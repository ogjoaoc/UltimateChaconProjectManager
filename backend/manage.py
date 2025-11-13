#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucpm_backend.settings')
    
    try:
        from django.core.management import execute_from_command_line
        import django
        django.setup()  
        from django.contrib.auth import get_user_model
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django..."
        ) from exc

    User = get_user_model()
    
    if not User.objects.filter(username="admin").exists():
        User.objects.create_superuser(username="admin", email="admin@gmail.com", password="admin")
        print("Superuser 'admin' criado!")
    
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
