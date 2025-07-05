/**
 * @since 1.0.0
 */
import type { HttpClientRequest } from '@effect/platform'
import { FileSystem, Path } from '@effect/platform'
import { Effect } from 'effect'
import type { RecordedTransaction } from '../Domain/Entities/RecordedTransaction.js'
import { DirectoryCreationError } from '../Domain/Errors/DirectoryCreationError.js'
import { FileSystemReadError } from '../Domain/Errors/FileSystemReadError.js'
import { FileSystemWriteError } from '../Domain/Errors/FileSystemWriteError.js'
import { TransactionNotFoundError } from '../Domain/Errors/TransactionNotFoundError.js'
import { TransactionSerializer } from '../Infrastructure/Serialization/TransactionSerializer.js'

/**
 * @since 1.0.0
 * @category predicates
 * @internal
 */
const isJsonFile = (filename: string): boolean => filename.endsWith('.json')

/**
 * @since 1.0.0
 * @category predicates
 * @internal
 */
const isMatchingTransaction =
  (request: HttpClientRequest.HttpClientRequest) =>
  (transaction: RecordedTransaction): boolean =>
    transaction.request.method === request.method &&
    transaction.request.url === request.url

/**
 * @since 1.0.0
 * @category repository
 * @summary File system implementation of TransactionRepository
 */
export class FileSystemTransactionRepository extends Effect.Service<FileSystemTransactionRepository>()(
  '@akoenig/effect-http-recorder/FileSystemTransactionRepository',
  {
    dependencies: [TransactionSerializer.Default],
    effect: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const transactionSerializer = yield* TransactionSerializer

      return {
        /**
         * Save a recorded transaction to the file system
         * @since 1.0.0
         */
        save(transaction: RecordedTransaction, filePath: string) {
          return Effect.gen(function* () {
            const serializedTransaction =
              yield* transactionSerializer.serialize(transaction)

            yield* fs.writeFileString(filePath, serializedTransaction).pipe(
              Effect.mapError(
                (error) =>
                  new FileSystemWriteError({
                    message: `Failed to write recording: ${String(error)}`,
                    filePath,
                    operation: 'writeFileString',
                    cause: String(error),
                  }),
              ),
            )
          })
        },

        /**
         * Find a recorded transaction that matches the given request
         * @since 1.0.0
         */
        findByMethodAndUrl(
          request: HttpClientRequest.HttpClientRequest,
          storagePath: string,
        ) {
          return Effect.gen(function* () {
            const files = yield* fs.readDirectory(storagePath).pipe(
              Effect.mapError(
                (error) =>
                  new FileSystemReadError({
                    message: `Failed to read directory: ${String(error)}`,
                    path: storagePath,
                    operation: 'readDirectory',
                    cause: String(error),
                  }),
              ),
            )

            const jsonFiles = files.filter(isJsonFile)

            for (const file of jsonFiles) {
              const filePath = path.join(storagePath, file)
              const content = yield* fs.readFileString(filePath).pipe(
                Effect.mapError(
                  (error) =>
                    new FileSystemReadError({
                      message: `Failed to read file: ${String(error)}`,
                      path: filePath,
                      operation: 'readFileString',
                      cause: String(error),
                    }),
                ),
              )

              const parseResult =
                yield* transactionSerializer.deserialize(content)

              if (parseResult === null) {
                continue
              }

              const transaction = parseResult
              const isMatching = isMatchingTransaction(request)(transaction)

              if (isMatching) {
                return transaction
              }
            }

            return yield* Effect.fail(
              new TransactionNotFoundError({
                message: `No matching transaction found for ${request.method} ${request.url}`,
                method: request.method,
                url: request.url,
              }),
            )
          })
        },

        /**
         * Ensure storage directory exists
         * @since 1.0.0
         */
        ensureStorageExists(storagePath: string) {
          return Effect.gen(function* () {
            yield* fs.makeDirectory(storagePath, { recursive: true }).pipe(
              Effect.mapError(
                (error) =>
                  new DirectoryCreationError({
                    message: `Failed to create directory: ${String(error)}`,
                    directoryPath: storagePath,
                    cause: String(error),
                  }),
              ),
            )
          })
        },
      }
    }),
  },
) {}
