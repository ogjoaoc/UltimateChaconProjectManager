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
  role: "PO" | "SM" | "DEV";
};

type Project = {
  id: number;
  name: string;
  members: User[];
};

const InviteMembers = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const proj: Project = await apiFetch(`/api/projects/${id}/`);
        setProject(proj);
      } catch (err: any) {
        toast.error(err.detail || "Erro ao carregar projeto");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const handleInvite = async () => {
    if (!username.trim()) return toast.error("Informe o username ou email");
    setInviting(true);
    try {
      await apiFetch(`/api/projects/${id}/invite/`, {
        method: "POST",
        body: JSON.stringify({ username: username.trim() }),
      });
      toast.success("Convite enviado");
      setUsername("");
      // Atualiza a lista de membros
      const updated: Project = await apiFetch(`/api/projects/${id}/`);
      setProject(updated);
    } catch (err: any) {
      toast.error(err.detail || "Erro ao enviar convite");
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
          <input
            type="text"
            placeholder="Username ou email"
            className="flex-1 rounded-md border border-input px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Button onClick={handleInvite} disabled={inviting}>
            {inviting ? "Enviando..." : "Convidar"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membros Atuais</CardTitle>
        </CardHeader>
        <CardContent>
          {project.members.length > 0 ? (
            <ul className="list-disc pl-5">
              {project.members.map((m) => (
                <li key={m.id}>
                  {m.username} ({m.role})
                </li>
              ))}
            </ul>
          ) : (
            <p>Sem membros ainda</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteMembers;
