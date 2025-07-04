/**
 * @fileoverview Redaction Helper Utilities
 * @since 1.0.0
 */
import type { RedactionFunction } from "../Domain/Types/RedactionFunction.js";
import type { RedactionContext } from "../Domain/ValueObjects/RedactionContext.js";
import type { RedactionResult } from "../Domain/ValueObjects/RedactionResult.js";

/**
 * Creates a function that masks specific headers with a redaction value
 * @since 1.0.0
 * @category redaction
 * @param headerNames - Array of header names to mask (case-insensitive)
 * @param mask - The value to replace sensitive headers with
 * @returns Function that takes headers and returns masked headers
 * @example
 * ```typescript
 * const maskAuth = maskHeaders(["authorization", "x-api-key"]);
 * const headers = { "Authorization": "Bearer token", "Content-Type": "application/json" };
 * const masked = maskAuth(headers); // { "Authorization": "***REDACTED***", "Content-Type": "application/json" }
 * ```
 */
export function maskHeaders(
  headerNames: ReadonlyArray<string>,
  mask = "***REDACTED***",
): (headers: Record<string, string>) => Record<string, string> {
  const headerSet = new Set(headerNames.map((name) => name.toLowerCase()));

  return (headers: Record<string, string>) => {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (headerSet.has(key.toLowerCase())) {
        result[key] = mask;
      } else {
        result[key] = value;
      }
    }

    return result;
  };
}

/**
 * Creates a function that masks specific JSON paths with a redaction value
 * @since 1.0.0
 * @category redaction
 * @param paths - Array of dot-notation paths to mask (e.g., "user.password", "auth.token")
 * @param mask - The value to replace sensitive data with
 * @returns Function that takes data and returns masked data
 * @example
 * ```typescript
 * const maskSecrets = maskJson(["user.password", "auth.token"]);
 * const data = { user: { name: "john", password: "secret" }, auth: { token: "abc123" } };
 * const masked = maskSecrets(data); // { user: { name: "john", password: "***REDACTED***" }, auth: { token: "***REDACTED***" } }
 * ```
 */
export function maskJson(
  paths: ReadonlyArray<string>,
  mask = "***REDACTED***",
): (data: unknown) => unknown {
  return (data: unknown) => {
    if (typeof data !== "object" || data === null) {
      return data;
    }

    const result = structuredClone(data);

    for (const path of paths) {
      setValueAtPath(result, path, mask);
    }

    return result;
  };
}

/**
 * Creates a function that masks URL query parameters with a redaction value
 * @since 1.0.0
 * @category redaction
 * @param paramNames - Array of parameter names to mask (case-insensitive)
 * @param mask - The value to replace sensitive parameters with
 * @returns Function that takes a URL string and returns URL with masked parameters
 * @example
 * ```typescript
 * const maskTokenParam = maskUrlParams(["token", "api_key"]);
 * const url = "https://api.example.com/data?token=abc123&user=john";
 * const masked = maskTokenParam(url); // "https://api.example.com/data?token=***REDACTED***&user=john"
 * ```
 */
export function maskUrlParams(
  paramNames: ReadonlyArray<string>,
  mask = "***REDACTED***",
): (url: string) => string {
  const paramSet = new Set(paramNames.map((name) => name.toLowerCase()));

  return (url: string) => {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);

      for (const [key, _] of params.entries()) {
        if (paramSet.has(key.toLowerCase())) {
          params.set(key, mask);
        }
      }

      urlObj.search = params.toString();
      return urlObj.toString();
    } catch {
      // If URL parsing fails, return original URL
      return url;
    }
  };
}

/**
 * Default excluded headers for security (matching HttpRecorder defaults)
 * @since 1.0.0
 * @category constants
 * @internal
 */
const DEFAULT_EXCLUDED_HEADERS = [
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "access-token",
  "refresh-token",
  "bearer",
  "x-csrf-token",
  "x-xsrf-token",
] as const;

/**
 * Creates a redaction function that masks specified headers and filters out non-redacted sensitive headers
 * @since 1.0.0
 * @category redaction
 * @param headerNames - Array of header names to mask
 * @param mask - The value to replace sensitive headers with
 * @returns RedactionFunction that can be used with HttpRecorder
 * @example
 * ```typescript
 * const redactor = createHeaderRedactor(["x-custom-token"]);
 * const recorder = HttpRecorder.layer({ path: "./recordings", mode: "record", redactionFn: redactor });
 * ```
 */
export function createHeaderRedactor(
  headerNames: ReadonlyArray<string>,
  mask = "***REDACTED***",
): RedactionFunction {
  const headerMasker = maskHeaders(headerNames, mask);
  const excludedHeadersSet = new Set(
    DEFAULT_EXCLUDED_HEADERS.map((h) => h.toLowerCase()),
  );
  const redactedHeadersSet = new Set(headerNames.map((h) => h.toLowerCase()));

  return (context: RedactionContext): RedactionResult => {
    const maskedHeaders = headerMasker(context.headers);
    const filteredHeaders: Record<string, string> = {};

    // Include headers that are either not sensitive or have been redacted
    for (const [key, value] of Object.entries(maskedHeaders)) {
      const lowerKey = key.toLowerCase();

      if (
        !excludedHeadersSet.has(lowerKey) ||
        redactedHeadersSet.has(lowerKey)
      ) {
        filteredHeaders[key] = value;
      }
    }

    return {
      headers: filteredHeaders,
      body: context.body,
    };
  };
}

