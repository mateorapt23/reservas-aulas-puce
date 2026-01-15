## 🚀 Instalación y Configuración

1. **Clonar el repositorio**

```bash
git clone https://github.com/tu-usuario/mi-proyecto-django.git
cd mi-proyecto-django

Crear y activar un entorno virtual

# Linux / macOS
python3 -m venv env
source env/bin/activate

Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Windows
python -m venv env O py -m venv env
env\Scripts\activate


pip install django
pip freeze > requirements.txt

Instalar dependencias
pip install -r requirements.txt

python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
