const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../../middleware/auth');
const roles = require('../../middleware/roles');
const iaLimiter = require('./iaLimiter');
const controller = require('./inventarioIa.controller');
const { iaMaxImagenes, iaMaxMb } = require('../../config/env');

// Configuración de multer en memoria
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        files: iaMaxImagenes || 5,
        fileSize: (iaMaxMb || 5) * 1024 * 1024 // MB a bytes
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowedMimes.includes(file.mimetype)) {
            const err = new Error('Solo se permiten imágenes JPEG, PNG o WebP');
            err.code = 'INVALID_MIME_TYPE';
            return cb(err, false);
        }
        cb(null, true);
    }
});

// Middleware para capturar y formatear errores de Multer en JSON 400/413
const handleMulterUpload = (req, res, next) => {
    upload.array('imagenes', iaMaxImagenes || 5)(req, res, (err) => {
        if (!err) return next();

        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({
                    error: `El archivo supera el tamaño máximo permitido de ${iaMaxMb || 5} MB.`
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    error: `Se permite un máximo de ${iaMaxImagenes || 5} imágenes por análisis.`
                });
            }
            return res.status(400).json({ error: `Error al subir imágenes: ${err.message}` });
        }

        if (err.code === 'INVALID_MIME_TYPE' || err.message?.includes('JPEG')) {
            return res.status(400).json({ error: err.message });
        }

        return res.status(400).json({ error: err.message || 'Error al procesar los archivos subidos' });
    });
};

// Roles autorizados
const rolesAutorizados = roles('Administrador', 'Jefe de taller');

// Endpoints
router.get('/estado', auth, rolesAutorizados, controller.getEstado);
router.post('/analizar', auth, rolesAutorizados, iaLimiter, handleMulterUpload, controller.analizar);
router.get('/:id', auth, rolesAutorizados, controller.getById);
router.post('/:id/confirmar', auth, rolesAutorizados, controller.confirmar);
router.post('/:id/descartar', auth, rolesAutorizados, controller.descartar);

module.exports = router;
