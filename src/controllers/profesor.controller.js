const pool = require('../config/db');

// Obtener profesores con paginación, búsqueda y orden
const getProfesores = async (req, res) => {
    try {
        const { pagina = 1, busqueda = '', orden = 'miembro_id', dir = 'ASC' } = req.query;
        const limite = 8; // Mismo límite que Estudiantes
        const offset = (pagina - 1) * limite;

        // Validar columnas para ordenamiento
        const columnasValidas = ['miembro_id', 'nombres', 'apellidos', 'escalafon', 'tipo_contrato'];
        const sortCol = columnasValidas.includes(orden) ? orden : 'miembro_id';
        const sortDir = dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        const query = `
            SELECT p.profesor_id, p.miembro_id, p.escalafon, p.tipo_contrato,
                   m.nombres, m.apellidos, m.correo
            FROM profesor p
            JOIN miembro m ON p.miembro_id = m.miembro_id
            WHERE m.nombres ILIKE $1 OR m.apellidos ILIKE $1 OR m.correo ILIKE $1
            ORDER BY ${sortCol} ${sortDir}
            LIMIT $2 OFFSET $3
        `;

        const { rows } = await pool.query(query, [`%${busqueda}%`, limite, offset]);

        // Contar total para paginación
        const countQuery = `
            SELECT COUNT(*) FROM profesor p
            JOIN miembro m ON p.miembro_id = m.miembro_id
            WHERE m.nombres ILIKE $1 OR m.apellidos ILIKE $1 OR m.correo ILIKE $1
        `;
        const totalRes = await pool.query(countQuery, [`%${busqueda}%`]);
        const totalRegistros = parseInt(totalRes.rows[0].count);

        res.json({
            datos: rows,
            totalPaginas: Math.ceil(totalRegistros / limite),
            paginaActual: parseInt(pagina)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Obtener un profesor por ID (Para edición)
const getProfesorById = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT p.miembro_id, m.nombres, m.apellidos, p.escalafon, p.tipo_contrato
            FROM profesor p
            JOIN miembro m ON p.miembro_id = m.miembro_id
            WHERE p.miembro_id = $1
        `;
        const { rows } = await pool.query(query, [id]);
        if (rows.length === 0) return res.status(404).json({ error: "Profesor no encontrado" });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Obtener candidatos (Miembros que NO son profesores)
const getCandidatos = async (req, res) => {
    try {
        const query = `
            SELECT miembro_id, nombres, apellidos 
            FROM miembro 
            WHERE miembro_id NOT IN (SELECT miembro_id FROM profesor)
            ORDER BY nombres ASC
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Crear Profesor
const crearProfesor = async (req, res) => {
    const { miembro_id, escalafon, tipo_contrato } = req.body;
    try {
        await pool.query(
            'INSERT INTO profesor (miembro_id, escalafon, tipo_contrato) VALUES ($1, $2, $3)',
            [miembro_id, escalafon, tipo_contrato]
        );
        res.json({ mensaje: "Profesor registrado con éxito" });
    } catch (err) {
        // Error de duplicados
        if (err.code === '23505') return res.status(400).json({ error: "Este miembro ya es profesor" });
        res.status(500).json({ error: err.message });
    }
};

// Actualizar Profesor
const updateProfesor = async (req, res) => {
    const { id } = req.params;
    const { escalafon, tipo_contrato } = req.body;
    try {
        const query = `
            UPDATE profesor 
            SET escalafon = $1, tipo_contrato = $2 
            WHERE miembro_id = $3
            RETURNING *
        `;
        const resultado = await pool.query(query, [escalafon, tipo_contrato, id]);
        
        if (resultado.rows.length === 0) return res.status(404).json({ error: "Registro no encontrado" });
        res.json({ mensaje: "Datos actualizados correctamente" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Eliminar Profesor (Quitar rol, mantener miembro)
const eliminarProfesor = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM profesor WHERE miembro_id = $1', [id]);
        res.json({ mensaje: "Rol de profesor eliminado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { 
    getProfesores, 
    getProfesorById, 
    getCandidatos, 
    crearProfesor, 
    updateProfesor, 
    eliminarProfesor 
};