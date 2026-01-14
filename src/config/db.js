require('dotenv').config(); // <-- ESTA LÍNEA ES CLAVE: Carga el archivo .env
const { Pool } = require('pg');

// Configuración de la conexión usando variables de entorno
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Verificación de conexión (Opcional, pero útil para depurar)
pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ Error adquiriendo cliente', err.stack);
    }
    client.query('SELECT NOW()', (err, result) => {
        release();
        if (err) {
            return console.error('❌ Error ejecutando query', err.stack);
        }
        console.log('✅ Conexión exitosa a la base de datos:', process.env.DB_NAME);
    });
});


module.exports = pool;