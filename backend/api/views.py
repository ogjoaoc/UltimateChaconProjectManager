from rest_framework import viewsets, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Q, Case, When, IntegerField
from .models import Project, ProjectMembership, UserStory, ProductBacklogItem
from .serializers import (
    ProjectSerializer, RegisterSerializer, UserSerializer,
    UserStorySerializer, ProductBacklogItemSerializer
)

User = get_user_model()

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Project.objects.filter(Q(owner=user) | Q(members=user)).distinct()

    def perform_create(self, serializer):
        project = serializer.save(owner=self.request.user)
        # Criar automaticamente uma associação ProjectMembership para o criador como PO
        ProjectMembership.objects.create(
            user=self.request.user,
            project=project,
            role='PO'
        )

class UserStoryViewSet(viewsets.ModelViewSet):
    serializer_class = UserStorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        project_id = self.kwargs.get('project_pk')  
        project = get_object_or_404(Project, id=project_id)
        if ProjectMembership.objects.filter(user=self.request.user, project=project).exists():
            return UserStory.objects.filter(project=project)
        return UserStory.objects.none()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        context['view'] = self
        context['project_id'] = self.kwargs.get('project_pk')  

class ProductBacklogItemViewSet(viewsets.ModelViewSet):
    serializer_class = ProductBacklogItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        project_id = self.kwargs.get('project_pk')
        if not project_id:
            return ProductBacklogItem.objects.none()

        project = get_object_or_404(Project, id=project_id)
        if ProjectMembership.objects.filter(user=self.request.user, project=project).exists():
            # HIGH -> MEDIUM -> LOW
            return ProductBacklogItem.objects.filter(project=project).annotate(
                priority_order=Case(
                    When(priority='HIGH', then=0),
                    When(priority='MEDIUM', then=1),
                    When(priority='LOW', then=2),
                    output_field=IntegerField(),
                )
            ).order_by('priority_order', '-created_at')
        return ProductBacklogItem.objects.none()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        project_id = self.kwargs.get('project_pk')
        context['project'] = get_object_or_404(Project, id=project_id)
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        project_id = self.kwargs.get('project_pk')
        project = get_object_or_404(Project, id=project_id)
        membership = ProjectMembership.objects.filter(
            user=self.request.user,
            project=project,
            role='PO'
        ).first()
        
        if not membership:
            raise PermissionDenied("Apenas o Product Owner pode gerenciar o backlog")
        
        serializer.save(project=project, created_by=self.request.user)



class AddMemberView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, project_id):
        project = get_object_or_404(Project, id=project_id)

        
        is_po = ProjectMembership.objects.filter(
            user=request.user,
            project=project,
            role='PO'
        ).exists()

        if not is_po:
            return Response(
                {"detail": "Apenas o Product Owner pode adicionar membros"},
                status=status.HTTP_403_FORBIDDEN
            )

        email = request.data.get("email")
        role = request.data.get("role")

        if not email or not role:
            return Response(
                {"detail": "Informe o email do usuário e o papel (role)"},
                status=400
            )

        if role not in ['SM', 'DEV']:
            return Response(
                {"detail": "Papel inválido. Use 'SM' para Scrum Master ou 'DEV' para Developer"},
                status=400
            )

        try:
            added_user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"detail": "Usuário não encontrado"}, status=404)

        if ProjectMembership.objects.filter(user=added_user, project=project).exists():
            return Response({"detail": "Usuário já é membro do projeto"}, status=400)

        ProjectMembership.objects.create(
            user=added_user,
            project=project,
            role=role
        )

        return Response(
            {"detail": f"{added_user.username} adicionado como {role} ao projeto {project.name}"},
            status=200
        )

@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register_view(request):
    username = request.data.get("username")
    email = request.data.get("email")
    
    if User.objects.filter(username=username).exists():
        return Response({"detail": "Username já está em uso"}, status=400)
    if User.objects.filter(email=email).exists():
        return Response({"detail": "Email já está em uso"}, status=400)

    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            "user": UserSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh)
        }, status=201)
    return Response(serializer.errors, status=400)

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def me_view(request):
    return Response(UserSerializer(request.user).data)
