import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch, clearTokens } from "@/api/client";
import { LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import UserStoriesTab from "@/components/project/UserStoriesTab";
import ProductBacklogTab from "@/components/project/ProductBacklogTab";
import SprintsTab from "@/components/project/SprintsTab";
import SprintPlanTab from "@/components/project/SprintsTab";
import MembersTab from "@/components/project/MembersTab";

type User = {
  id: number;
  username: string;
  email?: string;
  bio?: string;
};

type Project = {
  id: number;
  name: string;
  description?: string;
  owner: User;
  members: (User & { role: string })[];
};

const ProjectPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("user-stories");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [projectData, userData] = await Promise.all([
          apiFetch(`/api/projects/${id}/`),
          apiFetch("/api/users/me/"),
        ]);
        setProject(projectData);
        setCurrentUser(userData);
      } catch (err: any) {
        toast.error("Erro ao carregar projeto");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  if (loading) return <div>Carregando...</div>;
  if (!project || !currentUser) return null;

  const isProductOwner = project.owner.id === currentUser.id;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-2">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)} title="Voltar">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <Button variant="ghost" onClick={() => { clearTokens(); navigate('/auth'); }} title="Sair">
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="user-stories">Histórias de Usuário</TabsTrigger>
          <TabsTrigger value="product-backlog">Backlog do Produto</TabsTrigger>
          <TabsTrigger value="sprints">Sprints</TabsTrigger>
          <TabsTrigger value="sprint-plan">Plano da Sprint</TabsTrigger>
          <TabsTrigger value="members">Membros</TabsTrigger>
        </TabsList>

        <TabsContent value="user-stories">
          <UserStoriesTab projectId={project.id} isProductOwner={isProductOwner} />
        </TabsContent>

        <TabsContent value="product-backlog">
          <ProductBacklogTab projectId={project.id} isProductOwner={isProductOwner} />
        </TabsContent>

        <TabsContent value="sprints">
          <SprintsTab projectId={project.id} isProductOwner={isProductOwner} />
        </TabsContent>

        <TabsContent value="sprint-plan">
          <SprintPlanTab projectId={project.id} isProductOwner={isProductOwner} />
        </TabsContent>

        <TabsContent value="members">
          <MembersTab projectId={project.id} isProductOwner={isProductOwner} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectPage;
