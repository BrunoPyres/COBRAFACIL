import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'cobrafacil-secret-key-2026';

app.use(cors());
app.use(express.json());

// Database
const dbPath = join(__dirname, 'cobra.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Init tables
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      cpf TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      cep TEXT,
      notes TEXT,
      score TEXT DEFAULT 'good',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      principal_amount REAL NOT NULL,
      interest_rate REAL NOT NULL,
      interest_type TEXT DEFAULT 'simple',
      interest_amount REAL NOT NULL,
      total_amount REAL NOT NULL,
      term_days REAL NOT NULL,
      term_type TEXT DEFAULT 'days',
      start_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      payment_type TEXT DEFAULT 'single',
      installments INTEGER,
      installment_amount REAL,
      frequency TEXT DEFAULT 'monthly',
      late_fee_daily REAL DEFAULT 30,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_type TEXT DEFAULT 'partial',
      installment_number INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (loan_id) REFERENCES loans(id)
    )
  `);
}

initDb();

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Nao autenticado' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalido' });
  }
}

// ============ AUTH ============
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Dados incompletos' });
  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: 'Email ja cadastrado' });
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name, email, hash);
    const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: result.lastInsertRowid, name, email } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Dados incompletos' });
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Credenciais invalidas' });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.userId);
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ CLIENTS ============
app.get('/api/clients', authMiddleware, (req, res) => {
  try {
    const clients = db.prepare('SELECT * FROM clients WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    res.json(clients);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clients', authMiddleware, (req, res) => {
  try {
    const { name, cpf, phone, email, address, city, state, cep, notes } = req.body;
    const result = db.prepare(
      'INSERT INTO clients (user_id, name, cpf, phone, email, address, city, state, cep, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(req.userId, name, cpf || null, phone || null, email || null, address || null, city || null, state || null, cep || null, notes || null);
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
    res.json(client);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/clients/:id', authMiddleware, (req, res) => {
  try {
    const { name, cpf, phone, email, address, city, state, cep, notes } = req.body;
    db.prepare(
      'UPDATE clients SET name = ?, cpf = ?, phone = ?, email = ?, address = ?, city = ?, state = ?, cep = ?, notes = ? WHERE id = ? AND user_id = ?'
    ).run(name, cpf || null, phone || null, email || null, address || null, city || null, state || null, cep || null, notes || null, req.params.id, req.userId);
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    res.json(client);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/clients/:id', authMiddleware, (req, res) => {
  try {
    const hasLoans = db.prepare('SELECT COUNT(*) as c FROM loans WHERE client_id = ?').get(req.params.id);
    if (hasLoans.c > 0) return res.status(400).json({ error: 'Cliente tem emprestimos' });
    db.prepare('DELETE FROM clients WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ LOANS ============
app.get('/api/loans', authMiddleware, (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT l.*, c.name as client_name, c.phone as client_phone FROM loans l JOIN clients c ON l.client_id = c.id WHERE l.user_id = ?';
    const params = [req.userId];
    if (status) { sql += ' AND l.status = ?'; params.push(status); }
    sql += ' ORDER BY l.created_at DESC';
    const loans = db.prepare(sql).all(...params);
    res.json(loans);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/loans/:id', authMiddleware, (req, res) => {
  try {
    const loan = db.prepare('SELECT l.*, c.name as client_name, c.phone as client_phone FROM loans l JOIN clients c ON l.client_id = c.id WHERE l.id = ? AND l.user_id = ?').get(req.params.id, req.userId);
    if (!loan) return res.status(404).json({ error: 'Emprestimo nao encontrado' });
    const payments = db.prepare('SELECT * FROM payments WHERE loan_id = ? ORDER BY payment_date DESC').all(req.params.id);
    res.json({ ...loan, payments });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/loans', authMiddleware, (req, res) => {
  try {
    const { client_id, principal_amount, interest_rate, interest_type, interest_amount, total_amount, term_days, term_type, start_date, due_date, payment_type, installments, installment_amount, frequency, late_fee_daily, notes } = req.body;
    const result = db.prepare(
      `INSERT INTO loans (client_id, user_id, principal_amount, interest_rate, interest_type, interest_amount, total_amount, term_days, term_type, start_date, due_date, status, payment_type, installments, installment_amount, frequency, late_fee_daily, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`
    ).run(client_id, req.userId, principal_amount, interest_rate, interest_type || 'simple', interest_amount, total_amount, term_days, term_type || 'days', start_date, due_date, payment_type || 'single', installments || null, installment_amount || null, frequency || 'monthly', late_fee_daily || 30, notes || null);
    const loan = db.prepare('SELECT l.*, c.name as client_name FROM loans l JOIN clients c ON l.client_id = c.id WHERE l.id = ?').get(result.lastInsertRowid);
    res.json(loan);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/loans/:id', authMiddleware, (req, res) => {
  try {
    const { status } = req.body;
    db.prepare('UPDATE loans SET status = ? WHERE id = ? AND user_id = ?').run(status, req.params.id, req.userId);
    const loan = db.prepare('SELECT l.*, c.name as client_name FROM loans l JOIN clients c ON l.client_id = c.id WHERE l.id = ?').get(req.params.id);
    res.json(loan);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/loans/:id', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM payments WHERE loan_id = ?').run(req.params.id);
    db.prepare('DELETE FROM loans WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ PAYMENTS ============
app.post('/api/loans/:id/payments', authMiddleware, (req, res) => {
  try {
    const { amount, payment_date, payment_type, notes } = req.body;
    const result = db.prepare('INSERT INTO payments (loan_id, amount, payment_date, payment_type, notes) VALUES (?, ?, ?, ?, ?)').run(req.params.id, amount, payment_date, payment_type, notes || null);
    // Check if paid off
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
    const totalPaid = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE loan_id = ?').get(req.params.id);
    if (totalPaid.total >= loan.total_amount) {
      db.prepare("UPDATE loans SET status = 'paid' WHERE id = ?").run(req.params.id);
    }
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid);
    res.json(payment);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/payments', authMiddleware, (req, res) => {
  try {
    const payments = db.prepare(`
      SELECT p.*, l.client_id, c.name as client_name
      FROM payments p
      JOIN loans l ON p.loan_id = l.id
      JOIN clients c ON l.client_id = c.id
      WHERE l.user_id = ?
      ORDER BY p.payment_date DESC
    `).all(req.userId);
    res.json(payments);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ MIGRATE (localStorage -> Server) ============
app.post('/api/migrate', authMiddleware, (req, res) => {
  try {
    const { clients: clientList, loans: loanList, payments: paymentList } = req.body;

    // Insert clients (keep original IDs if numeric, otherwise let SQLite assign)
    const clientIdMap = {};
    for (const c of clientList) {
      const result = db.prepare(
        'INSERT INTO clients (user_id, name, cpf, phone, email, address, city, state, cep, notes, score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(req.userId, c.name, c.cpf || null, c.phone || null, c.email || null, c.address || null, c.city || null, c.state || null, c.cep || null, c.notes || null, c.score || 'good', c.createdAt || new Date().toISOString());
      clientIdMap[c.id] = result.lastInsertRowid;
    }

    const loanIdMap = {};
    for (const l of loanList) {
      const newClientId = clientIdMap[l.clientId];
      if (!newClientId) continue;
      const result = db.prepare(
        `INSERT INTO loans (client_id, user_id, principal_amount, interest_rate, interest_type, interest_amount, total_amount, term_days, term_type, start_date, due_date, status, payment_type, installments, installment_amount, frequency, late_fee_daily, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(newClientId, req.userId, l.principalAmount, l.interestRate, l.interestType, l.interestAmount, l.totalAmount, l.termDays, l.termType || 'days', l.startDate, l.dueDate, l.status, l.paymentType || 'single', l.installments || null, l.installmentAmount || null, l.frequency || 'monthly', l.lateFeeDaily || 30, l.notes || null, l.createdAt || new Date().toISOString());
      loanIdMap[l.id] = result.lastInsertRowid;
    }

    for (const p of paymentList) {
      const newLoanId = loanIdMap[p.loanId];
      if (!newLoanId) continue;
      db.prepare('INSERT INTO payments (loan_id, amount, payment_date, payment_type, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        newLoanId, p.amount, p.paymentDate, p.paymentType, p.notes || null, p.createdAt || new Date().toISOString()
      );
    }

    res.json({ success: true, clients: Object.keys(clientIdMap).length, loans: Object.keys(loanIdMap).length, payments: paymentList.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ DASHBOARD ============
app.get('/api/dashboard', authMiddleware, (req, res) => {
  try {
    const userId = req.userId;
    const today = new Date().toISOString().split('T')[0];

    // Update overdue
    db.prepare("UPDATE loans SET status = 'overdue' WHERE user_id = ? AND status = 'active' AND due_date < ?").run(userId, today);

    const capitalInStreet = db.prepare("SELECT COALESCE(SUM(principal_amount), 0) as t FROM loans WHERE user_id = ? AND status != 'paid'").get(userId);
    const totalToReceive = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as t FROM loans WHERE user_id = ? AND status != 'paid'").get(userId);
    const activeLoans = db.prepare("SELECT COUNT(*) as c FROM loans WHERE user_id = ? AND status = 'active'").get(userId);
    const overdueLoans = db.prepare("SELECT COUNT(*) as c FROM loans WHERE user_id = ? AND status = 'overdue'").get(userId);
    const paidLoans = db.prepare("SELECT COUNT(*) as c FROM loans WHERE user_id = ? AND status = 'paid'").get(userId);
    const dueToday = db.prepare("SELECT COUNT(*) as c FROM loans WHERE user_id = ? AND due_date = ? AND status = 'active'").get(userId, today);
    const clientsCount = db.prepare("SELECT COUNT(*) as c FROM clients WHERE user_id = ?").get(userId);
    const totalInterest = db.prepare("SELECT COALESCE(SUM(interest_amount), 0) as t FROM loans WHERE user_id = ?").get(userId);

    res.json({
      capitalInStreet: capitalInStreet.t || 0,
      totalToReceive: totalToReceive.t || 0,
      activeLoans: activeLoans.c || 0,
      overdueLoans: overdueLoans.c || 0,
      paidLoans: paidLoans.c || 0,
      dueToday: dueToday.c || 0,
      clientsCount: clientsCount.c || 0,
      totalInterest: totalInterest.t || 0,
      defaultRate: activeLoans.c + overdueLoans.c > 0 ? parseFloat(((overdueLoans.c / (activeLoans.c + overdueLoans.c)) * 100).toFixed(1)) : 0,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ HEALTHCHECK ============
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ============ STATIC FILES ============
import { existsSync } from 'fs';
const distPath = join(__dirname, '..', 'dist');

if (existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback for non-API routes (must be after all API routes)
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(join(distPath, 'index.html'));
  });
}

// ============ START ============
app.listen(PORT, () => {
  console.log(`CobraFacil backend running on port ${PORT}`);
});
