# 🎓 Sistema de Reserva de Aulas - LTIC

Sistema web para gestionar reservas de aulas, cátedras y requerimientos en una institución educativa.

**💡 Este sistema funciona en RED LOCAL únicamente** - No requiere internet.

---

## 📋 Requisitos Previos

- Windows 10/11 (para el servidor)
- Python 3.10 o superior
- PostgreSQL 14 o superior
- Todos los PCs deben estar en la misma red local

---

## 🖥️ Instalación en PC Servidor

### Paso 1: Instalar Python

1. Descargar desde: https://www.python.org/downloads/
2. **IMPORTANTE**: Al instalar, marcar ✅ **"Add Python to PATH"**
3. Verificar instalación abriendo CMD:
   ```cmd
   python --version
   ```

### Paso 2: Instalar PostgreSQL

1. Descargar desde: https://www.postgresql.org/download/windows/
2. Durante la instalación:
   - Puerto: **5432** (dejar por defecto)
   - Contraseña: Anota la contraseña que pongas para el usuario `postgres`
   - Idioma: Español (opcional)

### Paso 3: Crear la Base de Datos

1. Abre **SQL Shell (psql)** (busca en el menú inicio)
2. Presiona Enter 4 veces (deja todo por defecto)
3. Ingresa la contraseña de `postgres` que pusiste en la instalación
4. Copia y pega estos comandos uno por uno:

```sql
CREATE DATABASE reservaulasltic;
CREATE USER reservas_user WITH PASSWORD '12345';
ALTER ROLE reservas_user SET client_encoding TO 'utf8';
ALTER ROLE reservas_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE reservas_user SET timezone TO 'America/Guayaquil';
GRANT ALL PRIVILEGES ON DATABASE reservaulasltic TO reservas_user;
```

5. Sal con: `\q`

### Paso 4: Copiar el Proyecto

1. Copia la carpeta `reservaulasltic` al servidor (por USB o red)
2. Recomendado: Ponla en `C:\reservaulasltic\`

### Paso 5: Instalar Dependencias

1. Abre CMD **como Administrador**
2. Ve a la carpeta del proyecto:
   ```cmd
   cd C:\reservaulasltic
   ```

3. Crea el entorno virtual:
   ```cmd
   python -m venv venv
   ```

4. Activa el entorno virtual:
   ```cmd
   venv\Scripts\activate
   ```

5. Instala las dependencias:
   ```cmd
   pip install -r requirements.txt
   ```

### Paso 6: Configurar la Base de Datos

Abre el archivo `settings.py` y verifica que tenga esto:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'reservaulasltic',
        'USER': 'reservas_user',
        'PASSWORD': '12345',  # Usa la contraseña que pusiste
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### Paso 7: Aplicar Migraciones

Desde CMD (con el entorno virtual activado):

```cmd
python manage.py migrate
```

### Paso 8: Crear el Primer Usuario Administrador

```cmd
python manage.py createsuperuser
```

Ingresa:
- Usuario: (por ejemplo: `admin`)
- Email: (puede ser cualquiera, ejemplo: `admin@ltic.edu`)
- Contraseña: (mínimo 8 caracteres, anótala bien)

### Paso 9: Permitir Conexiones en el Firewall

Abre CMD **como Administrador** y ejecuta:

```cmd
netsh advfirewall firewall add rule name="Django Server LTIC" dir=in action=allow protocol=TCP localport=8000
```

### Paso 10: Configurar PostgreSQL para Red Local

#### a) Editar postgresql.conf

1. Ve a: `C:\Program Files\PostgreSQL\16\data\postgresql.conf`
   (El "16" puede ser otra versión, busca tu versión)
2. Abre con Notepad
3. Busca la línea `listen_addresses` y cámbiala a:
   ```conf
   listen_addresses = '*'
   ```
4. Guarda y cierra

#### b) Editar pg_hba.conf

1. Abre: `C:\Program Files\PostgreSQL\16\data\pg_hba.conf`
2. Al final del archivo, agrega esta línea:
   ```conf
   host    reservaulasltic    reservas_user    192.168.0.0/16    md5
   ```
3. Guarda y cierra

#### c) Reiniciar PostgreSQL

1. Presiona `Win + R` y escribe: `services.msc`
2. Busca "PostgreSQL"
3. Clic derecho → **Reiniciar**

### Paso 11: Probar el Servidor

```cmd
cd C:\reservaulasltic
venv\Scripts\activate
python manage.py runserver 0.0.0.0:8000
```

Verás algo como:
```
Starting development server at http://0.0.0.0:8000/
```

**Prueba desde el mismo servidor:** Abre un navegador y ve a `http://localhost:8000`

---

## 🔄 AUTO-INICIO DEL SERVIDOR (LO MÁS IMPORTANTE)

