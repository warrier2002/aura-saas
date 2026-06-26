const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const fs = require('fs');
const https = require('https');

const app = express();
const port = process.env.PORT || 3001;

// ─── Security Configuration ──────────────────────────────────────────────────
const JWT_SECRET  = process.env.JWT_SECRET  || 'aura-super-secret-jwt-key-2026-change-in-prod';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';
const SALT_ROUNDS = 10;

// ─── Middlewares ─────────────────────────────────────────────────────────────
// Helmet for setting HTTP security headers
app.use(helmet());

// Restrict CORS to known origins in production
const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:3001',
  'http://127.0.0.1:5000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS policy: origin ${origin} not allowed.`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Prevent oversized payloads
app.use(express.json({ limit: '10kb' })); 
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Database Configuration ───────────────────────────────────────────────────
// Strict Connection Pool Configuration
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'aura_app_user',
  password: process.env.DB_PASSWORD || 'aura_password',
  database: process.env.DB_NAME     || 'aura_db',
  port:     process.env.DB_PORT     || 5432,
  // Ensure SSL is required for RDS
  ssl: { rejectUnauthorized: false }
});

// Helper function to safely execute tenant-scoped queries
async function queryTenant(tenantId, text, params) {
  const client = await pool.connect();
  try {
    // SECURITY: Parameterise schema search path to isolate tenant data
    // We sanitize tenantId against an allowlist to prevent SQL injection in SET command
    const safeTenant = tenantId.replace(/[^a-z0-9_]/g, '');
    await client.query(`SET search_path TO ${safeTenant}`);
    
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// ─── Input Validators ─────────────────────────────────────────────────────────
function validateEmail(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email format.');
  }
  return email.toLowerCase().trim();
}

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

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health Check Endpoint (used by Kubernetes and CI/CD)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Aura SaaS Backend', secured: true });
});

