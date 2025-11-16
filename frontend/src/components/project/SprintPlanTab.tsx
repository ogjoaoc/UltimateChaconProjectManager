import { useState, useEffect } from "react";
import { apiFetch } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, Target, Code, CheckCircle2 } from "lucide-react";

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
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [projectId]);

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