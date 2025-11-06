import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckSquare, Users, TrendingUp, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mb-6">
            <CheckSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            Ultimate Scrum Manager
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            Gerencie seus projetos ágeis com eficiência e simplicidade
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="text-lg px-8"
            >
              Começar Agora
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/auth")}
              className="text-lg px-8"
            >
              Fazer Login
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl border bg-card hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Colaboração em Equipe</h3>
            <p className="text-muted-foreground">
              Trabalhe junto com sua equipe em tempo real e mantenha todos alinhados
            </p>
          </div>

          <div className="p-6 rounded-xl border bg-card hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Acompanhamento Visual</h3>
            <p className="text-muted-foreground">
              Visualize o progresso dos projetos com dashboards intuitivos
            </p>
          </div>

          <div className="p-6 rounded-xl border bg-card hover:shadow-lg transition-all">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Sprints Ágeis</h3>
            <p className="text-muted-foreground">
              Planeje e execute sprints de forma eficiente com ferramentas dedicadas
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
