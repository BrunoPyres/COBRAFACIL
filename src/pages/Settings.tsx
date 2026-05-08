import { useState, useEffect } from 'react';
import { Building2, Percent, Save, Download, Upload, Trash2, LogOut, AlertTriangle, ChevronRight } from 'lucide-react';
import { getSession, getSettings, saveSettings, exportAllData, importAllData, clearAllData, getUsers } from '@/lib/storage';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function SettingsPage() {
  const navigate = useNavigate();
  const session = getSession();
  const userId = session?.userId || '';
  const [activeTab, setActiveTab] = useState<'business' | 'loan' | 'data'>('business');
  const [form, setForm] = useState({ companyName: '', companyCnpj: '', defaultInterestRate: '35', defaultLateFee: '30', defaultTermDays: '30' });
  const [user, setUser] = useState({ name: '', email: '' });
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    const settings = getSettings(userId);
    setForm({
      companyName: settings.companyName || '',
      companyCnpj: settings.companyCnpj || '',
      defaultInterestRate: String(settings.defaultInterestRate || 35),
      defaultLateFee: String(settings.defaultLateFee || 30),
      defaultTermDays: String(settings.defaultTermDays || 30),
    });
    const users = getUsers();
    const u = users.find(u => u.id === userId);
    if (u) setUser({ name: u.name, email: u.email });
  }, [userId]);

  const handleSave = () => {
    saveSettings({
      userId,
      companyName: form.companyName,
      companyCnpj: form.companyCnpj,
      defaultInterestRate: parseFloat(form.defaultInterestRate) || 35,
      defaultLateFee: parseFloat(form.defaultLateFee) || 30,
      defaultTermDays: parseFloat(form.defaultTermDays) || 30,
      defaultInterestType: 'simple',
      defaultFrequency: 'monthly',
    });
    toast.success('Configuracoes salvas!');
  };

  const handleExport = () => {
    const json = exportAllData(userId);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cobrafacil-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup exportado!');
  };

  const handleImport = async () => {
    if (!importFile) { toast.error('Selecione um arquivo'); return; }
    try {
      const text = await importFile.text();
      importAllData(userId, text);
      toast.success('Dados importados com sucesso!');
      setImportFile(null);
    } catch { toast.error('Arquivo invalido'); }
  };

  const handleClear = () => {
    if (!confirm('ATENCAO: Isso apagara TODOS os dados. Tem certeza?')) return;
    if (!confirm('CONFIRME: Todos os dados serao perdidos. Deseja continuar?')) return;
    clearAllData(userId);
    toast.success('Dados apagados');
  };

  const handleLogout = () => {
    const session = getSession();
    if (session) {
      import('@/lib/storage').then(m => m.clearSession());
    }
    navigate('/login');
  };

  const tabs = [
    { id: 'business' as const, label: 'Empresa', icon: Building2 },
    { id: 'loan' as const, label: 'Emprestimos', icon: Percent },
    { id: 'data' as const, label: 'Dados', icon: Download },
  ];

  return (
    <div className="space-y-5 animate-fade-in max-w-xl">
      <div><h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Configuracoes</h1><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Personalize o sistema</p></div>

      {/* User card */}
      <div className="rounded-2xl border p-4 flex items-center gap-3" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}>
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{user.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ background: activeTab === tab.id ? 'rgba(0,200,83,0.1)' : 'transparent', color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}>
              <Icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'business' && (
        <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-2"><div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,200,83,0.1)' }}><Building2 className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} /></div><div><h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Dados da Empresa</h3><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Informacoes para relatorios</p></div></div>
          <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nome da Empresa</label>
            <input type="text" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
          <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>CNPJ</label>
            <input type="text" value={form.companyCnpj} onChange={e => setForm({ ...form, companyCnpj: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border font-mono" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
          <button onClick={handleSave} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--accent-primary)', color: '#000' }}><Save className="w-4 h-4" />Salvar</button>
        </div>
      )}

      {activeTab === 'loan' && (
        <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-2"><div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(41,121,255,0.1)' }}><Percent className="w-4 h-4" style={{ color: 'var(--accent-secondary)' }} /></div><div><h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Regras de Emprestimo</h3><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Valores padrao</p></div></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Juros (%)</label>
              <input type="number" step="0.01" value={form.defaultInterestRate} onChange={e => setForm({ ...form, defaultInterestRate: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border font-mono" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
            <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Multa (R$)</label>
              <input type="number" value={form.defaultLateFee} onChange={e => setForm({ ...form, defaultLateFee: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border font-mono" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
            <div><label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Prazo (dias)</label>
              <input type="number" value={form.defaultTermDays} onChange={e => setForm({ ...form, defaultTermDays: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
          </div>
          <div className="rounded-lg border p-3" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Exemplo: R$ 1.000 a {form.defaultInterestRate}% = R$ {(1000 * (parseFloat(form.defaultInterestRate) / 100)).toFixed(2)} de juros. Total: R$ {(1000 + (1000 * (parseFloat(form.defaultInterestRate) / 100))).toFixed(2)} em {form.defaultTermDays} dias.</p>
          </div>
          <button onClick={handleSave} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--accent-primary)', color: '#000' }}><Save className="w-4 h-4" />Salvar</button>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="space-y-3">
          <div className="rounded-2xl border p-4 flex items-center gap-3 cursor-pointer" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} onClick={handleExport}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,200,83,0.1)' }}><Download className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} /></div>
            <div className="flex-1"><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Exportar Dados</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Download backup JSON</p></div>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          </div>

          <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(41,121,255,0.1)' }}><Upload className="w-5 h-5" style={{ color: 'var(--accent-secondary)' }} /></div>
              <div className="flex-1"><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Importar Dados</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Restaurar de backup JSON</p></div>
            </div>
            <div className="flex gap-2">
              <input type="file" accept=".json" onChange={e => setImportFile(e.target.files?.[0] || null)}
                className="flex-1 text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#2A2A2A] file:text-[#9E9E9E]" style={{ color: 'var(--text-secondary)' }} />
              <button onClick={handleImport} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ background: 'var(--accent-secondary)', color: '#fff' }}>Importar</button>
            </div>
          </div>

          <div className="rounded-2xl border p-4 flex items-center gap-3 cursor-pointer" style={{ background: 'var(--bg-secondary)', borderColor: 'rgba(255,82,82,0.3)' }} onClick={handleClear}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,82,82,0.1)' }}><Trash2 className="w-5 h-5" style={{ color: 'var(--accent-danger)' }} /></div>
            <div className="flex-1"><p className="text-sm font-medium" style={{ color: 'var(--accent-danger)' }}>Apagar Todos os Dados</p><p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Acao irreversivel</p></div>
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--accent-danger)' }} />
          </div>

          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border mt-4" style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}>
            <LogOut className="w-4 h-4" />Sair da Conta
          </button>
        </div>
      )}
    </div>
  );
}
