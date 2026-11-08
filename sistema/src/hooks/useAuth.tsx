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
  profile: { name?: string; role?: string } | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAllowed: false,
  isAdmin: false,
  profile: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<{ name?: string; role?: string } | null>(null);

  const checkAccess = async (email?: string) => {
    if (!email) {
      setIsAllowed(false);
      setIsAdmin(false);
      return;
    }
    
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
        console.log('Initializing auth session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          if (isMounted) setLoading(false);
          return;
        }

        if (isMounted) setSession(session);
        
        if (session?.user?.email) {
          await checkAccess(session.user.email);
        }
      } catch (err) {
        console.error("Auth init exception:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (isMounted) {
        setSession(session);
        
        if (session?.user?.email) {
          setLoading(true);
          try {
            await checkAccess(session.user.email);
          } finally {
            setLoading(false);
          }
        } else {
          setIsAllowed(false);
          setIsAdmin(false);
          setLoading(false);
        }
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
      setProfile(null);
      setSession(null);
    } catch (error: any) {
      console.error("SignOut error:", error);
      toast.error("Erro ao sair da conta");
    }
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, isAllowed, isAdmin, profile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