// POST /api/login — Verify credentials and return JWT
app.post('/login', async (req, res) => {
  let { email, password, tenant_id } = req.body;

  try {
    email = validateEmail(email || '');
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  if (!password) return res.status(400).json({ error: 'Password is required.' });

  // Restrict to known tenants for this student project
  const allowedTenants = ['tenant_a', 'tenant_b'];
  tenant_id = (tenant_id || 'tenant_a').toLowerCase().trim();
  if (!allowedTenants.includes(tenant_id)) {
    return res.status(400).json({ error: "Invalid tenant_id." });
  }

  try {
    // 1. Connect to DB and set tenant schema
    const result = await queryTenant(tenant_id, 
      'SELECT id, full_name, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

    // 2. Sign JWT with tenant_id embedded
    const token = jwt.sign(
      { sub: email, tenant: tenant_id, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRES }
    );
    
    return res.json({ 
      message: 'Login successful.', 
      token, 
      user: { name: user.full_name, email: user.email, tenant_id } 
    });
  } catch (err) {
    console.error('DB error during login:', err.message);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});


// GET /api/customers — Protected. Tenant extracted from JWT.
app.get('/customers', requireAuth, async (req, res) => {
  const tenant_id = req.tokenData.tenant; // SECURITY: Read tenant from JWT, never from input

  try {
    const result = await queryTenant(tenant_id, 'SELECT id, name, email, phone, company, status FROM customers ORDER BY id DESC', []);
    return res.json({ customers: result.rows });
  } catch (err) {
    console.error('DB error on get_customers:', err.message);
    return res.status(500).json({ error: 'Failed to fetch customers.' });
  }
});


// POST /api/customers — Protected. 
app.post('/customers', requireAuth, async (req, res) => {
  const tenant_id = req.tokenData.tenant; 
  const { name, email, phone, company } = req.body;

  if (!name) return res.status(400).json({ error: 'Customer name is required' });

  try {
    const result = await queryTenant(
      tenant_id, 
      'INSERT INTO customers (name, email, phone, company) VALUES ($1, $2, $3, $4) RETURNING id, name, email',
      [name, email, phone, company]
    );
    return res.status(201).json({ message: 'Customer added successfully.', customer: result.rows[0] });
  } catch (err) {
    console.error('DB error on add_customer:', err.message);
    return res.status(500).json({ error: 'Failed to add customer.' });
  }
});

// DELETE /customers/:id — Protected.
app.delete('/customers/:id', requireAuth, async (req, res) => {
  const tenant_id = req.tokenData.tenant;
  const customerId = parseInt(req.params.id, 10);

  if (isNaN(customerId)) {
    return res.status(400).json({ error: 'Invalid customer ID.' });
  }

  try {
    const result = await queryTenant(
      tenant_id,
      'DELETE FROM customers WHERE id = $1 RETURNING id',
      [customerId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    return res.json({ message: 'Customer and all associated contacts deleted successfully.' });
  } catch (err) {
    console.error('DB error on delete_customer:', err.message);
    return res.status(500).json({ error: 'Failed to delete customer.' });
  }
});

// GET /contacts — Protected.
app.get('/contacts', requireAuth, async (req, res) => {
  const tenant_id = req.tokenData.tenant;

  try {
    const result = await queryTenant(
      tenant_id,
      `SELECT c.id, c.name, c.email, c.phone, c.role, cust.name as customer_name 
       FROM contacts c 
       LEFT JOIN customers cust ON c.customer_id = cust.id 
       ORDER BY c.id DESC`,
      []
    );
    return res.json({ contacts: result.rows });
  } catch (err) {
    console.error('DB error on get_contacts:', err.message);
    return res.status(500).json({ error: 'Failed to fetch contacts.' });
  }
});

// POST /contacts — Protected.
app.post('/contacts', requireAuth, async (req, res) => {
  const tenant_id = req.tokenData.tenant;
  const { customer_id, name, email, phone, role } = req.body;

  const customerId = parseInt(customer_id, 10);
  if (isNaN(customerId)) {
    return res.status(400).json({ error: 'Valid Customer ID is required.' });
  }
  if (!name) return res.status(400).json({ error: 'Contact name is required.' });

  try {
    const result = await queryTenant(
      tenant_id,
      'INSERT INTO contacts (customer_id, name, email, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email',
      [customerId, name, email, phone, role]
    );
    return res.status(201).json({ message: 'Contact added successfully.', contact: result.rows[0] });
  } catch (err) {
    console.error('DB error on add_contact:', err.message);
    return res.status(500).json({ error: 'Failed to add contact.' });
  }
});

// Helper: Query Kubernetes API for active replicas
async function getK8sReplicaCount() {
  const tokenPath = '/var/run/secrets/kubernetes.io/serviceaccount/token';
  const nsPath = '/var/run/secrets/kubernetes.io/serviceaccount/namespace';
  
  if (!fs.existsSync(tokenPath) || !fs.existsSync(nsPath)) {
    // Fallback: local dev
    return { replicas: 1, readyReplicas: 1, mode: 'local' };
  }
  
  try {
    const token = fs.readFileSync(tokenPath, 'utf8');
    const namespace = fs.readFileSync(nsPath, 'utf8').trim();
    
    // Deployment name created by Helm (e.g. aura-saas-backend)
    const deployName = 'aura-saas-backend';
    const path = `/apis/apps/v1/namespaces/${namespace}/deployments/${deployName}`;
    
    const options = {
      hostname: 'kubernetes.default.svc',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      rejectUnauthorized: false
    };
    
    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const body = JSON.parse(data);
              resolve({
                replicas: body.status.replicas || 1,
                readyReplicas: body.status.readyReplicas || 0,
                mode: 'k8s'
              });
            } catch (e) {
              resolve({ replicas: 1, readyReplicas: 1, mode: 'k8s-parse-error' });
            }
          } else {
            resolve({ replicas: 1, readyReplicas: 1, mode: `k8s-error-status-${res.statusCode}` });
          }
        });
      });
      req.on('error', (err) => {
        resolve({ replicas: 1, readyReplicas: 1, mode: `k8s-error-${err.message}` });
      });
      req.end();
    });
  } catch (err) {
    return { replicas: 1, readyReplicas: 1, mode: `k8s-exception-${err.message}` };
  }
}

// GET /hpa-status — Public/Protected (Returns the replica scale metadata)
app.get('/hpa-status', async (req, res) => {
  try {
    const status = await getK8sReplicaCount();
    return res.json(status);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch scaling status.' });
  }
});

// ─── Server ───────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`Secured Aura SaaS Backend listening at http://localhost:${port}`);
});

