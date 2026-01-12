const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Importar rutas
const miembroRoutes = require('./src/routes/miembro.routes');
const estudianteRoutes = require('./src/routes/estudiante.routes');
const profesorRoutes = require('./src/routes/profesor.routes');
const egresadoRoutes = require('./src/routes/egresado.routes');
const grupoRoutes = require('./src/routes/grupo.routes'); // <--- ¡IMPORTANTE!

const app = express();

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de la API
app.use('/miembros', miembroRoutes);
app.use('/estudiantes', estudianteRoutes);
app.use('/profesores', profesorRoutes);
app.use('/egresados', egresadoRoutes);
app.use('/grupos', grupoRoutes); // <--- ¡ESTA LÍNEA ES VITAL!

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Algo salió mal!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});