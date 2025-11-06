"""
ASGI config for ucsm_backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ucpm_backend.settings')

application = get_asgi_application()


'''
Isso aqui é tipo a porta do server pra aplicação 
aqui a gente só seta qual é o arquivo main de configuração
do django e cria a variável application

Isso é literalmente o objeto que o servidor web vai usar pra enviar 
as requisições pro Django.

Resumindo, quando o React faz um GET/algumacoisa/, o servidor
passa a requisição pra application antes de tudo

Acho que da pra assumir que isso é meio blackbox, só aceita

O importante é saber que sem esse arquivo, 
o django não consegue iniciar o servidor nem 
receber chamadas do frontend
'''