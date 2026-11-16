import React, { useState } from 'react';
import { prepararSubidaArchivo, eliminarArchivo } from '../../services/diagnosticoService';

// Helper to get env config
const MAX_MB = Number(import.meta.env.VITE_DIAG_MAX_MB || 10);
const ALLOWED_MIME = (import.meta.env.VITE_DIAG_ALLOWED_MIME || '').split(',').map(s => s.trim());

export default function ArchivoUploader({ diagnosticoId, existingFiles = [], onUpload, onDelete }) {
  const [files, setFiles] = useState(existingFiles);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const selected = Array.from(e.target.files);
    for (const file of selected) {
      // Validations
      if (!ALLOWED_MIME.includes(file.type)) {
        setError(`Tipo no permitido: ${file.type}`);
        continue;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`Archivo supera ${MAX_MB} MB`);
        continue;
      }
      // Prepare upload on backend
      try {
        setUploading(true);
        const tipo = file.type.startsWith('video') ? 'video' : 'imagen';
        const firma = await prepararSubidaArchivo(diagnosticoId, {
          nombre_original: file.name,
          mime: file.type,
          tamano: file.size,
          tipo,
          descripcion: ''
        });
        // Direct PUT to Supabase signed URL
        await fetch(firma.ruta, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
            'Authorization': `Bearer ${firma.token}`
          },
          body: file
        });
        // Notify parent
        const newFile = {
          id_archivo: Date.now(), // provisional id for UI
          ruta: firma.ruta,
          tipo,
          nombre_original: file.name,
          tamano: file.size,
          descripcion: ''
        };
        setFiles((prev) => [...prev, newFile]);
        onUpload && onUpload(newFile);
      } catch (err) {
        setError(err.message || 'Error al subir archivo');
      } finally {
        setUploading(false);
      }
    }
    // Reset input
    e.target.value = null;
  };

  const handleDelete = async (fileId, ruta) => {
    if (!window.confirm('¿Eliminar este archivo?')) return;
    try {
      await eliminarArchivo(diagnosticoId, fileId);
      const filtered = files.filter((f) => f.id_archivo !== fileId);
      setFiles(filtered);
      onDelete && onDelete(fileId);
    } catch (err) {
      setError(err.message || 'Error al eliminar archivo');
    }
  };

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-lg font-medium">Archivos (fotos / videos)</h3>
      {error && <p className="text-red-600">{error}</p>}
      <input
        type="file"
        multiple
        accept={ALLOWED_MIME.join(',')}
        capture="environment"
        onChange={handleFileChange}
        disabled={uploading || !diagnosticoId}
        className="border p-2 rounded w-full"
      />
      <p className="text-sm text-gray-500">Máximo {MAX_MB} MB por archivo.</p>
      <ul className="grid grid-cols-2 gap-4">
        {files.map((f) => (
          <li key={f.id_archivo} className="border p-2 rounded">
            {f.tipo === 'imagen' ? (
              <img src={f.ruta} alt={f.nombre_original} className="object-cover w-full h-32" />
            ) : (
              <video src={f.ruta} controls className="w-full h-32" />
            )}
            <p className="text-xs mt-1 truncate">{f.nombre_original}</p>
            <button
              type="button"
              onClick={() => handleDelete(f.id_archivo, f.ruta)}
              className="mt-1 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