/**
 * Creates a redaction function that masks JSON paths in request/response bodies
 * @since 1.0.0
 * @category redaction
 * @param paths - Array of dot-notation paths to mask in JSON bodies
 * @param mask - The value to replace sensitive data with
 * @returns RedactionFunction that can be used with HttpRecorder
 * @example
 * ```typescript
 * const redactor = createJsonRedactor(["user.password", "auth.secret"]);
 * const recorder = HttpRecorder.layer({ path: "./recordings", mode: "record", redactionFn: redactor });
 * ```
 */
export function createJsonRedactor(
  paths: ReadonlyArray<string>,
  mask = "***REDACTED***",
): RedactionFunction {
  const jsonMasker = maskJson(paths, mask);

  return (context: RedactionContext): RedactionResult => ({
    headers: context.headers,
    body: jsonMasker(context.body),
  });
}

/**
 * Creates a conditional redaction function that applies redaction based on context
 * @since 1.0.0
 * @category redaction
 * @param condition - Function that determines whether to apply redaction
 * @param redactor - The redaction function to apply when condition is true
 * @returns RedactionFunction that conditionally applies redaction
 * @example
 * ```typescript
 * const conditionalRedactor = createConditionalRedactor(
 *   (ctx) => ctx.type === "request" && ctx.method === "POST",
 *   createJsonRedactor(["password"])
 * );
 * ```
 */
export function createConditionalRedactor(
  condition: (context: RedactionContext) => boolean,
  redactor: RedactionFunction,
): RedactionFunction {
  return (context: RedactionContext): RedactionResult => {
    if (condition(context)) {
      return redactor(context);
    }
    return {
      headers: context.headers,
      body: context.body,
    };
  };
}

/**
 * Composes multiple redaction functions into a single function
 * @since 1.0.0
 * @category redaction
 * @param redactors - Array of redaction functions to compose
 * @returns RedactionFunction that applies all redactors in sequence
 * @example
 * ```typescript
 * const composedRedactor = compose(
 *   createHeaderRedactor(["authorization"]),
 *   createJsonRedactor(["password"]),
 *   createPatternRedactor([/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g]) // Credit card numbers
 * );
 * ```
 */
export function compose(
  ...redactors: ReadonlyArray<RedactionFunction>
): RedactionFunction {
  return (context: RedactionContext): RedactionResult => {
    let result: RedactionResult = {
      headers: context.headers,
      body: context.body,
    };

    for (const redactor of redactors) {
      const newContext: RedactionContext = {
        ...context,
        headers: result.headers ?? context.headers,
        body: result.body ?? context.body,
      };

      const redactionResult = redactor(newContext);
      result = {
        headers: redactionResult.headers ?? result.headers ?? context.headers,
        body: redactionResult.body ?? result.body ?? context.body,
      };
    }

    return result;
  };
}

/**
 * Creates a redaction function that masks sensitive patterns in strings and object field names
 * @since 1.0.0
 * @category redaction
 * @param patterns - Array of strings or RegExp patterns to match and redact
 * @param mask - The value to replace matched patterns with
 * @returns RedactionFunction that masks matching patterns
 * @example
 * ```typescript
 * const patternRedactor = createPatternRedactor([
 *   /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, // Credit card numbers
 *   /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
 *   "password", "secret", "token" // Field names
 * ]);
 * ```
 */
export function createPatternRedactor(
  patterns: ReadonlyArray<string | RegExp>,
  mask = "***REDACTED***",
): RedactionFunction {
  return (context: RedactionContext): RedactionResult => {
    const processValue = (value: unknown): unknown => {
      if (typeof value === "string") {
        let result = value;
        for (const pattern of patterns) {
          if (typeof pattern === "string") {
            result = result.replace(new RegExp(pattern, "gi"), mask);
          } else {
            result = result.replace(pattern, mask);
          }
        }
        return result;
      }

      if (typeof value === "object" && value !== null) {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
          // Check if the field name matches any pattern
          let shouldRedactField = false;
          for (const pattern of patterns) {
            if (typeof pattern === "string") {
              if (new RegExp(pattern, "gi").test(key)) {
                shouldRedactField = true;
                break;
              }
            } else {
              if (pattern.test(key)) {
                shouldRedactField = true;
                break;
              }
            }
          }

          if (shouldRedactField) {
            result[key] = mask;
          } else {
            result[key] = processValue(val);
          }
        }
        return result;
      }

      return value;
    };

    return {
      headers: context.headers,
      body: processValue(context.body),
    };
  };
}

/**
 * Helper function to set a value at a nested path in an object
 * @since 1.0.0
 * @category utilities
 * @internal
 * @param obj - The object to modify
 * @param path - Dot-notation path to the property (e.g., "user.profile.name")
 * @param value - The value to set at the path
 */
function setValueAtPath(obj: unknown, path: string, value: unknown): void {
  if (typeof obj !== "object" || obj === null) {
    return;
  }

  const parts = path.split(".");
  let current = obj as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (part && typeof current[part] === "object" && current[part] !== null) {
      current = current[part] as Record<string, unknown>;
    } else {
      return; // Path doesn't exist, skip
    }
  }

  const lastPart = parts[parts.length - 1];
  if (lastPart && lastPart in current) {
    current[lastPart] = value;
  }
}
