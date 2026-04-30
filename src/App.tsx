import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import GlobalSearch from '@/components/GlobalSearch';
import { AppLoadingSkeleton } from '@/components/Skeleton';
import { useStore, loadStateFromDb, setStoreToken, forceSetGlobalState, saveStateToDb } from '@/store/useStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';
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

// Восстанавливаем акцент при старте
const _savedAccent = localStorage.getItem('kuhni_pro_accent');
if (_savedAccent && _savedAccent !== 'gold') {
  document.documentElement.setAttribute('data-accent', _savedAccent);
}

export default function App() {
  const [section, setSection] = useState<Section>('home');
  const [stateLoading, setStateLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [openClientId, setOpenClientId] = useState<string | null>(null);
  const [baseSearch, setBaseSearch] = useState<{ tab: 'materials' | 'services'; search: string } | null>(null);
  const [searchClients, setSearchClients] = useState<{
    id: string; last_name: string; first_name: string; middle_name: string;
    phone: string; status: string; reminder_date: string; reminder_note: string;
  }[]>([]);

  const { state, login, logout, getToken } = useAuth();
  const store = useStore();

  // Push-уведомления
  usePushNotifications(searchClients);

  // Загружаем клиентов для поиска и push-уведомлений
  useEffect(() => {
    if (state.status !== 'authenticated') return;
    const token = getToken();
    if (!token) return;
    fetch(`https://functions.poehali.dev/48534318-9b07-4f30-9a75-98efb43248e7/?action=list&token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => setSearchClients(d.clients || []))
      .catch(() => {});
  }, [state.status]);

  // Загружаем state из БД
  useEffect(() => {
    if (state.status !== 'authenticated') return;
    const token = getToken();
    if (!token) return;

    setStoreToken(token);
    setStateLoading(true);

    loadStateFromDb(token).then(dbState => {
      if (dbState) {
        forceSetGlobalState(dbState);
      } else {
        // БД пуста — первый вход, сохраняем то что есть
        saveStateToDb();
      }
      store.patchSkatMaterials('mt2', 'v2');
      setStateLoading(false);
    });
  }, [state.status]);

  if (state.status === 'loading') {
    return <AppLoadingSkeleton />;
  }

  if (state.status === 'unauthenticated') {
    return <LoginPage onLogin={login} />;
  }

  if (stateLoading) {
    return <AppLoadingSkeleton />;
  }

  const user = state.user;
  const token = getToken() || '';

  return (
    <>
      <Layout
        active={section}
        onNav={s => { setSection(s); if (s !== 'clients') setOpenClientId(null); if (s !== 'base') setBaseSearch(null); }}
        user={user}
        onLogout={logout}
        onOpenSearch={() => setShowSearch(true)}
      >
        {section === 'home'     && <HomePage onNav={setSection} />}
        {section === 'clients'  && <ClientsPage openClientId={openClientId} key={openClientId ?? 'clients'} />}
        {section === 'calc'     && <CalcPage />}
        {section === 'blocks'   && <BlocksPage />}
        {section === 'services' && <ServicesPage />}
        {section === 'base'     && <BasePage initialSearch={baseSearch?.search} initialTab={baseSearch?.tab} key={baseSearch ? `${baseSearch.tab}-${baseSearch.search}` : 'base'} />}
        {section === 'expenses' && <ExpensesPage />}
        {section === 'settings' && <SettingsPage />}
        {section === 'users'    && user.role === 'admin' && <AdminPanel currentUser={user} token={token} inline />}
        {section === 'users'    && user.role !== 'admin' && <HomePage onNav={setSection} />}
      </Layout>

      {showSearch && (
        <GlobalSearch
          clients={searchClients}
          onNav={s => setSection(s as Section)}
          onClose={() => setShowSearch(false)}
          onOpenClient={clientId => {
            setOpenClientId(clientId);
            setSection('clients');
          }}
          onOpenBase={(tab, search) => {
            setBaseSearch({ tab, search });
            setSection('base');
          }}
        />
      )}
    </>
  );
}