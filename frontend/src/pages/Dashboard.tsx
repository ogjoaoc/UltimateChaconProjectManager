// src/pages/Dashboard.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearTokens } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { LogOut, TrendingUp, User as UserIcon } from "lucide-react";
import ProfileModal from "@/components/ui/ProfileModal";

// --- TIPAGENS ---
type User = {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: "PO" | "SM" | "DEV";
  bio?: string;
  is_superuser?: boolean;
};

type Project = {
  id: number;
  name: string;
  description?: string;
  owner: User;
  members: (User & { role?: string })[];
  status: "ACTIVE" | "CONCLUDED";
  concluded_at?: string | null;
};

// --- FORMULÁRIO DE CRIAÇÃO DE PROJETO ---
const CreateProjectForm = ({ onProjectCreated }: { onProjectCreated: () => void }) => {
  const [creating, setCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");

  async function handleCreateProject(e?: React.FormEvent) {
    e?.preventDefault();
    if (!newProjectName.trim()) return toast.error("Nome do projeto vazio");
    setCreating(true);
    try {
      const payload = { name: newProjectName.trim(), description: newProjectDesc.trim() };
      await apiFetch("/api/projects/", { method: "POST", body: JSON.stringify(payload) });
      toast.success("Projeto criado");
      setNewProjectName("");
      setNewProjectDesc("");
      onProjectCreated();
    } catch (err: any) {
      toast.error(err.detail || "Erro criando projeto");
    } finally {
      setCreating(false);
    }
  }

  return (
    <form onSubmit={handleCreateProject} className="flex flex-col gap-3 w-full">
      <Input
        value={newProjectName}
        onChange={(e) => setNewProjectName(e.target.value)}
        placeholder="Nome do projeto"
      />
      <Input
        value={newProjectDesc}
        onChange={(e) => setNewProjectDesc(e.target.value)}
        placeholder="Descrição (opcional)"
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={creating} className="flex-1">
          {creating ? "Criando..." : "Criar"}
        </Button>
        <Button
          variant="ghost"
          type="button"
          onClick={() => { setNewProjectName(""); setNewProjectDesc(""); }}
          className="flex-1"
        >
          Limpar
        </Button>
      </div>
    </form>
  );
};

// --- DASHBOARD ---
const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); // Novo estado para o modal de perfil

  const [openAddProjectId, setOpenAddProjectId] = useState<number | null>(null);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"PO" | "SM" | "DEV">("DEV");
  const [adding, setAdding] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [projectToClose, setProjectToClose] = useState<Project | null>(null);
  const [isClosingProject, setIsClosingProject] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const me: User = await apiFetch("/api/users/me/");
        setUser(me);

        const projs: Project[] = await apiFetch("/api/projects/");
        setProjects(projs);
      } catch (err: any) {
        toast.error(err.detail || err.message || "Erro ao carregar dashboard");
        clearTokens();
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  async function fetchProjects() {
    try {
      const projs: Project[] = await apiFetch("/api/projects/");
      setProjects(projs);
    } catch (err: any) {
      console.error("Erro ao carregar projetos:", err);
      toast.error(err.message || err.detail || "Erro ao carregar projetos");
    }
  }

  async function handleDeleteProject() {
    if (!projectToDelete) return;
    const projectId = projectToDelete.id;
    const projectName = projectToDelete.name;
    setIsDeletingProject(true);
    try {
      await apiFetch(`/api/projects/${projectId}/`, { method: "DELETE" });
      toast.success(`Projeto "${projectName}" removido`);
      setProjects((p) => p.filter((x) => x.id !== projectId));
      setProjectToDelete(null);
    } catch (err: any) {
      console.error("Erro removendo projeto:", err);
      toast.error(err.message || err.detail || "Erro ao remover projeto");
    } finally {
      setIsDeletingProject(false);
    }
  }

  async function handleCloseProject() {
    if (!projectToClose) return;
    setIsClosingProject(true);
    try {
      const updatedProject = await apiFetch(`/api/projects/${projectToClose.id}/close/`, { method: "POST" });
      toast.success(`Projeto "${projectToClose.name}" encerrado`);
      setProjects((prev) => prev.map((proj) => (proj.id === updatedProject.id ? updatedProject : proj)));
      setProjectToClose(null);
    } catch (err: any) {
      console.error("Erro encerrando projeto:", err);
      toast.error(err.message || err.detail || "Erro ao encerrar projeto");
    } finally {
      setIsClosingProject(false);
    }
  }

  async function handleAddMember(projectId: number) {
    if (!addEmail.trim()) return toast.error("Email vazio");
    if (!addRole) return toast.error("Selecione o papel do membro");
    
    setAdding(true);
    try {
      await apiFetch(`/api/projects/${projectId}/add_member/`, {
        method: "POST",
        body: JSON.stringify({ 
          email: addEmail.trim(),
          role: addRole
        }),
      });
      toast.success("Membro adicionado à equipe");
      setAddEmail("");
      setAddRole("DEV");
      setOpenAddProjectId(null);
      await fetchProjects();
    } catch (err: any) {
      console.error("Erro adicionando membro:", err);
      toast.error(err.message || err.detail || "Erro ao adicionar membro");
    } finally {
      setAdding(false);
    }
  }

  function handleLogout() {
    clearTokens();
    navigate("/auth");
  }

  const visibleProjects = useMemo(() => {
    if (!user) return [];
    return projects.filter((proj) =>
      proj.members.some((m) => m.id === user.id) || proj.owner.id === user.id
    );
  }, [projects, user]);

  const activeProjectsList = useMemo(
    () => visibleProjects.filter((proj) => proj.status !== "CONCLUDED"),
    [visibleProjects]
  );
  const concludedProjects = useMemo(
    () => visibleProjects.filter((proj) => proj.status === "CONCLUDED"),
    [visibleProjects]
  );
  const activeProjectsCount = activeProjectsList.length;

  const renderProjectCard = (proj: Project) => {
    const isOwner = proj.owner.id === user?.id;
    const isConcluded = proj.status === "CONCLUDED";
    const concludedDateLabel = proj.concluded_at
      ? new Date(proj.concluded_at).toLocaleDateString("pt-BR")
      : null;

    return (
      <Card key={proj.id} className="flex flex-col justify-between h-full min-h-[240px]">
        <CardHeader>
          <div className="flex justify-between items-start gap-2">
            <div className="flex-grow min-w-0">
              <h3 className="text-lg font-medium">{proj.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{proj.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Owner: {proj.owner.username} | Membros: {proj.members.length}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Badge variant={isConcluded ? "outline" : "secondary"}>
                {isConcluded ? "Concluído" : "Ativo"}
              </Badge>
              {isOwner && (
                <div className="flex flex-wrap justify-end gap-2">
                  {!isConcluded && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProjectToClose(proj)}
                      className="flex-shrink-0"
                    >
                      Encerrar
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setProjectToDelete(proj)}
                    className="flex-shrink-0"
                  >
                    Remover
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground">Membros: {proj.members.length}</p>
          {isConcluded && concludedDateLabel && (
            <p className="text-xs text-muted-foreground mt-2">Concluído em {concludedDateLabel}</p>
          )}
        </CardContent>

        <CardFooter className="flex justify-between items-center pt-2">
          <Button
            size="sm"
            onClick={() => navigate(`/projects/${proj.id}`)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Abrir Projeto
          </Button>

          {isOwner && proj.status !== "CONCLUDED" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpenAddProjectId(proj.id)}
              className="flex-shrink-0"
            >
              Adicionar Membro
            </Button>
          )}
        </CardFooter>

        {openAddProjectId === proj.id && proj.status !== "CONCLUDED" && (
          <Dialog open={true} onOpenChange={() => setOpenAddProjectId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar membro a {proj.name}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Email do usuário</label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Papel no projeto</label>
                  <select
                    className="w-full rounded-md border border-input px-3 py-2"
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as "PO" | "SM" | "DEV")}
                  >
                    <option value="PO">Product Owner</option>
                    <option value="SM">Scrum Master</option>
                    <option value="DEV">Developer</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button onClick={() => handleAddMember(proj.id)} disabled={adding}>
                    {adding ? "Adicionando..." : "Adicionar Membro"}
                  </Button>
                  <Button variant="ghost" onClick={() => setOpenAddProjectId(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </Card>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Bem-vindo, {user?.username || "..."}! 👋</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setIsProfileModalOpen(true)} title="Perfil">
            <UserIcon className="w-4 h-4 mr-2" /> Perfil
          </Button>
          <Button variant="ghost" onClick={handleLogout} title="Sair">
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </header>

      {/* Modal de perfil do usuário */}
      <ProfileModal
        open={isProfileModalOpen}
        onOpenChange={(o) => setIsProfileModalOpen(o)}
        user={user}
        onSaved={(u) => setUser(u)}
      />

      {/* KPIs */}
      <section className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : activeProjectsCount}</div>
          </CardContent>
        </Card>
      </section>

      {/* CRIAR PROJETO */}
      <section className="mb-6 flex justify-start">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Criar Novo Projeto</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateProjectForm onProjectCreated={fetchProjects} />
          </CardContent>
        </Card>
      </section>

      {/* LISTA DE PROJETOS */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Projetos Ativos</h2>
        {activeProjectsList.length === 0 ? (
          <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
            Nenhum projeto ativo no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {activeProjectsList.map(renderProjectCard)}
          </div>
        )}
      </section>

      {concludedProjects.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Projetos Concluídos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {concludedProjects.map(renderProjectCard)}
          </div>
        </section>
      )}

      <AlertDialog
        open={!!projectToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeletingProject) setProjectToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o projeto "{projectToDelete?.name}"? Essa ação é permanente e não
              poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingProject}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={isDeletingProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingProject ? "Excluindo..." : "Excluir Projeto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!projectToClose}
        onOpenChange={(open) => {
          if (!open && !isClosingProject) setProjectToClose(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja encerrar "{projectToClose?.name}"? O projeto será marcado como concluído e continuará disponível apenas
              para consulta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosingProject}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseProject}
              disabled={isClosingProject}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isClosingProject ? "Encerrando..." : "Encerrar Projeto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
