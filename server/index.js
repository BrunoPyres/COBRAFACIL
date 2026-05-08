import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'cobrafacil-secret-key-2026';
const DATABASE_URL = process.env.DATABASE_URL;

app.use(cors());
app.use(express.json());

let db;
let isPostgres = false;

// ============ DATABASE SETUP ============

if (DATABASE_URL) {
  // PostgreSQL (Railway)
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  db = pool;
  isPostgres = true;

  // Init tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS loans (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      loan_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_type TEXT DEFAULT 'partial',
      installment_number INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

} else {
  // SQLite (local dev)
  const { default: Database } = await import('better-sqlite3');
  const dbPath = join(__dirname, 'cobra.db');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  db = sqlite;
  isPostgres = false;

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  sqlite.exec(`
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  sqlite.exec(`
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_type TEXT DEFAULT 'partial',
      installment_number INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Helper query
async function query(sql, params = []) {
  if (isPostgres) {
    return (await db.query(sql, params)).rows;
  } else {
    const stmt = db.prepare(sql);
    if (sql.trim().toLowerCase().startsWith('select')) {
      return stmt.all(...params);
    } else {
      return stmt.run(...params);
    }
  }
}

function queryOne(sql, params = []) {
  if (isPostgres) {
    return db.query(sql, params).then(r => r.rows[0] || null);
  } else {
    return db.prepare(sql).get(...params) || null;
  }
}

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
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Dados incompletos' });
  try {
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ error: 'Email ja cadastrado' });
    const hash = bcrypt.hashSync(password, 10);
    let result;
    if (isPostgres) {
      result = await db.query('INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id', [name, email, hash]);
      result = { lastInsertRowid: result.rows[0].id };
    } else {
      result = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name, email, hash);
    }
    const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: result.lastInsertRowid, name, email } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Dados incompletos' });
  try {
    const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Credenciais invalidas' });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await queryOne('SELECT id, name, email FROM users WHERE id = ?', [req.userId]);
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ CLIENTS ============
app.get('/api/clients', authMiddleware, async (req, res) => {
  try {
    const clients = await query('SELECT * FROM clients WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    res.json(clients);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clients', authMiddleware, async (req, res) => {
  try {
    const { name, cpf, phone, email, address, city, state, cep, notes } = req.body;
    let result;
    if (isPostgres) {
      result = await db.query('INSERT INTO clients (user_id, name, cpf, phone, email, address, city, state, cep, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id', [req.userId, name, cpf || null, phone || null, email || null, address || null, city || null, state || null, cep || null, notes || null]);
      result = { lastInsertRowid: result.rows[0].id };
    } else {
      result = db.prepare('INSERT INTO clients (user_id, name, cpf, phone, email, address, city, state, cep, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(req.userId, name, cpf || null, phone || null, email || null, address || null, city || null, state || null, cep || null, notes || null);
    }
    const client = await queryOne('SELECT * FROM clients WHERE id = ?', [result.lastInsertRowid]);
    res.json(client);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/clients/:id', authMiddleware, async (req, res) => {
  try {
    const { name, cpf, phone, email, address, city, state, cep, notes } = req.body;
    await query('UPDATE clients SET name = ?, cpf = ?, phone = ?, email = ?, address = ?, city = ?, state = ?, cep = ?, notes = ? WHERE id = ? AND user_id = ?', [name, cpf || null, phone || null, email || null, address || null, city || null, state || null, cep || null, notes || null, req.params.id, req.userId]);
    const client = await queryOne('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    res.json(client);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/clients/:id', authMiddleware, async (req, res) => {
  try {
    const hasLoans = await queryOne('SELECT COUNT(*) as c FROM loans WHERE client_id = ?', [req.params.id]);
    if ((hasLoans?.c || hasLoans?.count || 0) > 0) return res.status(400).json({ error: 'Cliente tem emprestimos' });
    await query('DELETE FROM clients WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ LOANS ============
app.get('/api/loans', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT l.*, c.name as client_name, c.phone as client_phone FROM loans l JOIN clients c ON l.client_id = c.id WHERE l.user_id = ?';
    const params = [req.userId];
    if (status) { sql += ' AND l.status = ?'; params.push(status); }
    sql += ' ORDER BY l.created_at DESC';
    const loans = await query(sql, params);
    res.json(loans);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/loans/:id', authMiddleware, async (req, res) => {
  try {
    const loan = await queryOne('SELECT l.*, c.name as client_name, c.phone as client_phone FROM loans l JOIN clients c ON l.client_id = c.id WHERE l.id = ? AND l.user_id = ?', [req.params.id, req.userId]);
    if (!loan) return res.status(404).json({ error: 'Emprestimo nao encontrado' });
    const payments = await query('SELECT * FROM payments WHERE loan_id = ? ORDER BY payment_date DESC', [req.params.id]);
    res.json({ ...loan, payments });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/loans', authMiddleware, async (req, res) => {
  try {
    const { client_id, principal_amount, interest_rate, interest_type, interest_amount, total_amount, term_days, term_type, start_date, due_date, payment_type, installments, installment_amount, frequency, late_fee_daily, notes } = req.body;
    let result;
    if (isPostgres) {
      result = await db.query(
        `INSERT INTO loans (client_id, user_id, principal_amount, interest_rate, interest_type, interest_amount, total_amount, term_days, term_type, start_date, due_date, status, payment_type, installments, installment_amount, frequency, late_fee_daily, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', $12, $13, $14, $15, $16, $17) RETURNING id`,
        [client_id, req.userId, principal_amount, interest_rate, interest_type || 'simple', interest_amount, total_amount, term_days, term_type || 'days', start_date, due_date, payment_type || 'single', installments || null, installment_amount || null, frequency || 'monthly', late_fee_daily || 30, notes || null]
      );
      result = { lastInsertRowid: result.rows[0].id };
    } else {
      result = db.prepare(
        `INSERT INTO loans (client_id, user_id, principal_amount, interest_rate, interest_type, interest_amount, total_amount, term_days, term_type, start_date, due_date, status, payment_type, installments, installment_amount, frequency, late_fee_daily, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`
      ).run(client_id, req.userId, principal_amount, interest_rate, interest_type || 'simple', interest_amount, total_amount, term_days, term_type || 'days', start_date, due_date, payment_type || 'single', installments || null, installment_amount || null, frequency || 'monthly', late_fee_daily || 30, notes || null);
    }
    const loan = await queryOne('SELECT l.*, c.name as client_name FROM loans l JOIN clients c ON l.client_id = c.id WHERE l.id = ?', [result.lastInsertRowid]);
    res.json(loan);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/loans/:id', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    await query('UPDATE loans SET status = ? WHERE id = ? AND user_id = ?', [status, req.params.id, req.userId]);
    const loan = await queryOne('SELECT l.*, c.name as client_name FROM loans l JOIN clients c ON l.client_id = c.id WHERE l.id = ?', [req.params.id]);
    res.json(loan);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/loans/:id', authMiddleware, async (req, res) => {
  try {
    await query('DELETE FROM payments WHERE loan_id = ?', [req.params.id]);
    await query('DELETE FROM loans WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ PAYMENTS ============
app.post('/api/loans/:id/payments', authMiddleware, async (req, res) => {
  try {
    const { amount, payment_date, payment_type, notes } = req.body;
    let result;
    if (isPostgres) {
      result = await db.query('INSERT INTO payments (loan_id, amount, payment_date, payment_type, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id', [req.params.id, amount, payment_date, payment_type, notes || null]);
      result = { lastInsertRowid: result.rows[0].id };
    } else {
      result = db.prepare('INSERT INTO payments (loan_id, amount, payment_date, payment_type, notes) VALUES (?, ?, ?, ?, ?)').run(req.params.id, amount, payment_date, payment_type, notes || null);
    }
    // Check if paid off
    const loan = await queryOne('SELECT * FROM loans WHERE id = ?', [req.params.id]);
    const totalPaid = await queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE loan_id = ?', [req.params.id]);
    const paid = totalPaid?.total || totalPaid?.sum || 0;
    if (paid >= loan.total_amount) {
      await query("UPDATE loans SET status = 'paid' WHERE id = ?", [req.params.id]);
    }
    const payment = await queryOne('SELECT * FROM payments WHERE id = ?', [result.lastInsertRowid]);
    res.json(payment);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/payments', authMiddleware, async (req, res) => {
  try {
    const payments = await query(`
      SELECT p.*, l.client_id, c.name as client_name
      FROM payments p
      JOIN loans l ON p.loan_id = l.id
      JOIN clients c ON l.client_id = c.id
      WHERE l.user_id = ?
      ORDER BY p.payment_date DESC
    `, [req.userId]);
    res.json(payments);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ MIGRATE ============
app.post('/api/migrate', authMiddleware, async (req, res) => {
  try {
    const { clients: clientList, loans: loanList, payments: paymentList } = req.body;
    const clientIdMap = {};
    for (const c of clientList) {
      let result;
      if (isPostgres) {
        result = await db.query('INSERT INTO clients (user_id, name, cpf, phone, email, address, city, state, cep, notes, score, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id', [req.userId, c.name, c.cpf || null, c.phone || null, c.email || null, c.address || null, c.city || null, c.state || null, c.cep || null, c.notes || null, c.score || 'good', c.createdAt || new Date().toISOString()]);
        result = { lastInsertRowid: result.rows[0].id };
      } else {
        result = db.prepare('INSERT INTO clients (user_id, name, cpf, phone, email, address, city, state, cep, notes, score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(req.userId, c.name, c.cpf || null, c.phone || null, c.email || null, c.address || null, c.city || null, c.state || null, c.cep || null, c.notes || null, c.score || 'good', c.createdAt || new Date().toISOString());
      }
      clientIdMap[c.id] = result.lastInsertRowid;
    }
    const loanIdMap = {};
    for (const l of loanList) {
      const newClientId = clientIdMap[l.clientId];
      if (!newClientId) continue;
      let result;
      if (isPostgres) {
        result = await db.query(
          'INSERT INTO loans (client_id, user_id, principal_amount, interest_rate, interest_type, interest_amount, total_amount, term_days, term_type, start_date, due_date, status, payment_type, installments, installment_amount, frequency, late_fee_daily, notes, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING id',
          [newClientId, req.userId, l.principalAmount, l.interestRate, l.interestType, l.interestAmount, l.totalAmount, l.termDays, l.termType || 'days', l.startDate, l.dueDate, l.status, l.paymentType || 'single', l.installments || null, l.installmentAmount || null, l.frequency || 'monthly', l.lateFeeDaily || 30, l.notes || null, l.createdAt || new Date().toISOString()]
        );
        result = { lastInsertRowid: result.rows[0].id };
      } else {
        result = db.prepare('INSERT INTO loans (client_id, user_id, principal_amount, interest_rate, interest_type, interest_amount, total_amount, term_days, term_type, start_date, due_date, status, payment_type, installments, installment_amount, frequency, late_fee_daily, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(newClientId, req.userId, l.principalAmount, l.interestRate, l.interestType, l.interestAmount, l.totalAmount, l.termDays, l.termType || 'days', l.startDate, l.dueDate, l.status, l.paymentType || 'single', l.installments || null, l.installmentAmount || null, l.frequency || 'monthly', l.lateFeeDaily || 30, l.notes || null, l.createdAt || new Date().toISOString());
      }
      loanIdMap[l.id] = result.lastInsertRowid;
    }
    for (const p of paymentList) {
      const newLoanId = loanIdMap[p.loanId];
      if (!newLoanId) continue;
      await query('INSERT INTO payments (loan_id, amount, payment_date, payment_type, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)', [newLoanId, p.amount, p.paymentDate, p.paymentType, p.notes || null, p.createdAt || new Date().toISOString()]);
    }
    res.json({ success: true, clients: Object.keys(clientIdMap).length, loans: Object.keys(loanIdMap).length, payments: paymentList.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ DASHBOARD ============
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const today = new Date().toISOString().split('T')[0];

    // Update overdue
    await query("UPDATE loans SET status = 'overdue' WHERE user_id = ? AND status = 'active' AND due_date < ?", [userId, today]);

    const capitalInStreet = await queryOne("SELECT COALESCE(SUM(principal_amount), 0) as t FROM loans WHERE user_id = ? AND status != 'paid'", [userId]);
    const totalToReceive = await queryOne("SELECT COALESCE(SUM(total_amount), 0) as t FROM loans WHERE user_id = ? AND status != 'paid'", [userId]);
    const activeLoans = await queryOne("SELECT COUNT(*) as c FROM loans WHERE user_id = ? AND status = 'active'", [userId]);
    const overdueLoans = await queryOne("SELECT COUNT(*) as c FROM loans WHERE user_id = ? AND status = 'overdue'", [userId]);
    const paidLoans = await queryOne("SELECT COUNT(*) as c FROM loans WHERE user_id = ? AND status = 'paid'", [userId]);
    const dueToday = await queryOne("SELECT COUNT(*) as c FROM loans WHERE user_id = ? AND due_date = ? AND status = 'active'", [userId, today]);
    const clientsCount = await queryOne("SELECT COUNT(*) as c FROM clients WHERE user_id = ?", [userId]);
    const totalInterest = await queryOne("SELECT COALESCE(SUM(interest_amount), 0) as t FROM loans WHERE user_id = ?", [userId]);

    res.json({
      capitalInStreet: capitalInStreet?.t || 0,
      totalToReceive: totalToReceive?.t || 0,
      activeLoans: activeLoans?.c || 0,
      overdueLoans: overdueLoans?.c || 0,
      paidLoans: paidLoans?.c || 0,
      dueToday: dueToday?.c || 0,
      clientsCount: clientsCount?.c || 0,
      totalInterest: totalInterest?.t || 0,
      defaultRate: (activeLoans?.c || 0) + (overdueLoans?.c || 0) > 0 ? parseFloat((((overdueLoans?.c || 0) / ((activeLoans?.c || 0) + (overdueLoans?.c || 0))) * 100).toFixed(1)) : 0,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ HEALTHCHECK ============
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: isPostgres ? 'postgres' : 'sqlite', time: new Date().toISOString() });
});

// ============ STATIC FILES ============
const distPath = join(__dirname, '..', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(distPath, 'index.html'));
  });
}

// ============ START ============
app.listen(PORT, () => {
  console.log(`CobraFacil running on port ${PORT} with ${isPostgres ? 'PostgreSQL' : 'SQLite'}`);
});
