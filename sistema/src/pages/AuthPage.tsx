import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Lock, LogIn, UserPlus, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.jfif";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ 
          email: email.trim().toLowerCase(), 
          password,
          options: {
            data: {
              display_name: email.split('@')[0],
              app: 'melhoraco',
            }
          }
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Conta criada e login realizado! 🎉");
        } else {
          toast.success("Verifique seu e-mail para confirmar a conta! 📧");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ 
          email: email.trim().toLowerCase(), 
          password 
        });
        if (error) throw error;
        toast.success("Login realizado com sucesso!");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <img src={logo} alt="Melhoraço" className="w-20 h-20 rounded-2xl object-cover shadow-lg mx-auto border-2 border-border bg-white p-1" />
            <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-1.5 rounded-xl shadow-md border-2 border-background">
               <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Melhoraço Inox</h1>
            <p className="text-muted-foreground font-medium text-xs uppercase tracking-widest">Enterprise Management</p>
          </div>
        </div>

        <div className="bg-card p-8 rounded-2xl shadow-sm border border-border space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {isSignUp ? "Nova Conta" : "Login"}
            </h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              Acesse sua plataforma operacional
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="label-caps">E-mail</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 rounded-xl bg-muted/30 border-border font-medium"
                  autoComplete="email"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="label-caps">Senha</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-12 rounded-xl bg-muted/30 border-border font-medium"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  minLength={8}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-bold shadow-sm transition-all mt-2"
            >
              {loading ? "Processando..." : isSignUp ? (
                <><UserPlus className="w-5 h-5 mr-2" /> CRIAR CONTA</>
              ) : (
                <><LogIn className="w-5 h-5 mr-2" /> ENTRAR</>
              )}
            </Button>
          </form>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-center text-xs font-bold text-muted-foreground hover:text-primary transition-colors py-1"
          >
            {isSignUp ? "Já tem conta? Login" : "Solicitar acesso"}
          </button>
        </div>
        
        <p className="text-center text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
          © 2026 Melhoraço Inox
        </p>
      </div>
    </div>
  );
}
