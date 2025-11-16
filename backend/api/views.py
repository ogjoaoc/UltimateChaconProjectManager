from rest_framework import viewsets, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Q, Case, When, IntegerField
from .models import Project, ProjectMembership, UserStory, ProductBacklogItem, Sprint
from .serializers import (
    ProjectSerializer, RegisterSerializer, UserSerializer,
    UserStorySerializer, ProductBacklogItemSerializer, SprintSerializer
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
        # Garante que o criador seja atribuído como Scrum Master (SM).
        # Usamos update_or_create para sobrescrever qualquer membership pré-existente
        # (por exemplo se um script ou lógica externa criou uma entrada PO).
        ProjectMembership.objects.update_or_create(
            user=self.request.user,
            project=project,
            defaults={'role': 'SM'}
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
        return context

    def destroy(self, request, *args, **kwargs):
        project_id = self.kwargs.get('project_pk')
        project = get_object_or_404(Project, id=project_id)
        membership = ProjectMembership.objects.filter(
            user=request.user,
            project=project,
            role='PO'
        ).first()

        if not membership:
            return Response({"detail": "Apenas o Product Owner pode remover histórias de usuário"}, status=status.HTTP_403_FORBIDDEN)

        return super().destroy(request, *args, **kwargs)

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

        # Agora somente o Scrum Master (SM) pode adicionar membros
        is_sm = ProjectMembership.objects.filter(
            user=request.user,
            project=project,
            role='SM'
        ).exists()

        if not is_sm:
            return Response(
                {"detail": "Apenas o Scrum Master pode adicionar membros"},
                status=status.HTTP_403_FORBIDDEN
            )

        email = request.data.get("email")
        role = request.data.get("role")

        if not email or not role:
            return Response(
                {"detail": "Informe o email do usuário e o papel (role)"},
                status=400
            )

        # Permitir também atribuir Product Owner (PO) via convite
        if role not in ['PO', 'SM', 'DEV']:
            return Response(
                {"detail": "Papel inválido. Use 'PO' para Product Owner, 'SM' para Scrum Master ou 'DEV' para Developer"},
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
class RemoveMemberView(APIView):
    """
    View personalizada para remover um membro de um projeto.
    Espera um POST com {'user_id': <id_do_usuario>}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, project_id):
        # 1. Encontra o projeto
        project = get_object_or_404(Project, id=project_id)
        # 2. Verifica se o usuário que faz a requisição é Scrum Master (SM)
        is_sm = ProjectMembership.objects.filter(
            user=request.user,
            project=project,
            role='SM'
        ).exists()

        if not is_sm:
            return Response(
                {"detail": "Apenas o Scrum Master pode remover membros."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 3. Pega o ID do usuário a ser removido (do corpo da requisição)
        user_id_to_remove = request.data.get('user_id')
        if not user_id_to_remove:
            return Response(
                {"detail": "O 'user_id' do membro é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 4. Impede a remoção do owner do projeto (dono real)
        # 4. Impede a remoção do owner do projeto (dono real)
        try:
            target_id_int = int(user_id_to_remove)
        except (TypeError, ValueError):
            return Response({"detail": "'user_id' inválido."}, status=status.HTTP_400_BAD_REQUEST)

        if project.owner and project.owner.id == target_id_int:
            return Response(
                {"detail": "O owner do projeto não pode ser removido."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 5. Encontra o usuário que será removido
        user_to_remove = get_object_or_404(User, id=user_id_to_remove)

        # 6. Encontra o 'vínculo' (ProjectMembership) e o deleta
        try:
            membership = ProjectMembership.objects.get(
                project=project,
                user=user_to_remove
            )
            membership.delete()
            return Response(
                {"detail": "Membro removido com sucesso."},
                status=status.HTTP_200_OK
            )
        except ProjectMembership.DoesNotExist:
            return Response(
                {"detail": "Este usuário não é membro do projeto."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"detail": f"Um erro ocorreu: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SprintViewSet(viewsets.ModelViewSet):
    """
    ViewSet responsável por gerenciar Sprints.
    Permite listar, criar, atualizar e remover sprints de um projeto.
    Somente o Scrum Master (SM) pode criar novas sprints e adicionar itens.
    """
    serializer_class = SprintSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Retorna apenas as sprints do projeto específico que o usuário participa.
        """
        project_id = self.kwargs.get('project_pk')
        if not project_id:
            return Sprint.objects.none()
        
        project = get_object_or_404(Project, id=project_id)
        
        # Verifica se o usuário é membro do projeto
        if ProjectMembership.objects.filter(user=self.request.user, project=project).exists():
            return Sprint.objects.filter(project=project).order_by('-created_at')
        
        return Sprint.objects.none()

    def get_serializer_context(self):
        """
        Adiciona o project_id ao contexto do serializer.
        """
        context = super().get_serializer_context()
        context['project_id'] = self.kwargs.get('project_pk')
        return context

    def perform_create(self, serializer):
        """
        Cria uma nova sprint apenas se o usuário for Scrum Master (SM) do projeto.
        """
        project_id = self.kwargs.get('project_pk')
        project = get_object_or_404(Project, id=project_id)
        # Agora permitimos que qualquer membro do projeto crie/edite sprints.
        membership = ProjectMembership.objects.filter(
            user=self.request.user,
            project=project
        ).first()

        if not membership:
            raise PermissionDenied("Apenas membros do projeto podem criar sprints neste projeto.")

        serializer.save(project=project, created_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="active")
    def active_sprints(self, request, project_pk=None):
        """
        Retorna apenas as sprints ativas onde o usuário atual faz parte da equipe.
        Uma sprint é considerada ativa se:
        - A data atual estiver entre start_date e end_date
        - O status não for COMPLETED
        """
        from datetime import date
        
        project = get_object_or_404(Project, id=project_pk)
        
        # Verifica se o usuário é membro do projeto
        if not ProjectMembership.objects.filter(user=request.user, project=project).exists():
            return Response([], status=status.HTTP_200_OK)
        
        today = date.today()
        user_id = str(request.user.id)
        
        # Filtra sprints ativas (não concluídas e dentro do período)
        active_sprints = Sprint.objects.filter(
            project=project,
            start_date__lte=today,
            end_date__gte=today
        ).exclude(status='COMPLETED')
        
        # Filtra apenas sprints onde o usuário está na equipe
        user_sprints = []
        for sprint in active_sprints:
            if sprint.team:
                team_ids = sprint.team.split(',')
                if user_id in team_ids:
                    user_sprints.append(sprint)
            # Se não tem equipe definida, inclui para todos os membros do projeto
            else:
                user_sprints.append(sprint)
        
        serializer = self.get_serializer(user_sprints, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="add-items")
    def add_items(self, request, pk=None):
        """
        Adiciona itens do Product Backlog ao Sprint Backlog.
        Apenas o Scrum Master do projeto pode executar essa ação.

        Espera no corpo da requisição:
        {
            "items": [1, 2, 3]
        }
        """
        sprint = get_object_or_404(Sprint, pk=pk)
        project = sprint.project

        # Verifica se o usuário é Scrum Master do projeto
        if not ProjectMembership.objects.filter(user=request.user, project=project, role="SM").exists():
            return Response(
                {"detail": "Apenas o Scrum Master pode adicionar itens à sprint."},
                status=status.HTTP_403_FORBIDDEN
            )

        items = request.data.get("items")
        if not isinstance(items, list):
            return Response(
                {"detail": "O campo 'items' deve ser uma lista de IDs de itens do backlog."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Seleciona apenas itens válidos (pertencentes ao projeto e sem sprint associada)
        backlog_items = ProductBacklogItem.objects.filter(
            id__in=items,
            project=project,
            sprint__isnull=True
        )

        if not backlog_items.exists():
            return Response(
                {"detail": "Nenhum item válido encontrado para adicionar."},
                status=status.HTTP_400_BAD_REQUEST
            )

        count = backlog_items.update(sprint=sprint)

        return Response(
            {"detail": f"{count} item(s) adicionados ao Sprint Backlog com sucesso."},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"], url_path="end-sprint")
    def end_sprint(self, request, project_pk=None, pk=None):
        """
        Encerra uma sprint, marcando-a como COMPLETED.
        Pode ser executado por:
        - Scrum Master a qualquer momento
        - Qualquer membro da equipe após o prazo da sprint expirar
        """
        from datetime import date
        
        sprint = self.get_object()
        project = sprint.project

        # Verifica se o usuário é membro do projeto
        membership = ProjectMembership.objects.filter(
            user=request.user,
            project=project
        ).first()

        if not membership:
            return Response(
                {"detail": "Você não é membro deste projeto."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verifica se pode encerrar a sprint
        is_scrum_master = membership.role == "SM"
        is_sprint_ended = date.today() > sprint.end_date
        
        if not (is_scrum_master or is_sprint_ended):
            return Response(
                {"detail": "Apenas o Scrum Master pode encerrar a sprint antes do prazo, ou qualquer membro após o prazo expirar."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verifica se a sprint já está concluída
        if sprint.status == 'COMPLETED':
            return Response(
                {"detail": "Esta sprint já foi encerrada."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Remove a associação dos itens de backlog com a sprint
        ProductBacklogItem.objects.filter(sprint=sprint).update(sprint=None)
        
        # Marca a sprint como concluída
        sprint.status = 'COMPLETED'
        sprint.save()

        return Response(
            {"detail": f"Sprint '{sprint.name}' encerrada com sucesso."},
            status=status.HTTP_200_OK
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

@api_view(["GET", "PATCH"])
@permission_classes([permissions.IsAuthenticated])
def me_view(request):
    user = request.user
    
    # GET: Retorna os dados do usuário
    if request.method == "GET":
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    # PATCH: Atualiza os dados do usuário
    elif request.method == "PATCH":
        serializer = UserSerializer(user, data=request.data, partial=True)
        
        # Valida e salva as alterações
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_200_OK)
        
        # Se os dados forem inválidos, retorna os erros
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


