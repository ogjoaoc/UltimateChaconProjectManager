from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model
from api.models import Project, ProjectMembership, ProductBacklogItem, Sprint, UserStory

User = get_user_model()


class SprintFlowTests(APITestCase):
    """
    Testa o fluxo completo de criação de Sprint e adição de itens ao Sprint Backlog.
    Cobre as user stories US-008 e US-009.
    """

    def setUp(self):
        # Criação dos usuários
        self.po = User.objects.create_user(username="po", password="1234")
        self.sm = User.objects.create_user(username="sm", password="1234")
        self.dev = User.objects.create_user(username="dev", password="1234")

        # Criação do projeto
        self.project = Project.objects.create(
            name="Projeto Teste",
            description="Projeto para testes de sprint",
            owner=self.po
        )

        # Papéis
        ProjectMembership.objects.create(user=self.po, project=self.project, role="PO")
        ProjectMembership.objects.create(user=self.sm, project=self.project, role="SM")
        ProjectMembership.objects.create(user=self.dev, project=self.project, role="DEV")

        # Criar uma UserStory para associar os ProductBacklogItems (obrigatório pela nova regra)
        self.user_story = UserStory.objects.create(
            project=self.project,
            title="US-001 - Exemplo",
            description="User story de exemplo para testes",
            created_by=self.po
        )

        # Itens do Product Backlog vinculados à user_story
        self.item1 = ProductBacklogItem.objects.create(
            project=self.project,
            title="Item 1",
            description="Primeiro item",
            user_story=self.user_story,
            created_by=self.po
        )
        self.item2 = ProductBacklogItem.objects.create(
            project=self.project,
            title="Item 2",
            description="Segundo item",
            user_story=self.user_story,
            created_by=self.po
        )

        # Endpoints
        self.sprint_url = reverse("sprints-list")  # /api/sprints/
        self.client_sm = APIClient()
        self.client_po = APIClient()
        self.client_dev = APIClient()
        self.client_sm.force_authenticate(user=self.sm)
        self.client_po.force_authenticate(user=self.po)
        self.client_dev.force_authenticate(user=self.dev)

    def test_01_sm_can_create_sprint(self):
        """✅ O Scrum Master deve conseguir criar uma sprint."""
        data = {
            "project": self.project.id,
            "name": "Sprint 1",
            "start_date": "2025-11-10",
            "end_date": "2025-11-20"
        }
        response = self.client_sm.post(self.sprint_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Sprint.objects.filter(name="Sprint 1").exists())

    def test_02_po_cannot_create_sprint(self):
        """🚫 O Product Owner não pode criar sprint."""
        data = {
            "project": self.project.id,
            "name": "Sprint Bloqueada",
            "start_date": "2025-11-10",
            "end_date": "2025-11-20"
        }
        response = self.client_po.post(self.sprint_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Sprint.objects.filter(name="Sprint Bloqueada").exists())

    def test_03_dev_cannot_create_sprint(self):
        """🚫 O Developer não pode criar sprint."""
        data = {
            "project": self.project.id,
            "name": "Sprint Dev",
            "start_date": "2025-11-10",
            "end_date": "2025-11-20"
        }
        response = self.client_dev.post(self.sprint_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Sprint.objects.filter(name="Sprint Dev").exists())

    def test_04_sprint_requires_valid_dates(self):
        """🚫 O sistema deve recusar sprint com datas inválidas (start > end)."""
        data = {
            "project": self.project.id,
            "name": "Sprint Inválida",
            "start_date": "2025-12-10",
            "end_date": "2025-12-01"
        }
        response = self.client_sm.post(self.sprint_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_05_sm_can_add_items_to_sprint(self):
        """✅ O Scrum Master pode adicionar itens do Product Backlog à Sprint."""
        # Cria sprint primeiro
        sprint = Sprint.objects.create(
            project=self.project,
            name="Sprint de Teste",
            start_date="2025-11-10",
            end_date="2025-11-20"
        )

        url = reverse("sprints-add-items", args=[sprint.id])  # /api/sprints/{id}/add-items/
        data = {"items": [self.item1.id, self.item2.id]}

        response = self.client_sm.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.item1.refresh_from_db()
        self.assertEqual(self.item1.sprint, sprint)

    def test_06_po_cannot_add_items(self):
        """🚫 O Product Owner não pode adicionar itens à Sprint."""
        sprint = Sprint.objects.create(
            project=self.project,
            name="Sprint Proibida",
            start_date="2025-11-10",
            end_date="2025-11-20"
        )

        url = reverse("sprints-add-items", args=[sprint.id])
        data = {"items": [self.item1.id]}
        response = self.client_po.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.item1.refresh_from_db()
        self.assertIsNone(self.item1.sprint)

    def test_07_add_items_rejects_invalid_data(self):
        """🚫 Deve rejeitar payload inválido (items não é lista)."""
        sprint = Sprint.objects.create(
            project=self.project,
            name="Sprint Inválida",
            start_date="2025-11-10",
            end_date="2025-11-20"
        )

        url = reverse("sprints-add-items", args=[sprint.id])
        data = {"items": "isso_nao_e_lista"}  # tipo errado
        response = self.client_sm.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
