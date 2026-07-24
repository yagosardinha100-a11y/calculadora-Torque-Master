/**
 * Conexão com o IndexedDB.
 *
 * Todos os dados da aplicação vivem exclusivamente no navegador, em um único
 * banco com um object store por entidade. A conexão é aberta uma vez e
 * memoizada; em caso de `versionchange` (outra aba atualizando o schema) a
 * conexão é fechada para não bloquear o upgrade.
 */

const DB_NAME = 'escala-mecanica-offshore'
const DB_VERSION = 1

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

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

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

export function getDatabase(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabase().catch((error) => {
      databasePromise = null
      throw error
    })
  }
  return databasePromise
}

/** Converte um `IDBRequest` em `Promise`. */
export function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Erro no IndexedDB.'))
  })
}

/** Resolve quando a transação for concluída com sucesso. */
export function promisifyTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Transação do IndexedDB falhou.'))
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Transação do IndexedDB abortada.'))
  })
}
