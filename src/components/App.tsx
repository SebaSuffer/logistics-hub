import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { Sidebar } from './layout/Sidebar';
import Dashboard from '../pages/dashboard';
import ViajesPage from '../pages/viajes';
import SubirArchivosPage from '../pages/subir-archivos';
import FlotaPage from '../pages/flota';
import ConductoresPage from '../pages/conductores';
import ClientesPage from '../pages/clientes';
import RutasPage from '../pages/rutas';
import TarifariosPage from '../pages/tarifarios';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState('Dashboard');

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    // Redirect to auth page
    window.location.href = '/auth';
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Redirigiendo...</div>
      </div>
    );
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Historial de Viajes':
        return <ViajesPage />;
      case 'Subir Archivos':
        return <SubirArchivosPage />;
      case 'Gestión de Flota':
        return <FlotaPage />;
      case 'Conductores':
        return <ConductoresPage />;
      case 'Clientes':
        return <ClientesPage />;
      case 'Rutas':
        return <RutasPage />;
      case 'Tarifarios':
        return <TarifariosPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      <Sidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        user={user}
        onLogout={handleLogout}
      />
      <div className="flex-1 overflow-y-auto h-full">
        {renderModule()}
      </div>
    </div>
  );
}

