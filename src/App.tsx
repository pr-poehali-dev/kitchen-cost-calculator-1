import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useStore } from '@/store/useStore';
import HomePage from '@/pages/HomePage';
import CalcPage from '@/pages/CalcPage';
import BlocksPage from '@/pages/BlocksPage';
import ServicesPage from '@/pages/ServicesPage';
import BasePage from '@/pages/BasePage';
import ExpensesPage from '@/pages/ExpensesPage';
import SettingsPage from '@/pages/SettingsPage';
import LoginPage from '@/auth/LoginPage';
import AdminPanel from '@/auth/AdminPanel';
import { useAuth } from '@/auth/useAuth';
import Icon from '@/components/ui/icon';

type Section = 'home' | 'calc' | 'blocks' | 'services' | 'base' | 'expenses' | 'settings' | 'users';

export default function App() {
  const [section, setSection] = useState<Section>('home');
  const { state, login, logout, getToken } = useAuth();
  const store = useStore();

  // Одноразовый патч: назначить всем материалам СКАТ тип МДФ и поставщика Специалист
  useEffect(() => {
    store.patchSkatMaterials('mt2', 'v2');
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-[hsl(220,16%,7%)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[hsl(var(--text-muted))]">
          <Icon name="Loader2" size={20} className="animate-spin text-gold" />
          <span className="text-sm">Загрузка...</span>
        </div>
      </div>
    );
  }

  if (state.status === 'unauthenticated') {
    return <LoginPage onLogin={login} />;
  }

  const user = state.user;
  const token = getToken() || '';

  return (
    <Layout active={section} onNav={setSection} user={user} onLogout={logout}>
      {section === 'home'     && <HomePage />}
      {section === 'calc'     && <CalcPage />}
      {section === 'blocks'   && <BlocksPage />}
      {section === 'services' && <ServicesPage />}
      {section === 'base'     && <BasePage />}
      {section === 'expenses' && <ExpensesPage />}
      {section === 'settings' && <SettingsPage />}
      {section === 'users'    && user.role === 'admin' && <AdminPanel currentUser={user} token={token} inline />}
      {section === 'users'    && user.role !== 'admin' && <HomePage />}
    </Layout>
  );
}