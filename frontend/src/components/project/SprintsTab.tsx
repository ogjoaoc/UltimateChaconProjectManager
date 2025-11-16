import { useState, useEffect, useMemo, useCallback } from "react";
import { apiFetch } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Eye, Pencil, Plus, Trash2, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

type Sprint = {
  id: number;
  project: number;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
  status?: string;
  objective?: string;
  tech?: string;
  team?: string;
  increment?: string;
  sprint_backlog?: ProductBacklogItem[];
};

type ProjectMember = {
  id: number;
  username: string;
  email?: string;
  role: "PO" | "SM" | "DEV";
};

type ProductBacklogItem = {
  id: number;
  title: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
};

type Props = {
  projectId: number;
  canManageProject: boolean;
};

export default function SprintsTab({ projectId, canManageProject }: Props) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Dados adicionais
  const [members, setMembers] = useState<ProjectMember[]>([]);

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
    objective: "",
    tech: "",
    increment: "",
  });

  // Membros e backlog selecionados
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<number[]>([]);

  const scrumMasterIds = useMemo(
    () => members.filter((member) => member.role === "SM").map((member) => member.id),
    [members]
  );

  const withScrumMasters = useCallback(
    (teamIds: number[]) => {
      if (scrumMasterIds.length === 0) {
        return teamIds;
      }
      const merged = Array.from(new Set([...teamIds, ...scrumMasterIds]));
      return merged;
    },
    [scrumMasterIds]
  );

  useEffect(() => {
    setSelectedTeamMembers((prev) => withScrumMasters(prev));
  }, [withScrumMasters]);

  useEffect(() => {
    loadSprints();
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      const projectData = await apiFetch(`/api/projects/${projectId}/`);
      setMembers(projectData.members || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar dados do projeto",
        variant: "destructive",
      });
    }
  };

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
      const payload = {
        ...formData,
        team: selectedTeamMembers.join(','),
      };

      await apiFetch(`/api/projects/${projectId}/sprints/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      toast({
        title: "Sucesso",
        description: "Sprint criada com sucesso!",
      });
      
      setIsCreateModalOpen(false);
      resetForm();
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
      const payload = {
        ...formData,
        team: selectedTeamMembers.join(','),
      };

      await apiFetch(`/api/projects/${projectId}/sprints/${selectedSprint.id}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      
      toast({
        title: "Sucesso",
        description: "Sprint atualizada com sucesso!",
      });
      
      setIsEditModalOpen(false);
      setSelectedSprint(null);
      resetForm();
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

  const resetForm = () => {
    setFormData({
      name: "",
      start_date: "",
      end_date: "",
      objective: "",
      tech: "",
      increment: "",
    });
    setSelectedTeamMembers(withScrumMasters([]));
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openEditModal = (sprint: Sprint) => {
    setSelectedSprint(sprint);
    setFormData({
      name: sprint.name,
      start_date: sprint.start_date,
      end_date: sprint.end_date,
      objective: sprint.objective || "",
      tech: sprint.tech || "",
      increment: sprint.increment || "",
    });
    // Parse team members from comma-separated string
    const parsedTeam = sprint.team
      ? sprint.team.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))
      : [];
    setSelectedTeamMembers(withScrumMasters(parsedTeam));
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
      // Se tem status COMPLETED, vai para concluídas independente da data
      if (sprint.status === 'COMPLETED') {
        completed.push(sprint);
        return;
      }

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

          {canManageProject && (
            <>
              {status === "planned" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(sprint)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}

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
        {canManageProject ? (
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Sprint
          </Button>
        ) : (
          <div></div>
        )}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Sprint</DialogTitle>
            <DialogDescription>Crie uma nova sprint para o projeto</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Título *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Sprint 1"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Data de Início *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_date">Data de Fim *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="objective">Objetivo</Label>
              <Textarea
                id="objective"
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                placeholder="Descreva o objetivo da sprint"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="tech">Tecnologias</Label>
              <Textarea
                id="tech"
                value={formData.tech}
                onChange={(e) => setFormData({ ...formData, tech: e.target.value })}
                placeholder="Liste as tecnologias que serão utilizadas"
                rows={2}
              />
            </div>

            <div>
              <Label>Equipe (Membros da Sprint)</Label>
              <div className="border rounded-md p-3 mt-2 space-y-2 max-h-40 overflow-y-auto">
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum membro disponível</p>
                ) : (
                  members.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`member-${member.id}`}
                        checked={selectedTeamMembers.includes(member.id)}
                        disabled={member.role === "SM"}
                        onCheckedChange={(checked) => {
                          if (member.role === "SM") return;
                          if (checked) {
                            setSelectedTeamMembers((prev) => [...prev, member.id]);
                          } else {
                            setSelectedTeamMembers((prev) =>
                              prev.filter((id) => id !== member.id)
                            );
                          }
                        }}
                      />
                      <label
                        htmlFor={`member-${member.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {member.username} ({member.role})
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="increment">Saída (Incremento)</Label>
              <Textarea
                id="increment"
                value={formData.increment}
                onChange={(e) => setFormData({ ...formData, increment: e.target.value })}
                placeholder="Descreva o incremento esperado ao final da sprint"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateSprint}>Criar</Button>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Sprint */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Sprint</DialogTitle>
            <DialogDescription>
              Edite as informações da sprint
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_name">Título *</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Sprint 1"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_start_date">Data de Início *</Label>
                <Input
                  id="edit_start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_end_date">Data de Fim *</Label>
                <Input
                  id="edit_end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_objective">Objetivo</Label>
              <Textarea
                id="edit_objective"
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                placeholder="Descreva o objetivo da sprint"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit_tech">Tecnologias</Label>
              <Textarea
                id="edit_tech"
                value={formData.tech}
                onChange={(e) => setFormData({ ...formData, tech: e.target.value })}
                placeholder="Liste as tecnologias que serão utilizadas"
                rows={2}
              />
            </div>

            <div>
              <Label>Equipe (Membros da Sprint)</Label>
              <div className="border rounded-md p-3 mt-2 space-y-2 max-h-40 overflow-y-auto">
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum membro disponível</p>
                ) : (
                  members.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-member-${member.id}`}
                        checked={selectedTeamMembers.includes(member.id)}
                        disabled={member.role === "SM"}
                        onCheckedChange={(checked) => {
                          if (member.role === "SM") return;
                          if (checked) {
                            setSelectedTeamMembers((prev) => [...prev, member.id]);
                          } else {
                            setSelectedTeamMembers((prev) =>
                              prev.filter((id) => id !== member.id)
                            );
                          }
                        }}
                      />
                      <label
                        htmlFor={`edit-member-${member.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {member.username} ({member.role})
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="edit_increment">Saída (Incremento)</Label>
              <Textarea
                id="edit_increment"
                value={formData.increment}
                onChange={(e) => setFormData({ ...formData, increment: e.target.value })}
                placeholder="Descreva o incremento esperado ao final da sprint"
                rows={3}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Data de Início</Label>
                  <p className="text-lg">{formatDate(selectedSprint.start_date)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data de Término</Label>
                  <p className="text-lg">{formatDate(selectedSprint.end_date)}</p>
                </div>
              </div>
              {selectedSprint.objective && (
                <div>
                  <Label className="text-muted-foreground">Objetivo</Label>
                  <p className="text-base whitespace-pre-wrap">{selectedSprint.objective}</p>
                </div>
              )}
              {selectedSprint.tech && (
                <div>
                  <Label className="text-muted-foreground">Tecnologias</Label>
                  <p className="text-base whitespace-pre-wrap">{selectedSprint.tech}</p>
                </div>
              )}
              {selectedSprint.team && (
                <div>
                  <Label className="text-muted-foreground">Equipe</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedSprint.team.split(',').map((memberId) => {
                      const member = members.find(m => m.id === parseInt(memberId));
                      return member ? (
                        <Badge key={member.id} variant="outline">
                          {member.username}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              {selectedSprint.increment && (
                <div>
                  <Label className="text-muted-foreground">Saída (Incremento)</Label>
                  <p className="text-base whitespace-pre-wrap">{selectedSprint.increment}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Criada em</Label>
                <p className="text-lg">
                  {new Date(selectedSprint.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button onClick={() => setIsViewModalOpen(false)}>Fechar</Button>
            {canManageProject && (
              <Button
                variant="outline"
                onClick={() => {
                  // fechar a visualização e abrir modal de edição
                  setIsViewModalOpen(false);
                  if (selectedSprint) openEditModal(selectedSprint);
                }}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
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