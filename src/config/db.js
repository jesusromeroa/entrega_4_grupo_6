const { Pool } = require('pg');

// Configuración de la conexión
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'soyucab', // Asegúrate de que este sea el nombre correcto
    password: 'x', // ¡PON TU CONTRASEÑA AQUÍ!
    port: 5432,
});

module.exports = pool;