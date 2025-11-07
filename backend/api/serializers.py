from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError
from .models import Project, ProjectMembership, UserStory, ProductBacklogItem

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

    class Meta:
        model = Project
        fields = ["id", "name", "description", "owner", "members"]

    def get_members(self, obj):
        memberships = ProjectMembership.objects.filter(project=obj)
        return [{
            **UserSerializer(m.user).data,
            'role': m.role
        } for m in memberships]

    

class UserStorySerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = UserStory
        fields = ["id", "title", "description", "acceptance_criteria", "created_at", "created_by"]

    def to_internal_value(self, data):
        for field in ['title', 'description']:
            if field not in data or not str(data.get(field)).strip():
                raise ValidationError({field: f"O campo {field} é obrigatório"})
        
        for field in ['title', 'description', 'acceptance_criteria']:
            if field in data and data[field] is not None:
                data[field] = str(data[field]).strip()
        
        return super().to_internal_value(data)

    def create(self, validated_data):
        request = self.context.get('request')
        project_id = self.context.get('project_id')  # Pegando do contexto ao invés da view

        if not request:
            raise ValidationError({"detail": "Contexto inválido da requisição"})

        if not project_id:
            raise ValidationError({"detail": "ID do projeto não especificado"})
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            raise ValidationError({"detail": f"Projeto {project_id} não encontrado"})
        
        membership = ProjectMembership.objects.filter(
            user=request.user, 
            project=project,
            role='PO'
        ).first()
        
        if not membership:
            raise ValidationError({
                "detail": "Apenas o Product Owner pode gerenciar histórias de usuário"
            })
        
        return UserStory.objects.create(
            **validated_data,
            project=project,
            created_by=request.user
        )

class ProductBacklogItemSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    user_story = UserStorySerializer(read_only=True)
    user_story_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = ProductBacklogItem
        fields = ["id", "title", "description", "priority", "created_at", "created_by", "user_story", "user_story_id"]

    def validate(self, data):
        request = self.context.get('request')
        project = self.context.get('project')
        
        if not project:
            raise ValidationError("Projeto não especificado")

        membership = ProjectMembership.objects.filter(user=request.user, project=project).first()
        if not membership or membership.role != "PO":
            raise ValidationError("Apenas o Product Owner pode gerenciar o backlog.")

        user_story = UserStory.objects.filter(id=data['user_story_id'], project=project).first()
        if not user_story:
            raise ValidationError("História de usuário não encontrada neste projeto")

        return data



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