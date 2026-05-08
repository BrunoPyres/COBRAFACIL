import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Wallet } from 'lucide-react';
import { getLoans, getClients, getPayments } from '@/lib/storage';
import { getSession } from '@/lib/storage';
import { formatCurrency, formatDate } from '@/lib/utils';

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const navigate = useNavigate();

  const session = getSession();
  const userId = session?.userId || '';

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Get loans due dates
  const loans = getLoans(userId);
  const clients = getClients(userId);

  const loansByDate = useMemo(() => {
    const map: Record<string, { id: string; clientName: string; amount: number; status: string; remaining: number }[]> = {};
    loans.forEach(loan => {
      const key = loan.dueDate;
      if (!map[key]) map[key] = [];
      const client = clients.find(c => c.id === loan.clientId);
      const payments = getPayments(userId).filter(p => p.loanId === loan.id);
      const paid = payments.reduce((s, p) => s + p.amount, 0);
      map[key].push({
        id: loan.id,
        clientName: client?.name || 'Desconhecido',
        amount: loan.totalAmount,
        status: loan.status,
        remaining: loan.totalAmount - paid,
      });
    });
    return map;
  }, [loans, clients, userId]);

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Calendário de Vencimentos</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold min-w-[120px] text-center" style={{ color: 'var(--text-primary)' }}>
            {monthNames[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-2 rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-2xl border p-3 lg:p-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(d => (
            <div key={d} className="text-center text-xs font-medium py-2" style={{ color: 'var(--text-tertiary)' }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square rounded-lg" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayLoans = loansByDate[dateStr] || [];
            const hasActive = dayLoans.some(l => l.status === 'active');
            const hasOverdue = dayLoans.some(l => l.status === 'overdue');
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;

            return (
              <button key={day} onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
                className="aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all"
                style={{
                  background: isSelected ? 'rgba(0,200,83,0.2)' : isToday ? 'rgba(0,200,83,0.1)' : 'transparent',
                  border: isToday ? '1px solid var(--accent-primary)' : '1px solid transparent',
                }}>
                <span className="text-sm font-medium" style={{ color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{day}</span>
                {dayLoans.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {hasOverdue && <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-danger)' }} />}
                    {hasActive && <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-primary)' }} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-primary)' }} /><span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Ativo</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-danger)' }} /><span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Atrasado</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-secondary)' }} /><span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Pago</span></div>
        </div>
      </div>

      {/* Selected day details */}
      {selectedDate && loansByDate[selectedDate] && (
        <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Vencimentos em {formatDate(selectedDate)}</h3>
            <button onClick={() => setSelectedDate(null)} className="p-1 rounded" style={{ color: 'var(--text-tertiary)' }}><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-2">
            {loansByDate[selectedDate].map(loan => (
              <div key={loan.id} className="flex items-center justify-between p-3 rounded-xl cursor-pointer" style={{ background: 'var(--bg-tertiary)' }} onClick={() => navigate(`/emprestimos/${loan.id}`)}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: loan.status === 'overdue' ? 'rgba(255,82,82,0.1)' : 'rgba(0,200,83,0.1)' }}>
                    <Wallet className="w-4 h-4" style={{ color: loan.status === 'overdue' ? 'var(--accent-danger)' : 'var(--accent-primary)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{loan.clientName}</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(loan.amount)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold font-mono" style={{ color: loan.remaining > 0 ? 'var(--accent-warning)' : 'var(--accent-primary)' }}>
                    {formatCurrency(loan.remaining)}
                  </p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: loan.status === 'overdue' ? 'rgba(255,82,82,0.1)' : loan.status === 'paid' ? 'rgba(41,121,255,0.1)' : 'rgba(0,200,83,0.1)', color: loan.status === 'overdue' ? 'var(--accent-danger)' : loan.status === 'paid' ? 'var(--accent-secondary)' : 'var(--accent-primary)' }}>
                    {loan.status === 'active' ? 'Ativo' : loan.status === 'overdue' ? 'Atrasado' : 'Pago'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
