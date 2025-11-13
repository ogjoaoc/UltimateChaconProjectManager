import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/api/client";
import { toast } from "sonner";

type User = {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
};

export default function ProfileModal({
  open,
  onOpenChange,
  user,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSaved?: (u: User) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [password, setPassword] = React.useState("");

  React.useEffect(() => {
    if (user) {
      setName(user.username || "");
      setEmail(user.email || "");
      setBio(user.bio || "");
      setPassword("");
    }
  }, [user, open]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const payload: any = {};
      if (name !== user.username) payload.username = name;
      if (email !== user.email) payload.email = email;
      if (password.trim()) payload.password = password;
      if (bio !== (user.bio || "")) payload.bio = bio;

      if (Object.keys(payload).length === 0) {
        toast.info("Nenhuma alteração para salvar");
        onOpenChange(false);
        return;
      }

      const updated = await apiFetch(`/api/users/me/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      toast.success("Perfil atualizado");
      onSaved && onSaved(updated);
      onOpenChange(false);
    
    } catch (err: any) {
      console.error("Objeto de erro recebido:", err); // Para debug
      
      let errorMessage = "Erro ao atualizar perfil"; // Mensagem padrão

      try {
        // Padronização das mensagens de erro
        if (err && typeof err === "object" && !err.message) {
          const fieldErrors = Object.values(err).flat();
          if (fieldErrors.length > 0) {
            errorMessage = fieldErrors.join(" ");
          }
        } else if (err.message) {
          errorMessage = err.message;
        } else if (typeof err === "string") {
            errorMessage = err;
        }

        // Limpa mensagens que começam com nomes de campo
        const parts = errorMessage.split(":");
        const possibleFields = ['username', 'email', 'detail'];
        
        if (parts.length > 1 && possibleFields.includes(parts[0].trim())) {
          errorMessage = parts.slice(1).join(":").trim();
        }

      } catch (e) {
        console.error("Falha ao processar o erro:", e);
        errorMessage = "Ocorreu um erro ao atualizar o perfil.";
      }
      
      toast.error(errorMessage);

    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Perfil</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Nome de usuário</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Senha (deixe em branco para não alterar)</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Bio</label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