Para que el servidor inicie automáticamente cada vez que enciendas la PC:

### Método 1: Script BAT Simple (Recomendado)

#### 1. Crear el Script

**Opción A - Descargar el archivo listo:**

Ya tienes el archivo `iniciar_servidor.bat` listo para usar. Solo cópialo a `C:\reservaulasltic\`

**Opción B - Crearlo manualmente:**

1. Abre **Notepad** (Bloc de notas)
2. Copia y pega **exactamente** este código:

```batch
@echo off
title Sistema de Reservas LTIC - Servidor Activo
color 0A
cd /d "%~dp0"
echo ====================================
echo   SISTEMA DE RESERVAS - LTIC
echo ====================================
echo.
echo Iniciando servidor...
echo.
call venv\Scripts\activate
python manage.py runserver 0.0.0.0:8000
pause
```

3. Click en **Archivo** → **Guardar como**
4. Nombre del archivo: `iniciar_servidor.bat`
5. Tipo: **Todos los archivos (*.*)**
6. Ubicación: `C:\reservaulasltic\`
7. Click en **Guardar**

**⚠️ IMPORTANTE:** 
- El nombre debe ser **exactamente** `iniciar_servidor.bat` (con la extensión .bat)
- NO lo guardes como .txt
- Guárdalo en la carpeta raíz del proyecto: `C:\reservaulasltic\`

#### 2. Configurar Inicio Automático

**Opción A - Carpeta de Inicio (MÁS FÁCIL):**

1. Presiona `Win + R` y escribe: `shell:startup`
2. Se abre una carpeta
3. Crea un acceso directo de `iniciar_servidor.bat` ahí:
   - Clic derecho en `iniciar_servidor.bat` → Enviar a → Escritorio (crear acceso directo)
   - Corta ese acceso directo del escritorio y pégalo en la carpeta de inicio
4. Clic derecho en el acceso directo → Propiedades
5. En "Ejecutar", selecciona: **Minimizada**
6. Aceptar

**Opción B - Programador de Tareas (MÁS CONTROL):**

1. Presiona `Win + R` y escribe: `taskschd.msc`
2. En el panel derecho, click en **"Crear tarea básica"**
3. Nombre: `Servidor Django LTIC`
4. Desencadenador: **Al iniciar el equipo**
5. Acción: **Iniciar un programa**
6. Programa: `C:\reservaulasltic\iniciar_servidor.bat`
7. Iniciar en: `C:\reservaulasltic\`
8. Marcar: ✅ **"Ejecutar con los privilegios más altos"**
9. Finalizar

#### 3. Probar el Auto-Inicio

1. Reinicia la PC
2. Espera 30 segundos después de iniciar
3. Abre un navegador y ve a `http://localhost:8000`
4. Deberías ver el sistema funcionando

**💡 Nota:** La ventana del servidor aparecerá minimizada. Para verla, busca "Sistema de Reservas LTIC" en la barra de tareas.

---

## 👥 ACCESO DESDE OTROS PCs (CLIENTES)

### Paso 1: Obtener la IP del Servidor

En el servidor, abre CMD y escribe:
```cmd
ipconfig
```

Busca la línea que dice **"Dirección IPv4"** en tu adaptador de red (Ethernet o Wi-Fi).
Ejemplo: `192.168.1.100`

**⚠️ ANOTA ESTA IP - LA NECESITARÁS**

### Paso 2: Acceder desde las PCs Clientes

En cualquier PC de la red local:

1. Abre un navegador (Chrome, Firefox, Edge)
2. Escribe en la barra de direcciones:
   ```
   http://192.168.1.100:8000
   ```
   (Reemplaza `192.168.1.100` con la IP de tu servidor)

3. Deberías ver la pantalla de login

### Paso 3: Crear Usuarios para Cada Persona

Cada persona debe tener su propia cuenta:

#### Método 1 - Desde la PC Servidor (Consola):

```cmd
cd C:\reservaulasltic
venv\Scripts\activate
python manage.py createsuperuser
```

Crea un usuario para cada persona:
- Usuario: `maria.lopez`
- Email: `maria@ltic.edu`
- Contraseña: (que la persona elija una segura)

#### Método 2 - Desde el Admin Web (MÁS FÁCIL):

1. Ve a: `http://192.168.1.100:8000/admin`
2. Inicia sesión con el usuario admin
3. Click en **"Usuarios"** → **"Agregar Usuario"**
4. Completa:
   - Nombre de usuario
   - Contraseña (2 veces)
5. Click en **"Guardar y continuar editando"**
6. En la siguiente pantalla:
   - Nombre y apellido (opcional)
   - Email (opcional)
   - **Permisos:** Marca ✅ "Estado de superusuario" si quieres que tenga acceso completo
