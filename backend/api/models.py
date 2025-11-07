from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    bio = models.TextField(blank=True)
    # birth_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.username

# um usuário pode ter vários projetos, e cada projeto pode ter vários usuários com papéis diferentes
# ManyToManyFiled
class Project(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        'User', on_delete=models.CASCADE, related_name="owned_projects"
    )
    members = models.ManyToManyField(
        'User', through='ProjectMembership', related_name="projects"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class ProjectMembership(models.Model):
    ROLE_CHOICES = [
        ('PO', 'Product Owner'),
        ('SM', 'Scrum Master'),
        ('DEV', 'Developer'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    role = models.CharField(max_length=3, choices=ROLE_CHOICES)

    class Meta:
        unique_together = ('user', 'project')  # não pode ter usuário duplicado no mesmo projeto

    def __str__(self):
        return f"{self.user.username} como {self.get_role_display()} em {self.project.name}"


class Task(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    done = models.BooleanField(default=False)
    
    assigned_to = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="tasks"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title

'''
Aqui é bem importante, os models são só classes do python, que depois são 
passados pra tabela no banco de dados. Cada atributo da classe vira uma coluna, e cada 
instância é uma linha. Isso ai é safe

A cada migration o django pega essas classes e cria as tabelas automaticamente no banco
(sqlite)

O fluxo normal do django é, define os models que a gente por aqui
Cria as migrations
Faz as views 
Expões as urls
O front é alimentado pelas urls

Esse arquivo é literalmente o esqueleto
'''