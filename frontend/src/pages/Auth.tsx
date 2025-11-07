// src/pages/Auth.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, setTokens } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:8000";

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  // login fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // register fields
  const [rUsername, setRUsername] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPassword, setRPassword] = useState("");
  const [rPassword2, setRPassword2] = useState("");
  const [rBio, setRBio] = useState("");

  // --- LOGIN ---
  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_ROOT}/api/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro no login");
      if (data.access) setTokens(data.access, data.refresh || "");
      toast.success("Logado com sucesso");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Erro no login");
    } finally {
      setLoading(false);
    }
  }

  // --- REGISTER ---
  async function handleRegister(e?: React.FormEvent) {
    e?.preventDefault();
    if (!rUsername.trim()) return toast.error("Usuário vazio");
    if (!rPassword) return toast.error("Senha vazia");
    if (rPassword !== rPassword2) return toast.error("Senhas não conferem");
    setLoading(true);
    try {
      const res = await fetch(`${API_ROOT}/api/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: rUsername.trim(),
          email: rEmail.trim(),
          password: rPassword,
          bio: rBio.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data.detail ||
          (typeof data === "object" ? JSON.stringify(data) : data) ||
          "Erro no cadastro";
        throw new Error(msg);
      }
      if (data.access) setTokens(data.access, data.refresh || "");
      toast.success("Conta criada e logado");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Autenticação</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v: any) => setTab(v as "login" | "register")}>
            <TabsList>
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Registrar</TabsTrigger>
            </TabsList>

            {/* --- LOGIN TAB --- */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="flex flex-col gap-3 mt-4">
                <Label>Usuário</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Seu usuário"
                />
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha"
                />
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Entrar"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* --- REGISTER TAB --- */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="flex flex-col gap-3 mt-4">
                <Label>Usuário</Label>
                <Input
                  value={rUsername}
                  onChange={(e) => setRUsername(e.target.value)}
                  placeholder="Escolha um usuário"
                />
                <Label>E-mail</Label>
                <Input
                  value={rEmail}
                  onChange={(e) => setREmail(e.target.value)}
                  placeholder="seu@exemplo.com"
                />
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={rPassword}
                  onChange={(e) => setRPassword(e.target.value)}
                  placeholder="Senha"
                />
                <Label>Repita a senha</Label>
                <Input
                  type="password"
                  value={rPassword2}
                  onChange={(e) => setRPassword2(e.target.value)}
                  placeholder="Repita a senha"
                />
                <Label>Bio</Label>
                <Input
                  value={rBio}
                  onChange={(e) => setRBio(e.target.value)}
                  placeholder="Fale sobre você"
                />
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Registrar"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
