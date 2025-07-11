import { Schema } from 'effect'
import { GitHub } from '../../Infrastructure/Schemas/GitHubSchemas.js'
import { MinimalRepository } from '../ValueObjects/MinimalRepository.js'
import { NotificationSubject } from '../ValueObjects/NotificationSubject.js'

/**
 * GitHub notification schema with camelCase properties
 * Compliant with GitHub REST API v3 specification (Thread)
 */
export const Notification = Schema.Struct({
  id: Schema.String,
  unread: Schema.Boolean,
  reason: Schema.String,
  updatedAt: Schema.propertySignature(Schema.DateFromString).pipe(
    Schema.fromKey('updated_at'),
  ),
  lastReadAt: Schema.propertySignature(GitHub.nullableDate()).pipe(
    Schema.fromKey('last_read_at'),
  ),
  subject: NotificationSubject,
  repository: MinimalRepository,
  url: Schema.String,
  subscriptionUrl: Schema.propertySignature(Schema.String).pipe(
    Schema.fromKey('subscription_url'),
  ),
})

export type Notification = Schema.Schema.Type<typeof Notification>
