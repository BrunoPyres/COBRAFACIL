import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { formatCurrency, calculateInterestSimple, calculateInterestCompound } from '@/lib/utils';

export function Simulator() {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('35');
  const [time, setTime] = useState('30');
  const [timeType, setTimeType] = useState<'days' | 'months'>('days');
  const [type, setType] = useState<'simple' | 'compound'>('simple');
  const [installments, setInstallments] = useState('1');

  const p = parseFloat(principal) || 0;
  const r = parseFloat(rate) || 0;
  const t = timeType === 'months' ? parseFloat(time) || 0 : (parseFloat(time) || 0) / 30;
  const interest = type === 'simple' ? calculateInterestSimple(p, r, t) : calculateInterestCompound(p, r, t);
  const total = p + interest;
  const instCount = parseInt(installments) || 1;

  return (
    <div className="space-y-5 animate-fade-in max-w-xl mx-auto">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(0,200,83,0.1)' }}>
          <Calculator className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
        </div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Simulador de Emprestimos</h1>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Calcule juros e parcelas</p>
      </div>

      <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Valor Principal (R$)</label>
          <input type="number" step="0.01" min="0" value={principal} onChange={e => setPrincipal(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none border font-mono text-base" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            placeholder="1.000,00" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Taxa de Juros (%)</label>
            <input type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border font-mono" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Prazo</label>
            <div className="flex gap-2">
              <input type="number" min="1" value={time} onChange={e => setTime(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none border font-mono" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
              <select value={timeType} onChange={e => setTimeType(e.target.value as any)}
                className="px-2 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                <option value="days">Dias</option>
                <option value="months">Meses</option>
              </select>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tipo de Juros</label>
            <select value={type} onChange={e => setType(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
              <option value="simple">Simples</option>
              <option value="compound">Composto</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Parcelas</label>
            <input type="number" min="1" value={installments} onChange={e => setInstallments(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
          </div>
        </div>
      </div>

      {/* Result */}
      {p > 0 && (
        <div className="rounded-2xl border p-5 space-y-3" style={{ background: 'rgba(0,200,83,0.05)', borderColor: 'var(--accent-primary)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>Resultado</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Principal</p><p className="text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(p)}</p></div>
            <div><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Juros ({type === 'simple' ? 'Simples' : 'Composto'})</p><p className="text-lg font-bold font-mono" style={{ color: 'var(--accent-warning)' }}>{formatCurrency(interest)}</p></div>
          </div>
          <div className="border-t pt-3" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex justify-between items-center">
              <div><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Total</p><p className="text-2xl font-bold font-mono" style={{ color: 'var(--accent-primary)' }}>{formatCurrency(total)}</p></div>
              {instCount > 1 && (
                <div className="text-right"><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{instCount}x de</p><p className="text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(total / instCount)}</p></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
