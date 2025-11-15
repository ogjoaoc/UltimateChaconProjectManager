import { useState, useEffect } from "react";
import { apiFetch } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Sprint = {
  id: number;
  project: number;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
};

type Props = {
  projectId: number;
  canManageProject: boolean;
};

export default function SprintsTab({ projectId, canManageProject }: Props) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Sprint selecionada
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);

  // Formulário
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    loadSprints();
  }, [projectId]);

  const loadSprints = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`/api/projects/${projectId}/sprints/`);
      setSprints(data);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar sprints",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSprint = async () => {
    try {
      await apiFetch(`/api/projects/${projectId}/sprints/`, {
        method: "POST",
        body: JSON.stringify(formData),
      });
      
      toast({
        title: "Sucesso",
        description: "Sprint criada com sucesso!",
      });
      
      setIsCreateModalOpen(false);
      setFormData({ name: "", start_date: "", end_date: "" });
      loadSprints();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar sprint",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSprint = async () => {
    if (!selectedSprint) return;

    try {
      await apiFetch(`/api/projects/${projectId}/sprints/${selectedSprint.id}/`, {
        method: "PATCH",
        body: JSON.stringify(formData),
      });
      
      toast({
        title: "Sucesso",
        description: "Sprint atualizada com sucesso!",
      });
      
      setIsEditModalOpen(false);
      setSelectedSprint(null);
      setFormData({ name: "", start_date: "", end_date: "" });
      loadSprints();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar sprint",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSprint = async () => {
    if (!selectedSprint) return;

    try {
      await apiFetch(`/api/projects/${projectId}/sprints/${selectedSprint.id}/`, {
        method: "DELETE",
      });
      
      toast({
        title: "Sucesso",
        description: "Sprint excluída com sucesso!",
      });
      
      setIsDeleteDialogOpen(false);
      setSelectedSprint(null);
      loadSprints();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir sprint",
        variant: "destructive",
      });
    }
  };

  const openCreateModal = () => {
    setFormData({ name: "", start_date: "", end_date: "" });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (sprint: Sprint) => {
    setSelectedSprint(sprint);
    setFormData({
      name: sprint.name,
      start_date: sprint.start_date,
      end_date: sprint.end_date,
    });
    setIsEditModalOpen(true);
  };

  const openViewModal = (sprint: Sprint) => {
    setSelectedSprint(sprint);
    setIsViewModalOpen(true);
  };

  const openDeleteDialog = (sprint: Sprint) => {
    setSelectedSprint(sprint);
    setIsDeleteDialogOpen(true);
  };

  // Categoriza sprints
  const categorizeSprints = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const active: Sprint[] = [];
    const completed: Sprint[] = [];
    const planned: Sprint[] = [];

    sprints.forEach((sprint) => {
      const startDate = new Date(sprint.start_date);
      const endDate = new Date(sprint.end_date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      if (today >= startDate && today <= endDate) {
        active.push(sprint);
      } else if (today > endDate) {
        completed.push(sprint);
      } else {
        planned.push(sprint);
      }
    });

    return { active, completed, planned };
  };

  const { active, completed, planned } = categorizeSprints();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const SprintCard = ({ sprint, status }: { sprint: Sprint; status: "active" | "completed" | "planned" }) => (
    <Card className={status === "active" ? "border-blue-500 border-2" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {sprint.name}
        </CardTitle>
        <CardDescription>
          {formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openViewModal(sprint)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Visualizar
          </Button>
          
          {status === "planned" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditModal(sprint)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => openDeleteDialog(sprint)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Carregando sprints...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com botão Nova Sprint */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Sprints</h2>
          <p className="text-muted-foreground">Gerencie as sprints do projeto</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Sprint
        </Button>
      </div>

      {/* Sprint Ativa */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-blue-600">Sprint Ativa</h3>
        {active.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {active.map((sprint) => (
              <SprintCard key={sprint.id} sprint={sprint} status="active" />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma sprint ativa no momento
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sprints Planejadas */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-green-600">Sprints Planejadas</h3>
        {planned.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {planned.map((sprint) => (
              <SprintCard key={sprint.id} sprint={sprint} status="planned" />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma sprint planejada
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sprints Concluídas */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-600">Sprints Concluídas</h3>
        {completed.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completed.map((sprint) => (
              <SprintCard key={sprint.id} sprint={sprint} status="completed" />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma sprint concluída
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal Criar Sprint */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Sprint</DialogTitle>
            <DialogDescription>Crie uma nova sprint para o projeto</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Sprint</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Sprint 1"
              />
            </div>
            <div>
              <Label htmlFor="start_date">Data de Início</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="end_date">Data de Término</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSprint}>Criar Sprint</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Sprint */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Sprint</DialogTitle>
            <DialogDescription>Edite as informações da sprint</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_name">Nome da Sprint</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_start_date">Data de Início</Label>
              <Input
                id="edit_start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_end_date">Data de Término</Label>
              <Input
                id="edit_end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateSprint}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizar Sprint */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSprint?.name}</DialogTitle>
            <DialogDescription>Informações da Sprint</DialogDescription>
          </DialogHeader>
          {selectedSprint && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Nome</Label>
                <p className="text-lg font-medium">{selectedSprint.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Data de Início</Label>
                <p className="text-lg">{formatDate(selectedSprint.start_date)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Data de Término</Label>
                <p className="text-lg">{formatDate(selectedSprint.end_date)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Criada em</Label>
                <p className="text-lg">
                  {new Date(selectedSprint.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a sprint "{selectedSprint?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSprint} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}