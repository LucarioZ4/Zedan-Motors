import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Clientes from './pages/Clientes/Clientes';

function ModulePlaceholder({ title }) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '14px',
      padding: '40px',
      border: '1px solid #e2e8f0',
      textAlign: 'center'
    }}>
      <h2 style={{ color: '#1e3a8a', marginBottom: '8px' }}>Módulo de {title}</h2>
      <p style={{ color: '#64748b' }}>Próximamente disponible en la migración a React.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Rutas Protegidas dentro de MainLayout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="vehiculos" element={<ModulePlaceholder title="Vehículos" />} />
          <Route path="empleados" element={<ModulePlaceholder title="Empleados" />} />
          <Route path="servicios" element={<ModulePlaceholder title="Servicios" />} />
          <Route path="citas" element={<ModulePlaceholder title="Citas" />} />
          <Route path="ordenes" element={<ModulePlaceholder title="Órdenes" />} />
          <Route path="inventario" element={<ModulePlaceholder title="Inventario" />} />
          <Route path="facturacion" element={<ModulePlaceholder title="Facturación" />} />
          <Route path="historial" element={<ModulePlaceholder title="Historial" />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
