import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Diagnosticos from './Diagnosticos';
import DiagnosticoForm from './DiagnosticoForm';
import DiagnosticoDetalle from './DiagnosticoDetalle';

export default function DiagnosticosRouter() {
  return (
    <Routes>
      <Route index element={<Diagnosticos />} />
      <Route path="nuevo" element={<DiagnosticoForm />} />
      <Route path="editar/:id" element={<DiagnosticoForm />} />
      <Route path=":id" element={<DiagnosticoDetalle />} />
    </Routes>
  );
}

