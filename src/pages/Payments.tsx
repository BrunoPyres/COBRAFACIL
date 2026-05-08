import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, ArrowRight } from 'lucide-react';
import { getSession, getPayments, getLoans, getClients } from '@/lib/storage';
import { formatCurrency, formatDate } from '@/lib/utils';

export function Payments() {
  const navigate = useNavigate();
  const session = getSession();
  const userId = session?.userId || '';

  const data = useMemo(() => {
    const payments = getPayments(userId);
    const loans = getLoans(userId);
    const clients = getClients(userId);
    return payments.map(p => {
      const loan = loans.find(l => l.id === p.loanId);
      const client = clients.find(c => c.id === loan?.clientId);
      return { ...p, clientName: client?.name || '?', clientPhone: client?.phone };
    });
  }, [userId]);

  const total = data.reduce((s, p) => s + p.amount, 0);
  const thisMonth = new Date().toISOString().substring(0, 7);
  const monthTotal = data.filter(p => p.paymentDate.startsWith(thisMonth)).reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div><h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Pagamentos</h1><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{data.length} registros</p></div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border p-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total Recebido</p>
          <p className="text-xl font-bold font-mono mt-1" style={{ color: 'var(--accent-primary)' }}>{formatCurrency(total)}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Este Mês</p>
          <p className="text-xl font-bold font-mono mt-1" style={{ color: 'var(--accent-secondary)' }}>{formatCurrency(monthTotal)}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Quantidade</p>
          <p className="text-xl font-bold font-mono mt-1" style={{ color: 'var(--text-primary)' }}>{data.length}</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 rounded-2xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <Receipt className="w-10 h-10 mb-2" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Nenhum pagamento</p>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                <th className="text-left px-4 py-3 text-[10px] font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Cliente</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Valor</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium uppercase hidden sm:table-cell" style={{ color: 'var(--text-tertiary)' }}>Data</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium uppercase hidden md:table-cell" style={{ color: 'var(--text-tertiary)' }}>Tipo</th>
                <th className="text-right px-4 py-3 text-[10px] font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}></th>
              </tr></thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {data.map(p => (
                  <tr key={p.id} className="hover:opacity-80 cursor-pointer" onClick={() => navigate(`/emprestimos/${p.loanId}`)}>
                    <td className="px-4 py-3"><div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}>{p.clientName?.charAt(0)?.toUpperCase()}</div>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.clientName}</span>
                    </div></td>
                    <td className="px-4 py-3"><span className="text-sm font-semibold font-mono" style={{ color: 'var(--accent-primary)' }}>{formatCurrency(p.amount)}</span></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(p.paymentDate)}</span></td>
                    <td className="px-4 py-3 hidden md:table-cell"><span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: p.paymentType === 'full' ? 'rgba(0,200,83,0.1)' : 'rgba(41,121,255,0.1)', color: p.paymentType === 'full' ? 'var(--accent-primary)' : 'var(--accent-secondary)' }}>{p.paymentType === 'full' ? 'Quitação' : 'Parcial'}</span></td>
                    <td className="px-4 py-3 text-right"><ArrowRight className="w-4 h-4 inline-block" style={{ color: 'var(--text-tertiary)' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
