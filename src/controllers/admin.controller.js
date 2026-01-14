// --- SIMULACIÓN DE BASE DE DATOS EN MEMORIA ---
// Estos datos se mantendrán vivos mientras el servidor esté encendido.
let rolesDinamicos = [
    { id: 1, nombre: 'Investigador Invitado', descripcion: 'Personal externo de investigación' },
    { id: 2, nombre: 'Pasante Administrativo', descripcion: 'Estudiantes en labores de oficina' }
];

let elecciones = [
    { id: 1, titulo: 'Elecciones Centro de Estudiantes 2025', fecha: '2025-11-15', estado: 'Activo' },
    { id: 2, titulo: 'Representante Profesoral', fecha: '2025-10-01', estado: 'Cerrado' }
];

// --- FUNCIONES DEL CONTROLADOR ---

// 1. Obtener Roles
const getRoles = (req, res) => {
    res.json(rolesDinamicos);
};

// 2. Crear Nuevo Rol (Sin tocar BD)
const crearRol = (req, res) => {
    const { nombre, descripcion } = req.body;
    const nuevoRol = {
        id: rolesDinamicos.length + 1,
        nombre,
        descripcion
    };
    rolesDinamicos.push(nuevoRol);
    res.status(201).json({ message: "Rol creado exitosamente", rol: nuevoRol });
};

// 3. Obtener Elecciones
const getElecciones = (req, res) => {
    res.json(elecciones);
};

// 4. Convocar Elección
const crearEleccion = (req, res) => {
    const { titulo, fecha } = req.body;
    const nuevaEleccion = {
        id: elecciones.length + 1,
        titulo,
        fecha,
        estado: 'Activo' // Por defecto activa
    };
    elecciones.push(nuevaEleccion);
    res.status(201).json({ message: "Convocatoria creada exitosamente", eleccion: nuevaEleccion });
};

// 5. Cerrar Elección (Simulado)
const cerrarEleccion = (req, res) => {
    const { id } = req.params;
    const eleccion = elecciones.find(e => e.id == id);
    if(eleccion) {
        eleccion.estado = 'Cerrado';
        res.json({ message: "Elección cerrada", eleccion });
    } else {
        res.status(404).json({ error: "Elección no encontrada" });
    }
};

module.exports = { 
    getRoles, crearRol, 
    getElecciones, crearEleccion, cerrarEleccion 
};