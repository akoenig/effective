import { Schema } from 'effect'
import { GitHub } from '../../Infrastructure/Schemas/GitHubSchemas.js'

/**
 * GitHub license schema with camelCase properties
 * Compliant with GitHub REST API v3 specification (nullable-license-simple)
 */
export const License = Schema.Struct({
  key: Schema.String,
  name: Schema.String,
  url: GitHub.nullable(Schema.String),
  spdxId: Schema.propertySignature(GitHub.nullable(Schema.String)).pipe(
    Schema.fromKey('spdx_id'),
  ),
  nodeId: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('node_id'),
  ),
})

export type License = Schema.Schema.Type<typeof License>