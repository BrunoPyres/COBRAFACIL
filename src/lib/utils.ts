import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return formatDateInput(d);
}

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + months);
  return formatDateInput(d);
}

export function calculateDueDate(startDate: string, termDays: number, termType: 'days' | 'months' = 'days'): string {
  if (termType === 'months') return addMonths(startDate, termDays);
  return addDays(startDate, termDays);
}

export function calculateLateFee(dueDate: string, dailyFee: number = 30): number {
  const today = new Date();
  const due = new Date(dueDate + 'T23:59:59');
  if (today <= due) return 0;
  const diffMs = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays * dailyFee;
}

export function calculateInterestSimple(principal: number, rate: number, _time?: number): number {
  // Taxa unica sobre o principal, NAO multiplicada pelo prazo
  return principal * (rate / 100);
}

export function calculateInterestCompound(principal: number, rate: number, time: number): number {
  return principal * Math.pow(1 + rate / 100, time) - principal;
}

export function calculateTotalFromPrincipalAndInterest(principal: number, interest: number): number {
  return principal + interest;
}

export function calculateRateFromInterest(principal: number, interest: number): number {
  if (principal <= 0) return 0;
  return (interest / principal) * 100;
}

export function daysOverdue(dueDate: string): number {
  const today = new Date();
  const due = new Date(dueDate + 'T23:59:59');
  if (today <= due) return 0;
  return Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDaysDiff(a: string, b: string): number {
  const da = new Date(a + 'T12:00:00');
  const db = new Date(b + 'T12:00:00');
  return Math.ceil(Math.abs(da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24));
}

export function getMonthName(monthIdx: number): string {
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return names[monthIdx] || '';
}

export function getToday(): string {
  return formatDateInput(new Date());
}

export function generateMonths(count: number = 6): { month: string; monthLabel: string }[] {
  const result = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const month = d.toISOString().substring(0, 7);
    result.push({ month, monthLabel: `${getMonthName(d.getMonth())}/${d.getFullYear()}` });
  }
  return result;
}

export function getClientScore(clientId: string, payments: any[]): 'good' | 'medium' | 'bad' {
  const clientPayments = payments.filter(p => p.clientId === clientId);
  if (clientPayments.length === 0) return 'good';
  const onTime = clientPayments.filter(p => p.onTime).length;
  const ratio = onTime / clientPayments.length;
  if (ratio >= 0.8) return 'good';
  if (ratio >= 0.5) return 'medium';
  return 'bad';
}
