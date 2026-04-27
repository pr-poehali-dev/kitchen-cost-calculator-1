import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useStore, loadStateFromDb, setStoreToken, forceSetGlobalState, saveStateToDb } from '@/store/useStore';
import HomePage from '@/pages/HomePage';
import ClientsPage from '@/clients/ClientsPage';
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

type Section = 'home' | 'clients' | 'calc' | 'blocks' | 'services' | 'base' | 'expenses' | 'settings' | 'users';

export default function App() {
  const [section, setSection] = useState<Section>('home');
  const [stateLoading, setStateLoading] = useState(false);
  const { state, login, logout, getToken } = useAuth();
  const store = useStore();

  // Когда пользователь авторизовался — грузим общий state из БД
  useEffect(() => {
    if (state.status !== 'authenticated') return;
    const token = getToken();
    if (!token) return;

    setStoreToken(token);
    setStateLoading(true);

    loadStateFromDb(token).then(dbState => {
      if (dbState) {
        // В БД есть данные — применяем их всем пользователям
        forceSetGlobalState(dbState);
      } else {
        // БД пустая — первый вход, сохраняем текущий localStorage в БД
        saveStateToDb();
      }
      // Патч СКАТ после загрузки
      store.patchSkatMaterials('mt2', 'v2');
      setStateLoading(false);
    });
  }, [state.status]);

  // Экран загрузки авторизации
  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-[hsl(220,16%,7%)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Icon name="Loader2" size={24} className="animate-spin text-gold" />
          <span className="text-sm text-[hsl(var(--text-muted))]">Загрузка...</span>
        </div>
      </div>
    );
  }

  if (state.status === 'unauthenticated') {
    return <LoginPage onLogin={login} />;
  }

  // Экран загрузки данных из БД
  if (stateLoading) {
    return (
      <div className="min-h-screen bg-[hsl(220,16%,7%)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Icon name="Loader2" size={24} className="animate-spin text-gold" />
          <span className="text-sm text-[hsl(var(--text-muted))]">Загрузка данных...</span>
        </div>
      </div>
    );
  }

  const user = state.user;
  const token = getToken() || '';

  return (
    <Layout active={section} onNav={setSection} user={user} onLogout={logout}>
      {section === 'home'     && <HomePage onNav={setSection} />}
      {section === 'clients'  && <ClientsPage />}
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