import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import SchedulePage from './pages/SchedulePage';
import VacationPage from './pages/VacationPage';
import CollaboratorsPage from './pages/CollaboratorsPage';
import DobrasPage from './pages/DobrasPage';
import TreinamentosPage from './pages/TreinamentosPage';
import RelatoriosPage from './pages/RelatoriosPage';
import LoginPage from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

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
                  <Route path="configuracoes" element={<Navigate to="/colaboradores" replace />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
