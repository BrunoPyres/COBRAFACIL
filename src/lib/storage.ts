import type { User, Client, Loan, Payment, AppSettings } from '@/types';

const KEYS = {
  USERS: 'cobra_users',
  CLIENTS: 'cobra_clients',
  LOANS: 'cobra_loans',
  PAYMENTS: 'cobra_payments',
  SETTINGS: 'cobra_settings',
  SESSION: 'cobra_session',
};

function get<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch { return fallback; }
}

function set(key: string, value: any) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Users
export function getUsers(): User[] { return get(KEYS.USERS, []); }
export function saveUser(user: User) {
  const users = getUsers();
  const existing = users.findIndex(u => u.id === user.id);
  if (existing >= 0) users[existing] = user;
  else users.push(user);
  set(KEYS.USERS, users);
}
export function findUserByEmail(email: string): User | undefined {
  return getUsers().find(u => u.email === email);
}

// Session
export function getSession(): { userId: string } | null { return get(KEYS.SESSION, null); }
export function setSession(userId: string) { set(KEYS.SESSION, { userId }); }
export function clearSession() { localStorage.removeItem(KEYS.SESSION); }

// Clients
export function getClients(userId: string): Client[] {
  return get<Client[]>(KEYS.CLIENTS, []).filter(c => c.userId === userId);
}
export function saveClient(client: Client) {
  const all = get<Client[]>(KEYS.CLIENTS, []);
  const idx = all.findIndex(c => c.id === client.id);
  if (idx >= 0) all[idx] = client;
  else all.push(client);
  set(KEYS.CLIENTS, all);
}
export function deleteClient(id: string) {
  set(KEYS.CLIENTS, get<Client[]>(KEYS.CLIENTS, []).filter(c => c.id !== id));
}

// Loans
export function getLoans(userId: string): Loan[] {
  return get<Loan[]>(KEYS.LOANS, []).filter(l => l.userId === userId);
}
export function saveLoan(loan: Loan) {
  const all = get<Loan[]>(KEYS.LOANS, []);
  const idx = all.findIndex(l => l.id === loan.id);
  if (idx >= 0) all[idx] = loan;
  else all.push(loan);
  set(KEYS.LOANS, all);
}
export function deleteLoan(id: string) {
  set(KEYS.LOANS, get<Loan[]>(KEYS.LOANS, []).filter(l => l.id !== id));
  // Also delete associated payments
  set(KEYS.PAYMENTS, get<Payment[]>(KEYS.PAYMENTS, []).filter(p => p.loanId !== id));
}

// Payments
export function getPayments(userId?: string): Payment[] {
  const all = get<Payment[]>(KEYS.PAYMENTS, []);
  if (!userId) return all;
  const loans = getLoans(userId).map(l => l.id);
  return all.filter(p => loans.includes(p.loanId));
}
export function getPaymentsForLoan(loanId: string): Payment[] {
  return get<Payment[]>(KEYS.PAYMENTS, []).filter(p => p.loanId === loanId);
}
export function savePayment(payment: Payment) {
  const all = get<Payment[]>(KEYS.PAYMENTS, []);
  const idx = all.findIndex(p => p.id === payment.id);
  if (idx >= 0) all[idx] = payment;
  else all.push(payment);
  set(KEYS.PAYMENTS, all);
}
export function deletePayment(id: string) {
  set(KEYS.PAYMENTS, get<Payment[]>(KEYS.PAYMENTS, []).filter(p => p.id !== id));
}

// Settings
export function getSettings(userId: string): AppSettings {
  const all = get<AppSettings[]>(KEYS.SETTINGS, []);
  return all.find(s => s.userId === userId) || {
    userId,
    companyName: '',
    companyCnpj: '',
    defaultInterestRate: 35,
    defaultLateFee: 30,
    defaultTermDays: 30,
    defaultInterestType: 'simple',
    defaultFrequency: 'monthly',
  };
}
export function saveSettings(settings: AppSettings) {
  const all = get<AppSettings[]>(KEYS.SETTINGS, []);
  const idx = all.findIndex(s => s.userId === settings.userId);
  if (idx >= 0) all[idx] = settings;
  else all.push(settings);
  set(KEYS.SETTINGS, all);
}

// Export / Import
export function exportAllData(userId: string): string {
  const data = {
    clients: getClients(userId),
    loans: getLoans(userId),
    payments: getPayments(userId),
    settings: getSettings(userId),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(userId: string, json: string) {
  const data = JSON.parse(json);
  if (data.clients) {
    const allClients = get<Client[]>(KEYS.CLIENTS, []).filter(c => c.userId !== userId);
    set(KEYS.CLIENTS, [...allClients, ...data.clients.map((c: Client) => ({ ...c, userId }))]);
  }
  if (data.loans) {
    const allLoans = get<Loan[]>(KEYS.LOANS, []).filter(l => l.userId !== userId);
    set(KEYS.LOANS, [...allLoans, ...data.loans.map((l: Loan) => ({ ...l, userId }))]);
  }
  if (data.payments) {
    set(KEYS.PAYMENTS, [...get<Payment[]>(KEYS.PAYMENTS, []), ...data.payments]);
  }
}

// Clear all data for user
export function clearAllData(userId: string) {
  set(KEYS.CLIENTS, get<Client[]>(KEYS.CLIENTS, []).filter(c => c.userId !== userId));
  set(KEYS.LOANS, get<Loan[]>(KEYS.LOANS, []).filter(l => l.userId !== userId));
  set(KEYS.PAYMENTS, get<Payment[]>(KEYS.PAYMENTS, []));
  set(KEYS.SETTINGS, get<AppSettings[]>(KEYS.SETTINGS, []).filter(s => s.userId !== userId));
}

// Generate ID
export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
