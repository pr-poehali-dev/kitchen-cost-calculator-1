import { useState } from 'react';
import Layout from '@/components/Layout';
import HomePage from '@/pages/HomePage';
import CalcPage from '@/pages/CalcPage';
import BlocksPage from '@/pages/BlocksPage';
import ServicesPage from '@/pages/ServicesPage';
import BasePage from '@/pages/BasePage';
import ExpensesPage from '@/pages/ExpensesPage';
import SettingsPage from '@/pages/SettingsPage';

type Section = 'home' | 'calc' | 'blocks' | 'services' | 'base' | 'expenses' | 'settings';

export default function App() {
  const [section, setSection] = useState<Section>('home');

  return (
    <Layout active={section} onNav={setSection}>
      {section === 'home'     && <HomePage />}
      {section === 'calc'     && <CalcPage />}
      {section === 'blocks'   && <BlocksPage />}
      {section === 'services' && <ServicesPage />}
      {section === 'base'     && <BasePage />}
      {section === 'expenses' && <ExpensesPage />}
      {section === 'settings' && <SettingsPage />}
    </Layout>
  );
}
