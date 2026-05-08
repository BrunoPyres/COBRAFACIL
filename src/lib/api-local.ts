import { setToken, setUser, getUser } from './auth';

// Local Storage API - replaces backend for static deployment
const STORAGE_KEYS = {
  USERS: 'gestao_users',
  CLIENTS: 'gestao_clients',
  LOANS: 'gestao_loans',
  PAYMENTS: 'gestao_payments',
  SETTINGS: 'gestao_settings',
  CURRENT_USER: 'gestao_current_user',
};

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorage(key: string, value: any) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Initialize with demo data
function initDemoData() {
  const users = getStorage(STORAGE_KEYS.USERS, []);
  if (users.length === 0) {
    // Create demo user
    const demoUser = {
      id: 1,
      name: 'Administrador',
      email: 'admin@exemplo.com',
      password_hash: 'admin123',
      company_name: 'Minha Empresa',
      created_at: new Date().toISOString(),
    };
    setStorage(STORAGE_KEYS.USERS, [demoUser]);

    // Create demo settings
    setStorage(STORAGE_KEYS.SETTINGS, [{
      id: 1,
      user_id: 1,
      default_interest_rate: 35,
      default_late_fee: 30,
      default_term_days: 30,
      company_name: 'Minha Empresa',
      company_cnpj: '',
      updated_at: new Date().toISOString(),
    }]);

    // Create demo clients
    const demoClients = [
      { id: 1, user_id: 1, name: 'João Silva', cpf: '123.456.789-00', phone: '(11) 98765-4321', email: 'joao@email.com', address: 'Rua A, 123', city: 'São Paulo', state: 'SP', cep: '01000-000', created_at: new Date().toISOString() },
      { id: 2, user_id: 1, name: 'Maria Santos', cpf: '987.654.321-00', phone: '(11) 91234-5678', email: 'maria@email.com', address: 'Rua B, 456', city: 'São Paulo', state: 'SP', cep: '02000-000', created_at: new Date().toISOString() },
      { id: 3, user_id: 1, name: 'Pedro Oliveira', cpf: '456.789.123-00', phone: '(11) 99876-5432', email: 'pedro@email.com', address: 'Rua C, 789', city: 'Rio de Janeiro', state: 'RJ', cep: '20000-000', created_at: new Date().toISOString() },
    ];
    setStorage(STORAGE_KEYS.CLIENTS, demoClients);

    // Create demo loans
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    const nextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

    const demoLoans = [
      {
        id: 1, client_id: 1, user_id: 1,
        principal_amount: 1000, interest_rate: 35, interest_amount: 350,
        total_amount: 1350, term_days: 30,
        start_date: formatDateInput(lastMonth),
        due_date: formatDateInput(yesterday),
        status: 'overdue',
        created_at: lastMonth.toISOString(),
      },
      {
        id: 2, client_id: 2, user_id: 1,
        principal_amount: 2500, interest_rate: 35, interest_amount: 875,
        total_amount: 3375, term_days: 30,
        start_date: formatDateInput(today),
        due_date: formatDateInput(nextWeek),
        status: 'active',
        created_at: today.toISOString(),
      },
      {
        id: 3, client_id: 3, user_id: 1,
        principal_amount: 500, interest_rate: 35, interest_amount: 175,
        total_amount: 675, term_days: 15,
        start_date: formatDateInput(lastMonth),
        due_date: formatDateInput(new Date(lastMonth.getFullYear(), lastMonth.getMonth(), lastMonth.getDate() + 15)),
        status: 'paid',
        created_at: lastMonth.toISOString(),
      },
    ];
    setStorage(STORAGE_KEYS.LOANS, demoLoans);

    // Create demo payments
    const demoPayments = [
      { id: 1, loan_id: 3, amount: 675, payment_date: formatDateInput(today), payment_type: 'full', notes: 'Pagamento total', created_at: today.toISOString() },
      { id: 2, loan_id: 1, amount: 350, payment_date: formatDateInput(today), payment_type: 'partial', notes: 'Primeira parcela', created_at: today.toISOString() },
    ];
    setStorage(STORAGE_KEYS.PAYMENTS, demoPayments);
  }
}

function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

