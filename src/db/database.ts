/**
 * Conexão com o IndexedDB — schema v3 unificado.
 *
 * Compatível com bancos legados (Opus/Grok/Composer) e com fallback em memória
 * quando IndexedDB falha ou fica indisponível no mobile.
 */

const DB_NAME = 'escala-mecanica-offshore'
const DB_VERSION = 3
const OPEN_TIMEOUT_MS = 4000

export const STORE_NAMES = {
  settings: 'settings',
  teams: 'teams',
  collaborators: 'collaborators',
  overrides: 'overrides',
  dobras: 'dobras',
  appointments: 'appointments',
} as const

export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES]

export const ALL_STORE_NAMES: StoreName[] = Object.values(STORE_NAMES)

let databasePromise: Promise<IDBDatabase> | null = null

function createStores(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(STORE_NAMES.settings)) {
    db.createObjectStore(STORE_NAMES.settings, { keyPath: 'id' })
  }
  if (!db.objectStoreNames.contains(STORE_NAMES.teams)) {
    db.createObjectStore(STORE_NAMES.teams, { keyPath: 'id' })
  }
  if (!db.objectStoreNames.contains(STORE_NAMES.collaborators)) {
    db.createObjectStore(STORE_NAMES.collaborators, { keyPath: 'id' })
  }
  if (!db.objectStoreNames.contains(STORE_NAMES.overrides)) {
    const store = db.createObjectStore(STORE_NAMES.overrides, { keyPath: 'id' })
    store.createIndex('byCollaborator', 'collaboratorId', { unique: false })
  }
  if (!db.objectStoreNames.contains(STORE_NAMES.dobras)) {
    const store = db.createObjectStore(STORE_NAMES.dobras, { keyPath: 'id' })
    store.createIndex('byCollaborator', 'collaboratorId', { unique: false })
  }
  if (!db.objectStoreNames.contains(STORE_NAMES.appointments)) {
    const store = db.createObjectStore(STORE_NAMES.appointments, { keyPath: 'id' })
    store.createIndex('byCollaborator', 'collaboratorId', { unique: false })
  }
}

export function validateSchema(db: IDBDatabase): boolean {
  return ALL_STORE_NAMES.every((name) => db.objectStoreNames.contains(name))
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} excedeu ${ms}ms.`)), ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (err: unknown) => {
        window.clearTimeout(timer)
        reject(err)
      },
    )
  })
}

function openDatabaseOnce(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => createStores(request.result)

    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => {
        db.close()
        databasePromise = null
      }
      resolve(db)
    }

    request.onerror = () => {
      reject(request.error ?? new Error('Falha ao abrir o banco de dados local.'))
    }

    request.onblocked = () => {
      reject(
        new Error(
          'O banco de dados local está bloqueado por outra aba. Feche as demais abas e recarregue.',
        ),
      )
    }
  })
}

export function deleteDatabase(): Promise<void> {
  databasePromise = null
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () =>
      reject(request.error ?? new Error('Não foi possível apagar o banco de dados local.'))
    request.onblocked = () => resolve()
  })
}

async function openDatabaseWithRecovery(): Promise<IDBDatabase> {
  try {
    let db = await withTimeout(openDatabaseOnce(), OPEN_TIMEOUT_MS, 'Abertura do IndexedDB')

    if (!validateSchema(db)) {
      db.close()
      await deleteDatabase()
      db = await withTimeout(openDatabaseOnce(), OPEN_TIMEOUT_MS, 'Reabertura do IndexedDB')
    }

    if (!validateSchema(db)) {
      db.close()
      throw new Error('Schema do IndexedDB incompatível após recuperação.')
    }

    return db
  } catch (firstError) {
    try {
      await deleteDatabase()
      const db = await withTimeout(openDatabaseOnce(), OPEN_TIMEOUT_MS, 'Recriação do IndexedDB')
      if (validateSchema(db)) return db
      db.close()
    } catch {
      /* tenta fallback */
    }
    throw firstError
  }
}

export function getDatabase(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseWithRecovery().catch((error) => {
      databasePromise = null
      throw error
    })
  }
  return databasePromise
}

export async function resetDatabase(): Promise<IDBDatabase> {
  databasePromise = null
  await deleteDatabase()
  const db = await openDatabaseOnce()
  if (!validateSchema(db)) {
    db.close()
    throw new Error('Falha ao recriar o banco de dados local.')
  }
  databasePromise = Promise.resolve(db)
  return db
}

export function invalidateDatabaseCache(): void {
  databasePromise = null
}

export function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Erro no IndexedDB.'))
  })
}

export function promisifyTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Transação do IndexedDB falhou.'))
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Transação do IndexedDB abortada.'))
  })
}

export function isSchemaMismatchError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false
  return (
    error.name === 'NotFoundError' ||
    error.message.includes('object stores was not found') ||
    error.message.includes('object store was not found')
  )
}

/** Tenta abrir IndexedDB; em falha ativa fallback em memória. */
export async function initStorage(): Promise<'indexeddb' | 'memory'> {
  try {
    await getDatabase()
    return 'indexeddb'
  } catch {
    const { enableMemoryMode } = await import('@/db/memoryStore')
    enableMemoryMode()
    invalidateDatabaseCache()
    return 'memory'
  }
}

export function isUsingMemoryStorage(): boolean {
  // sync check — memoryStore tracks mode
  return false // overridden by repository via memoryStore.isMemoryMode
}
