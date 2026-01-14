 SoyUCAB - Sistema de Gestión de Comunidad Universitaria

Proyecto desarrollado para la asignatura Sistemas de Bases de Datos.
**Grupo 6** Jesus Romero - Fernando Gil

Este sistema permite la gestión integral de miembros (estudiantes, profesores, egresados), grupos, eventos, marketplace, alquileres y reportes, con un enfoque en la seguridad y la interacción social.

Requisitos Previos
* **Node.js** (v14 o superior)
* **PostgreSQL** (v12 o superior)
* **pgAdmin 4** (Recomendado para la gestión de BD)

---

 Guía de Instalación y Despliegue

Paso 1: Configuración del Proyecto
1. Descomprima la carpeta del proyecto.
2. Abra una terminal en la raíz del proyecto.
3. Instale las dependencias necesarias ejecutando:
   ```bash
   npm install

Paso 2: Configuración de la Base de Datos (Seguridad y Estructura)
Para garantizar la integridad y seguridad del despliegue, siga este orden estricto:

2.1. Crear la Base de Datos
Abra pgAdmin 4.

Cree una nueva base de datos vacía llamada soyucab.

2.2. Configurar Roles y Seguridad (Antes de restaurar)
Para que la restauración funcione correctamente y se cumplan los requisitos de seguridad lógica, primero debe crear el rol de aplicación.

Abra la Query Tool  sobre la base de datos soyucab y ejecute este script:


DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'soyucab_app_rol') THEN
    CREATE ROLE soyucab_app_rol;
  END IF; 
  
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'soyucab_usuario') THEN
    CREATE USER soyucab_usuario WITH PASSWORD '1234';
  END IF; 
END $$;

GRANT soyucab_app_rol TO soyucab_usuario;

GRANT USAGE ON SCHEMA public TO soyucab_app_rol;

Paso 3: Configurar Variables de Entorno
Cree un archivo llamado .env en la carpeta raíz del proyecto (al mismo nivel que package.json) y pegue el siguiente contenido para conectar la aplicación con el usuario seguro:

Code snippet

DB_USER=soyucab_usuario
DB_PASSWORD=1234
DB_HOST=localhost
DB_PORT=5432
DB_NAME=soyucab

Paso 4: Iniciar la Aplicación
En la terminal BASH, ejecute:

npm start

Acceda a la aplicación en su navegador:  http://localhost:3000/login.html

Credenciales de Acceso (Datos de Prueba)
El sistema ya cuenta con usuarios precargados para facilitar la corrección:

Administrador:

Correo: admin@ucab.edu.ve

Contraseña: 1234

Acceso total a reportes y gestión.

Miembro / Estudiante (Ejemplo):

Correo: jesusmiembro@ucab.edu.ve

Contraseña: 1234

Puede registrar un nuevo usuario libremente desde el botón "Registrarse".