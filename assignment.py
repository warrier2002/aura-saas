from flask import Flask, request, jsonify, render_template
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import logging
import re
from functools import wraps
from datetime import datetime, timedelta, timezone

app = Flask(__name__)

# ─── Security Configuration ───────────────────────────────────────────────────
# In production, load this from environment variable / secrets manager
JWT_SECRET  = 'super-secret-jwt-key-2026'
JWT_ALG     = 'HS256'
JWT_EXPIRE  = timedelta(hours=8)

# Configure clean logging to show tenant requests clearly
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MultiTenantSaaS")

# ─── Mock Tenant Databases (Option 1 – DB-per-tenant isolation) ───────────────
tenant_databases = {
    'a': [
        {"name": "apple",  "price": 100,   "quantity": 10, "available": True},
        {"name": "banana", "price": 200,   "quantity": 20, "available": True},
        {"name": "orange", "price": 300,   "quantity": 30, "available": False},
    ],
    'b': [
        {"name": "laptop",   "price": 54000, "quantity": 5,  "available": True},
        {"name": "mouse",    "price": 800,   "quantity": 45, "available": True},
        {"name": "keyboard", "price": 2500,  "quantity": 0,  "available": False},
    ]
}

# Tenant user database (passwords stored as bcrypt hashes)
tenant_users = {'a': [], 'b': []}

ALLOWED_TENANTS = {'a', 'b'}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _sanitize_tenant(raw: str) -> str:
    """Return a valid tenant ID or raise ValueError."""
    tid = (raw or '').strip().lower()
    if tid not in ALLOWED_TENANTS:
        raise ValueError(f"Unknown tenant: {tid!r}")
    return tid

def _issue_token(tenant_id: str, email: str) -> str:
    payload = {
        'sub': email,
        'tenant': tenant_id,
        'iat': datetime.now(tz=timezone.utc),
        'exp': datetime.now(tz=timezone.utc) + JWT_EXPIRE,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def _decode_token(token: str) -> dict:
    """Decode and verify a JWT. Raises jwt.PyJWTError on failure."""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])

def require_auth(f):
    """Decorator: enforces valid JWT and injects 'token_data' into kwargs."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Missing or malformed Authorization header"}), 401
        token = auth_header[7:]
        try:
            token_data = _decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired. Please log in again."}), 401
        except jwt.PyJWTError:
            return jsonify({"error": "Invalid token. Authentication required."}), 401
        return f(*args, token_data=token_data, **kwargs)
    return wrapper

def _validate_name(name: str) -> str:
    """Allow only alphanumeric + spaces + hyphens, 1–80 chars."""
    name = name.strip()
    if not name or len(name) > 80:
        raise ValueError("Name must be 1–80 characters.")
    if not re.fullmatch(r"[A-Za-z0-9 _\-]+", name):
        raise ValueError("Name contains invalid characters.")
    return name.lower()

def _validate_positive_int(val, label: str) -> int:
    try:
        v = int(val)
    except (TypeError, ValueError):
        raise ValueError(f"{label} must be an integer.")
    if v < 0:
        raise ValueError(f"{label} must be non-negative.")
    return v

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route('/')
def hello():
    return render_template('index.html')


@app.post('/signup')
def signup():
    """Register a new admin user under a specific tenant. Returns a JWT."""
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 415

    data = request.get_json(silent=True) or {}
    name     = (data.get('name')     or '').strip()
    email    = (data.get('email')    or '').strip().lower()
    password = (data.get('password') or '').strip()
    raw_tid  = (data.get('tenant_id') or request.headers.get('X-Tenant-ID', '')).strip()

    if not name or not email or not password:
        return jsonify({"error": "Missing required fields: name, email, password"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400

    if not re.fullmatch(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({"error": "Invalid email format."}), 400

    try:
        tenant_id = _sanitize_tenant(raw_tid)
    except ValueError:
        return jsonify({"error": "Invalid or missing tenant_id. Must be 'a' or 'b'."}), 400

    # Check for duplicate email within the same tenant
    if any(u['email'] == email for u in tenant_users[tenant_id]):
        return jsonify({"error": "An account with this email already exists in this tenant."}), 409

    pw_hash = generate_password_hash(password)
    tenant_users[tenant_id].append({"name": name, "email": email, "password": pw_hash})
    logger.info(f"[Tenant {tenant_id.upper()}] New admin registered: {email}")

    token = _issue_token(tenant_id, email)
    return jsonify({
        "message": f"Registered successfully in Tenant {tenant_id.upper()}.",
        "token": token,
        "tenant": tenant_id
    }), 201


@app.post('/login')
def login():
    """Authenticate a tenant user and return a signed JWT."""
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 415

    data = request.get_json(silent=True) or {}
    email    = (data.get('email')    or '').strip().lower()
    password = (data.get('password') or '').strip()
    raw_tid  = (data.get('tenant_id') or request.headers.get('X-Tenant-ID', '')).strip()

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    try:
        tenant_id = _sanitize_tenant(raw_tid)
    except ValueError:
        return jsonify({"error": "Invalid or missing tenant_id."}), 400

    user = next((u for u in tenant_users[tenant_id] if u['email'] == email), None)
    # Constant-time comparison to resist timing attacks
    if user is None or not check_password_hash(user['password'], password):
        logger.warning(f"[Tenant {tenant_id.upper()}] Failed login attempt for: {email}")
        return jsonify({"error": "Invalid credentials."}), 401

    logger.info(f"[Tenant {tenant_id.upper()}] Successful login: {email}")
    token = _issue_token(tenant_id, email)
    return jsonify({"message": "Login successful.", "token": token, "tenant": tenant_id}), 200


@app.get('/get_items')
@require_auth
def get_items(token_data):
    """Return items for the authenticated user's tenant — tenant from JWT, NOT from header."""
    tenant_id = token_data['tenant']
    logger.info(f"[Tenant {tenant_id.upper()}] Catalog query by {token_data['sub']}")
    return jsonify({"Items": tenant_databases[tenant_id]})


