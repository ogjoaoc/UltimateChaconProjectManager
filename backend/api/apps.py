from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

'''
Esse arquivo é o que o django usa pra registrar
e configurar a "api" 

ele não é muito importante por agora, mas é bom
saber que ele econfigura a api pro django poder acessar
os outros arquivos/diretório
'''