initDemoData();

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Auth API
export const auth = {
  async login(email: string, password: string) {
    await delay(300);
    const users = getStorage<any[]>(STORAGE_KEYS.USERS, []);
    const user = users.find(u => u.email === email && u.password_hash === password);
    if (!user) throw new Error('Email ou senha incorretos');
    const token = 'token-' + user.id + '-' + Date.now();
    setToken(token);
    setUser({ id: user.id, name: user.name, email: user.email, company_name: user.company_name });
    return { token, user: { id: user.id, name: user.name, email: user.email, company_name: user.company_name } };
  },

  async register(name: string, email: string, password: string, company_name?: string) {
    await delay(300);
    const users = getStorage<any[]>(STORAGE_KEYS.USERS, []);
    if (users.find(u => u.email === email)) throw new Error('Email já cadastrado');
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      name, email, password_hash: password, company_name: company_name || null,
      created_at: new Date().toISOString(),
    };
    users.push(newUser);
    setStorage(STORAGE_KEYS.USERS, users);

    // Create settings for user
    const allSettings = getStorage<any[]>(STORAGE_KEYS.SETTINGS, []);
    allSettings.push({
      id: allSettings.length > 0 ? Math.max(...allSettings.map(s => s.id)) + 1 : 1,
      user_id: newUser.id,
      default_interest_rate: 35,
      default_late_fee: 30,
      default_term_days: 30,
      company_name: company_name || '',
      company_cnpj: '',
      updated_at: new Date().toISOString(),
    });
    setStorage(STORAGE_KEYS.SETTINGS, allSettings);

    const token = 'token-' + newUser.id + '-' + Date.now();
    setToken(token);
    setUser({ id: newUser.id, name: newUser.name, email: newUser.email, company_name: newUser.company_name });
    return { token, user: { id: newUser.id, name: newUser.name, email: newUser.email, company_name: newUser.company_name } };
  },

  async me() {
    await delay(100);
    const user = getUser();
    if (!user) throw new Error('Não autenticado');
    return user;
  },
};

// Dashboard API
export const dashboard = {
  async summary() {
    await delay(200);
    const user = getUser();
    if (!user) throw new Error('Não autenticado');

    const allLoans = getStorage<any[]>(STORAGE_KEYS.LOANS, []).filter(l => l.user_id === user.id);
    const allPayments = getStorage<any[]>(STORAGE_KEYS.PAYMENTS, []);

    // Update overdue status
    const today = formatDateInput(new Date());
    allLoans.forEach(loan => {
      if (loan.status === 'active' && loan.due_date < today) {
        loan.status = 'overdue';
      }
    });
    setStorage(STORAGE_KEYS.LOANS, allLoans);

    const activeLoans = allLoans.filter(l => l.status === 'active' || l.status === 'overdue');
    const overdueLoans = allLoans.filter(l => l.status === 'overdue');

    const currentMonth = today.substring(0, 7);
    const receivedThisMonth = allPayments
      .filter(p => p.payment_date.startsWith(currentMonth))
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalActiveLoans: activeLoans.reduce((sum, l) => sum + l.total_amount, 0),
      totalPrincipal: activeLoans.reduce((sum, l) => sum + l.principal_amount, 0),
      receivedThisMonth,
      overdueCount: overdueLoans.length,
      overdueAmount: overdueLoans.reduce((sum, l) => sum + l.total_amount, 0),
      activeCount: allLoans.filter(l => l.status === 'active').length,
      dueToday: allLoans.filter(l => l.due_date === today && l.status === 'active').length,
      outstandingBalance: activeLoans.reduce((sum, l) => sum + l.total_amount, 0) - totalPaid,
      defaultRate: activeLoans.length > 0 ? parseFloat(((overdueLoans.length / activeLoans.length) * 100).toFixed(1)) : 0,
      totalPaid,
    };
  },

  async chartData() {
    await delay(200);
    const user = getUser();
    if (!user) throw new Error('Não autenticado');

    const allLoans = getStorage<any[]>(STORAGE_KEYS.LOANS, []).filter(l => l.user_id === user.id);
    const allPayments = getStorage<any[]>(STORAGE_KEYS.PAYMENTS, []);

    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(d.toISOString().substring(0, 7));
    }

    const monthlyData = months.map(month => {
      const monthLoans = allLoans.filter(l => l.created_at.startsWith(month));
      const monthPayments = allPayments.filter(p => p.payment_date.startsWith(month));
      return {
        month: month.substring(5) + '/' + month.substring(0, 4),
        emprestimos: monthLoans.reduce((sum, l) => sum + l.principal_amount, 0),
        recebimentos: monthPayments.reduce((sum, p) => sum + p.amount, 0),
        quantidade: monthLoans.length,
      };
    });

    const statusData = [
      { name: 'Ativo', value: allLoans.filter(l => l.status === 'active').length, color: '#00D4AA' },
      { name: 'Quitado', value: allLoans.filter(l => l.status === 'paid').length, color: '#3B82F6' },
      { name: 'Atrasado', value: allLoans.filter(l => l.status === 'overdue').length, color: '#EF4444' },
    ];

    return { monthlyData, statusData };
  },
};

