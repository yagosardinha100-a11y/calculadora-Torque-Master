import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './data/ThemeProvider';
import { AuthProvider } from './data/AuthProvider';
import { DataProvider } from './data/DataProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import SchedulePage from './pages/SchedulePage';
import CollaboratorsPage from './pages/CollaboratorsPage';
import VacationPage from './pages/VacationPage';
import DobrasPage from './pages/DobrasPage';
import TreinamentosPage from './pages/TreinamentosPage';
import RelatoriosPage from './pages/RelatoriosPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Layout />}>
                  <Route index element={<SchedulePage />} />
                  <Route path="colaboradores" element={<CollaboratorsPage />} />
                  <Route path="ferias" element={<VacationPage />} />
                  <Route path="dobras" element={<DobrasPage />} />
                  <Route path="treinamentos" element={<TreinamentosPage />} />
                  <Route path="relatorios" element={<RelatoriosPage />} />
                  <Route path="configuracoes" element={<SettingsPage />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
