import { useState, useEffect } from "react";
import { apiFetch } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type UserStory = {
  id: number;
  title: string;
  description: string;
  acceptance_criteria: string;
  created_at: string;
};

type Props = {
  projectId: number;
  canManageProject: boolean;
};

export default function UserStoriesTab({ projectId, canManageProject }: Props) {
  const [stories, setStories] = useState<UserStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<UserStory | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");

  useEffect(() => {
    fetchStories();
  }, [projectId]);

  async function fetchStories() {
    try {
      const data = await apiFetch(`/api/projects/${projectId}/user-stories/`);
      setStories(data);
    } catch (err: any) {
      toast.error("Erro ao carregar histórias de usuário");
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingStory(null);
    setTitle("");
    setDescription("");
    setAcceptanceCriteria("");
    setIsDialogOpen(true);
  }

  function openEditDialog(story: UserStory) {
    setEditingStory(story);
    setTitle(story.title);
    setDescription(story.description);
    setAcceptanceCriteria(story.acceptance_criteria);
    setIsDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Título é obrigatório");
    if (!description.trim()) return toast.error("Descrição é obrigatória");

    const payload = {
      title: title.trim(),
      description: description.trim(),
      acceptance_criteria: acceptanceCriteria.trim(),
    };

    try {
      if (editingStory) {
        await apiFetch(`/api/projects/${projectId}/user-stories/${editingStory.id}/`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("História atualizada com sucesso");
      } else {
        await apiFetch(`/api/projects/${projectId}/user-stories/`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("História criada com sucesso");
      }
      setIsDialogOpen(false);
      fetchStories();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar história");
    }
  }

  async function handleDelete(storyId: number) {
    if (!confirm("Tem certeza que deseja excluir esta história?")) return;
    try {
      await apiFetch(`/api/projects/${projectId}/user-stories/${storyId}/`, {
        method: "DELETE",
      });
      toast.success("História excluída com sucesso");
      fetchStories();
    } catch (err: any) {
      toast.error(err.detail || "Erro ao excluir história");
    }
  }

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-4">
  {canManageProject && (
        <Button onClick={openCreateDialog}>Nova História de Usuário</Button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stories.map((story) => (
          <Card key={story.id}>
            <CardHeader>
              <CardTitle>{story.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">{story.description}</p>
                {story.acceptance_criteria && (
                  <div>
                    <h4 className="font-semibold text-sm">Critérios de Aceitação:</h4>
                    <p className="text-sm">{story.acceptance_criteria}</p>
                  </div>
                )}
                {canManageProject && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(story)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(story.id)}
                    >
                      Excluir
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStory ? "Editar História" : "Nova História de Usuário"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Como um [usuário], eu quero [ação] para [benefício]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva a história em detalhes..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Critérios de Aceitação</label>
              <Textarea
                value={acceptanceCriteria}
                onChange={(e) => setAcceptanceCriteria(e.target.value)}
                placeholder="Lista de critérios de aceitação..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="submit">Salvar</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}