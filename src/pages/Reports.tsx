import { useMemo, useState } from 'react';
import { TrendingUp, Wallet, Receipt, Calendar, Download } from 'lucide-react';
import { getSession, getLoans, getPayments, getClients, exportAllData } from '@/lib/storage';
import { formatCurrency, generateMonths } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { toast } from 'sonner';

export function Reports() {
  const session = getSession();
  const userId = session?.userId || '';
  const [period, setPeriod] = useState<'6m' | '1y' | 'all'>('6m');

  const data = useMemo(() => {
    const loans = getLoans(userId);
    const payments = getPayments(userId);
    const clients = getClients(userId);

    const months = period === '6m' ? generateMonths(6) : period === '1y' ? generateMonths(12) : generateMonths(24);
    const monthlyData = months.map(({ month, monthLabel }) => {
      const mLoans = loans.filter(l => l.createdAt.startsWith(month));
      const mPayments = payments.filter(p => p.paymentDate.startsWith(month));
      return {
        month: monthLabel,
        emprestimos: mLoans.reduce((s, l) => s + l.principalAmount, 0),
        recebimentos: mPayments.reduce((s, p) => s + p.amount, 0),
        juros: mLoans.reduce((s, l) => s + l.interestAmount, 0),
        quantidade: mLoans.length,
      };
    });

    const totalLoaned = loans.reduce((s, l) => s + l.principalAmount, 0);
    const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
    const totalInterest = loans.reduce((s, l) => s + l.interestAmount, 0);
    const avgTerm = loans.length > 0 ? Math.round(loans.reduce((s, l) => s + l.termDays, 0) / loans.length) : 0;
    const overdue = loans.filter(l => l.status === 'overdue').length;
    const active = loans.filter(l => l.status === 'active').length;

    // Top clients
    const clientMap: Record<string, { name: string; total: number }> = {};
    loans.forEach(l => {
      const c = clients.find(c => c.id === l.clientId);
      if (!clientMap[l.clientId]) clientMap[l.clientId] = { name: c?.name || '?', total: 0 };
      clientMap[l.clientId].total += l.principalAmount;
    });
    const topClients = Object.values(clientMap).sort((a, b) => b.total - a.total).slice(0, 5);

    const statusDist = [
      { name: 'Ativo', value: active, color: '#00C853' },
      { name: 'Quitado', value: loans.filter(l => l.status === 'paid').length, color: '#2979FF' },
      { name: 'Atrasado', value: overdue, color: '#FF5252' },
    ];

    return { monthlyData, totalLoaned, totalReceived, totalInterest, avgTerm, overdue, clientsCount: clients.length, loanCount: loans.length, topClients, statusDist, receiptRate: totalLoaned > 0 ? ((totalReceived / totalLoaned) * 100).toFixed(1) : '0' };
  }, [userId, period]);

  const handleExport = () => {
    const json = exportAllData(userId);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cobrafacil-backup-${getToday()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup exportado!');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Relatórios</h1><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Análise da operação</p></div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
            {([['6m', '6M'], ['1y', '1A'], ['all', 'Tudo']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setPeriod(val)} className="px-3 py-1.5 text-xs font-medium transition-all"
                style={{ background: period === val ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: period === val ? '#000' : 'var(--text-secondary)' }}>{label}</button>
            ))}
          </div>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border" style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}>
            <Download className="w-3.5 h-3.5" />Backup
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { title: 'Total Emprestado', value: formatCurrency(data.totalLoaned), icon: Wallet, color: 'var(--accent-primary)' },
          { title: 'Total Recebido', value: formatCurrency(data.totalReceived), icon: Receipt, color: 'var(--accent-secondary)' },
          { title: 'Juros', value: formatCurrency(data.totalInterest), icon: TrendingUp, color: 'var(--accent-warning)' },
          { title: 'Prazo Médio', value: `${data.avgTerm} dias`, icon: Calendar, color: '#8B5CF6' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="rounded-xl border p-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-1.5 mb-1"><Icon className="w-3.5 h-3.5" style={{ color: card.color }} /><span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{card.title}</span></div>
              <p className="text-lg font-bold font-mono" style={{ color: card.color }}>{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Emprestimos vs Recebimentos</h3>
          <div className="h-[250px]"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlyData}><CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" /><XAxis dataKey="month" tick={{ fill: '#616161', fontSize: 10 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} /><YAxis tick={{ fill: '#616161', fontSize: 10 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} /><Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px', color: '#fff' }} formatter={(v: number) => formatCurrency(v)} /><Legend wrapperStyle={{ color: '#9E9E9E', fontSize: 12 }} /><Bar dataKey="emprestimos" fill="#00C853" radius={[4, 4, 0, 0]} name="Emprestimos" /><Bar dataKey="recebimentos" fill="#2979FF" radius={[4, 4, 0, 0]} name="Recebimentos" /></BarChart>
          </ResponsiveContainer></div>
        </div>
        <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Quantidade de Emprestimos</h3>
          <div className="h-[250px]"><ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.monthlyData}><CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" /><XAxis dataKey="month" tick={{ fill: '#616161', fontSize: 10 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} /><YAxis tick={{ fill: '#616161', fontSize: 10 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} /><Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px', color: '#fff' }} /><Line type="monotone" dataKey="quantidade" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: '#8B5CF6', r: 4 }} name="Quantidade" /></LineChart>
          </ResponsiveContainer></div>
        </div>
      </div>

      {/* Extra stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>Resumo da Carteira</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>Total de Clientes</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{data.clientsCount}</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>Total de Emprestimos</span><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{data.loanCount}</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>Ticket Medio</span><span className="font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(data.loanCount ? data.totalLoaned / data.loanCount : 0)}</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>Taxa Recebimento</span><span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>{data.receiptRate}%</span></div>
            {data.overdue > 0 && <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>Inadimplencia</span><span className="font-semibold" style={{ color: 'var(--accent-danger)' }}>{((data.overdue / (data.loanCount || 1)) * 100).toFixed(1)}%</span></div>}
          </div>
        </div>
        <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>Top Clientes</h3>
          <div className="space-y-2.5">
            {data.topClients.map((c, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2"><span className="text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}>{i + 1}</span><span style={{ color: 'var(--text-secondary)' }}>{c.name}</span></span>
                <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(c.total)}</span>
              </div>
            ))}
            {data.topClients.length === 0 && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Sem dados</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
