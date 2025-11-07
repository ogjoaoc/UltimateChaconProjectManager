from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from rest_framework_nested import routers as nested_routers
from api.views import (
    ProjectViewSet, AddMemberView, register_view, me_view,
    UserStoryViewSet, ProductBacklogItemViewSet
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = routers.DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='projects')

# URLs aninhadas para histórias de usuário e backlog
projects_router = nested_routers.NestedDefaultRouter(router, r'projects', lookup='project')
projects_router.register(r'user-stories', UserStoryViewSet, basename='project-user-stories')
projects_router.register(r'backlog', ProductBacklogItemViewSet, basename='project-backlog')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/register/', register_view, name='register'),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/users/me/', me_view, name='me'),
    path('api/', include(router.urls)),
    path('api/', include(projects_router.urls)),
    path("api/projects/<int:project_id>/add_member/", AddMemberView.as_view(), name="add-member")
]


'''
Aqui temos as "conexões" de tudo
esse arquivo é quem diz pro django como entender
a chamada por exemplo de /api/projects/

Explicando os imports:
admin = rota padrão do django Admin (/admin/)

path, include = funções pra definir urls

routers = cria rotas rest automaticamente a partir de ViewSets

ProjectViewSet, TaskViewSet = nossas views principais (CRUD de projetos e tarefas)

register_view, me_view = views de autenticação

TokenObtainPairView, TokenRefreshView = views do SimpleJWT pra login e refresh de toke

As rotas são meio intuitivas de saber o que cada uma faz, acho válido só
esclarescer aqui que com o router, as rotas são criadas
automaticamente pros ViewSets, que faciita muito a vida

Exemplo de uso de rotas:
Usuário se cadastra: POST /api/auth/register/

Usuário faz login: POST /api/auth/login/ → recebe access e refresh

React envia Authorization: Bearer <access> em cada requisição:

/api/users/me/ → pega dados do usuário

/api/projects/ → lista e cria projetos

/api/tasks/ → lista e cria tarefas

'''