// Clients API
export const clients = {
  async list(params?: { search?: string; status?: string }) {
    await delay(200);
    const user = getUser();
    if (!user) throw new Error('Não autenticado');

    let clientList = getStorage<any[]>(STORAGE_KEYS.CLIENTS, []).filter(c => c.user_id === user.id);

    if (params?.search) {
      const search = params.search.toLowerCase();
      clientList = clientList.filter(c =>
        c.name.toLowerCase().includes(search) || (c.cpf && c.cpf.includes(search))
      );
    }

    const allLoans = getStorage<any[]>(STORAGE_KEYS.LOANS, []);
    const allPayments = getStorage<any[]>(STORAGE_KEYS.PAYMENTS, []);

    clientList = clientList.map(client => {
      const clientLoans = allLoans.filter(l => l.client_id === client.id);
      const activeLoans = clientLoans.filter(l => l.status === 'active' || l.status === 'overdue');
      const totalPaid = allPayments
        .filter(p => clientLoans.some(l => l.id === p.loan_id))
        .reduce((sum, p) => sum + p.amount, 0);
      return {
        ...client,
        active_loans: activeLoans.length,
        total_due: activeLoans.reduce((sum, l) => sum + l.total_amount, 0),
        total_paid: totalPaid,
      };
    });

    return clientList;
  },

  async get(id: number) {
    await delay(100);
    const clientList = getStorage<any[]>(STORAGE_KEYS.CLIENTS, []);
    return clientList.find(c => c.id === id);
  },

  async create(data: any) {
    await delay(200);
    const user = getUser();
    const clientList = getStorage<any[]>(STORAGE_KEYS.CLIENTS, []);
    const newClient = {
      id: clientList.length > 0 ? Math.max(...clientList.map(c => c.id)) + 1 : 1,
      user_id: user?.id,
      ...data,
      created_at: new Date().toISOString(),
    };
    clientList.push(newClient);
    setStorage(STORAGE_KEYS.CLIENTS, clientList);
    return newClient;
  },

  async update(id: number, data: any) {
    await delay(200);
    const clientList = getStorage<any[]>(STORAGE_KEYS.CLIENTS, []);
    const index = clientList.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Cliente não encontrado');
    clientList[index] = { ...clientList[index], ...data };
    setStorage(STORAGE_KEYS.CLIENTS, clientList);
    return clientList[index];
  },

  async delete(id: number) {
    await delay(200);
    const clientList = getStorage<any[]>(STORAGE_KEYS.CLIENTS, []);
    const allLoans = getStorage<any[]>(STORAGE_KEYS.LOANS, []);
    if (allLoans.some(l => l.client_id === id)) throw new Error('Não é possível excluir cliente com empréstimos');
    setStorage(STORAGE_KEYS.CLIENTS, clientList.filter(c => c.id !== id));
    return { success: true };
  },
};

