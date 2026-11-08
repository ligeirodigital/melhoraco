export type AssistantSnapshot = {
  context: {
    installments: { asOf: string; pending: number; overdue: number; received: number; pendingCount: number; overdueCount: number; next30Days: number; days31To60: number; days61To90: number; monthlyPending: { month: string; amount: number }[] };
    orders: { total: number; byStatus: Record<string, number> };
  };
  blocked?: boolean; error?: string; canResume?: boolean; blockType?: string;
};

export function validateScenario(value: string): string | null {
  const length = value.trim().length;
  if (length < 10) return "Descreva a situação com pelo menos 10 caracteres.";
  if (length > 4000) return "A descrição deve ter no máximo 4.000 caracteres.";
  return null;
}

/** AI SDK handles SSE framing, UTF-8 and terminal stream errors. */
export async function consumeAssistantResponse(
  response: Response,
  onUpdate: (text: string, reasoning: string) => void,
) {
  if (!response.body) throw new Error("A IA não enviou uma resposta.");
  const { parseJsonEventStream, readUIMessageStream, uiMessageChunkSchema } = await import("ai");
  const chunks = parseJsonEventStream({ stream: response.body, schema: uiMessageChunkSchema }).pipeThrough(
    new TransformStream({ transform(result, controller) {
      if (!result.success) throw new Error("A resposta da IA foi interrompida ou está inválida.");
      controller.enqueue(result.value);
    } }),
  );
  let finalText = "";
  for await (const message of readUIMessageStream({ stream: chunks, terminateOnError: true })) {
    finalText = message.parts.filter((part) => part.type === "text").map((part) => part.text).join("");
    const reasoning = message.parts.filter((part) => part.type === "reasoning").map((part) => part.text).join("");
    onUpdate(finalText, reasoning);
  }
  if (!finalText.trim()) throw new Error("A IA encerrou a solicitação sem uma análise. Nenhum lançamento foi alterado.");
}
