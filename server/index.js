const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3001;

// ─── Security Configuration ──────────────────────────────────────────────────
// In production, load from environment variable / secrets manager
const JWT_SECRET  = process.env.JWT_SECRET  || 'ntpl-super-secret-jwt-key-2026-change-in-prod';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';
const SALT_ROUNDS = 10;

// ─── Middlewares ─────────────────────────────────────────────────────────────
// Restrict CORS to known origins in production
const allowedOrigins = ['http://localhost:5000', 'http://localhost:3001', 'http://127.0.0.1:5000'];
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g., curl, Postman) in dev
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS policy: origin ${origin} not allowed.`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10kb' })); // Prevent oversized payloads
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }
  const token = authHeader.slice(7);
  try {
    req.tokenData = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Token has expired. Please log in again.'
      : 'Invalid token. Authentication required.';
    return res.status(401).json({ error: msg });
  }
  next();
}

// ─── Input Validators ─────────────────────────────────────────────────────────
function validateItemName(name) {
  if (!name || typeof name !== 'string') throw new Error('Item name is required.');
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 80) throw new Error('Item name must be 1–80 chars.');
  if (!/^[A-Za-z0-9 _\-]+$/.test(trimmed)) throw new Error('Item name contains invalid characters.');
  return trimmed.toLowerCase();
}

function validatePositiveInt(val, label) {
  const n = parseInt(val, 10);
  if (isNaN(n) || n < 0) throw new Error(`${label} must be a non-negative integer.`);
  return n;
}

function validateEmail(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email format.');
  }
  return email.toLowerCase().trim();
}

// ─── Database Configuration ───────────────────────────────────────────────────
const dbConfig = {
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'crm_user',
  password: process.env.DB_PASSWORD || 'crm_password',
  database: process.env.DB_NAME     || 'crm_db',
  port:     5432,
};

const pool = new Pool(dbConfig);

// Fallback in-memory mock DB
let mockUsers = [];
let mockItems = [
  { name: 'apple',  price: 100,   quantity: 10, available: true  },
  { name: 'banana', price: 200,   quantity: 20, available: true  },
  { name: 'orange', price: 300,   quantity: 30, available: false },
];

let useRealDb = false;

async function initializeDb() {
  try {
    await pool.query('SELECT NOW()');
    console.log('Connected to PostgreSQL database successfully.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        tenant_id VARCHAR(10) NOT NULL DEFAULT 'a',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        price INTEGER NOT NULL CHECK (price >= 0),
        quantity INTEGER NOT NULL CHECK (quantity >= 0),
        available BOOLEAN DEFAULT TRUE
      )
    `);

    const checkItems = await pool.query('SELECT COUNT(*) FROM items');
    if (parseInt(checkItems.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO items (name, price, quantity, available) VALUES
        ('apple', 100, 10, true),
        ('banana', 200, 20, true),
        ('orange', 300, 30, false)
      `);
      console.log('Default items seeded.');
    }

    useRealDb = true;
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Database initialization error:', err.message);
    console.log('Falling back to in-memory mock database.');
  }
}

initializeDb();

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({ message: 'NTPL Multi-Tenant CRM Backend Active', secured: true });
});


// POST /signup — Register a user, hash password, return JWT
app.post('/signup', async (req, res) => {
  let { name, email, password, tenant_id } = req.body;

  try {
    email = validateEmail(email || '');
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters.' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const allowedTenants = ['a', 'b'];
  tenant_id = (tenant_id || req.headers['x-tenant-id'] || 'a').toLowerCase().trim();
  if (!allowedTenants.includes(tenant_id)) {
    return res.status(400).json({ error: "tenant_id must be 'a' or 'b'." });
  }

  console.log(`[Tenant ${tenant_id.toUpperCase()}] Signup request for: ${email}`);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  if (useRealDb) {
    try {
      const result = await pool.query(
        'INSERT INTO users (name, email, password_hash, tenant_id) VALUES ($1, $2, $3, $4) RETURNING id, name, email, tenant_id',
        [name.trim(), email, passwordHash, tenant_id]
      );
      const token = jwt.sign(
        { sub: email, tenant: tenant_id },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
      );
      return res.status(201).json({ message: 'Registered successfully.', token, user: result.rows[0] });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      console.error('DB error on signup:', err.message);
      return res.status(500).json({ error: 'Server error during registration.' });
    }
  }

  // Mock DB fallback
  if (mockUsers.some(u => u.email === email && u.tenant_id === tenant_id)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }
  mockUsers.push({ name: name.trim(), email, passwordHash, tenant_id });
  const token = jwt.sign({ sub: email, tenant: tenant_id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  return res.status(201).json({ message: 'Registered successfully (Mock DB).', token, user: { name: name.trim(), email, tenant_id } });
});


// POST /login — Verify credentials and return JWT
app.post('/login', async (req, res) => {
  let { email, password, tenant_id } = req.body;

  try {
    email = validateEmail(email || '');
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  if (!password) return res.status(400).json({ error: 'Password is required.' });

  const allowedTenants = ['a', 'b'];
  tenant_id = (tenant_id || req.headers['x-tenant-id'] || 'a').toLowerCase().trim();
  if (!allowedTenants.includes(tenant_id)) {
    return res.status(400).json({ error: "tenant_id must be 'a' or 'b'." });
  }

  if (useRealDb) {
    try {
      const result = await pool.query(
        'SELECT id, name, email, password_hash, tenant_id FROM users WHERE email = $1 AND tenant_id = $2',
        [email, tenant_id]
      );
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }
      const user = result.rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

      const token = jwt.sign({ sub: email, tenant: tenant_id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
      return res.json({ message: 'Login successful.', token, user: { name: user.name, email: user.email, tenant_id } });
    } catch (err) {
      return res.status(500).json({ error: 'Server error during login.' });
    }
  }

  // Mock DB fallback
  const user = mockUsers.find(u => u.email === email && u.tenant_id === tenant_id);
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

  const token = jwt.sign({ sub: email, tenant: tenant_id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  return res.json({ message: 'Login successful (Mock DB).', token, user: { name: user.name, email, tenant_id } });
});


// GET /get_items — Protected. Tenant from JWT, NOT header.
app.get('/get_items', requireAuth, async (req, res) => {
  const tenant_id = req.tokenData.tenant; // ALWAYS from the verified JWT

  if (useRealDb) {
    try {
      const result = await pool.query('SELECT * FROM items');
      return res.json({ Items: result.rows });
    } catch (err) {
      console.error('DB error on get_items:', err.message);
    }
  }
  return res.json({ Items: mockItems });
});


// GET /get_item/:name — Protected
app.get('/get_item/:name', requireAuth, async (req, res) => {
  let name;
  try {
    name = validateItemName(req.params.name);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  if (useRealDb) {
    try {
      const result = await pool.query('SELECT * FROM items WHERE name = $1', [name]);
      if (result.rows.length === 0) return res.status(404).json({ message: 'Item not found.' });
      return res.json(result.rows[0]);
    } catch (err) {
      console.error('DB error on get_item:', err.message);
    }
  }

  const item = mockItems.find(i => i.name === name);
  if (!item) return res.status(404).json({ message: 'Item not found.' });
  return res.json(item);
});


// POST /add_item — Protected
app.post('/add_item', requireAuth, async (req, res) => {
  const tenant_id = req.tokenData.tenant;
  let name, price, quantity;
  try {
    name     = validateItemName(req.body.name);
    price    = validatePositiveInt(req.body.price,    'price');
    quantity = validatePositiveInt(req.body.quantity, 'quantity');
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const available = req.body.available !== undefined ? Boolean(req.body.available) : true;
  console.log(`[Tenant ${tenant_id.toUpperCase()}] Adding item '${name}' by ${req.tokenData.sub}`);

  if (useRealDb) {
    try {
      await pool.query(
        `INSERT INTO items (name, price, quantity, available)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO UPDATE
           SET price = EXCLUDED.price,
               quantity = EXCLUDED.quantity,
               available = EXCLUDED.available`,
        [name, price, quantity, available]
      );
      return res.status(201).json({ message: 'Item saved successfully.' });
    } catch (err) {
      console.error('DB error on add_item:', err.message);
      return res.status(500).json({ error: 'Server error saving item.' });
    }
  }

  // Mock DB fallback
  const idx = mockItems.findIndex(i => i.name === name);
  if (idx !== -1) {
    mockItems[idx] = { name, price, quantity, available };
  } else {
    mockItems.push({ name, price, quantity, available });
  }
  return res.status(201).json({ message: 'Item saved (Mock DB).' });
});


// ─── Server ───────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`Secured backend listening at http://localhost:${port}`);
});