// Loans API
export const loans = {
  async list(params?: { status?: string; client_id?: number }) {
    await delay(200);
    const user = getUser();
    if (!user) throw new Error('Não autenticado');

    let loanList = getStorage<any[]>(STORAGE_KEYS.LOANS, []).filter(l => l.user_id === user.id);
    if (params?.status) loanList = loanList.filter(l => l.status === params.status);
    if (params?.client_id) loanList = loanList.filter(l => l.client_id === params.client_id);

    const allPayments = getStorage<any[]>(STORAGE_KEYS.PAYMENTS, []);
    const allClients = getStorage<any[]>(STORAGE_KEYS.CLIENTS, []);

    const today = new Date();

    loanList = loanList.map(loan => {
      const client = allClients.find(c => c.id === loan.client_id);
      const payments = allPayments.filter(p => p.loan_id === loan.id);
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const dueDate = new Date(loan.due_date);
      let lateFee = 0;
      let daysOverdue = 0;

      if (loan.status === 'overdue' || (loan.status === 'active' && dueDate < today)) {
        const diffTime = today.getTime() - dueDate.getTime();
        daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        lateFee = daysOverdue * 30;
      }

      return {
        ...loan,
        client_name: client?.name,
        client_phone: client?.phone,
        total_paid: totalPaid,
        late_fee: lateFee,
        days_overdue: daysOverdue,
        remaining_balance: loan.total_amount - totalPaid,
      };
    });

    return loanList;
  },

  async get(id: number) {
    await delay(100);
    const loanList = getStorage<any[]>(STORAGE_KEYS.LOANS, []);
    const allPayments = getStorage<any[]>(STORAGE_KEYS.PAYMENTS, []);
    const allClients = getStorage<any[]>(STORAGE_KEYS.CLIENTS, []);

    const loan = loanList.find(l => l.id === id);
    if (!loan) throw new Error('Empréstimo não encontrado');

    const client = allClients.find(c => c.id === loan.client_id);
    const payments = allPayments.filter(p => p.loan_id === loan.id);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    const today = new Date();
    const dueDate = new Date(loan.due_date);
    let lateFee = 0;
    let daysOverdue = 0;

    if (loan.status === 'overdue' || (loan.status === 'active' && dueDate < today)) {
      const diffTime = today.getTime() - dueDate.getTime();
      daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      lateFee = daysOverdue * 30;
    }

    return {
      ...loan,
      client_name: client?.name,
      client_phone: client?.phone,
      client_cpf: client?.cpf,
      payments,
      total_paid: totalPaid,
      late_fee: lateFee,
      days_overdue: daysOverdue,
      remaining_balance: loan.total_amount - totalPaid,
      total_with_late_fee: loan.total_amount + lateFee,
    };
  },

  async create(data: any) {
    await delay(200);
    const loanList = getStorage<any[]>(STORAGE_KEYS.LOANS, []);
    const user = getUser();

    const interestAmount = data.principal_amount * (data.interest_rate / 100);
    const totalAmount = data.principal_amount + interestAmount;

    const newLoan = {
      id: loanList.length > 0 ? Math.max(...loanList.map(l => l.id)) + 1 : 1,
      user_id: user?.id,
      principal_amount: data.principal_amount,
      interest_rate: data.interest_rate,
      interest_amount: interestAmount,
      total_amount: totalAmount,
      term_days: data.term_days,
      start_date: data.start_date,
      due_date: data.due_date,
      status: 'active',
      created_at: new Date().toISOString(),
      client_id: data.client_id,
    };
    loanList.push(newLoan);
    setStorage(STORAGE_KEYS.LOANS, loanList);

    const clients = getStorage<any[]>(STORAGE_KEYS.CLIENTS, []);
    const client = clients.find(c => c.id === data.client_id);
    return { ...newLoan, client_name: client?.name };
  },

  async update(id: number, data: any) {
    await delay(200);
    const loanList = getStorage<any[]>(STORAGE_KEYS.LOANS, []);
    const index = loanList.findIndex(l => l.id === id);
    if (index === -1) throw new Error('Empréstimo não encontrado');

    const loan = loanList[index];
    if (data.principal_amount !== undefined || data.interest_rate !== undefined) {
      const p = data.principal_amount !== undefined ? data.principal_amount : loan.principal_amount;
      const r = data.interest_rate !== undefined ? data.interest_rate : loan.interest_rate;
      data.interest_amount = p * (r / 100);
      data.total_amount = p + data.interest_amount;
    }

    loanList[index] = { ...loan, ...data };
    setStorage(STORAGE_KEYS.LOANS, loanList);
    return loanList[index];
  },

  async delete(id: number) {
    await delay(200);
    const loanList = getStorage<any[]>(STORAGE_KEYS.LOANS, []);
    const allPayments = getStorage<any[]>(STORAGE_KEYS.PAYMENTS, []);
    setStorage(STORAGE_KEYS.PAYMENTS, allPayments.filter(p => p.loan_id !== id));
    setStorage(STORAGE_KEYS.LOANS, loanList.filter(l => l.id !== id));
    return { success: true };
  },

  async addPayment(loanId: number, data: any) {
    await delay(200);
    const allPayments = getStorage<any[]>(STORAGE_KEYS.PAYMENTS, []);
    const loanList = getStorage<any[]>(STORAGE_KEYS.LOANS, []);
    const loan = loanList.find(l => l.id === loanId);
    if (!loan) throw new Error('Empréstimo não encontrado');

    const currentPayments = allPayments.filter(p => p.loan_id === loanId);
    const currentTotal = currentPayments.reduce((sum, p) => sum + p.amount, 0);

    if (data.amount > loan.total_amount - currentTotal) {
      throw new Error('Valor do pagamento excede o saldo devedor');
    }

    const newPayment = {
      id: allPayments.length > 0 ? Math.max(...allPayments.map(p => p.id)) + 1 : 1,
      loan_id: loanId,
      amount: data.amount,
      payment_date: data.payment_date,
      payment_type: data.payment_type,
      notes: data.notes,
      created_at: new Date().toISOString(),
    };
    allPayments.push(newPayment);
    setStorage(STORAGE_KEYS.PAYMENTS, allPayments);

    const newTotal = currentTotal + data.amount;
    if (newTotal >= loan.total_amount) {
      loan.status = 'paid';
      setStorage(STORAGE_KEYS.LOANS, loanList);
    }

    return newPayment;
  },
};

