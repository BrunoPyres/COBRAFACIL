import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppLayout } from '@/components/AppLayout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { CalendarPage } from '@/pages/Calendar';
import { Clients } from '@/pages/Clients';
import { Loans } from '@/pages/Loans';
import { LoanDetail } from '@/pages/LoanDetail';
import { Payments } from '@/pages/Payments';
import { Reports } from '@/pages/Reports';
import { Simulator } from '@/pages/Simulator';
import { SettingsPage } from '@/pages/Settings';
import { getSession } from '@/lib/storage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return getSession() ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  return !getSession() ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1A1A1A', color: '#fff', border: '1px solid #2A2A2A' }
      }} />
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="calendario" element={<CalendarPage />} />
          <Route path="emprestimos" element={<Loans />} />
          <Route path="emprestimos/:id" element={<LoanDetail />} />
          <Route path="clientes" element={<Clients />} />
          <Route path="pagamentos" element={<Payments />} />
          <Route path="relatorios" element={<Reports />} />
          <Route path="simulador" element={<Simulator />} />
          <Route path="configuracoes" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
