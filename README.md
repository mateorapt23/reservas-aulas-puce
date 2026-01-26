# 🎓 Sistema de Reserva de Aulas - LTIC

Sistema web para gestionar reservas de aulas, cátedras y requerimientos en una institución educativa.

## 📋 Requisitos Previos

- Python 3.10 o superior
- PostgreSQL 14 o superior
- Git (opcional, para clonar el repositorio)

---

## 🚀 Instalación en PC de Desarrollo

### 1. **Clonar o copiar el proyecto**
```bash
git clone https://github.com/tu-usuario/reservaulasltic.git
cd reservaulasltic
```

O simplemente copia la carpeta del proyecto.

### 2. **Crear y activar entorno virtual**

**Windows:**
```cmd
python -m venv venv
venv\Scripts\activate
```

**Linux / macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**Nota para Windows PowerShell:** Si obtienes error de permisos:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 3. **Instalar dependencias**
```bash
pip install -r requirements.txt
```

### 4. **Configurar PostgreSQL**

#### Instalar PostgreSQL:
- Descargar desde: https://www.postgresql.org/download/
- Durante la instalación, anota el puerto (5432) y la contraseña del usuario `postgres`

#### Crear la base de datos:

Abre **SQL Shell (psql)** y ejecuta:
```sql
CREATE DATABASE reservaulasltic;
CREATE USER reservas_user WITH PASSWORD 'MiPassword123';
ALTER ROLE reservas_user SET client_encoding TO 'utf8';
ALTER ROLE reservas_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE reservas_user SET timezone TO 'America/Guayaquil';
GRANT ALL PRIVILEGES ON DATABASE reservaulasltic TO reservas_user;
\q
```

### 5. **Configurar `settings.py`**

Verifica que la configuración de la base de datos sea correcta:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'reservaulasltic',
        'USER': 'reservas_user',
        'PASSWORD': 'MiPassword123',  # Cambia según tu configuración
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### 6. **Aplicar migraciones**
```bash
python manage.py migrate
```

### 7. **Crear superusuario**
```bash
python manage.py createsuperuser
```

### 8. **Iniciar servidor de desarrollo**
```bash
python manage.py runserver
```

Accede a: http://localhost:8000

---

## 🖥️ Instalación en PC Servidor (Producción)

### 1. **Requisitos del servidor**

- Windows 10/11 o Windows Server
- Python 3.10+
- PostgreSQL 14+
- Conexión a red local

### 2. **Copiar el proyecto al servidor**

Copia toda la carpeta del proyecto a la PC servidor (por USB, red compartida, etc.)

### 3. **Instalar PostgreSQL en el servidor**

- Descargar e instalar desde: https://www.postgresql.org/download/windows/
- Anotar puerto (5432) y contraseña de `postgres`

### 4. **Crear entorno virtual e instalar dependencias**
```cmd
cd ruta\del\proyecto
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 5. **Configurar PostgreSQL para conexiones de red**

#### a) Crear la base de datos:

Abre **SQL Shell (psql)**:
```sql
CREATE DATABASE reservaulasltic;
CREATE USER reservas_user WITH PASSWORD 'MiPassword123';
ALTER ROLE reservas_user SET client_encoding TO 'utf8';
ALTER ROLE reservas_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE reservas_user SET timezone TO 'America/Guayaquil';
GRANT ALL PRIVILEGES ON DATABASE reservaulasltic TO reservas_user;
\q
```

#### b) Permitir conexiones externas:

**Ubicación de archivos de configuración:**
`C:\Program Files\PostgreSQL\{version}\data\`

**Editar `postgresql.conf`:**
```conf
listen_addresses = '*'
```

**Editar `pg_hba.conf`** (agregar al final):
```conf
# Permitir conexiones desde la red local
host    reservaulasltic    reservas_user    192.168.1.0/24    md5
```

**Reiniciar PostgreSQL:**
- Servicios de Windows → PostgreSQL → Reiniciar

### 6. **Configurar Firewall de Windows**

Permitir el puerto 8000 (Django) y 5432 (PostgreSQL):
```cmd
netsh advfirewall firewall add rule name="Django Server" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="PostgreSQL" dir=in action=allow protocol=TCP localport=5432
```

### 7. **Aplicar migraciones y crear superusuario**
```cmd
python manage.py migrate
python manage.py createsuperuser
```

### 8. **Iniciar servidor para toda la red**
```cmd
python manage.py runserver 0.0.0.0:8000
```

### 9. **Acceder desde otros PCs**

Desde cualquier PC en la red local:
```
http://192.168.1.X:8000
```

(Reemplaza `X` con la IP del servidor. Para ver la IP: `ipconfig`)

---

## 📁 Estructura del Proyecto
```
reservaulasltic/
├── configuracion/        # Gestión de aulas, cátedras, requerimientos
├── reservas/             # Gestión de reservas
├── calendario/           # Visualización de calendario
├── usuarios/             # Autenticación
├── templates/            # Plantillas HTML globales
├── static/               # Archivos estáticos (CSS, JS)
├── manage.py
├── requirements.txt
└── README.md
```

---

## 🔧 Configuración Adicional

### Cambiar contraseña de PostgreSQL

Si necesitas cambiar la contraseña de la base de datos:

1. Edita `settings.py`:
```python
DATABASES = {
    'default': {
        'PASSWORD': 'TuNuevaContraseña',
        # ... resto de configuración
    }
}
```

2. Cambia la contraseña en PostgreSQL:
```sql
ALTER USER reservas_user WITH PASSWORD 'TuNuevaContraseña';
```

### Modo Debug

**Para desarrollo (settings.py):**
```python
DEBUG = True
ALLOWED_HOSTS = ['*']
```

**Para producción:**
```python
DEBUG = False
ALLOWED_HOSTS = ['192.168.1.X', 'localhost']  # IP del servidor
```

---

## 🛠️ Comandos Útiles
```bash
# Crear nuevas migraciones
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Iniciar servidor (desarrollo)
python manage.py runserver

# Iniciar servidor (red local)
python manage.py runserver 0.0.0.0:8000

# Ver IP del servidor
ipconfig  # Windows
ifconfig  # Linux/macOS
```

---

## 📝 Notas Importantes

- ✅ PostgreSQL soporta múltiples usuarios concurrentes
- ✅ Los cambios se reflejan en tiempo real para todos los usuarios
- ⚠️ Asegúrate de que todos los PCs estén en la misma red local
- ⚠️ Anota la IP del servidor para que los clientes puedan conectarse
- 🔒 Cambia las contraseñas por defecto en producción

---

## 🐛 Solución de Problemas

### Error: "No module named 'psycopg2'"
```bash
pip install psycopg2-binary
```

### Error: "FATAL: password authentication failed"
- Verifica usuario y contraseña en `settings.py`
- Confirma que la base de datos y usuario existen en PostgreSQL

### No se puede conectar desde otro PC
1. Verifica que el servidor esté corriendo con `0.0.0.0:8000`
2. Revisa que el firewall permita el puerto 8000
3. Confirma que estén en la misma red con `ping IP_DEL_SERVIDOR`

### Puerto 8000 en uso
```bash
# Usa otro puerto
python manage.py runserver 0.0.0.0:8080
```

---

## 👤 Autor

Desarrollado para la gestión de aulas en instituciones educativas.

## 📄 Licencia

Este proyecto es de uso interno educativo.