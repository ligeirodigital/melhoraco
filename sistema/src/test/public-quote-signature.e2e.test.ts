/**
 * E2E: public quote signature flow via anon RPCs.
 *
 * Validates that the SECURITY DEFINER functions used by the client portal
 * accept a text token, cast it safely to uuid, and never leak the
 * "operator does not exist: uuid = text" error to unauthenticated callers.
 *
 * We do NOT mutate real quotes — we assert that invalid/random tokens
 * return the documented "false / invalid_quote" shape rather than throwing.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const FAKE_QUOTE = "00000000-0000-0000-0000-000000000000";
const FAKE_TOKEN_UUID = "11111111-1111-1111-1111-111111111111";
const NOT_A_UUID = "not-a-uuid";

describe("public quote signature flow (anon RPCs)", () => {
  beforeAll(() => {
    if (!url || !anon) throw new Error("Missing VITE_SUPABASE_* env for E2E");
  });

  it("get_public_quote returns null for garbage slugs (no SQL error)", async () => {
    const { data, error } = await supabase.rpc("get_public_quote", {
      p_slug: `q_${FAKE_QUOTE}_${NOT_A_UUID}`,
    });
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("approve_public_quote returns false for invalid token (no uuid=text error)", async () => {
    const { data, error } = await supabase.rpc("approve_public_quote", {
      p_quote_id: FAKE_QUOTE,
      p_token: NOT_A_UUID,
      p_signature_url: null,
      p_receipt_url: null,
    });
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it("approve_public_quote returns false for well-formed but unknown token", async () => {
    const { data, error } = await supabase.rpc("approve_public_quote", {
      p_quote_id: FAKE_QUOTE,
      p_token: FAKE_TOKEN_UUID,
      p_signature_url: null,
      p_receipt_url: null,
    });
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it("save_public_feedback returns false for invalid token", async () => {
    const { data, error } = await supabase.rpc("save_public_feedback", {
      p_quote_id: FAKE_QUOTE,
      p_token: NOT_A_UUID,
      p_rating: 5,
      p_comment: null,
      p_project_photo_url: null,
    });
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it("consume_referral_code rejects invalid quote token gracefully", async () => {
    const { data, error } = await supabase.rpc("consume_referral_code", {
      p_quote_id: FAKE_QUOTE,
      p_token: NOT_A_UUID,
      p_code: "ANY",
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ ok: false, reason: "invalid_quote" });
  });

  it("get_upsell_suggestions returns [] for invalid token", async () => {
    const { data, error } = await supabase.rpc("get_upsell_suggestions", {
      p_quote_id: FAKE_QUOTE,
      p_token: NOT_A_UUID,
    });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("validate_referral_code returns empty reason for blank input", async () => {
    const { data, error } = await supabase.rpc("validate_referral_code", {
      p_code: "",
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ valid: false, reason: "empty" });
  });

  it("full happy-path against an existing quote if one is publicly reachable", async () => {
    // Best-effort: only runs when a real quote+token pair is discoverable
    // through the public RPC. Skips silently otherwise so CI never depends
    // on seeded data.
    const probeSlug = process.env.E2E_PUBLIC_QUOTE_SLUG;
    if (!probeSlug) return;

    const { data: quote, error } = await supabase.rpc("get_public_quote", {
      p_slug: probeSlug,
    });
    expect(error).toBeNull();
    expect(quote).toBeTruthy();
    expect((quote as any).id).toBeTruthy();
    expect((quote as any).client_view_token).toBeTruthy();

    const { data: upsell, error: upErr } = await supabase.rpc(
      "get_upsell_suggestions",
      { p_quote_id: (quote as any).id, p_token: (quote as any).client_view_token },
    );
    expect(upErr).toBeNull();
    expect(Array.isArray(upsell)).toBe(true);
  });
});
