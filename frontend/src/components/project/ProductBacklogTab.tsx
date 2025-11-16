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
};

type BacklogItem = {
  id: number;
  title: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  user_story: UserStory;
  created_at: string;
};

type Props = {
  projectId: number;
  userRole: "PO" | "SM" | "DEV" | string; // 'PO', 'SM', 'DEV'
};

export default function ProductBacklogTab({ projectId, userRole }: Props) {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BacklogItem | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [selectedStoryId, setSelectedStoryId] = useState<number | "">("");

  useEffect(() => {
    fetchData();
  }, [projectId]);

  async function fetchData() {
    try {
      const [backlogItems, stories] = await Promise.all([
        apiFetch(`/api/projects/${projectId}/backlog/`),
        apiFetch(`/api/projects/${projectId}/user-stories/`)
      ]);
      setItems(backlogItems);
      setUserStories(stories);
    } catch (err: any) {
      toast.error("Erro ao carregar backlog");
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingItem(null);
    setTitle("");
    setDescription("");
    setPriority("MEDIUM");
    setSelectedStoryId("");
    setIsDialogOpen(true);
  }

  function openEditDialog(item: BacklogItem) {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description);
    setPriority(item.priority);
    setSelectedStoryId(item.user_story.id);
    setIsDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Título é obrigatório");
    if (!description.trim()) return toast.error("Descrição é obrigatória");
    if (!selectedStoryId) return toast.error("Selecione uma história de usuário");

    const payload = {
      title: title.trim(),
      description: description.trim(),
      priority,
      user_story_id: selectedStoryId,
    };

    try {
      if (editingItem) {
        await apiFetch(`/api/projects/${projectId}/backlog/${editingItem.id}/`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Item atualizado com sucesso");
      } else {
        await apiFetch(`/api/projects/${projectId}/backlog/`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Item criado com sucesso");
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar item");
    }
  }

  async function handleDelete(itemId: number) {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;
    try {
      await apiFetch(`/api/projects/${projectId}/backlog/${itemId}/`, {
        method: "DELETE",
      });
      toast.success("Item excluído com sucesso");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir item");
    }
  }

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-4">
      {userRole === "PO" && (
        <Button onClick={openCreateDialog}>Novo Item de Backlog</Button>
      )}

      {!loading && items.length === 0 ? (
        <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
          <h3 className="text-lg font-semibold">Nenhum Item no Backlog</h3>
          {userRole === "PO" ? (
            <p>Você ainda não criou nenhum item. Que tal criar o primeiro?</p>
          ) : (
            <p>Ainda não há itens no backlog. Peça para que o Product Owner crie alguns.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <span className={`text-sm px-2 py-1 rounded ${
                    item.priority === "HIGH" ? "bg-red-100 text-red-800" :
                    item.priority === "MEDIUM" ? "bg-yellow-100 text-yellow-800" :
                    "bg-green-100 text-green-800"
                  }`}>
                    {item.priority === "HIGH" ? "Alta" :
                     item.priority === "MEDIUM" ? "Média" : "Baixa"}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">{item.description}</p>
                  <div className="text-sm text-muted-foreground">
                    <strong>História:</strong> {item.user_story.title}
                  </div>
                  {userRole === 'PO'  && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(item)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(item.id)}
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
              {editingItem ? "Editar Item" : "Novo Item de Backlog"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nome do item de backlog"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o item em detalhes..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "HIGH" | "MEDIUM" | "LOW")}
                className="w-full border rounded-md p-2"
              >
                <option value="HIGH">Alta</option>
                <option value="MEDIUM">Média</option>
                <option value="LOW">Baixa</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">História de Usuário</label>
              <select
                value={selectedStoryId}
                onChange={(e) => setSelectedStoryId(Number(e.target.value))}
                className="w-full border rounded-md p-2"
              >
                <option value="">Selecione uma história...</option>
                {userStories.map((story) => (
                  <option key={story.id} value={story.id}>
                    {story.title}
                  </option>
                ))}
              </select>
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