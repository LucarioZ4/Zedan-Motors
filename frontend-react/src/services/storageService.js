// Sube el video DIRECTO a Supabase Storage con el permiso firmado que entregó el backend.
// No pasa por Vercel: sus funciones solo aceptan peticiones de hasta 4.5 MB.
// La clave "anon/publishable" es pública por diseño; el permiso real es el token de un solo uso.
export const subirVideoFirmado = async ({ bucket, ruta, token, archivo }) => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const clave = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !clave) {
    throw new Error(
      'Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el frontend (.env).'
    );
  }

  // Se carga solo al subir un video, para no engordar el resto de la aplicación.
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  let contentType = archivo.type;
  if (!contentType) {
    const ext = archivo.name?.split('.').pop()?.toLowerCase();
    const map = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime'
    };
    contentType = map[ext] || 'image/jpeg';
  }

  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(ruta, token, archivo, { contentType });

  if (error) throw new Error(error.message || 'No se pudo subir el video');
};
