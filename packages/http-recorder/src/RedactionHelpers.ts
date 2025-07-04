import type { RedactionContext, RedactionFunction, RedactionResult } from "./HttpRecorder.js";

/**
 * Masks specific headers with a redaction value
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
 * Masks specific JSON paths with a redaction value
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
 * Masks URL query parameters with a redaction value
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
 * Creates a redaction function that masks headers and filters out non-redacted sensitive headers
 */
export function createHeaderRedactor(
  headerNames: ReadonlyArray<string>,
  mask = "***REDACTED***",
): RedactionFunction {
  const headerMasker = maskHeaders(headerNames, mask);
  const excludedHeadersSet = new Set(DEFAULT_EXCLUDED_HEADERS.map((h) => h.toLowerCase()));
  const redactedHeadersSet = new Set(headerNames.map((h) => h.toLowerCase()));
  
  return (context: RedactionContext): RedactionResult => {
    const maskedHeaders = headerMasker(context.headers);
    const filteredHeaders: Record<string, string> = {};
    
    // Include headers that are either not sensitive or have been redacted
    for (const [key, value] of Object.entries(maskedHeaders)) {
      const lowerKey = key.toLowerCase();
      if (!excludedHeadersSet.has(lowerKey) || redactedHeadersSet.has(lowerKey)) {
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
 * Creates a redaction function that masks JSON paths
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
 * Creates a conditional redaction function
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
 * Composes multiple redaction functions
 */
export function compose(...redactors: ReadonlyArray<RedactionFunction>): RedactionFunction {
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
 * Creates a redaction function for sensitive patterns
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
 * Helper to set a value at a nested path in an object
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