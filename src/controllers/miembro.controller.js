const pool = require("../config/db.js");

// OBTENER TODOS (Con paginación y filtros)
const getMiembros = async (req, res) => {
    try {
        const { pagina = 1, busqueda = '', orden = 'miembro_id', dir = 'ASC' } = req.query;
        const limite = 8;
        const offset = (pagina - 1) * limite;
        
        // Validación de seguridad para columnas
        const columnasValidas = ['miembro_id', 'nombres', 'apellidos', 'correo', 'estatus'];
        const ordenarPor = columnasValidas.includes(orden) ? orden : 'miembro_id';
        const direccion = dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        const query = `
            SELECT miembro_id, nombres, apellidos, correo, estatus 
            FROM MIEMBRO
            WHERE CAST(miembro_id AS TEXT) ILIKE $1
               OR nombres ILIKE $1 
               OR apellidos ILIKE $1 
               OR correo ILIKE $1
            ORDER BY ${ordenarPor} ${direccion}
            LIMIT $2 OFFSET $3
        `;
        
        const valores = [`%${busqueda}%`, limite, offset];
        const resultado = await pool.query(query, valores);
        
        const totalQuery = `
            SELECT COUNT(*) FROM MIEMBRO 
            WHERE CAST(miembro_id AS TEXT) ILIKE $1 OR nombres ILIKE $1 OR apellidos ILIKE $1 OR correo ILIKE $1
        `;
        const totalResult = await pool.query(totalQuery, [`%${busqueda}%`]);
        const totalRegistros = parseInt(totalResult.rows[0].count);
        const totalPaginas = Math.ceil(totalRegistros / limite);

        res.json({
            datos: resultado.rows,
            paginaActual: parseInt(pagina),
            totalPaginas: totalPaginas
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// OBTENER UN SOLO MIEMBRO
const getMiembroById = async (req, res) => {
    try {
        const { id } = req.params;
        // Unimos con CIUDAD para obtener el nombre de la ciudad actual si existe
        const resultado = await pool.query('SELECT * FROM MIEMBRO WHERE miembro_id = $1', [id]);
        res.json(resultado.rows[0]);
    } catch (err) {
        res.status(500).send('Error al obtener miembro');
    }
};

// CREAR MIEMBRO
const createMiembro = async (req, res) => {
    try {
        const { nombres, apellidos, correo, password, foto_perfil_url, biografia, ciudad } = req.body;

        if (!nombres || !apellidos || !correo || !password) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        const query = `
            INSERT INTO MIEMBRO (
                nombres, apellidos, correo, password_hash, estatus, fecha_registro,
                foto_perfil_url, biografia, nombre_ciudad
            )
            VALUES ($1, $2, $3, $4, 'Activo', CURRENT_DATE, $5, $6, $7)
            RETURNING *
        `;
        
        const valores = [nombres, apellidos, correo, password, foto_perfil_url || null, biografia || null, ciudad || null];
        const nuevoMiembro = await pool.query(query, valores);
        res.json(nuevoMiembro.rows[0]);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error al registrar');
    }
};

// ACTUALIZAR MIEMBRO
const updateMiembro = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombres, apellidos, correo, estatus, foto_perfil_url, biografia, nombre_ciudad } = req.body;

        const query = `
            UPDATE MIEMBRO
            SET nombres = $1, apellidos = $2, correo = $3, estatus = $4, 
                foto_perfil_url = $5, biografia = $6, nombre_ciudad = $7
            WHERE miembro_id = $8
        `;
        
        const valores = [nombres, apellidos, correo, estatus, foto_perfil_url || null, biografia || null, nombre_ciudad || null, id];
        await pool.query(query, valores);
        res.json({ mensaje: 'Actualizado correctamente' });

    } catch (err) {
        console.error(err);
        res.status(500).send('Error al actualizar');
    }
};

// ELIMINAR MIEMBRO
const deleteMiembro = async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await pool.query('DELETE FROM MIEMBRO WHERE miembro_id = $1', [id]);
        if (resultado.rowCount === 0) return res.status(404).json({ error: 'No encontrado' });
        res.json({ mensaje: 'Eliminado correctamente' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error al eliminar');
    }
};

// OBTENER CIUDADES (Auxiliar)
const getCiudades = async (req, res) => {
    try {
        const resultado = await pool.query('SELECT nombre_ciudad FROM CIUDAD ORDER BY nombre_ciudad ASC');
        res.json(resultado.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error al obtener ciudades');
    }
};

// Exportamos todas las funciones
module.exports = {
    getMiembros,
    getMiembroById,
    createMiembro,
    updateMiembro,
    deleteMiembro,
    getCiudades
};