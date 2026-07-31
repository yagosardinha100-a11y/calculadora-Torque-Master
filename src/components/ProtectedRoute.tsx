import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CalendarDays } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white p-4 font-sans">
        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg animate-bounce mb-3">
          <CalendarDays className="w-8 h-8 text-white" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Restaurando sessão...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
