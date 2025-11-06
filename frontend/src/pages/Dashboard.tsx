// src/pages/Dashboard.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearTokens } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LogOut, CheckSquare, TrendingUp } from "lucide-react";

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

type Task = {
  id: number;
  project: number;
  title: string;
  description?: string;
  done: boolean;
  assigned_to?: User;
};

type Project = {
  id: number;
  name: string;
  description?: string;
  owner: User;
  members: User[];
  tasks?: Task[];
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

  const [openAddProjectId, setOpenAddProjectId] = useState<number | null>(null);
  const [addEmail, setAddEmail] = useState("");
  const [adding, setAdding] = useState(false);

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
      toast.error(err.detail || "Erro ao carregar projetos");
    }
  }

  async function handleDeleteProject(id: number) {
    if (!confirm("Remover este projeto?")) return;
    try {
      await apiFetch(`/api/projects/${id}/`, { method: "DELETE" });
      toast.success("Projeto removido");
      setProjects((p) => p.filter((x) => x.id !== id));
    } catch (err: any) {
      toast.error(err.detail || "Erro ao remover projeto");
    }
  }

  async function handleToggleTask(task: Task) {
    try {
      const updated = { ...task, done: !task.done };
      await apiFetch(`/api/tasks/${task.id}/`, { method: "PUT", body: JSON.stringify(updated) });
      toast.success("Task atualizada");
      await fetchProjects();
    } catch (err: any) {
      toast.error(err.detail || "Erro ao atualizar task");
    }
  }

  async function handleAddMember(projectId: number) {
    if (!addEmail.trim()) return toast.error("Email vazio");
    setAdding(true);
    try {
      await apiFetch(`/api/projects/${projectId}/add_member/`, {
        method: "POST",
        body: JSON.stringify({ email: addEmail.trim() }),
      });
      toast.success("Membro adicionado à equipe");
      setAddEmail("");
      setOpenAddProjectId(null);
      await fetchProjects();
    } catch (err: any) {
      toast.error(err.detail || "Erro ao adicionar membro");
    } finally {
      setAdding(false);
    }
  }

  function handleLogout() {
    clearTokens();
    navigate("/auth");
  }

  const activeProjects = projects.length;
  const pendingTasks = useMemo(() => {
    return projects.reduce((acc, proj) => acc + (proj.tasks?.filter((t) => !t.done).length || 0), 0);
  }, [projects]);

  const visibleProjects = useMemo(() => {
    if (!user) return [];
    return projects.filter((proj) =>
      proj.members.some((m) => m.id === user.id) || user.is_superuser
    );
  }, [projects, user]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Bem-vindo, {user?.username || "..."}! 👋</h1>
          <p className="text-muted-foreground">
            {user ? `${user.is_superuser ? "ADMIN" : user.role || "Sem role"} - ${user.bio || ""}` : "Carregando..."}
          </p>
        </div>
        <Button variant="ghost" onClick={handleLogout} title="Sair">
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </Button>
      </header>

      {/* KPIs */}
      <section className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : activeProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : pendingTasks}</div>
          </CardContent>
        </Card>
      </section>

      {/* CRIAR PROJETO */}
      {user?.is_superuser && (
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
      )}

      {/* LISTA DE PROJETOS */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Seus Projetos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleProjects.map((proj) => (
            <Card key={proj.id}>
            <CardHeader>
                <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-medium">{proj.name}</h3>
                    <p className="text-sm text-muted-foreground">{proj.description}</p>
                    <p className="text-xs text-muted-foreground">
                    Owner: {proj.owner.username} | Membros: {proj.members.length}
                    </p>
                </div>
                {user?.is_superuser && (
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteProject(proj.id)}>
                    Remover
                    </Button>
                )}
                </div>
            </CardHeader>

            <CardContent>
                <h4 className="font-semibold mb-2">Tarefas</h4>
                {proj.tasks && proj.tasks.length > 0 ? (
                proj.tasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between mb-1">
                    <span className={t.done ? "line-through text-muted-foreground" : ""}>
                        {t.title} {t.assigned_to ? `( ${t.assigned_to.username} )` : ""}
                    </span>
                    <Button size="sm" onClick={() => handleToggleTask(t)}>
                        {t.done ? "Desmarcar" : "Concluir"}
                    </Button>
                    </div>
                ))
                ) : (
                <p className="text-sm text-muted-foreground">Sem tarefas</p>
                )}
            </CardContent>

            <div className="flex justify-end gap-4 mt-4">
            <Button size="sm" variant="outline" onClick={() => navigate(`/projects/${proj.id}`)}>
                Abrir Projeto
            </Button>

            {/* Botão de adicionar membro só se for admin */}
            {user?.is_superuser && (
                <Button size="sm" variant="outline" onClick={() => setOpenAddProjectId(proj.id)}>
                Adicionar Membro
                </Button>
            )}
            </div>

            {/* Modal de adicionar membro */}
            {openAddProjectId === proj.id && user?.is_superuser && (
                <Dialog open={true} onOpenChange={() => setOpenAddProjectId(null)}>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Adicionar membro a {proj.name}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-2">
                    <Input
                        type="email"
                        placeholder="Email do usuário"
                        value={addEmail}
                        onChange={(e) => setAddEmail(e.target.value)}
                    />
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
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
