
import { toast } from "sonner";

/**
 * World-Class Error Handling Wrapper for Supabase queries.
 * Provides consistent UI feedback and error logging.
 */
export async function safeDataFetch<T>(
  promise: Promise<{ data: T | null; error: any }>,
  errorMessage: string = "Falha ao carregar dados"
): Promise<T | null> {
  try {
    const { data, error } = await promise;
    if (error) {
      console.error(`[DataFetchError] ${errorMessage}:`, error);
      toast.error(errorMessage);
      return null;
    }
    return data;
  } catch (err) {
    console.error(`[DataFetchException] ${errorMessage}:`, err);
    toast.error("Erro inesperado de conexão");
    return null;
  }
}
