const API_BASE = '/api';

function getToken() { return localStorage.getItem('token'); }

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    return null;
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro');
  return data;
}

// Auth
export const auth = {
  register: (name: string, email: string, password: string) =>
    fetchApi('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email: string, password: string) =>
    fetchApi('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => fetchApi('/auth/me'),
};

// Clients
export const clients = {
  list: () => fetchApi('/clients'),
  create: (data: any) => fetchApi('/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => fetchApi(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => fetchApi(`/clients/${id}`, { method: 'DELETE' }),
};

// Loans
export const loans = {
  list: (params?: { status?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    return fetchApi(`/loans?${query}`);
  },
  get: (id: number) => fetchApi(`/loans/${id}`),
  create: (data: any) => fetchApi('/loans', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => fetchApi(`/loans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => fetchApi(`/loans/${id}`, { method: 'DELETE' }),
  addPayment: (id: number, data: any) => fetchApi(`/loans/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
};

// Payments
export const payments = {
  list: () => fetchApi('/payments'),
};

// Dashboard
export const dashboard = {
  summary: () => fetchApi('/dashboard'),
};

// Migrate
export const migrate = {
  send: (data: any) => fetchApi('/migrate', { method: 'POST', body: JSON.stringify(data) }),
};

import * as XLSX from 'xlsx';

// Export to Excel
export function exportToExcel(data: { clients: any[]; loans: any[]; payments: any[] }) {
  const wb = XLSX.utils.book_new();

  // Clients sheet
  const clientsData = data.clients.map(c => ({
    Nome: c.name,
    CPF: c.cpf || '',
    Telefone: c.phone || '',
    Email: c.email || '',
    Endereco: c.address || '',
    Cidade: c.city || '',
    Estado: c.state || '',
    CEP: c.cep || '',
    Observacoes: c.notes || '',
    'Data Cadastro': c.created_at,
  }));
  const wsClients = XLSX.utils.json_to_sheet(clientsData);
  XLSX.utils.book_append_sheet(wb, wsClients, 'Clientes');

  // Loans sheet
  const loansData = data.loans.map(l => ({
    Cliente: l.client_name || l.clientId,
    'Valor Principal': l.principal_amount,
    'Taxa Juros (%)': l.interest_rate,
    'Tipo Juros': l.interest_type === 'simple' ? 'Simples' : 'Composto',
    'Juros (R$)': l.interest_amount,
    'Total (R$)': l.total_amount,
    Prazo: `${l.term_days} ${l.term_type}`,
    'Data Inicio': l.start_date,
    Vencimento: l.due_date,
    Status: l.status === 'active' ? 'Ativo' : l.status === 'paid' ? 'Quitado' : 'Atrasado',
    Tipo: l.payment_type === 'single' ? 'Unico' : 'Parcelado',
    'Multa Diaria': l.late_fee_daily,
    Observacoes: l.notes || '',
    'Data Cadastro': l.created_at,
  }));
  const wsLoans = XLSX.utils.json_to_sheet(loansData);
  XLSX.utils.book_append_sheet(wb, wsLoans, 'Emprestimos');

  // Payments sheet
  const paymentsData = data.payments.map(p => ({
    Cliente: p.client_name || '',
    'Valor (R$)': p.amount,
    'Data Pagamento': p.payment_date,
    Tipo: p.payment_type === 'full' ? 'Quitacao' : 'Parcial',
    Observacoes: p.notes || '',
  }));
  const wsPayments = XLSX.utils.json_to_sheet(paymentsData);
  XLSX.utils.book_append_sheet(wb, wsPayments, 'Pagamentos');

  XLSX.writeFile(wb, `cobrafacil-relatorio-${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Export to JSON
export function exportToJSON(data: any) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cobrafacil-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default fetchApi;
