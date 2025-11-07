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


class UserStory(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="user_stories")
    title = models.CharField(max_length=200)
    description = models.TextField()
    acceptance_criteria = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return self.title

class ProductBacklogItem(models.Model):
    PRIORITY_CHOICES = [
        ('HIGH', 'Alta'),
        ('MEDIUM', 'Média'),
        ('LOW', 'Baixa'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="backlog_items")
    user_story = models.ForeignKey(UserStory, on_delete=models.CASCADE, related_name="backlog_items")
    title = models.CharField(max_length=200)
    description = models.TextField()
    priority = models.CharField(max_length=6, choices=PRIORITY_CHOICES, default='MEDIUM')
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

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