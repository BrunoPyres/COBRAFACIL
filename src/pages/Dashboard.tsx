import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, TrendingUp, AlertTriangle, Clock, Loader2, CalendarDays
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getSession } from '@/lib/storage';
import { getLoans, getPayments, getClients } from '@/lib/storage';
import { formatCurrency, getToday, formatDate, generateMonths } from '@/lib/utils';

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const session = getSession();
  const userId = session?.userId || '';

  const data = useMemo(() => {
    const loans = getLoans(userId);
    const payments = getPayments(userId);
    const clients = getClients(userId);
    const today = getToday();

    const activeLoans = loans.filter(l => l.status === 'active');
    const overdueLoans = loans.filter(l => l.status === 'overdue');
    const paidLoans = loans.filter(l => l.status === 'paid');

    const capitalInStreet = loans.filter(l => l.status !== 'paid').reduce((s, l) => s + l.principalAmount, 0);
    const totalToReceive = loans.filter(l => l.status !== 'paid').reduce((s, l) => s + l.totalAmount, 0);
    const profit = payments.reduce((s, p) => s + p.amount, 0) - loans.filter(l => l.status === 'paid').reduce((s, l) => s + l.principalAmount, 0);

    const dueToday = loans.filter(l => l.dueDate === today && l.status === 'active').length;
    const dueWeek = loans.filter(l => {
      if (l.status !== 'active') return false;
      const due = new Date(l.dueDate);
      const now = new Date();
      const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7;
    }).length;

    const defaultRate = loans.length > 0 ? (overdueLoans.length / loans.length * 100).toFixed(1) : '0';

    // Monthly chart
    const months = generateMonths(6);
    const monthlyData = months.map(({ month, monthLabel }) => {
      const monthLoans = loans.filter(l => l.createdAt.startsWith(month));
      const monthPayments = payments.filter(p => p.paymentDate.startsWith(month));
      return {
        month: monthLabel,
        emprestimos: monthLoans.reduce((s, l) => s + l.principalAmount, 0),
        recebimentos: monthPayments.reduce((s, p) => s + p.amount, 0),
        quantidade: monthLoans.length,
      };
    });

    // Status donut
    const statusData = [
      { name: 'Ativo', value: activeLoans.length, color: '#00C853' },
      { name: 'Quitado', value: paidLoans.length, color: '#2979FF' },
      { name: 'Atrasado', value: overdueLoans.length, color: '#FF5252' },
    ];

    // Due this week list
    const upcomingDue = loans
      .filter(l => l.status === 'active')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5)
      .map(l => {
        const client = clients.find(c => c.id === l.clientId);
        const remaining = l.totalAmount - payments.filter(p => p.loanId === l.id).reduce((s, p) => s + p.amount, 0);
        return { ...l, clientName: client?.name || 'Desconhecido', remaining };
      });

    return {
      kpi: { capitalInStreet, totalToReceive, profit, defaultRate: parseFloat(defaultRate), dueToday, dueWeek, clientsCount: clients.length, activeLoans: activeLoans.length, overdueLoans: overdueLoans.length },
      monthlyData,
      statusData,
      upcomingDue,
    };
  }, [userId]);

  useEffect(() => { setTimeout(() => setLoading(false), 300); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-primary)' }} />
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[
          { title: 'Capital na Rua', value: formatCurrency(data.kpi.capitalInStreet), icon: Wallet, color: 'var(--accent-primary)', subtitle: 'Emprestado', onClick: () => navigate('/emprestimos') },
          { title: 'A Receber', value: formatCurrency(data.kpi.totalToReceive), icon: TrendingUp, color: 'var(--accent-secondary)', subtitle: 'Total + juros', onClick: () => navigate('/emprestimos') },
          { title: 'Atrasados', value: String(data.kpi.overdueLoans), icon: AlertTriangle, color: 'var(--accent-danger)', subtitle: data.kpi.overdueLoans > 0 ? 'Ação necessária' : 'Tudo certo', onClick: () => navigate('/emprestimos') },
          { title: 'Vencem Hoje', value: String(data.kpi.dueToday), icon: Clock, color: 'var(--accent-warning)', subtitle: 'Empréstimos', onClick: () => navigate('/calendario') },
        ].map(card => {
          const Icon = card.icon;
          return (
            <button key={card.title} onClick={card.onClick}
              className="rounded-2xl border p-4 text-left transition-all hover:opacity-80 w-full"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${card.color}15` }}>
                <Icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
              <p className="text-lg lg:text-xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{card.title}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{card.subtitle}</p>
            </button>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border p-4 lg:p-5" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Evolução Mensal</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyData}>
                <defs>
                  <linearGradient id="gradE" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00C853" stopOpacity={0.3} /><stop offset="95%" stopColor="#00C853" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gradR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2979FF" stopOpacity={0.3} /><stop offset="95%" stopColor="#2979FF" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="month" tick={{ fill: '#616161', fontSize: 11 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} />
                <YAxis tick={{ fill: '#616161', fontSize: 11 }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px', color: '#fff' }} formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="emprestimos" stroke="#00C853" fill="url(#gradE)" strokeWidth={2} name="Empréstimos" />
                <Area type="monotone" dataKey="recebimentos" stroke="#2979FF" fill="url(#gradR)" strokeWidth={2} name="Recebimentos" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border p-4 lg:p-5" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Por Status</h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value">
                  {data.statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {data.statusData.map(item => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming due */}
      <div className="rounded-2xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Próximos Vencimentos</h3>
          <button onClick={() => navigate('/calendario')} className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>Ver calendário</button>
        </div>
        {data.upcomingDue.length === 0 ? (
          <div className="p-6 text-center">
            <CalendarDays className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Nenhum vencimento próximo</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {data.upcomingDue.map(loan => (
              <div key={loan.id} className="flex items-center justify-between p-3 px-4" onClick={() => navigate(`/emprestimos/${loan.id}`)}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}>
                    {loan.clientName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{loan.clientName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Vence {formatDate(loan.dueDate)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold font-mono" style={{ color: 'var(--accent-primary)' }}>{formatCurrency(loan.remaining)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
