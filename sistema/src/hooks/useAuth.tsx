import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAllowed: boolean;
  isAdmin: boolean;
  /** Login vinculado a um investidor (ex.: Thales); vê o painel "Minha comissão". */
  isInvestor: boolean;
  profile: { name?: string; role?: string } | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAllowed: false,
  isAdmin: false,
  isInvestor: false,
  profile: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInvestor, setIsInvestor] = useState(false);
  const [profile, setProfile] = useState<{ name?: string; role?: string } | null>(null);

  const checkInvestor = async (userId?: string) => {
    if (!userId) { setIsInvestor(false); return; }
    try {
      const { data } = await supabase.from('investors').select('id').eq('user_id', userId).maybeSingle();
      setIsInvestor(!!data);
    } catch {
      setIsInvestor(false);
    }
  };

  const checkAccess = async (email?: string, userId?: string) => {
    if (!email) {
      setIsAllowed(false);
      setIsAdmin(false);
      setIsInvestor(false);
      return;
    }
    await checkInvestor(userId);
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Master user safety
    if (normalizedEmail === 'melhoracooficial@gmail.com') {
      setIsAllowed(true);
      setIsAdmin(true);
      return;
    }
    
    try {
      // Return to original logic: check only allowed_emails
      const { data, error } = await supabase
        .from('allowed_emails')
        .select('email')
        .ilike('email', normalizedEmail)
        .maybeSingle();
      
      setIsAllowed(!!data);
      setIsAdmin(normalizedEmail === 'melhoracooficial@gmail.com');
    } catch (err) {
      console.error('Error checking access:', err);
      setIsAllowed(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Check current session first
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          if (isMounted) setLoading(false);
          return;
        }

        if (isMounted) setSession(session);
        
        if (session?.user?.email) {
          await checkAccess(session.user.email, session.user.id);
        }
      } catch (err) {
        console.error("Auth init exception:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    // Importante: não chamar o Supabase (await) dentro deste callback — a biblioteca segura uma trava
    // durante o login e a consulta fica esperando para sempre. Por isso a checagem roda logo depois (setTimeout).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      setSession(session);

      if (event === 'TOKEN_REFRESHED') return; // mesma pessoa, nada a checar de novo

      if (session?.user?.email) {
        const { email, id } = session.user;
        setLoading(true);
        setTimeout(async () => {
          try {
            await checkAccess(email, id);
          } finally {
            if (isMounted) setLoading(false);
          }
        }, 0);
      } else {
        setIsAllowed(false);
        setIsAdmin(false);
        setIsInvestor(false);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setIsAllowed(false);
      setIsAdmin(false);
      setIsInvestor(false);
      setProfile(null);
      setSession(null);
    } catch (error: any) {
      console.error("SignOut error:", error);
      toast.error("Erro ao sair da conta");
    }
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, isAllowed, isAdmin, isInvestor, profile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
