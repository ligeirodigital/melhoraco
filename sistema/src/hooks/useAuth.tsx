import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAllowed: boolean;
  isAdmin: boolean;
  /** Login vinculado a um investidor (ex.: Thales); vê o painel "Minha comissão". */
  isInvestor: boolean;
  /** Investidor que pode cadastrar pedidos (ex.: Thiago). */
  canCreateOrders: boolean;
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
  canCreateOrders: false,
  profile: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInvestor, setIsInvestor] = useState(false);
  const [canCreateOrders, setCanCreateOrders] = useState(false);
  const [profile, setProfile] = useState<{ name?: string; role?: string } | null>(null);

  /** Consulta direta à API REST com o token da sessão. Não usa o cliente do Supabase, que espera a trava de login. */
  const restSelect = async <T,>(table: string, query: string, token: string): Promise<T[]> => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
        'Accept-Profile': 'melhoraco',
      },
    });
    if (!res.ok) throw new Error(`${table} ${res.status}`);
    return (await res.json()) as T[];
  };

  const checkInvestor = async (userId: string | undefined, token: string) => {
    if (!userId) { setIsInvestor(false); setCanCreateOrders(false); return; }
    try {
      const rows = await restSelect<{ id: string; can_create_orders: boolean }>(
        'investors', `select=id,can_create_orders&user_id=eq.${userId}&limit=1`, token,
      );
      setIsInvestor(rows.length > 0);
      setCanCreateOrders(!!rows[0]?.can_create_orders);
    } catch {
      setIsInvestor(false);
      setCanCreateOrders(false);
    }
  };

  const checkAccess = async (email: string | undefined, userId: string | undefined, token: string) => {
    if (!email) {
      setIsAllowed(false);
      setIsAdmin(false);
      setIsInvestor(false);
      setCanCreateOrders(false);
      return;
    }
    await checkInvestor(userId, token);

    const normalizedEmail = email.toLowerCase().trim();

    // Master user safety
    if (normalizedEmail === 'melhoracooficial@gmail.com') {
      setIsAllowed(true);
      setIsAdmin(true);
      return;
    }

    try {
      const rows = await restSelect<{ email: string }>(
        'allowed_emails',
        `select=email&email=ilike.${encodeURIComponent(normalizedEmail)}&limit=1`,
        token,
      );
      setIsAllowed(rows.length > 0);
      setIsAdmin(false);
    } catch (err) {
      console.error('Error checking access:', err);
      setIsAllowed(false);
    }
  };

  /** Se a checagem travar, libera a tela com o acesso negado em vez de girar para sempre. */
  const checkAccessWithTimeout = (email: string, userId: string, token: string) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        console.error('Checagem de acesso demorou demais');
        resolve();
      }, 10000);
    });
    return Promise.race([checkAccess(email, userId, token), timeout]).finally(() => clearTimeout(timer));
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
          await checkAccessWithTimeout(session.user.email, session.user.id, session.access_token);
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
        const token = session.access_token;
        setTimeout(async () => {
          try {
            await checkAccessWithTimeout(email, id, token);
          } finally {
            if (isMounted) setLoading(false);
          }
        }, 0);
      } else {
        setIsAllowed(false);
        setIsAdmin(false);
        setIsInvestor(false);
        setCanCreateOrders(false);
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
      setCanCreateOrders(false);
      setProfile(null);
      setSession(null);
    } catch (error: any) {
      console.error("SignOut error:", error);
      toast.error("Erro ao sair da conta");
    }
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, isAllowed, isAdmin, isInvestor, canCreateOrders, profile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
