import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle2, Clock, Receipt, X, DollarSign, Percent, Calendar, RefreshCw } from 'lucide-react';
import { getLoans, getClients, getPaymentsForLoan, savePayment, saveLoan, genId, getSession } from '@/lib/storage';
import { formatCurrency, formatDate, formatDateInput, calculateLateFee, daysOverdue, getToday } from '@/lib/utils';
import { toast } from 'sonner';

const statusCfg: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: 'Ativo', color: 'var(--accent-primary)', icon: Clock },
  paid: { label: 'Quitado', color: 'var(--accent-secondary)', icon: CheckCircle2 },
  overdue: { label: 'Atrasado', color: 'var(--accent-danger)', icon: AlertTriangle },
};

export function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', paymentDate: getToday(), paymentType: 'partial' as 'partial' | 'full', notes: '' });
  const [activeTab, setActiveTab] = useState<'details' | 'payments'>('details');

  const session = getSession();
  const userId = session?.userId || '';

  const loadLoan = () => {
    const l = getLoans(userId).find(l => l.id === id);
    if (!l) { navigate('/emprestimos'); return; }
    const client = getClients(userId).find(c => c.id === l.clientId);
    const payments = getPaymentsForLoan(l.id);
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const remaining = l.totalAmount - totalPaid;
    const lateFee = l.status === 'overdue' ? calculateLateFee(l.dueDate, l.lateFeeDaily) : 0;
    const overdueDays = l.status === 'overdue' ? daysOverdue(l.dueDate) : 0;
    const progress = l.totalAmount > 0 ? Math.min((totalPaid / l.totalAmount) * 100, 100) : 0;
    setLoan({ ...l, clientName: client?.name || '?', clientPhone: client?.phone, payments, totalPaid, remaining, lateFee, overdueDays, progress });
  };

  useEffect(() => { if (id) loadLoan(); }, [id]);

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(payForm.amount);
    if (!amount || amount <= 0) { toast.error('Valor inválido'); return; }
    if (!loan) return;
    if (amount > loan.remaining) { toast.error('Valor excede saldo devedor'); return; }
    savePayment({ id: genId(), loanId: loan.id, amount, paymentDate: payForm.paymentDate, paymentType: payForm.paymentType as any, notes: payForm.notes, createdAt: new Date().toISOString() });
    // Auto update status
    const newTotal = loan.totalPaid + amount;
    if (newTotal >= loan.totalAmount) {
      saveLoan({ ...loan, status: 'paid' });
      toast.success('Empréstimo quitado!');
    } else {
      toast.success('Pagamento registrado!');
    }
    setShowPayment(false);
    setPayForm({ amount: '', paymentDate: getToday(), paymentType: 'partial', notes: '' });
    loadLoan();
  };

  const handleRenew = () => {
    if (!loan || !confirm('Criar renovação deste empréstimo?')) return;
    const newLoan = { ...loan, id: genId(), startDate: getToday(), status: 'active', createdAt: new Date().toISOString() };
    newLoan.dueDate = formatDateInput(new Date(new Date().getTime() + (loan.termDays * 24 * 60 * 60 * 1000)));
    saveLoan(newLoan);
    toast.success('Empréstimo renovado!');
    navigate(`/emprestimos/${newLoan.id}`);
  };

  if (!loan) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-primary)' }} /></div>;

  const cfg = statusCfg[loan.status];
  const StatusIcon = cfg?.icon || Clock;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/emprestimos')} className="p-2 rounded-lg" style={{ color: 'var(--text-tertiary)' }}><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Empréstimo #{loan.id.slice(-4)}</h1>
            <span className="px-2 py-0.5 rounded-lg text-xs font-medium flex items-center gap-1" style={{ background: `${cfg.color}15`, color: cfg.color }}><StatusIcon className="w-3 h-3" />{cfg.label}</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{loan.clientName}</p>
        </div>
        {loan.status !== 'paid' && (
          <button onClick={() => setShowPayment(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: 'var(--accent-primary)', color: '#000' }}><Receipt className="w-3.5 h-3.5" />Pagar</button>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Valor Principal', value: formatCurrency(loan.principalAmount), icon: DollarSign, color: 'var(--text-primary)' },
          { label: `Juros (${loan.interestRate}%)`, value: formatCurrency(loan.interestAmount), icon: Percent, color: 'var(--accent-warning)' },
          { label: 'Total a Pagar', value: formatCurrency(loan.totalAmount), icon: Receipt, color: 'var(--text-primary)' },
          { label: 'Total Pago', value: formatCurrency(loan.totalPaid), icon: CheckCircle2, color: 'var(--accent-primary)' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border p-3" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-1.5 mb-1"><Icon className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} /><span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{card.label}</span></div>
              <p className="text-base font-bold font-mono" style={{ color: card.color }}>{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Balance & Late Fee */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-2xl border p-4" style={{ background: loan.remaining > 0 ? 'var(--bg-secondary)' : 'rgba(0,200,83,0.05)', borderColor: loan.remaining > 0 ? 'var(--border-color)' : 'var(--accent-primary)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Saldo Devedor</p>
          <p className="text-2xl font-bold font-mono mt-1" style={{ color: loan.remaining > 0 ? 'var(--accent-warning)' : 'var(--accent-primary)' }}>{formatCurrency(loan.remaining)}</p>
          <div className="mt-3"><div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${loan.progress}%`, background: loan.progress >= 100 ? 'var(--accent-primary)' : 'var(--accent-secondary)' }} /></div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{loan.progress.toFixed(1)}% quitado</p>
          </div>
        </div>
        {loan.lateFee > 0 ? (
          <div className="rounded-2xl border p-4" style={{ background: 'rgba(255,82,82,0.05)', borderColor: 'var(--accent-danger)' }}>
            <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5" style={{ color: 'var(--accent-danger)' }} /><p className="text-xs font-medium" style={{ color: 'var(--accent-danger)' }}>Multa por Atraso</p></div>
            <p className="text-2xl font-bold font-mono" style={{ color: 'var(--accent-danger)' }}>{formatCurrency(loan.lateFee)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{loan.overdueDays} dias × R$ {loan.lateFeeDaily}/dia</p>
            <p className="text-sm mt-2 font-semibold" style={{ color: 'var(--accent-danger)' }}>Total: {formatCurrency(loan.totalAmount + loan.lateFee)}</p>
          </div>
        ) : (
          <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2 mb-2"><Calendar className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} /><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Informações</p></div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-tertiary)' }}>Início</span><span style={{ color: 'var(--text-primary)' }}>{formatDate(loan.startDate)}</span></div>
              <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-tertiary)' }}>Vencimento</span><span style={{ color: loan.status === 'overdue' ? 'var(--accent-danger)' : 'var(--text-primary)' }}>{formatDate(loan.dueDate)}</span></div>
              <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-tertiary)' }}>Prazo</span><span style={{ color: 'var(--text-primary)' }}>{loan.termDays} {loan.termType === 'months' ? 'meses' : 'dias'}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <button onClick={() => setActiveTab('details')} className="pb-3 text-sm font-medium border-b-2 transition-all" style={{ borderColor: activeTab === 'details' ? 'var(--accent-primary)' : 'transparent', color: activeTab === 'details' ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}>Detalhes</button>
        <button onClick={() => setActiveTab('payments')} className="pb-3 text-sm font-medium border-b-2 transition-all" style={{ borderColor: activeTab === 'payments' ? 'var(--accent-primary)' : 'transparent', color: activeTab === 'payments' ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}>Pagamentos ({loan.payments?.length || 0})</button>
      </div>

      {activeTab === 'details' && (
        <div className="space-y-3">
          <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Dados do Empréstimo</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Cliente</p><p className="text-sm" style={{ color: 'var(--text-primary)' }}>{loan.clientName}</p></div>
              <div><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Telefone</p><p className="text-sm" style={{ color: 'var(--text-primary)' }}>{loan.clientPhone || '-'}</p></div>
              <div><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Tipo de Juros</p><p className="text-sm capitalize" style={{ color: 'var(--text-primary)' }}>{loan.interestType === 'simple' ? 'Simples' : 'Composto'}</p></div>
              <div><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Pagamento</p><p className="text-sm capitalize" style={{ color: 'var(--text-primary)' }}>{loan.paymentType === 'single' ? 'Único' : `Parcelado (${loan.installments}x)`}</p></div>
            </div>
          </div>
          {loan.status !== 'paid' && (
            <button onClick={handleRenew} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border" style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}>
              <RefreshCw className="w-4 h-4" /> Renovar Empréstimo
            </button>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-2">
          {(!loan.payments || loan.payments.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-32 rounded-2xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
              <Receipt className="w-8 h-8 mb-2" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Nenhum pagamento registrado</p>
            </div>
          ) : (
            loan.payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: p.paymentType === 'full' ? 'rgba(0,200,83,0.1)' : 'rgba(41,121,255,0.1)' }}>
                    <Receipt className="w-4 h-4" style={{ color: p.paymentType === 'full' ? 'var(--accent-primary)' : 'var(--accent-secondary)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(p.amount)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{formatDate(p.paymentDate)} · {p.paymentType === 'full' ? 'Quitação' : p.paymentType === 'installment' ? 'Parcela' : 'Parcial'}</p>
                  </div>
                </div>
                {p.notes && <p className="text-xs hidden sm:block" style={{ color: 'var(--text-tertiary)' }}>{p.notes}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border p-5 animate-slide-up" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Registrar Pagamento</h2>
              <button onClick={() => setShowPayment(false)}><X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
            <div className="rounded-xl border p-3 mb-4" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Saldo Devedor</p>
              <p className="text-xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(loan.remaining)}</p>
            </div>
            <form onSubmit={handlePayment} className="space-y-3">
              <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Valor (R$) *</label>
                <input type="number" step="0.01" min="0.01" max={loan.remaining} value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border font-mono" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Data</label>
                  <input type="date" value={payForm.paymentDate} onChange={e => setPayForm({ ...payForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} required /></div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Tipo</label>
                  <select value={payForm.paymentType} onChange={e => setPayForm({ ...payForm, paymentType: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                    <option value="partial">Parcial</option>
                    <option value="full">Quitação</option>
                  </select></div>
              </div>
              <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Observações</label>
                <textarea value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border resize-none" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowPayment(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--accent-primary)', color: '#000' }}>Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
