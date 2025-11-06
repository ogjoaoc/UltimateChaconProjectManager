import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";

type User = { id: number; username: string; role?: string; is_superuser?: boolean };
type Task = { id: number; title: string; done: boolean };
type Artifact = { id: number; type: string; title: string; description?: string };
type Project = {
  id: number;
  name: string;
  description?: string;
  owner: User;
  members: User[];
  tasks?: Task[];
  artifacts?: Artifact[];
};

const TabButton = ({ active, onClick, children }: any) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-md border ${
      active ? "bg-emerald-600 text-white" : "bg-white text-black"
    }`}
  >
    {children}
  </button>
);

const ProjectPage = () => {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data: Project = await apiFetch(`/api/projects/${id}/`);
        setProject(data);
      } catch (err) {
        setProject(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{project ? project.name : "Carregando..."}</h1>
          <p className="text-sm text-muted-foreground">{project?.description}</p>
          <p className="text-xs text-muted-foreground">Owner: {project?.owner.username} | Members: {project?.members.length}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost">Voltar</Button>
          <Button className="bg-emerald-600 text-white">Novo Artefato</Button>
        </div>
      </header>

      <section className="mb-4">
        <div className="flex gap-2">
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>Overview</TabButton>
          <TabButton active={tab === "product-backlog"} onClick={() => setTab("product-backlog")}>Product Backlog</TabButton>
          <TabButton active={tab === "sprint-backlog"} onClick={() => setTab("sprint-backlog")}>Sprint Backlog</TabButton>
          <TabButton active={tab === "sprint-plan"} onClick={() => setTab("sprint-plan")}>Sprint Plan</TabButton>
          <TabButton active={tab === "artifacts"} onClick={() => setTab("artifacts")}>Catálogo de Artefatos</TabButton>
          <TabButton active={tab === "members"} onClick={() => setTab("members")}>Membros</TabButton>
        </div>
      </section>

      <main>
        {tab === "overview" && (
          <Card>
            <CardHeader>
              <CardTitle>Visão Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2">Resumo do projeto e indicadores principais (velocidade, progresso do sprint, número de tarefas abertas).</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Objetivo do Sprint</div>
                  <div className="font-semibold"> Definir objetivo do sprint</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Trabalho (how)</div>
                  <div className="font-semibold"> Principais tarefas planejadas</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Equipe (who)</div>
                  <div className="font-semibold">{project?.members.map((m) => m.username).join(", ")}</div>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "product-backlog" && (
          <Card>
            <CardHeader>
              <CardTitle>Product Backlog</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2">Lista de histórias de usuário e prioridades. (prototype)</p>
              <ul className="list-disc pl-5">
                <li>História A - Prioridade Alta</li>
                <li>História B - Prioridade Média</li>
                <li>História C - Prioridade Baixa</li>
              </ul>
            </CardContent>
          </Card>
        )}

        {tab === "sprint-backlog" && (
          <Card>
            <CardHeader>
              <CardTitle>Sprint Backlog</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2">Itens selecionados para o sprint atual.</p>
              <p className="text-sm text-muted-foreground">(prototype placeholder)</p>
            </CardContent>
          </Card>
        )}

        {tab === "sprint-plan" && (
          <Card>
            <CardHeader>
              <CardTitle>Plano de Sprint</CardTitle>
            </CardHeader>
            <CardContent>
              <h4 className="font-semibold">Objetivo (What)</h4>
              <p className="mb-2">Descrição do objetivo do sprint.</p>
              <h4 className="font-semibold">Trabalho (How)</h4>
              <p className="mb-2">Resumo de como o trabalho será realizado.</p>
              <h4 className="font-semibold">Equipe (Who)</h4>
              <p className="mb-2">Membros e responsáveis.</p>
              <h4 className="font-semibold">Tarefas (Backlog)</h4>
              <p className="mb-2">Tarefas do sprint com estimativas.</p>
              <h4 className="font-semibold">Saída (Increment)</h4>
              <p className="mb-2">Critérios de aceite e definição de pronto.</p>
            </CardContent>
          </Card>
        )}

        {tab === "artifacts" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: "user-story", title: "História de Usuário", desc: " backlog de produto e descrição" },
              { key: "product-backlog", title: "Product Backlog", desc: "Lista priorizada de histórias" },
              { key: "sprint-backlog", title: "Sprint Backlog", desc: "Itens selecionados para o sprint" },
              { key: "sprint-plan", title: "Plano de Sprint", desc: "Objetivo, trabalho, equipe, tarefas, incremento" },
              { key: "increment", title: "Incremento", desc: "Entrega do sprint" },
            ].map((a) => (
              <Card key={a.key}>
                <CardHeader>
                  <CardTitle>{a.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{a.desc}</p>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button size="sm" variant="outline">Abrir</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {tab === "members" && (
          <Card>
            <CardHeader>
              <CardTitle>Membros</CardTitle>
            </CardHeader>
            <CardContent>
              <ul>
                {project?.members.map((m) => (
                  <li key={m.id} className="mb-1">
                    {m.username} {m.role ? `- ${m.role}` : ''}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ProjectPage;
