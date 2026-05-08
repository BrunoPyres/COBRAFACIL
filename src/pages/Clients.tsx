import { useState, useMemo } from 'react';
import { Search, Plus, X, Pencil, Trash2, Phone, MapPin, User } from 'lucide-react';
import { getClients, saveClient, deleteClient, getLoans, getPayments, genId, getSession } from '@/lib/storage';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export function Clients() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [form, setForm] = useState({ name: '', cpf: '', phone: '', email: '', address: '', city: '', state: '', cep: '', notes: '' });
  const session = getSession();
  const userId = session?.userId || '';

  const clients = useMemo(() => {
    let list = getClients(userId);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(s) || c.cpf?.includes(s));
    }
    const loans = getLoans(userId);
    const payments = getPayments(userId);
    return list.map(c => {
      const cLoans = loans.filter(l => l.clientId === c.id);
      const activeLoans = cLoans.filter(l => l.status !== 'paid');
      const totalPaid = payments.filter(p => cLoans.some(l => l.id === p.loanId)).reduce((s, p) => s + p.amount, 0);
      const totalDue = activeLoans.reduce((s, l) => s + l.totalAmount, 0);
      return { ...c, activeLoans: activeLoans.length, totalDue: totalDue - totalPaid > 0 ? totalDue - totalPaid : 0 };
    });
  }, [userId, search]);

  const openModal = (client?: any) => {
    if (client) {
      setEditingClient(client);
      setForm({ name: client.name, cpf: client.cpf || '', phone: client.phone || '', email: client.email || '', address: client.address || '', city: client.city || '', state: client.state || '', cep: client.cep || '', notes: client.notes || '' });
    } else {
      setEditingClient(null);
      setForm({ name: '', cpf: '', phone: '', email: '', address: '', city: '', state: '', cep: '', notes: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    const clientData = { ...form, userId, score: 'good' as const, createdAt: new Date().toISOString() };
    if (editingClient) {
      saveClient({ ...editingClient, ...clientData });
      toast.success('Cliente atualizado!');
    } else {
      saveClient({ id: genId(), ...clientData });
      toast.success('Cliente cadastrado!');
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Excluir este cliente?')) return;
    const loans = getLoans(userId).filter(l => l.clientId === id);
    if (loans.length > 0) { toast.error('Cliente tem empréstimos. Exclua-os primeiro.'); return; }
    deleteClient(id);
    toast.success('Cliente excluído!');
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Clientes</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{clients.length} cadastrados</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--accent-primary)', color: '#000' }}>
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou CPF..."
          className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
        {search && <button onClick={() => setSearch('')}><X className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} /></button>}
      </div>

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 rounded-2xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <User className="w-10 h-10 mb-2" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Nenhum cliente encontrado</p>
          <button onClick={() => openModal()} className="mt-2 text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>Cadastrar primeiro</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {clients.map(c => (
            <div key={c.id} className="rounded-2xl border p-4 group" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{c.name}</h3>
                    {c.cpf && <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{c.cpf}</p>}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(c)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-tertiary)' }}><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-tertiary)' }}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="space-y-1.5 mb-3">
                {c.phone && <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}><Phone className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />{c.phone}</div>}
                {c.city && <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}><MapPin className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />{c.city}{c.state ? `, ${c.state}` : ''}</div>}
              </div>
              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <div><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Empréstimos ativos</p><p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{c.activeLoans}</p></div>
                <div className="text-right"><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Total devido</p><p className="text-sm font-semibold font-mono" style={{ color: 'var(--accent-primary)' }}>{formatCurrency(c.totalDue)}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg rounded-2xl border p-6 max-h-[85vh] overflow-y-auto" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nome *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>CPF</label>
                  <input type="text" value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border font-mono" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Telefone</label>
                  <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
              </div>
              <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
              <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Endereço</label>
                <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Cidade</label>
                  <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>UF</label>
                  <input type="text" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} maxLength={2}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
                <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>CEP</label>
                  <input type="text" value={form.cep} onChange={e => setForm({ ...form, cep: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border font-mono" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
              </div>
              <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Observações</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border resize-none" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--accent-primary)', color: '#000' }}>{editingClient ? 'Salvar' : 'Cadastrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
