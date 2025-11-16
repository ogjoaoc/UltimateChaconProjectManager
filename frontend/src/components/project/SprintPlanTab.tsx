import { useState, useEffect } from "react";
import { apiFetch } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, Target, Code, CheckCircle2, Plus, Pencil, Trash2 } from "lucide-react";

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
};

type ProjectMember = {
  id: number;
  username: string;
  email?: string;
  role: "PO" | "SM" | "DEV";
};

type BacklogItem = {
  id: number;
  title: string;
  description: string;
  priority: string;
  user_story?: {
    id: number;
    title: string;
  };
};

type Task = {
  id: number;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  assigned_to: ProjectMember | null;
  backlog_item: BacklogItem;
  created_at: string;
  created_by: ProjectMember;
};

type Props = {
  projectId: number;
  canManageProject: boolean;
  onNavigateToSprints?: () => void;
};

export default function SprintPlanTab({ projectId, canManageProject, onNavigateToSprints }: Props) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEndSprintDialogOpen, setIsEndSprintDialogOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    backlog_item_id: "",
    description: "",
    assigned_to_id: "",
    status: "TODO" as "TODO" | "IN_PROGRESS" | "DONE",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [projectId]);

  useEffect(() => {
    if (selectedSprintId) {
      loadTasks();
      loadBacklogItems();
    }
  }, [selectedSprintId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sprintsData, projectData, userData] = await Promise.all([
        apiFetch(`/api/projects/${projectId}/sprints/active/`),
        apiFetch(`/api/projects/${projectId}/`),
        apiFetch("/api/users/me/"),
      ]);

      setSprints(sprintsData);
      setMembers(projectData.members || []);
      setCurrentUser(userData);

      // Seleciona automaticamente a primeira sprint ativa
      if (sprintsData.length > 0 && !selectedSprintId) {
        setSelectedSprintId(sprintsData[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    if (!selectedSprintId) return;
    try {
      const tasksData = await apiFetch(`/api/projects/${projectId}/sprints/${selectedSprintId}/tasks/`);
      setTasks(tasksData);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar tarefas",
        variant: "destructive",
      });
    }
  };

  const loadBacklogItems = async () => {
    if (!selectedSprintId) return;
    try {
      const backlogData = await apiFetch(`/api/projects/${projectId}/backlog/`);
      
      // Carrega TODOS os itens do backlog do projeto para permitir criar tarefas com qualquer item
      setBacklogItems(backlogData);
    } catch (error: any) {
      console.error("Erro ao carregar backlog:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar itens do backlog",
        variant: "destructive",
      });
      setBacklogItems([]); // Define como array vazio em caso de erro
    }
  };

  const openTaskModal = async (task?: Task) => {
    try {
      // Carrega os itens do backlog antes de abrir o modal se ainda não foram carregados
      if (backlogItems.length === 0) {
        await loadBacklogItems();
      }
      
      if (task) {
        setEditingTask(task);
        setTaskForm({
          backlog_item_id: task.backlog_item.id.toString(),
          description: task.description,
          assigned_to_id: task.assigned_to?.id.toString() || "",
          status: task.status,
        });
      } else {
        setEditingTask(null);
        setTaskForm({
          backlog_item_id: "",
          description: "",
          assigned_to_id: "",
          status: "TODO",
        });
      }
      setIsTaskModalOpen(true);
    } catch (error) {
      console.error("Erro ao abrir modal:", error);
      toast({
        title: "Erro",
        description: "Não foi possível abrir o modal de tarefas",
        variant: "destructive",
      });
    }
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
    setTaskForm({
      backlog_item_id: "",
      description: "",
      assigned_to_id: "",
      status: "TODO",
    });
  };

  const handleSaveTask = async () => {
    if (!taskForm.description.trim() || !taskForm.backlog_item_id) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      // Trata "none" como null para o responsável
      const assignedToId = taskForm.assigned_to_id && taskForm.assigned_to_id !== "none" 
        ? parseInt(taskForm.assigned_to_id) 
        : null;

      const payload = {
        backlog_item_id: parseInt(taskForm.backlog_item_id),
        description: taskForm.description,
        assigned_to_id: assignedToId,
        status: taskForm.status,
      };

      if (editingTask) {
        await apiFetch(`/api/projects/${projectId}/sprints/${selectedSprintId}/tasks/${editingTask.id}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({
          title: "Sucesso",
          description: "Tarefa atualizada com sucesso!",
        });
      } else {
        await apiFetch(`/api/projects/${projectId}/sprints/${selectedSprintId}/tasks/`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({
          title: "Sucesso",
          description: "Tarefa criada com sucesso!",
        });
      }

      closeTaskModal();
      loadTasks();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar tarefa",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    try {
      await apiFetch(`/api/projects/${projectId}/sprints/${selectedSprintId}/tasks/${taskToDelete.id}/`, {
        method: "DELETE",
      });

      toast({
        title: "Sucesso",
        description: "Tarefa excluída com sucesso!",
      });

      setTaskToDelete(null);
      loadTasks();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir tarefa",
        variant: "destructive",
      });
    }
  };

  const handleEndSprint = async () => {
    if (!selectedSprintId) return;

    try {
      await apiFetch(`/api/projects/${projectId}/sprints/${selectedSprintId}/end-sprint/`, {
        method: "POST",
      });

      toast({
        title: "Sucesso",
        description: "Sprint encerrada com sucesso!",
      });

      setIsEndSprintDialogOpen(false);
      
      // Redireciona para a aba de Sprints após sucesso
      if (onNavigateToSprints) {
        // Pequeno delay para garantir que o toast apareça
        setTimeout(() => {
          onNavigateToSprints();
        }, 500);
      } else {
        // Se não tiver callback, recarrega os dados localmente
        setSelectedSprintId(null);
        await loadData();
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao encerrar sprint",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const isSprintEnded = (sprint: Sprint) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(sprint.end_date);
    endDate.setHours(0, 0, 0, 0);
    return today > endDate;
  };

  const selectedSprint = sprints.find((s) => s.id === selectedSprintId);
  const canEndSprint = selectedSprint && (canManageProject || isSprintEnded(selectedSprint));
  const isDeveloper = members.find(m => m.id === currentUser?.id)?.role === "DEV";

  // Agrupa tarefas por status
  const tasksByStatus = {
    TODO: tasks.filter(t => t.status === "TODO"),
    IN_PROGRESS: tasks.filter(t => t.status === "IN_PROGRESS"),
    DONE: tasks.filter(t => t.status === "DONE"),
  };

  const statusLabels = {
    TODO: "A fazer",
    IN_PROGRESS: "Em Andamento",
    DONE: "Concluído",
  };

  const statusColors = {
    TODO: "bg-gray-100 text-gray-800 border-gray-300",
    IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-300",
    DONE: "bg-green-100 text-green-800 border-green-300",
  };

  const priorityLabels: Record<string, string> = {
    HIGH: "Alta",
    MEDIUM: "Média",
    LOW: "Baixa",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (sprints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhuma Sprint Ativa</h3>
        <p className="text-muted-foreground max-w-md">
          Não há sprints ativas no momento onde você faz parte da equipe.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seletor de Sprint */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <Label htmlFor="sprint-select" className="mb-2 block">Selecione uma Sprint</Label>
          <Select
            value={selectedSprintId?.toString() || ""}
            onValueChange={(value) => setSelectedSprintId(parseInt(value))}
          >
            <SelectTrigger id="sprint-select">
              <SelectValue placeholder="Selecione uma sprint" />
            </SelectTrigger>
            <SelectContent>
              {sprints.map((sprint) => (
                <SelectItem key={sprint.id} value={sprint.id.toString()}>
                  {sprint.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {isDeveloper && selectedSprintId && (
            <Button onClick={() => openTaskModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          )}
          {canEndSprint && (
            <Button
              variant="destructive"
              onClick={() => setIsEndSprintDialogOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Encerrar Sprint
            </Button>
          )}
        </div>
      </div>

      {/* Detalhes da Sprint Selecionada */}
      {selectedSprint && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Card de Informações Gerais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Informações da Sprint
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Nome</Label>
                <p className="text-lg font-medium">{selectedSprint.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Início</Label>
                  <p className="font-medium">{formatDate(selectedSprint.start_date)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Término</Label>
                  <p className="font-medium">{formatDate(selectedSprint.end_date)}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">
                  {isSprintEnded(selectedSprint) ? (
                    <Badge variant="destructive">Prazo Expirado</Badge>
                  ) : (
                    <Badge className="bg-blue-500">Ativa</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Objetivo */}
          {selectedSprint.objective && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Objetivo da Sprint
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base whitespace-pre-wrap">{selectedSprint.objective}</p>
              </CardContent>
            </Card>
          )}

          {/* Card de Tecnologias */}
          {selectedSprint.tech && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Tecnologias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base whitespace-pre-wrap">{selectedSprint.tech}</p>
              </CardContent>
            </Card>
          )}

          {/* Card de Equipe */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Equipe
              </CardTitle>
              <CardDescription>
                Membros participantes desta sprint
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedSprint.team ? (
                <div className="flex flex-wrap gap-2">
                  {selectedSprint.team.split(',').map((memberId) => {
                    const member = members.find(m => m.id === parseInt(memberId));
                    return member ? (
                      <Badge key={member.id} variant="outline" className="px-3 py-1">
                        {member.username}
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({member.role})
                        </span>
                      </Badge>
                    ) : null;
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum membro definido</p>
              )}
            </CardContent>
          </Card>

          {/* Card de Incremento/Saída */}
          {selectedSprint.increment && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Incremento Esperado</CardTitle>
                <CardDescription>
                  Resultado esperado ao final da sprint
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-base whitespace-pre-wrap">{selectedSprint.increment}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Quadro de Tarefas (Kanban) */}
      {selectedSprintId && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Tarefas da Sprint</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
              <div key={status} className="space-y-3">
                <div className={`p-3 rounded-lg border-2 ${statusColors[status as keyof typeof statusColors]}`}>
                  <h4 className="font-semibold text-center">
                    {statusLabels[status as keyof typeof statusLabels]} ({statusTasks.length})
                  </h4>
                </div>
                <div className="space-y-3">
                  {statusTasks.map((task) => (
                    <Card key={task.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4 space-y-3">
                        <p className="text-sm font-medium line-clamp-3">{task.description}</p>
                        <div className="text-xs text-muted-foreground">
                          <p className="font-semibold">{task.backlog_item.title}</p>
                          <p className="text-xs mt-1">
                            Prioridade: {priorityLabels[task.backlog_item.priority] || task.backlog_item.priority}
                          </p>
                        </div>
                        {task.assigned_to && (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {task.assigned_to.username}
                            </Badge>
                          </div>
                        )}
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openTaskModal(task)}
                            className="flex-1"
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          {isDeveloper && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setTaskToDelete(task)}
                              className="flex-1"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Excluir
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {statusTasks.length === 0 && (
                    <div className="text-center p-6 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                      Nenhuma tarefa
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Criar/Editar Tarefa */}
      {isTaskModalOpen && (
        <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
              <DialogDescription>
                {editingTask ? "Atualize as informações da tarefa" : "Crie uma nova tarefa para a sprint"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {backlogItems.length === 0 ? (
                <div className="text-center p-6 space-y-3">
                  <div className="text-muted-foreground">
                    <p className="font-semibold">Nenhum item no Product Backlog</p>
                    <p className="text-sm mt-2">Para criar tarefas, você precisa primeiro ter itens no Product Backlog.</p>
                  </div>
                  <div className="text-sm text-left bg-muted p-4 rounded-lg space-y-2">
                    <p className="font-semibold">Como criar itens do backlog:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Vá para a aba "Backlog do Produto"</li>
                      <li>Clique em "Novo Item" para criar itens do backlog</li>
                      <li>Volte para "Plano da Sprint" e crie tarefas</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="backlog-item">Item do Backlog *</Label>
                    <Select
                      value={taskForm.backlog_item_id}
                      onValueChange={(value) => setTaskForm({ ...taskForm, backlog_item_id: value })}
                    >
                      <SelectTrigger id="backlog-item">
                        <SelectValue placeholder="Selecione um item" />
                      </SelectTrigger>
                      <SelectContent>
                        {backlogItems.map((item) => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição *</Label>
                    <Textarea
                      id="description"
                      placeholder="Descreva a tarefa..."
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assigned-to">Responsável</Label>
                    <Select
                      value={taskForm.assigned_to_id || "none"}
                      onValueChange={(value) => setTaskForm({ ...taskForm, assigned_to_id: value === "none" ? "" : value })}
                    >
                      <SelectTrigger id="assigned-to">
                        <SelectValue placeholder="Selecione um responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {members && members.length > 0 && members.map((member) => (
                          <SelectItem key={member.id} value={member.id.toString()}>
                            {member.username} ({member.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={taskForm.status}
                      onValueChange={(value) => setTaskForm({ ...taskForm, status: value as any })}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODO">A fazer</SelectItem>
                        <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                        <SelectItem value="DONE">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeTaskModal}>
                Cancelar
              </Button>
              {backlogItems.length > 0 && (
                <Button onClick={handleSaveTask}>
                  {editingTask ? "Atualizar" : "Criar"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação de Encerramento */}
      <AlertDialog open={isEndSprintDialogOpen} onOpenChange={setIsEndSprintDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar Sprint</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja encerrar a sprint "{selectedSprint?.name}"?
              {isSprintEnded(selectedSprint!) && " O prazo da sprint já expirou."}
              {canManageProject && !isSprintEnded(selectedSprint!) && " Como Scrum Master, você pode encerrar a sprint a qualquer momento."}
              <br /><br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndSprint}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Encerrar Sprint
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}