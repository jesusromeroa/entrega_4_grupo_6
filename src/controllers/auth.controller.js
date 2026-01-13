const pool = require('../config/db');

// --- INICIO DE SESIÓN ---
const login = async (req, res) => {
    try {
        const { correo, password } = req.body;
        
        // 1. Buscar el usuario por correo
        const query = `
            SELECT miembro_id, nombres, apellidos, correo, password_hash, es_administrador 
            FROM miembro 
            WHERE correo = $1 AND estatus = 'Activo'
        `;
        const { rows } = await pool.query(query, [correo]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado o inactivo." });
        }

        const usuario = rows[0];

        // 2. Verificar contraseña (En producción usar bcrypt, aquí comparación directa por simplicidad)
        if (usuario.password_hash !== password) {
            return res.status(401).json({ error: "Contraseña incorrecta." });
        }

        // 3. Devar datos de sesión (Sin password)
        delete usuario.password_hash;
        res.json({ 
            message: "Login exitoso", 
            usuario: usuario 
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- REGISTRO DE USUARIO ---
const register = async (req, res) => {
    const client = await pool.connect();
    try {
        const { 
            nombres, apellidos, correo, password, 
            tipo, // 'Estudiante', 'Profesor', 'Egresado'
            // Datos específicos según tipo
            semestre, situacion, // Estudiante
            escalafon, contrato, // Profesor
            ano_graduacion, titulo // Egresado
        } = req.body;

        await client.query('BEGIN');

        // 1. Insertar en tabla MIEMBRO
        // Nota: Asumimos que miembro_id es SERIAL o se genera auto. Si no, habría que calcularlo.
        // Basado en tu SQL, si no es serial, usamos MAX+1 (simplificado) o RETURNING id si es serial.
        // Asumiré que la BD maneja el ID o usamos RETURNING miembro_id.
        const insertMiembro = `
            INSERT INTO miembro (nombres, apellidos, correo, password_hash, fecha_registro, estatus, es_administrador)
            VALUES ($1, $2, $3, $4, CURRENT_DATE, 'Activo', false)
            RETURNING miembro_id
        `;
        const resMiembro = await client.query(insertMiembro, [nombres, apellidos, correo, password]);
        const nuevoId = resMiembro.rows[0].miembro_id;

        // 2. Insertar en la SUB-TABLA correspondiente
        if (tipo === 'Estudiante') {
            await client.query(
                `INSERT INTO estudiante (miembro_id, semestre_actual, situacion_academica) VALUES ($1, $2, $3)`,
                [nuevoId, semestre || 1, situacion || 'Regular']
            );
        } else if (tipo === 'Profesor') {
            await client.query(
                `INSERT INTO profesor (miembro_id, escalafon, tipo_contrato) VALUES ($1, $2, $3)`,
                [nuevoId, escalafon || 'Instructor', contrato || 'Tiempo Completo']
            );
        } else if (tipo === 'Egresado') {
            await client.query(
                `INSERT INTO egresado (miembro_id, ano_graduacion, titulo_obtenido) VALUES ($1, $2, $3)`,
                [nuevoId, ano_graduacion || new Date().getFullYear(), titulo || 'Ingeniero']
            );
        }

        await client.query('COMMIT');
        res.json({ message: "Registro exitoso", miembro_id: nuevoId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error en registro:", err);
        res.status(500).json({ error: "Error al registrar usuario: " + err.message });
    } finally {
        client.release();
    }
};

// --- OBTENER PERFIL ---
const getPerfil = async (req, res) => {
    try {
        const { id } = req.params;
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
        if(rows.length > 0) res.json(rows[0]);
        else res.status(404).json({error: "Perfil no encontrado"});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- ACTUALIZAR PERFIL ---
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