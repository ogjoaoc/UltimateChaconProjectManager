from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError
from .models import Project, Task, ProjectMembership

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "bio", "is_superuser"]

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields = ("username", "email", "password", "bio")

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email"),
            password=validated_data["password"],
            bio=validated_data.get("bio", "")
        )
        return user

class ProjectSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    owner = UserSerializer(read_only=True)
    tasks = serializers.SerializerMethodField()  

    class Meta:
        model = Project
        fields = ["id", "name", "description", "owner", "members", "tasks"]

    def get_members(self, obj):
        memberships = ProjectMembership.objects.filter(project=obj)
        return [{
            **UserSerializer(m.user).data,
            'role': m.role
        } for m in memberships]

    def get_tasks(self, obj):
        tasks = Task.objects.filter(project=obj)
        return TaskSerializer(tasks, many=True).data

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = "__all__"

    def validate_project(self, project):
        request = self.context.get('request')
        membership = ProjectMembership.objects.filter(user=request.user, project=project).first()
        if not membership or membership.role not in ["PO", "SM"]:
            raise ValidationError("Você não tem permissão para adicionar tarefas neste projeto.")
            

'''
Serializer ajuda na conversa entre o front e back
Ele converte de python pra JSON
de JSON pra python

Serializers é um import do Django REST framework
Por exemplo, se queremos retornar o dono de algum projeto
ele retorna como json 
{
  "id": 1,
  "username": "jose",
  "email": "jose@gmail.com",
  "first_name": "",
  "last_name": ""
}

O de registro em especial é útil pro cadastro. Ele evita
que a senha apareça no json da resposta. create_user() 
criptografa a senha automaticamente (django é lindo)

Toda vez que for criar modelo, tem que vir
aqui fazer o serializer correspondente.


'''