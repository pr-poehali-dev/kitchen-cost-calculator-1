import { useState } from 'react';
import Layout from '@/components/Layout';
import CalcPage from '@/pages/CalcPage';
import ServicesPage from '@/pages/ServicesPage';
import BasePage from '@/pages/BasePage';
import ExpensesPage from '@/pages/ExpensesPage';
import SettingsPage from '@/pages/SettingsPage';

type Section = 'calc' | 'services' | 'base' | 'expenses' | 'settings';

export default function App() {
  const [section, setSection] = useState<Section>('calc');

  return (
    <Layout active={section} onNav={setSection}>
      {section === 'calc' && <CalcPage />}
      {section === 'services' && <ServicesPage />}
      {section === 'base' && <BasePage />}
      {section === 'expenses' && <ExpensesPage />}
      {section === 'settings' && <SettingsPage />}
    </Layout>
  );
}
