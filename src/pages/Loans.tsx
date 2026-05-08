import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, Eye, Trash2, AlertTriangle, CheckCircle2, Clock, Wallet } from 'lucide-react';
import { getLoans, getClients, getPayments, saveLoan, deleteLoan, genId, getSettings, getSession } from '@/lib/storage';
import { formatCurrency, formatDate, calculateDueDate, getToday, calculateInterestSimple, calculateInterestCompound, calculateRateFromInterest } from '@/lib/utils';
import { toast } from 'sonner';

const statusOpts = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'paid', label: 'Quitados' },
  { value: 'overdue', label: 'Atrasados' },
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: 'Ativo', color: 'var(--accent-primary)', icon: Clock },
  paid: { label: 'Quitado', color: 'var(--accent-secondary)', icon: CheckCircle2 },
  overdue: { label: 'Atrasado', color: 'var(--accent-danger)', icon: AlertTriangle },
};

export function Loans() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    clientId: '', principalAmount: '', interestRate: '35', interestType: 'simple' as 'simple' | 'compound',
    interestAmount: '', totalAmount: '', termDays: '30', termType: 'days' as 'days' | 'months',
    startDate: getToday(), dueDate: '', paymentType: 'single' as 'single' | 'installments',
    installments: '1', frequency: 'monthly' as 'daily' | 'weekly' | 'biweekly' | 'monthly',
    lateFeeDaily: '30', notes: '',
  });
  const [manualMode, setManualMode] = useState(false);
  const navigate = useNavigate();
  const session = getSession();
  const userId = session?.userId || '';
  const clients = getClients(userId);
  const settings = getSettings(userId);

  const loans = useMemo(() => {
    let list = getLoans(userId);
    if (statusFilter) list = list.filter(l => l.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(l => {
        const c = clients.find(c => c.id === l.clientId);
        return c?.name.toLowerCase().includes(s);
      });
    }
    const payments = getPayments(userId);
    return list.map(l => {
      const c = clients.find(c => c.id === l.clientId);
      const p = payments.filter(pay => pay.loanId === l.id).reduce((s, pay) => s + pay.amount, 0);
      return { ...l, clientName: c?.name || '?', totalPaid: p, remaining: l.totalAmount - p };
    });
  }, [userId, statusFilter, search]);

  const openModal = () => {
    setStep(1);
    setManualMode(false);
    const defaultRate = settings.defaultInterestRate || 35;
    const defaultTerm = settings.defaultTermDays || 30;
    setForm({
      clientId: '', principalAmount: '', interestRate: String(defaultRate), interestType: 'simple',
      interestAmount: '', totalAmount: '', termDays: String(defaultTerm), termType: 'days',
      startDate: getToday(), dueDate: calculateDueDate(getToday(), defaultTerm),
      paymentType: 'single', installments: '1', frequency: settings.defaultFrequency || 'monthly',
      lateFeeDaily: String(settings.defaultLateFee || 30), notes: '',
    });
    setShowModal(true);
  };

  const handleFieldChange = (field: string, value: string) => {
    if (field === 'interestAmount' || field === 'totalAmount') {
      // Manual edit
      setManualMode(true);
      const updates = { ...form, [field]: value };
      if (field === 'totalAmount') {
        // Recalculate interest from total
        const principal = parseFloat(updates.principalAmount) || 0;
        const total = parseFloat(value) || 0;
        updates.interestAmount = total > principal ? String((total - principal).toFixed(2)) : '';
        // Recalculate rate
        const newInterest = total - principal;
        updates.interestRate = principal > 0 ? String(calculateRateFromInterest(principal, newInterest).toFixed(2)) : updates.interestRate;
      }
      if (field === 'interestAmount') {
        // Recalculate total from interest
        const principal = parseFloat(updates.principalAmount) || 0;
        const interestVal = parseFloat(value) || 0;
        updates.totalAmount = String((principal + interestVal).toFixed(2));
        // Recalculate rate
        updates.interestRate = principal > 0 ? String(calculateRateFromInterest(principal, interestVal).toFixed(2)) : updates.interestRate;
      }
      setForm(updates);
    } else if (['principalAmount', 'interestRate', 'interestType', 'termDays', 'termType', 'startDate'].includes(field)) {
      setForm(prev => {
        const base: any = { ...prev, [field]: value };
        // Auto-calc interest when principal/rate changes
        const isRateField = field === 'principalAmount' || field === 'interestRate' || field === 'interestType';
        const isDateField = field === 'termDays' || field === 'termType' || field === 'startDate';
        if (isRateField) {
          const p = parseFloat(base.principalAmount) || 0;
          const r = parseFloat(base.interestRate) || 0;
          let interest: number;
          if (base.interestType === 'compound') {
            const t = parseFloat(base.termDays) || 0;
            const months = base.termType === 'months' ? t : t / 30;
            interest = calculateInterestCompound(p, r, Math.max(months, 1));
          } else {
            interest = calculateInterestSimple(p, r);
          }
          if (!manualMode) {
            base.interestAmount = interest > 0 ? String(interest.toFixed(2)) : '';
            base.totalAmount = (p + interest) > 0 ? String((p + interest).toFixed(2)) : '';
          }
        }
        if (isDateField || isRateField) {
          base.dueDate = calculateDueDate(base.startDate, parseFloat(base.termDays) || 0, base.termType as 'days' | 'months');
        }
        return base;
      });
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) { setStep(step + 1); return; }
    if (!form.clientId) { toast.error('Selecione um cliente'); return; }
    const principal = parseFloat(form.principalAmount) || 0;
    const interest = parseFloat(form.interestAmount) || 0;
    const total = parseFloat(form.totalAmount) || 0;
    if (principal <= 0) { toast.error('Valor principal invalido'); return; }
    if (total <= 0) { toast.error('Valor total invalido'); return; }

    const loanData: any = {
      id: genId(), clientId: form.clientId, userId,
      principalAmount: principal, interestRate: parseFloat(form.interestRate) || 0,
      interestType: form.interestType, interestAmount: interest, totalAmount: total,
      termDays: parseFloat(form.termDays) || 0, termType: form.termType,
      startDate: form.startDate, dueDate: form.dueDate || calculateDueDate(form.startDate, parseFloat(form.termDays) || 0, form.termType as 'days' | 'months'),
      status: 'active', paymentType: form.paymentType, frequency: form.frequency,
      lateFeeDaily: parseFloat(form.lateFeeDaily) || 30, notes: form.notes,
      createdAt: new Date().toISOString(),
    };
    if (form.paymentType === 'installments') {
      loanData.installments = parseInt(form.installments) || 1;
      loanData.installmentAmount = total / loanData.installments;
    }
    saveLoan(loanData);
    toast.success('Emprestimo registrado!');
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Excluir este emprestimo e todos os pagamentos?')) return;
    deleteLoan(id);
    toast.success('Emprestimo excluido!');
  };

  const principal = parseFloat(form.principalAmount) || 0;
  const interest = parseFloat(form.interestAmount) || 0;
  const total = parseFloat(form.totalAmount) || 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Emprestimos</h1><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{loans.length} registros</p></div>
        <button onClick={openModal} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--accent-primary)', color: '#000' }}><Plus className="w-4 h-4" /> Novo Emprestimo</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border flex-1" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..." className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
          {search && <button onClick={() => setSearch('')}><X className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} /></button>}
        </div>
        <div className="flex gap-1">
          {statusOpts.map(o => (
            <button key={o.value} onClick={() => setStatusFilter(o.value)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all border"
              style={{ background: statusFilter === o.value ? 'rgba(0,200,83,0.1)' : 'var(--bg-secondary)', borderColor: statusFilter === o.value ? 'var(--accent-primary)' : 'var(--border-color)', color: statusFilter === o.value ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {loans.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 rounded-2xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <Wallet className="w-10 h-10 mb-2" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Nenhum emprestimo</p>
        </div>
      ) : (
        <div className="space-y-2">
          {loans.map(loan => {
            const cfg = statusConfig[loan.status];
            const Icon = cfg?.icon || Clock;
            return (
              <div key={loan.id} className="rounded-2xl border p-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${cfg?.color}15` }}>
                      <Icon className="w-5 h-5" style={{ color: cfg?.color }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{loan.clientName}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: `${cfg?.color}15`, color: cfg?.color }}>{cfg?.label}</span>
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Vence {formatDate(loan.dueDate)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right"><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total</p><p className="text-sm font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(loan.totalAmount)}</p></div>
                    <div className="text-right"><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Saldo</p><p className="text-sm font-semibold font-mono" style={{ color: loan.remaining > 0 ? 'var(--accent-warning)' : 'var(--accent-primary)' }}>{formatCurrency(loan.remaining)}</p></div>
                    <div className="flex gap-1">
                      <button onClick={() => navigate(`/emprestimos/${loan.id}`)} className="p-2 rounded-lg" style={{ color: 'var(--text-tertiary)' }}><Eye className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(loan.id)} className="p-2 rounded-lg" style={{ color: 'var(--text-tertiary)' }}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg rounded-2xl border p-5 max-h-[85vh] overflow-y-auto" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Novo Emprestimo - Etapa {step}/3</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>

            <div className="flex gap-2 mb-5">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex-1 h-1.5 rounded-full transition-all" style={{ background: s <= step ? 'var(--accent-primary)' : 'var(--bg-tertiary)' }} />
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 && (
                <>
                  <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Cliente *</label>
                    <select value={form.clientId} onChange={e => handleFieldChange('clientId', e.target.value)} required
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                      <option value="">Selecione um cliente</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select></div>
                </>
              )}
              {step === 2 && (
                <>
                  {/* Valor Principal */}
                  <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Valor Principal (R$) *</label>
                    <input type="number" step="0.01" min="0" value={form.principalAmount} onChange={e => handleFieldChange('principalAmount', e.target.value)} required
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border font-mono text-base" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} placeholder="0,00" /></div>

                  {/* Taxa e Tipo */}
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Taxa de Juros (%)</label>
                      <input type="number" step="0.01" min="0" value={form.interestRate} onChange={e => handleFieldChange('interestRate', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border font-mono" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
                    <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tipo de Juros</label>
                      <select value={form.interestType} onChange={e => handleFieldChange('interestType', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                        <option value="simple">Simples (taxa unica)</option>
                        <option value="compound">Composto</option>
                      </select></div>
                  </div>

                  {/* Juros (editavel) */}
                  <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Valor dos Juros (R$) <span style={{ color: 'var(--accent-primary)' }}>- editavel</span></label>
                    <input type="number" step="0.01" min="0" value={form.interestAmount} onChange={e => handleFieldChange('interestAmount', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border font-mono text-base" style={{ background: 'var(--bg-tertiary)', borderColor: manualMode ? 'var(--accent-primary)' : 'var(--border-color)', color: 'var(--text-primary)' }} placeholder="0,00" /></div>

                  {/* Total a Pagar (editavel) */}
                  <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Total a Pagar (R$) <span style={{ color: 'var(--accent-primary)' }}>- editavel</span></label>
                    <input type="number" step="0.01" min="0" value={form.totalAmount} onChange={e => handleFieldChange('totalAmount', e.target.value)} required
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border font-mono text-base font-bold" style={{ background: 'var(--bg-tertiary)', borderColor: manualMode ? 'var(--accent-primary)' : 'var(--border-color)', color: 'var(--accent-primary)' }} placeholder="0,00" /></div>

                  {manualMode && (
                    <div className="rounded-lg border p-2" style={{ background: 'rgba(0,200,83,0.05)', borderColor: 'rgba(0,200,83,0.3)' }}>
                      <p className="text-[10px]" style={{ color: 'var(--accent-primary)' }}>Modo manual ativo. Voce esta editando os valores manualmente.</p>
                    </div>
                  )}

                  {/* Prazo e Vencimento */}
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Prazo</label>
                      <div className="flex gap-2">
                        <input type="number" min="1" value={form.termDays} onChange={e => handleFieldChange('termDays', e.target.value)}
                          className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none border font-mono" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                        <select value={form.termType} onChange={e => handleFieldChange('termType', e.target.value)}
                          className="px-2 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                          <option value="days">Dias</option>
                          <option value="months">Meses</option>
                        </select>
                      </div></div>
                    <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Data Inicio</label>
                      <input type="date" value={form.startDate} onChange={e => handleFieldChange('startDate', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
                  </div>
                  <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Vencimento</label>
                    <input type="date" value={form.dueDate} onChange={e => handleFieldChange('dueDate', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>

                  <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Multa Diaria (R$)</label>
                    <input type="number" value={form.lateFeeDaily} onChange={e => handleFieldChange('lateFeeDaily', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border font-mono" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>

                  {/* Preview */}
                  {principal > 0 && total > 0 && (
                    <div className="rounded-xl border p-4 space-y-2" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
                      <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>Principal</span><span className="font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(principal)}</span></div>
                      <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>Juros ({form.interestRate}% {form.interestType === 'simple' ? '- taxa unica' : '- composto'})</span><span className="font-mono" style={{ color: 'var(--accent-warning)' }}>{formatCurrency(interest)}</span></div>
                      <div className="border-t pt-2 flex justify-between text-sm font-semibold" style={{ borderColor: 'var(--border-color)' }}><span style={{ color: 'var(--text-primary)' }}>Total a Pagar</span><span className="font-mono" style={{ color: 'var(--accent-primary)' }}>{formatCurrency(total)}</span></div>
                      <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>Lucro</span><span className="font-mono" style={{ color: 'var(--accent-secondary)' }}>{formatCurrency(interest)} ({principal > 0 ? ((interest / principal) * 100).toFixed(1) : 0}%)</span></div>
                    </div>
                  )}
                </>
              )}
              {step === 3 && (
                <>
                  <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tipo de Pagamento</label>
                    <select value={form.paymentType} onChange={e => handleFieldChange('paymentType', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                      <option value="single">Pagamento Unico</option>
                      <option value="installments">Parcelado</option>
                    </select></div>
                  {form.paymentType === 'installments' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>N Parcelas</label>
                        <input type="number" min="2" value={form.installments} onChange={e => handleFieldChange('installments', e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
                      <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Frequencia</label>
                        <select value={form.frequency} onChange={e => handleFieldChange('frequency', e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                          <option value="daily">Diaria</option>
                          <option value="weekly">Semanal</option>
                          <option value="biweekly">Quinzenal</option>
                          <option value="monthly">Mensal</option>
                        </select></div>
                    </div>
                  )}
                  {form.paymentType === 'installments' && total > 0 && (
                    <div className="rounded-xl border p-3" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Valor por parcela</p>
                      <p className="text-lg font-bold font-mono" style={{ color: 'var(--accent-primary)' }}>{formatCurrency(total / (parseInt(form.installments) || 1))}</p>
                    </div>
                  )}
                  <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Observacoes</label>
                    <textarea value={form.notes} onChange={e => handleFieldChange('notes', e.target.value)} rows={2}
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border resize-none" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>

                  <div className="rounded-xl border p-4 space-y-1" style={{ background: 'rgba(0,200,83,0.05)', borderColor: 'var(--accent-primary)' }}>
                    <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>Cliente</span><span style={{ color: 'var(--text-primary)' }}>{clients.find(c => c.id === form.clientId)?.name}</span></div>
                    <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>Principal</span><span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(principal)}</span></div>
                    <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>Juros</span><span className="font-mono font-semibold" style={{ color: 'var(--accent-warning)' }}>{formatCurrency(interest)}</span></div>
                    <div className="flex justify-between text-sm font-semibold"><span style={{ color: 'var(--text-primary)' }}>Total a Pagar</span><span className="font-mono" style={{ color: 'var(--accent-primary)' }}>{formatCurrency(total)}</span></div>
                    <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>Vencimento</span><span style={{ color: 'var(--text-primary)' }}>{formatDate(form.dueDate)}</span></div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Voltar</button>}
                <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--accent-primary)', color: '#000' }}>{step < 3 ? 'Proximo' : 'Finalizar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
