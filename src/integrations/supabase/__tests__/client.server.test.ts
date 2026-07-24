import { describe, expect, it } from "vitest";
import {
  buildSupabaseAdminHeaders,
  isUsableSupabaseServiceRoleKey,
  selectSupabaseServiceRoleKey,
} from "../client.server";

function fakeJwt(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
): string {
  return `${Buffer.from(JSON.stringify(header)).toString("base64url")}.${Buffer.from(
    JSON.stringify(payload),
  ).toString("base64url")}.signature`;
}

describe("buildSupabaseAdminHeaders", () => {
  it("remove o bearer externo ao usar uma chave secreta opaca", () => {
    const request = new Request("https://example.supabase.co/auth/v1/admin/users", {
      headers: {
        Authorization: "Bearer olist-external-jwt",
        "Content-Type": "application/json",
      },
    });

    const headers = buildSupabaseAdminHeaders("sb_secret_server_only", request);

    expect(headers.get("Authorization")).toBeNull();
    expect(headers.get("apikey")).toBe("sb_secret_server_only");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("substitui qualquer bearer externo pelo service-role legado", () => {
    const request = new Request("https://example.supabase.co/auth/v1/admin/users", {
      headers: { Authorization: "Bearer olist-external-jwt" },
    });

    const headers = buildSupabaseAdminHeaders("legacy-service-role-jwt", request);

    expect(headers.get("Authorization")).toBe("Bearer legacy-service-role-jwt");
    expect(headers.get("apikey")).toBe("legacy-service-role-jwt");
  });
});

describe("seleção da chave administrativa", () => {
  it("aceita chave secreta nova e rejeita chave pública", () => {
    expect(isUsableSupabaseServiceRoleKey("sb_secret_server_only")).toBe(true);
    expect(isUsableSupabaseServiceRoleKey("sb_publishable_browser_key")).toBe(false);
  });

  it("aceita service-role legado HS256", () => {
    const key = fakeJwt({ alg: "HS256", typ: "JWT" }, { role: "service_role" });

    expect(isUsableSupabaseServiceRoleKey(key)).toBe(true);
  });

  it("rejeita ES256 sem kid e usa a chave de fallback válida", () => {
    const invalidWithoutKid = fakeJwt({ alg: "ES256", typ: "JWT" }, { role: "service_role" });
    const validFallback = "sb_secret_valid_fallback";

    expect(isUsableSupabaseServiceRoleKey(invalidWithoutKid)).toBe(false);
    expect(
      selectSupabaseServiceRoleKey({
        SB_SERVICE_ROLE_KEY: invalidWithoutKid,
        SUPABASE_SERVICE_ROLE_KEY: validFallback,
      }),
    ).toBe(validFallback);
  });

  it("rejeita token de usuário mesmo quando é um JWT válido", () => {
    const userToken = fakeJwt(
      { alg: "ES256", typ: "JWT", kid: "signing-key" },
      { role: "authenticated" },
    );

    expect(isUsableSupabaseServiceRoleKey(userToken)).toBe(false);
  });
});
