const pool = require('../config/db');

// OBTENER TODOS LOS ESTUDIANTES (Con datos de Miembro)
const getEstudiantes = async (req, res) => {
    try {
        const query = `
            SELECT e.estudiante_id, e.semestre_actual, e.situacion_academica,
                   m.nombres, m.apellidos, m.correo
            FROM ESTUDIANTE e
            JOIN MIEMBRO m ON e.estudiante_id = m.miembro_id
            ORDER BY e.estudiante_id ASC
        `;
        const resultado = await pool.query(query);
        res.json(resultado.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// CREAR ESTUDIANTE (Asignar rol a un miembro)
const createEstudiante = async (req, res) => {
    try {
        const { miembro_id, semestre, situacion } = req.body;

        // CORRECCIÓN AQUÍ:
        // La columna en la BD se llama 'miembro_id', no 'estudiante_id' en el insert.
        const query = `
            INSERT INTO ESTUDIANTE (miembro_id, semestre_actual, situacion_academica)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        
        const valores = [miembro_id, semestre, situacion];
        
        await pool.query(query, valores);
        res.json({ mensaje: 'Estudiante registrado correctamente' });

    } catch (err) {
        console.error("Error detallado:", err.message); // Verás el error exacto en la terminal

        // Manejo de duplicados (Si el miembro ya es estudiante)
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Este miembro ya está registrado como estudiante' });
        }
        
        // CORRECCIÓN DE FORMATO: Enviamos JSON, no texto plano
        res.status(500).json({ error: 'Error al registrar estudiante en la base de datos' });
    }
};
// OBTENER UN ESTUDIANTE POR ID
const getEstudianteById = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT e.*, m.nombres, m.apellidos 
            FROM ESTUDIANTE e
            JOIN MIEMBRO m ON e.estudiante_id = m.miembro_id
            WHERE e.estudiante_id = $1
        `;
        const resultado = await pool.query(query, [id]);
        res.json(resultado.rows[0]);
    } catch (err) {
        res.status(500).send('Error al obtener estudiante');
    }
};

// ACTUALIZAR ESTUDIANTE
const updateEstudiante = async (req, res) => {
    try {
        const { id } = req.params;
        const { semestre, situacion } = req.body; // Solo editamos datos académicos

        const query = `
            UPDATE ESTUDIANTE
            SET semestre_actual = $1, situacion_academica = $2
            WHERE estudiante_id = $3
        `;
        await pool.query(query, [semestre, situacion, id]);
        res.json({ mensaje: 'Datos académicos actualizados' });
    } catch (err) {
        res.status(500).send('Error al actualizar');
    }
};

// ELIMINAR (Solo quita el rol de estudiante, mantiene al miembro)
const deleteEstudiante = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM ESTUDIANTE WHERE estudiante_id = $1', [id]);
        res.json({ mensaje: 'Estudiante eliminado (Miembro conservado)' });
    } catch (err) {
        res.status(500).send('Error al eliminar');
    }
};

// EXTRA: Obtener miembros que NO son estudiantes (Para el dropdown de crear)
const getCandidatos = async (req, res) => {
    try {
        const query = `
            SELECT miembro_id, nombres, apellidos FROM MIEMBRO
            WHERE miembro_id NOT IN (SELECT estudiante_id FROM ESTUDIANTE)
        `;
        const resultado = await pool.query(query);
        res.json(resultado.rows);
    } catch (err) {
        res.status(500).send('Error al obtener candidatos');
    }
};

module.exports = {
    getEstudiantes,
    createEstudiante,
    getEstudianteById,
    updateEstudiante,
    deleteEstudiante,
    getCandidatos
};