// Payments API
export const payments = {
  async list() {
    await delay(200);
    const user = getUser();
    if (!user) throw new Error('Não autenticado');

    const allPayments = getStorage<any[]>(STORAGE_KEYS.PAYMENTS, []);
    const allLoans = getStorage<any[]>(STORAGE_KEYS.LOANS, []).filter(l => l.user_id === user.id);
    const allClients = getStorage<any[]>(STORAGE_KEYS.CLIENTS, []);

    return allPayments
      .filter(p => allLoans.some(l => l.id === p.loan_id))
      .map(p => {
        const loan = allLoans.find(l => l.id === p.loan_id);
        const client = allClients.find(c => c.id === loan?.client_id);
        return {
          ...p,
          client_id: loan?.client_id,
          client_name: client?.name,
          principal_amount: loan?.principal_amount,
          total_amount: loan?.total_amount,
        };
      })
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  },
};

// Settings API
export const settings = {
  async get() {
    await delay(100);
    const user = getUser();
    if (!user) throw new Error('Não autenticado');

    const allSettings = getStorage<any[]>(STORAGE_KEYS.SETTINGS, []);
    let setting = allSettings.find(s => s.user_id === user.id);
    if (!setting) {
      setting = {
        id: allSettings.length > 0 ? Math.max(...allSettings.map(s => s.id)) + 1 : 1,
        user_id: user.id,
        default_interest_rate: 35,
        default_late_fee: 30,
        default_term_days: 30,
        company_name: '',
        company_cnpj: '',
        updated_at: new Date().toISOString(),
      };
      allSettings.push(setting);
      setStorage(STORAGE_KEYS.SETTINGS, allSettings);
    }
    return setting;
  },

  async update(data: any) {
    await delay(200);
    const user = getUser();
    if (!user) throw new Error('Não autenticado');

    const allSettings = getStorage<any[]>(STORAGE_KEYS.SETTINGS, []);
    const index = allSettings.findIndex(s => s.user_id === user.id);
    if (index === -1) throw new Error('Configurações não encontradas');

    allSettings[index] = { ...allSettings[index], ...data, updated_at: new Date().toISOString() };
    setStorage(STORAGE_KEYS.SETTINGS, allSettings);
    return allSettings[index];
  },
};

export default { auth, dashboard, clients, loans, payments, settings };
