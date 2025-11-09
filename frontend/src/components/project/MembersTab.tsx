import { useState, useEffect } from "react";
import { apiFetch } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";

type ProjectMember = {
  id: number;
  username: string;
  email?: string;
  role: "PO" | "SM" | "DEV";
};

type ProductOwner ={
    id: number;
    username: string;
    email?: string;
}


type Props = {
  projectId: number;
  isProductOwner: boolean;
};

// Função auxiliar para exibir o nome completo do papel do membro
function getRoleDisplayName(role: string) {
  if (role === "PO") return "Product Owner";
  if (role === "SM") return "Scrum Master";
  if (role === "DEV") return "Developer";
  return role;
}


export default function MembersTab({ projectId, isProductOwner }: Props) {
    const [owner, setOwner] = useState<ProductOwner | null>(null);
    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [removingId, setRemovingId] = useState<number | null>(null);

    useEffect(() => {
        fetchData();
    }, [projectId]);
  
    async function fetchData() {
    setLoading(true);
    try {
      // MESMO ENDPOINT do InviteMembers.tsx!
      const projectData = await apiFetch(`/api/projects/${projectId}/`);
      
      // Separamos o dono...
      setOwner(projectData.owner);
      // ...da lista de membros
      const otherMembers = projectData.members.filter(
        (member: ProjectMember) => member.id !== projectData.owner.id
      );

      setMembers(otherMembers);

    } catch (err: any) {
      toast.error("Erro ao carregar membros do projeto");
    } finally {
      setLoading(false);
    }
    }
    async function handleRemoveMember(memberId: number) {
    if (!confirm("Tem certeza que deseja remover este membro do projeto?")) {
      return;
    }

    setRemovingId(memberId); // Ativa o loading do botão
    try {
      //
      // 1. A CHAMADA DA API
      //
      await apiFetch(`/api/projects/${projectId}/remove_member/`, {
        //
        // 2. O MÉTODO: POST
        //    (corresponde ao 'def post' na sua RemoveMemberView)
        //
        method: "POST",
        //
        // 3. O CORPO (Payload)
        //    (Envia o 'user_id' que a sua view espera em request.data.get('user_id'))
        //
        body: JSON.stringify({ user_id: memberId }),
      });

      toast.success("Membro removido com sucesso");
      
      // 4. ATUALIZAÇÃO DA TELA
      //    (Após o sucesso, busca os dados novamente para o cartão sumir)
      fetchData();

    } catch (err: any) {
      toast.error(err.detail || "Erro ao remover membro");
    } finally {
      setRemovingId(null); // Desativa o loading
    }
  }


    if (loading) return <div>Carregando Membros...</div>
  
    return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card do Product Owner (vem do objeto "owner") */}
        {owner && (
        <Card key={owner.id}>
            <CardHeader>
                <CardTitle className="text-lg">{owner.username}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Email: {owner.email || "Sem email cadastrado"}
                </p>
                <p className="text-sm font-semibold text-blue-600">
                    Função: {getRoleDisplayName("PO")}
                </p>
            </CardContent>
        </Card> 
        )}
        {/* Cards dos demais membros (vem do array "members") */}
        {members.map((member) => (
          <Card key={member.id}>
            <CardHeader>
              <CardTitle className="text-lg">{member.username}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Email: {member.email || "Sem email cadastrado"}
                </p>
                <p className="text-sm text-muted-foreground">
                    Função: {getRoleDisplayName(member.role)}
                </p>
            </CardContent>
            {isProductOwner && (
              <CardFooter className="pt-4"> {/* pt-4 = padding-top */}
                <Button
                  variant="destructive" // "destructive" dá a cor vermelha de perigo
                  size="sm" // "sm" para um botão pequeno, como no seu exemplo
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={removingId === member.id}
                  className="w-full" // Faz o botão ocupar a largura total do footer
                >
                  {removingId === member.id ? "Removendo..." : "Remover"}
                </Button>
              </CardFooter>
            )}
          </Card>
        
    ))}
      </div>
    </div>
  );
}