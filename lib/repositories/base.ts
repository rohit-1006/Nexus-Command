import type { ZodTypeAny } from "zod";
import { z } from "zod";

/**
 * Small helper for the repository layer: every repository boundary validates
 * its inputs with a Zod schema before touching the database.
 */
export function validated<S extends ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  return schema.parse(input);
}

export function safe<S extends ZodTypeAny>(
  schema: S,
  input: unknown,
): { ok: true; data: z.infer<S> } | { ok: false; error: string } {
  const result = schema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  return { ok: true, data: result.data };
}