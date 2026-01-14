const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require("node:path");

// Importar rutas
const miembroRoutes = require('./src/routes/miembro.routes.js');
const estudianteRoutes = require('./src/routes/estudiante.routes.js');
const profesorRoutes = require('./src/routes/profesor.routes.js');
const egresadoRoutes = require('./src/routes/egresado.routes.js');
const grupoRoutes = require('./src/routes/grupo.routes.js');
const eventoRoutes = require('./src/routes/evento.routes.js');
const conexionRoutes = require('./src/routes/conexion.routes.js');
const authRoutes = require('./src/routes/auth.routes.js');
const empleosRoutes = require('./src/routes/empleos.routes.js');
const marketplaceRoutes = require('./src/routes/marketplace.routes.js');
const alquiler = require('./src/routes/alquiler.routes.js');
const recomendacion = require('./src/routes/recomendacion.routes.js')
const reportes = require('./src/routes/reportes.routes.js');
const admin = require('./src/routes/admin.routes.js');

// Importar controlador de miembro para la ruta de ciudades
const miembroController = require('./src/controllers/miembro.controller.js'); 

const app = express();

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// REGISTRO DE RUTAS
// ==========================================

// 1. Ruta auxiliar de Ciudades (Soluciona el error de ciudad)
app.get('/ciudades', miembroController.getCiudades);

// 2. Rutas Principales (Aquí asignamos los prefijos)
app.use('/miembros', miembroRoutes);      // Conecta con routes/miembro.routes.js
app.use('/estudiantes', estudianteRoutes); // Conecta con routes/estudiante.routes.js
app.use('/profesores', profesorRoutes);
app.use('/egresados', egresadoRoutes);
app.use('/grupos', grupoRoutes);
app.use('/eventos', eventoRoutes);
app.use('/conexiones', conexionRoutes);
app.use('/auth', authRoutes);
app.use('/empleos', empleosRoutes);
app.use('/marketplace', marketplaceRoutes);
app.use('/alquileres', alquiler);
app.use('/recomendaciones', recomendacion);
app.use('/reportes', reportes);
app.use('/admin', admin);
// ==========================================

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor listo en puerto ${PORT}`);
});