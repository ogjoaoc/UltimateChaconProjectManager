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

type UserStory = {
  id: number;
  title: string;
  description: string;
  acceptance_criteria: string;
  created_at: string;
};

type Props = {
  projectId: number;
  userRole: "PO" | "SM" | "DEV" | string; // 'PO', 'SM', 'DEV'
};

export default function UserStoriesTab({ projectId, userRole }: Props) {
  const [stories, setStories] = useState<UserStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<UserStory | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [storyToDelete, setStoryToDelete] = useState<UserStory | null>(null);
  const [isDeletingStory, setIsDeletingStory] = useState(false);

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

  async function handleDelete() {
    if (!storyToDelete) return;
    setIsDeletingStory(true);
    try {
      await apiFetch(`/api/projects/${projectId}/user-stories/${storyToDelete.id}/`, {
        method: "DELETE",
      });
      toast.success(`História "${storyToDelete.title}" excluída com sucesso`);
      setStoryToDelete(null);
      fetchStories();
    } catch (err: any) {
      toast.error(err.detail || "Erro ao excluir história");
    } finally {
      setIsDeletingStory(false);
    }
  }

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-4">
      {userRole === "PO" && (
        <Button onClick={openCreateDialog}>Nova História de Usuário</Button>
      )}

      {!loading && stories.length === 0 ? (
        <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
          <h3 className="text-lg font-semibold">Nenhuma História de Usuário Encontrada</h3>
          {userRole === "PO" ? (
            <p>Você ainda não criou nenhuma história. Que tal criar a primeira?</p>
          ) : (
            <p>Ainda não há histórias de usuário. Peça para que o Product Owner crie algumas.</p>
          )}
        </div>
      ) : (
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
                  {userRole === "PO" && (
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
                        onClick={() => setStoryToDelete(story)}
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
      )}

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

      <AlertDialog
        open={!!storyToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeletingStory) setStoryToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir história de usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{storyToDelete?.title}"? Backlog e históricos ligados à história poderão
              ser impactados e esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingStory}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeletingStory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingStory ? "Excluindo..." : "Excluir História"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}