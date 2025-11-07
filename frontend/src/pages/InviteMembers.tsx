// src/pages/InviteMembers.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type User = {
  id: number;
  username: string;
  email?: string;
  role?: "PO" | "SM" | "DEV";
  bio?: string;
  is_superuser?: boolean;
};

type Project = {
  id: number;
  name: string;
  owner: User;
  members: User[];
};

const InviteMembers = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"SM" | "DEV">("DEV");
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const [proj, me] = await Promise.all([
          apiFetch(`/api/projects/${id}/`),
          apiFetch('/api/users/me/')
        ]);
        setProject(proj);
        setCurrentUser(me);

        // Redireciona se não for o Product Owner
        if (proj.owner.id !== me.id) {
          toast.error("Apenas o Product Owner pode gerenciar membros");
          navigate("/dashboard");
        }
      } catch (err: any) {
        toast.error(err.detail || "Erro ao carregar projeto");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const handleInvite = async () => {
    if (!email.trim()) return toast.error("Informe o email do usuário");
    if (!role) return toast.error("Selecione o papel do usuário");
    if (!project?.owner || !currentUser) return;
    
    // Verifica se é o Product Owner
    if (project.owner.id !== currentUser.id) {
      toast.error("Apenas o Product Owner pode adicionar membros");
      return;
    }

    setInviting(true);
    try {
      await apiFetch(`/api/projects/${id}/add_member/`, {
        method: "POST",
        body: JSON.stringify({ 
          email: email.trim(),
          role: role
        }),
      });
      toast.success("Membro adicionado com sucesso");
      setEmail("");
      // Atualiza a lista de membros
      const updated: Project = await apiFetch(`/api/projects/${id}/`);
      setProject(updated);
    } catch (err: any) {
      toast.error(err.detail || "Erro ao adicionar membro");
    } finally {
      setInviting(false);
    }
  };

  if (loading) return <p>Carregando projeto...</p>;
  if (!project) return <p>Projeto não encontrado</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Convidar membros - {project.name}</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Enviar Convite</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <div className="flex flex-col gap-2">
            <input
              type="email"
              placeholder="Email do usuário"
              className="flex-1 rounded-md border border-input px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "SM" | "DEV")}
              className="rounded-md border border-input px-3 py-2"
            >
              <option value="SM">Scrum Master</option>
              <option value="DEV">Developer</option>
            </select>
            <Button onClick={handleInvite} disabled={inviting}>
              {inviting ? "Adicionando..." : "Adicionar Membro"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membros Atuais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="font-medium">
              Product Owner: {project.owner.username}
            </div>
            {project.members.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2">
                {project.members.map((m) => (
                  <li key={m.id}>
                    {m.username} - {m.role === 'SM' ? 'Scrum Master' : m.role === 'DEV' ? 'Developer' : m.role}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Sem outros membros ainda</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteMembers;