7. Click en **"Guardar"**

**Repite esto para cada persona que usará el sistema.**

---

## 📊 VERIFICAR QUE TODO FUNCIONE BIEN

### Verificar Usuarios Conectados:

1. Abre **SQL Shell (psql)**
2. Ingresa estos comandos:

```sql
\c reservaulasltic
SELECT datname, usename, client_addr, state FROM pg_stat_activity WHERE datname = 'reservaulasltic';
```

Verás la lista de usuarios conectados con sus IPs.

### Verificar Tamaño de la Base de Datos:

```sql
SELECT pg_size_pretty(pg_database_size('reservaulasltic'));
```

---

## 💾 BACKUP DE LA BASE DE DATOS (IMPORTANTE)

### Backup Manual

1. Abre CMD
2. Ejecuta:

```cmd
set PGPASSWORD=12345
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U reservas_user -h localhost reservaulasltic > C:\backups\reservas_FECHA.sql
```

(Crea la carpeta `C:\backups\` antes)

### Backup Automático Diario

#### 1. Crear la carpeta de backups

Abre CMD y ejecuta:
```cmd
mkdir C:\backups
```

#### 2. Crear el script de backup

**Opción A - Usar el archivo listo:**

Ya tienes el archivo `backup_diario.bat` listo. Solo cópialo a `C:\reservaulasltic\`

**Opción B - Crearlo manualmente:**

1. Abre **Notepad** (Bloc de notas)
2. Copia y pega **exactamente** este código:

```batch
@echo off
set PGPASSWORD=12345
set FECHA=%date:~-4,4%%date:~-7,2%%date:~-10,2%
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U reservas_user -h localhost reservaulasltic > "C:\backups\reservas_%FECHA%.sql"
echo Backup completado: reservas_%FECHA%.sql
```

3. Click en **Archivo** → **Guardar como**
4. Nombre del archivo: `backup_diario.bat`
5. Tipo: **Todos los archivos (*.*)**
6. Ubicación: `C:\reservaulasltic\`
7. Click en **Guardar**

**⚠️ IMPORTANTE:** 
- Si tu PostgreSQL es versión diferente a 16, cambia el "16" en la ruta
- Para encontrar tu versión: ve a `C:\Program Files\PostgreSQL\` y verás la carpeta con el número
- La contraseña debe coincidir con la de `settings.py` (en este caso es `12345`)

#### 3. Probar el backup manualmente

1. Abre CMD
2. Ejecuta:
   ```cmd
   cd C:\reservaulasltic
   backup_diario.bat
   ```
3. Verifica que se creó el archivo en `C:\backups\reservas_YYYYMMDD.sql`

#### 4. Configurar backup automático diario

1. Presiona `Win + R` y escribe: `taskschd.msc`
2. En el panel derecho, click en **"Crear tarea básica"**
3. Completa así:
   - **Nombre:** `Backup Diario Base de Datos`
   - **Descripción:** `Backup automático de reservas a las 2:00 AM`
   - **Desencadenador:** Selecciona **"Diariamente"**
   - **Hora:** `02:00:00` (2:00 AM)
   - **Repetir cada:** `1 días`
   - **Acción:** Selecciona **"Iniciar un programa"**
   - **Programa:** `C:\reservaulasltic\backup_diario.bat`
   - **Iniciar en:** `C:\reservaulasltic\`
4. En la última pantalla, marca: ✅ **"Abrir el cuadro de diálogo Propiedades"**
5. Click en **Finalizar**
6. En la ventana de Propiedades que se abre:
   - Pestaña **"General"**: Marca ✅ **"Ejecutar tanto si el usuario inició sesión como si no"**
   - Pestaña **"Configuración"**: Marca ✅ **"Ejecutar la tarea lo antes posible después de un inicio programado perdido"**
7. Click en **Aceptar**

#### 5. Verificar que funciona

Para probar sin esperar hasta las 2 AM:

1. En el Programador de tareas, busca tu tarea "Backup Diario Base de Datos"
2. Clic derecho → **"Ejecutar"**
3. Espera 10 segundos
4. Abre `C:\backups\` y verifica que se creó un nuevo archivo .sql

**💡 Consejo:** Los backups ocupan espacio. Cada mes, elimina backups antiguos para liberar espacio.

### Restaurar un Backup

```cmd
set PGPASSWORD=12345
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U reservas_user -d reservaulasltic < "C:\backups\reservas_20250127.sql"
```

---

## 🔧 Comandos Útiles

```cmd
# Ver IP del servidor
ipconfig

# Activar entorno virtual
cd C:\reservaulasltic
venv\Scripts\activate

# Iniciar servidor manualmente
python manage.py runserver 0.0.0.0:8000

# Crear nuevo usuario
python manage.py createsuperuser

# Aplicar cambios a la base de datos (después de modificar modelos)
python manage.py makemigrations
python manage.py migrate

# Limpiar sesiones antiguas (hacer cada mes)
python manage.py clearsessions
```

---

## ❓ Solución de Problemas

### El servidor no inicia automáticamente

1. Verifica que el script `iniciar_servidor.bat` existe en `C:\reservaulasltic\`
2. Abre el Programador de tareas y revisa que la tarea esté ahí
3. Prueba ejecutar `iniciar_servidor.bat` manualmente a ver si funciona

### No puedo conectarme desde otro PC

**Paso 1:** Verifica que el servidor esté corriendo
- En el servidor, abre `http://localhost:8000` - ¿Funciona?

**Paso 2:** Verifica la IP del servidor
- En el servidor: `ipconfig` - Anota la IP

**Paso 3:** Prueba el ping
- Desde la PC cliente, abre CMD:
  ```cmd
  ping 192.168.1.100
  ```
  (Usa la IP de tu servidor)
- Si dice "Tiempo de espera agotado" → problema de red
- Si responde → el servidor está accesible

**Paso 4:** Verifica el firewall
- Ejecuta de nuevo (como admin):
  ```cmd
  netsh advfirewall firewall add rule name="Django Server LTIC" dir=in action=allow protocol=TCP localport=8000
  ```

**Paso 5:** Verifica que PostgreSQL acepte conexiones externas
- `postgresql.conf` debe tener: `listen_addresses = '*'`
- `pg_hba.conf` debe tener la línea que agregamos
- Reinicia el servicio PostgreSQL

### Error: "No module named 'psycopg2'"

```cmd
cd C:\reservaulasltic
venv\Scripts\activate
pip install psycopg2-binary
```

### Error: "FATAL: password authentication failed"

La contraseña en `settings.py` no coincide con PostgreSQL.

1. Cambia la contraseña en PostgreSQL:
   ```sql
   ALTER USER reservas_user WITH PASSWORD '12345';
   ```

2. Verifica que `settings.py` tenga la misma contraseña

### Puerto 8000 ya está en uso

Alguien más está usando el puerto. Usa otro:

```cmd
python manage.py runserver 0.0.0.0:8001
```

(Recuerda actualizar el firewall para el puerto 8001)

### El sistema está muy lento con muchos usuarios

1. Aumenta memoria de PostgreSQL:
   - Edita `postgresql.conf`:
   ```conf
   shared_buffers = 256MB
   max_connections = 100
   ```
   - Reinicia PostgreSQL

2. Limpia sesiones antiguas:
   ```cmd
   python manage.py clearsessions
   ```

---

## 📋 Checklist de Instalación

- [ ] Python instalado (con PATH)
- [ ] PostgreSQL instalado
- [ ] Base de datos `reservaulasltic` creada
- [ ] Usuario `reservas_user` creado en PostgreSQL
- [ ] Proyecto copiado a `C:\reservaulasltic\`
- [ ] Entorno virtual creado (`venv`)
- [ ] Dependencias instaladas (`pip install -r requirements.txt`)
- [ ] Migraciones aplicadas (`python manage.py migrate`)
- [ ] Superusuario creado (`python manage.py createsuperuser`)
- [ ] Firewall configurado (puerto 8000)
- [ ] PostgreSQL acepta conexiones de red (`postgresql.conf` y `pg_hba.conf`)
- [ ] PostgreSQL reiniciado
- [ ] Script `iniciar_servidor.bat` creado
- [ ] Auto-inicio configurado (carpeta de inicio o Programador de tareas)
- [ ] IP del servidor anotada
- [ ] Backup automático configurado
- [ ] Probado desde el servidor (`http://localhost:8000`)
- [ ] Probado desde otra PC (`http://IP_SERVIDOR:8000`)

---

## 📱 Acceso Rápido

**Desde el servidor:**
```
http://localhost:8000
http://localhost:8000/admin
```

**Desde PCs clientes:**
```
http://192.168.1.XXX:8000
http://192.168.1.XXX:8000/admin
```
(Reemplaza XXX con la IP del servidor)

---

## 🎯 Resumen de lo Más Importante

1. **✅ El servidor debe estar SIEMPRE encendido** para que los demás puedan acceder
2. **✅ Usa el script `iniciar_servidor.bat`** para no tener que iniciar manualmente
3. **✅ Cada persona debe tener su propia cuenta** (no compartir contraseñas)
4. **✅ Haz backups regulares** de la base de datos (con el script automático)
5. **✅ Todos los cambios se sincronizan automáticamente** entre todos los usuarios
6. **✅ Si cambias la IP del servidor**, avisa a todos los usuarios


