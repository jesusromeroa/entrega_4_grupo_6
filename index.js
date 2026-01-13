const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Importar rutas
const miembroRoutes = require('./src/routes/miembro.routes');
const estudianteRoutes = require('./src/routes/estudiante.routes');
const profesorRoutes = require('./src/routes/profesor.routes');
const egresadoRoutes = require('./src/routes/egresado.routes');
const grupoRoutes = require('./src/routes/grupo.routes');
const eventoRoutes = require('./src/routes/evento.routes');
const conexionRoutes = require('./src/routes/conexion.routes');

// Importar controlador de miembro para la ruta de ciudades
const miembroController = require('./src/controllers/miembro.controller'); 

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