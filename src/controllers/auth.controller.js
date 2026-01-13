const pool = require('../config/db');

// --- INICIO DE SESIÓN ---
const login = async (req, res) => {
    try {
        const { correo, password } = req.body;
        const query = `SELECT miembro_id, nombres, apellidos, correo, password_hash, es_administrador FROM miembro WHERE correo = $1 AND estatus = 'Activo'`;
        const { rows } = await pool.query(query, [correo]);

        if (rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado." });
        
        const usuario = rows[0];
        if (usuario.password_hash !== password) return res.status(401).json({ error: "Contraseña incorrecta." });

        delete usuario.password_hash;
        res.json({ message: "Login exitoso", usuario });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- REGISTRO (Soporta 'Miembro' general) ---
const register = async (req, res) => {
    const client = await pool.connect();
    try {
        const { nombres, apellidos, correo, password, tipo, semestre, situacion, escalafon, contrato, ano_graduacion, titulo } = req.body;

        await client.query('BEGIN');

        // 1. Insertar en MIEMBRO (Base)
        const insertMiembro = `
            INSERT INTO miembro (nombres, apellidos, correo, password_hash, fecha_registro, estatus, es_administrador)
            VALUES ($1, $2, $3, $4, CURRENT_DATE, 'Activo', false)
            RETURNING miembro_id
        `;
        const resMiembro = await client.query(insertMiembro, [nombres, apellidos, correo, password]);
        const nuevoId = resMiembro.rows[0].miembro_id;

        // 2. Insertar en SUB-TABLAS (Según el tipo seleccionado)
        if (tipo === 'Estudiante') {
            await client.query(`INSERT INTO estudiante (miembro_id, semestre_actual, situacion_academica) VALUES ($1, $2, 'Regular')`, [nuevoId, semestre || 1]);
        } else if (tipo === 'Profesor') {
            await client.query(`INSERT INTO profesor (miembro_id, escalafon, tipo_contrato) VALUES ($1, $2, 'Tiempo Completo')`, [nuevoId, escalafon || 'Instructor']);
        } else if (tipo === 'Egresado') {
            await client.query(`INSERT INTO egresado (miembro_id, ano_graduacion, titulo_obtenido) VALUES ($1, $2, 'Ingeniero')`, [nuevoId, ano_graduacion || 2024]);
        }
        // Si tipo === 'Miembro', no inserta en sub-tablas (correcto para personal administrativo/general)

        await client.query('COMMIT');
        res.json({ message: "Registro exitoso", miembro_id: nuevoId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error registro:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// --- OBTENER PERFIL (CORREGIDO: YA NO ESTÁ VACÍO) ---
const getPerfil = async (req, res) => {
    try {
        const { id } = req.params;
        // Hacemos LEFT JOIN para traer datos si existen, sino vendrán NULL
        const query = `
            SELECT m.*, 
                e.semestre_actual, e.situacion_academica,
                p.escalafon, p.tipo_contrato,
                eg.ano_graduacion, eg.titulo_obtenido
            FROM miembro m
            LEFT JOIN estudiante e ON m.miembro_id = e.miembro_id
            LEFT JOIN profesor p ON m.miembro_id = p.miembro_id
            LEFT JOIN egresado eg ON m.miembro_id = eg.miembro_id
            WHERE m.miembro_id = $1
        `;
        const { rows } = await pool.query(query, [id]);
        
        if(rows.length > 0) {
            delete rows[0].password_hash; // No enviamos el hash al frontend
            res.json(rows[0]);
        } else {
            res.status(404).json({error: "Perfil no encontrado"});
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- ACTUALIZAR PERFIL (CORREGIDO: YA NO ESTÁ VACÍO) ---
const updatePerfil = async (req, res) => {
    try {
        const { id } = req.params;
        const { biografia, nombre_ciudad, foto_perfil_url } = req.body;
        
        await pool.query(
            `UPDATE miembro SET biografia = $1, nombre_ciudad = $2, foto_perfil_url = $3 WHERE miembro_id = $4`,
            [biografia, nombre_ciudad, foto_perfil_url, id]
        );
        res.json({ message: "Perfil actualizado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { login, register, getPerfil, updatePerfil };