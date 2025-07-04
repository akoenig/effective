/**
 * @since 1.0.0
 */
import type { RedactionContext } from "../ValueObjects/RedactionContext.js";
import type { RedactionResult } from "../ValueObjects/RedactionResult.js";

/**
 * @since 1.0.0
 * @category models
 */
export type RedactionFunction = (context: RedactionContext) => RedactionResult;