@app.get('/get_item/<string:name>')
@require_auth
def get_item(name, token_data):
    """Fetch a single item by name, scoped to the JWT-authenticated tenant."""
    tenant_id = token_data['tenant']
    # Sanitize the name from the URL
    name = name.strip().lower()
    if not re.fullmatch(r"[a-z0-9 _\-]+", name):
        return jsonify({"error": "Invalid item name."}), 400

    logger.info(f"[Tenant {tenant_id.upper()}] Searching for item: '{name}' by {token_data['sub']}")
    for item in tenant_databases[tenant_id]:
        if item.get('name') == name:
            return jsonify(item)
    return jsonify({"message": "Item not found"}), 404


@app.post('/add_item')
@require_auth
def add_item(token_data):
    """Insert or update a catalog item for the authenticated tenant."""
    tenant_id = token_data['tenant']

    if not request.is_json:
        return jsonify({"error": "Request body must be JSON"}), 415

    data = request.get_json(silent=True) or {}
    try:
        name      = _validate_name(data.get('name', ''))
        price     = _validate_positive_int(data.get('price'),    'price')
        quantity  = _validate_positive_int(data.get('quantity'), 'quantity')
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    available = bool(data.get('available', True))

    logger.info(f"[Tenant {tenant_id.upper()}] Adding '{name}' (₹{price}) by {token_data['sub']}")

    db = tenant_databases[tenant_id]
    existing_index = next((i for i, item in enumerate(db) if item["name"] == name), -1)
    new_item = {"name": name, "price": price, "quantity": quantity, "available": available}

    if existing_index != -1:
        db[existing_index] = new_item
        logger.info(f"[Tenant {tenant_id.upper()}] Updated existing item: '{name}'")
    else:
        db.append(new_item)
        logger.info(f"[Tenant {tenant_id.upper()}] Inserted new item: '{name}'")

    return jsonify({"message": "Item saved successfully."}), 201


if __name__ == '__main__':
    logger.info("Initializing Secured Multi-Tenant CRM Flask server on http://localhost:5000")
    # debug=False in any real scenario; keep True only for local dev
    app.run(debug=True, port=5000)
