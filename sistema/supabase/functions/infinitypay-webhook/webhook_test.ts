import {
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { validateWebhookConsistency } from "../_shared/infinitypay.ts";

// Cenário real: checkout https://checkout.infinitepay.io/melhoraco/dsZGYWezKR
// O slug "dsZGYWezKR" é gerado pela InfinityPay — nós NÃO o conhecemos ao
// criar o link. A correção em infinitypay-create-link grava
// payment_invoice_slug=null, então a validação só compara valores.

Deno.test("aceita webhook quando expected.invoice_slug é null (fluxo novo)", () => {
  const r = validateWebhookConsistency(
    { amount: 59, invoice_slug: null },
    { paidAmount: 59, invoiceSlug: "dsZGYWezKR" },
  );
  assertEquals(r.ok, true);
});

Deno.test("aceita quando valor bate exatamente", () => {
  const r = validateWebhookConsistency(
    { amount: 59.0, invoice_slug: null },
    { paidAmount: 59.0, invoiceSlug: "dsZGYWezKR" },
  );
  assertEquals(r.ok, true);
});

Deno.test("rejeita quando valor diverge > 1 centavo", () => {
  const r = validateWebhookConsistency(
    { amount: 59, invoice_slug: null },
    { paidAmount: 58.5, invoiceSlug: "dsZGYWezKR" },
  );
  assertEquals(r.ok, false);
  assertEquals(r.reason, "amount_mismatch");
});

Deno.test("BUG antigo reproduzido: slug pré-gravado != slug real => mismatch", () => {
  // Antes da correção, gravávamos payment_invoice_slug=orderNsu (ex.: MEL-...).
  // Quando o webhook chegava com o slug real, disparava mismatch.
  const r = validateWebhookConsistency(
    { amount: 59, invoice_slug: "MEL-20260101-ABCDEF" },
    { paidAmount: 59, invoiceSlug: "dsZGYWezKR" },
  );
  assertEquals(r.ok, false);
  assertEquals(r.reason, "invoice_slug_mismatch");
});

Deno.test("aceita quando slug esperado é igual ao recebido", () => {
  const r = validateWebhookConsistency(
    { amount: 59, invoice_slug: "dsZGYWezKR" },
    { paidAmount: 59, invoiceSlug: "dsZGYWezKR" },
  );
  assertEquals(r.ok, true);
});

Deno.test("tolera diferença de arredondamento até 1 centavo", () => {
  const r = validateWebhookConsistency(
    { amount: 59.005, invoice_slug: null },
    { paidAmount: 59.00, invoiceSlug: "dsZGYWezKR" },
  );
  assertEquals(r.ok, true);
});
