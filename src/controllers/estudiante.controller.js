const pool = require('../config/db');

// Obtener estudiantes con búsqueda, paginación y ordenamiento
const getEstudiantes = async (req, res) => {
    try {
        const { pagina = 1, busqueda = '', orden = 'miembro_id', dir = 'ASC' } = req.query;
        const limite = 8; // Registros por página
        const offset = (pagina - 1) * limite;

        // Validar columnas para evitar SQL Injection
        const columnasValidas = ['miembro_id', 'nombres', 'apellidos', 'semestre_actual', 'situacion_academica'];
        const sortCol = columnasValidas.includes(orden) ? orden : 'miembro_id';
        const sortDir = dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        // Consulta con JOIN corregido
        const query = `
            SELECT e.estudiante_id, e.miembro_id, e.semestre_actual, e.situacion_academica,
                   m.nombres, m.apellidos, m.correo
            FROM estudiante e
            JOIN miembro m ON e.miembro_id = m.miembro_id
            WHERE m.nombres ILIKE $1 OR m.apellidos ILIKE $1 OR m.correo ILIKE $1
            ORDER BY ${sortCol} ${sortDir}
            LIMIT $2 OFFSET $3
        `;

        const { rows } = await pool.query(query, [`%${busqueda}%`, limite, offset]);

        // Contar total para la paginación
        const countQuery = `
            SELECT COUNT(*) FROM estudiante e
            JOIN miembro m ON e.miembro_id = m.miembro_id
            WHERE m.nombres ILIKE $1 OR m.apellidos ILIKE $1 OR m.correo ILIKE $1
        `;
        const totalRes = await pool.query(countQuery, [`%${busqueda}%`]);
        const totalRegistros = parseInt(totalRes.rows[0].count);

        // RESPUESTA FORMATEADA (Para que el JS no de error)
        res.json({
            datos: rows,
            totalPaginas: Math.ceil(totalRegistros / limite),
            paginaActual: parseInt(pagina)
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Error al obtener estudiantes" });
    }
};

// Obtener miembros que aún no son estudiantes (para el select del registro)
const getCandidatos = async (req, res) => {
    try {
        const query = `
            SELECT miembro_id, nombres, apellidos 
            FROM miembro 
            WHERE miembro_id NOT IN (SELECT miembro_id FROM estudiante)
            ORDER BY nombres ASC
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener candidatos" });
    }
};

const crearEstudiante = async (req, res) => {
    // Extraemos los datos del cuerpo de la petición
    let { miembro_id, semestre_actual, situacion_academica } = req.body;

    try {
        // Validaciones de seguridad y tipos de datos
        const idMiembro = parseInt(miembro_id);
        const semestre = semestre_actual === "" ? null : parseInt(semestre_actual);
        const situacion = situacion_academica === "" ? null : situacion_academica;

        if (isNaN(idMiembro)) {
            return res.status(400).json({ error: "El ID de miembro es obligatorio y debe ser un número." });
        }

        const query = `
            INSERT INTO estudiante (miembro_id, semestre_actual, situacion_academica)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        
        const valores = [idMiembro, semestre, situacion];
        const resultado = await pool.query(query, valores);

        res.status(201).json({
            mensaje: "Estudiante registrado con éxito",
            estudiante: resultado.rows[0]
        });

    } catch (err) {
        console.error("Error al insertar estudiante:", err.message);
        
        // Manejo de errores específicos de PostgreSQL
        if (err.code === '23505') { // Error de llave duplicada (Unique violation)
            return res.status(400).json({ error: "Este miembro ya está registrado como estudiante." });
        }
        
        res.status(500).json({ error: "Error interno al registrar el estudiante: " + err.message });
    }
};

const eliminarEstudiante = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM estudiante WHERE miembro_id = $1', [id]);
        res.json({ message: "Estudiante eliminado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Obtener un estudiante por ID (Para cargar el modal de edición)
const getEstudianteById = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT e.miembro_id, m.nombres, m.apellidos, e.semestre_actual, e.situacion_academica
            FROM estudiante e
            JOIN miembro m ON e.miembro_id = m.miembro_id
            WHERE e.miembro_id = $1
        `;
        const { rows } = await pool.query(query, [id]);
        if (rows.length === 0) return res.status(404).json({ error: "Estudiante no encontrado" });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Actualizar datos del estudiante
const updateEstudiante = async (req, res) => {
    const { id } = req.params;
    const { semestre_actual, situacion_academica } = req.body;
    try {
        const semestre = semestre_actual === "" ? null : parseInt(semestre_actual);
        
        const query = `
            UPDATE estudiante 
            SET semestre_actual = $1, situacion_academica = $2 
            WHERE miembro_id = $3 
            RETURNING *
        `;
        const resultado = await pool.query(query, [semestre, situacion_academica, id]);
        
        if (resultado.rows.length === 0) return res.status(404).json({ error: "Estudiante no encontrado" });
        res.json({ mensaje: "Datos actualizados correctamente", estudiante: resultado.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Asegúrate de exportarlas al final del archivo
module.exports = { 
    getEstudiantes, 
    getCandidatos, 
    crearEstudiante, 
    eliminarEstudiante, 
    getEstudianteById, // <--- Nueva
    updateEstudiante   // <--- Nueva
};

