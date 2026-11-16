// Reduce la foto en el navegador antes de enviarla a la IA.
// Una foto de celular pesa 3-8 MB, y Vercel rechaza cualquier petición de más de 4.5 MB;
// con 1600 px de lado mayor la IA lee igual de bien y el envío pesa unos cientos de KB.
const MAX_BASE64 = 2_800_000;   // margen por debajo del límite del servidor

export const prepararImagen = (archivo, maxLado = 1600) =>
  new Promise((resolve, reject) => {
    if (!archivo.type.startsWith('image/')) {
      reject(new Error('El archivo seleccionado no es una imagen.'));
      return;
    }

    const url = URL.createObjectURL(archivo);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

      // Si aún pesa demasiado, baja la calidad hasta que quepa.
      let dataUrl = '';
      for (const calidad of [0.82, 0.7, 0.55, 0.4]) {
        dataUrl = canvas.toDataURL('image/jpeg', calidad);
        if (dataUrl.length - dataUrl.indexOf(',') - 1 <= MAX_BASE64) break;
      }

      const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
      if (base64.length > MAX_BASE64) {
        reject(new Error('La foto sigue siendo demasiado pesada. Prueba con otra o con menos resolución.'));
        return;
      }

      resolve({
        base64,
        tipoMedia: 'image/jpeg',
        preview: dataUrl,
        kb: Math.round((base64.length * 0.75) / 1024),
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen. Usa una foto JPG o PNG.'));
    };

    img.src = url;
  });
