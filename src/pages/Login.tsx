import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HandCoins, Loader2, Eye, EyeOff } from 'lucide-react';
import { saveUser, findUserByEmail, setSession } from '@/lib/storage';
import { genId } from '@/lib/storage';
import { toast } from 'sonner';

export function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) { toast.error('Nome é obrigatório'); setLoading(false); return; }
        const existing = findUserByEmail(email);
        if (existing) { toast.error('Email já cadastrado'); setLoading(false); return; }
        const newUser = { id: genId(), name, email, password, createdAt: new Date().toISOString() };
        saveUser(newUser);
        setSession(newUser.id);
        toast.success('Conta criada!');
        navigate('/');
      } else {
        const user = findUserByEmail(email);
        if (!user || user.password !== password) {
          toast.error('Email ou senha incorretos');
          setLoading(false);
          return;
        }
        setSession(user.id);
        toast.success('Bem-vindo!');
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0A0A0A 0%, #0D1F0D 50%, #0A0A0A 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--accent-primary)' }}>
            <HandCoins className="w-9 h-9 text-black" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>CobraFácil</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {isRegister ? 'Crie sua conta gratuita' : 'Sistema de Gestão de Empréstimos'}
          </p>
        </div>

        <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome completo</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none border transition-colors focus:border-green-500"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="Seu nome" required />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none border transition-colors focus:border-green-500"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="seu@email.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Senha</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-10 rounded-xl text-sm outline-none border transition-colors focus:border-green-500"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="••••••" required minLength={4} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
              style={{ background: 'var(--accent-primary)', color: '#000', opacity: loading ? 0.7 : 1 }}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isRegister ? 'Criar Conta' : 'Entrar'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button onClick={() => setIsRegister(!isRegister)} className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>
              {isRegister ? 'Já tem conta? Entrar' : 'Criar nova conta'}
            </button>
          </div>
        </div>

        {/* Demo data hint */}
        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-tertiary)' }}>
          Seus dados ficam no seu dispositivo. Você tem controle total.
        </p>
      </div>
    </div>
  );
}
