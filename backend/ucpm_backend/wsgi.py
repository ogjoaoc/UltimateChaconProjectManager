"""
WSGI config for ucsm_backend project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucpm_backend.settings')

application = get_wsgi_application()

'''
Só mais um arquivo blackbox que diz pro django
como se inicializar
'''