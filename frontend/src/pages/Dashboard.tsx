// src/pages/Dashboard.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearTokens } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  members: User[];
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
  const [addRole, setAddRole] = useState<"SM" | "DEV">("DEV");
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
      console.error("Erro ao carregar projetos:", err);
      toast.error(err.message || err.detail || "Erro ao carregar projetos");
    }
  }

  async function handleDeleteProject(id: number) {
    if (!confirm("Remover este projeto?")) return;
    try {
      await apiFetch(`/api/projects/${id}/`, { method: "DELETE" });
      toast.success("Projeto removido");
      setProjects((p) => p.filter((x) => x.id !== id));
    } catch (err: any) {
      console.error("Erro removendo projeto:", err);
      toast.error(err.message || err.detail || "Erro ao remover projeto");
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

  const activeProjects = projects.length;
  

  const visibleProjects = useMemo(() => {
    if (!user) return [];
    return projects.filter((proj) =>
      proj.members.some((m) => m.id === user.id) || proj.owner.id === user.id
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
            <div className="text-2xl font-bold">{loading ? "..." : activeProjects}</div>
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
        <h2 className="text-xl font-semibold mb-4">Seus Projetos</h2>

        {/* OBS: items-stretch garante que os cards tenham a mesma altura na grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {visibleProjects.map((proj) => (
            // A principal mudança: tornar o Card um flex column que preenche a altura
            <Card key={proj.id} className="flex flex-col justify-between h-full min-h-[220px]">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-grow min-w-0">
                    <h3 className="text-lg font-medium">{proj.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{proj.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Owner: {proj.owner.username} | Membros: {proj.members.length}
                    </p>
                  </div>

                  {proj.owner.id === user?.id && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteProject(proj.id)}
                      className="flex-shrink-0"
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </CardHeader>

              {/* CardContent cresce para ocupar o espaço, empurrando o footer para o final */}
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">Membros: {proj.members.length}</p>
              </CardContent>

              {/* Footer sem mt-4; fica sempre no fim do card por causa do flex-column + justify-between */}
              <CardFooter className="flex justify-between items-center pt-2">
                <Button
                  size="sm"
                  onClick={() => navigate(`/projects/${proj.id}`)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Abrir Projeto
                </Button>

                {proj.owner.id === user?.id && (
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

              {/* Modal de adicionar membro */}
              {openAddProjectId === proj.id && (
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
                          onChange={(e) => setAddRole(e.target.value as "SM" | "DEV")}
                        >
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
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
