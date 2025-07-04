/**
 * @since 1.0.0
 */
import { Schema } from "effect";

/**
 * @since 1.0.0
 * @category schemas
 * @internal
 */
export const TransactionId = Schema.String.pipe(
  Schema.pattern(/^\d+__[A-Z]+_[a-z0-9-]*$/),
  Schema.brand("TransactionId"),
);

/**
 * @since 1.0.0
 * @category schemas
 * @internal
 */
export const Slug = Schema.String.pipe(
  Schema.pattern(/^[a-z0-9-]*$/),
  Schema.brand("Slug"),
);

/**
 * @since 1.0.0
 * @category schemas
 * @internal
 */
export const StringToSlug = Schema.transform(Schema.String, Slug, {
  decode: (input: string) =>
    input
      .toLowerCase()
      .trim()
      .replace(/\//g, "-")
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, ""),
  encode: (slug) => slug,
});

/**
 * @since 1.0.0
 * @category schemas
 * @internal
 */
export const CreateTransactionId = Schema.transform(
  Schema.Struct({
    timestamp: Schema.Number,
    method: Schema.String,
    slug: Slug,
  }),
  TransactionId,
  {
    strict: true,
    decode: ({ timestamp, method, slug }) =>
      `${timestamp}__${method.toUpperCase()}_${slug}` as Schema.Schema.Type<
        typeof TransactionId
      >,
    encode: (id) => {
      const [timestamp, rest = ""] = id.split("__");
      const [method = "", slug = ""] = rest.split("_", 2);
      return {
        timestamp: Number(timestamp),
        method,
        slug: slug as Schema.Schema.Type<typeof Slug>,
      };
    },
  },
);