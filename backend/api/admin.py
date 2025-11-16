from django.contrib import admin
from .models import Project, Task

admin.site.register(Project)
admin.site.register(Task)

''' 
esse arquivo serve pra registrar os modelos no "painel de admin"
do django. 

Ele pega os nossos modelos tipo Project, Task, User em tabelas
interativos dentro do painel /admin, sem precisar de interface

http://127.0.0.1:8000/
'''