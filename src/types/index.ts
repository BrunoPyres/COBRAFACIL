export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface Client {
  id: string;
  userId: string;
  name: string;
  cpf: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  cep?: string;
  notes?: string;
  score: 'good' | 'medium' | 'bad';
  createdAt: string;
}

export interface Loan {
  id: string;
  clientId: string;
  userId: string;
  principalAmount: number;
  interestRate: number;
  interestType: 'simple' | 'compound';
  interestAmount: number;
  totalAmount: number;
  termDays: number;
  termType: 'days' | 'months';
  startDate: string;
  dueDate: string;
  status: 'active' | 'paid' | 'overdue';
  paymentType: 'single' | 'installments';
  installments?: number;
  installmentAmount?: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  lateFeeDaily: number;
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  loanId: string;
  amount: number;
  paymentDate: string;
  paymentType: 'partial' | 'full' | 'installment';
  installmentNumber?: number;
  notes?: string;
  createdAt: string;
}

export interface AppSettings {
  userId: string;
  companyName: string;
  companyCnpj: string;
  defaultInterestRate: number;
  defaultLateFee: number;
  defaultTermDays: number;
  defaultInterestType: 'simple' | 'compound';
  defaultFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
}

export interface DashboardSummary {
  capitalInStreet: number;
  totalToReceive: number;
  totalInterest: number;
  profit: number;
  activeLoans: number;
  paidLoans: number;
  overdueLoans: number;
  defaultRate: number;
  dueToday: number;
  dueThisWeek: number;
  clientsCount: number;
}

export interface MonthlyData {
  month: string;
  monthLabel: string;
  loaned: number;
  received: number;
  interest: number;
  count: number;
}
