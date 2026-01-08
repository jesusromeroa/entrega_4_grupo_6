const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path'); // Necesario para la carpeta public

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// --- ARCHIVOS ESTÁTICOS (HTML, CSS, JS) ---
// Esto permite que el navegador encuentre index.html y tus scripts
app.use(express.static(path.join(__dirname, 'public')));

// --- RUTAS API ---
// Importamos las rutas que creamos
const miembroRoutes = require('./src/routes/miembro.routes');
const estudianteRoutes = require('./src/routes/estudiante.routes');

// Usamos las rutas. 
// Nota: Como en el archivo de rutas ya pusimos '/miembros', aquí usamos la raíz '/'
app.use('/', miembroRoutes);
app.use('/estudiantes', estudianteRoutes);

// --- INICIAR SERVIDOR ---
app.listen(3000, () => {
    console.log('Servidor corriendo en puerto 3000');
});