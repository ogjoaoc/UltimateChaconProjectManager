#!/usr/bin/env python3
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ucsm_backend.settings")
django.setup()

from api.models import Project, ProjectMembership, User
USERNAME = "ogjoaoc"   # usuário que será SM/PO no projeto
PROJECT_ID = 2              # ID do projeto alvo
ROLE = "SM"                 # papel que o usuário terá no projeto: "PO", "SM" ou "DEV"
# -----------------------

try:
    user = User.objects.get(username=USERNAME)
except User.DoesNotExist:
    print(f"Usuário '{USERNAME}' não encontrado")
    exit(1)

try:
    project = Project.objects.get(id=PROJECT_ID)
except Project.DoesNotExist:
    print(f"Projeto com ID {PROJECT_ID} não encontrado")
    exit(1)

# Checa se já existe
membership, created = ProjectMembership.objects.get_or_create(
    user=user,
    project=project,
    defaults={"role": ROLE}
)

if created:
    print(f"✅ {user.username} adicionado ao projeto '{project.name}' como {ROLE}")
else:
    print(f"⚠️ {user.username} já é membro do projeto '{project.name}' com role {membership.role}")
    membership.role = ROLE
    membership.save()
    print(f"♻️ Role atualizada para {ROLE}")
