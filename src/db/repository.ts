/**
 * Repositório genérico sobre o IndexedDB.
 *
 * Cada função abre uma transação curta e devolve `Promise`, mantendo o
 * restante da aplicação totalmente desacoplado da API de callbacks do
 * IndexedDB.
 */

import {
  ALL_STORE_NAMES,
  getDatabase,
  promisifyRequest,
  promisifyTransaction,
  type StoreName,
} from '@/db/database'

export async function getAllRecords<T>(storeName: StoreName): Promise<T[]> {
  const db = await getDatabase()
  const transaction = db.transaction(storeName, 'readonly')
  const request = transaction.objectStore(storeName).getAll() as IDBRequest<T[]>
  return promisifyRequest(request)
}

export async function putRecord<T>(storeName: StoreName, record: T): Promise<void> {
  const db = await getDatabase()
  const transaction = db.transaction(storeName, 'readwrite')
  transaction.objectStore(storeName).put(record)
  await promisifyTransaction(transaction)
}

export async function putRecords<T>(storeName: StoreName, records: T[]): Promise<void> {
  if (records.length === 0) return
  const db = await getDatabase()
  const transaction = db.transaction(storeName, 'readwrite')
  const store = transaction.objectStore(storeName)
  for (const record of records) {
    store.put(record)
  }
  await promisifyTransaction(transaction)
}

export async function deleteRecord(storeName: StoreName, key: string): Promise<void> {
  const db = await getDatabase()
  const transaction = db.transaction(storeName, 'readwrite')
  transaction.objectStore(storeName).delete(key)
  await promisifyTransaction(transaction)
}

export async function deleteRecords(storeName: StoreName, keys: string[]): Promise<void> {
  if (keys.length === 0) return
  const db = await getDatabase()
  const transaction = db.transaction(storeName, 'readwrite')
  const store = transaction.objectStore(storeName)
  for (const key of keys) {
    store.delete(key)
  }
  await promisifyTransaction(transaction)
}

/**
 * Remove, em uma única transação, todos os registros vinculados a um
 * colaborador nos stores que possuem o índice `byCollaborator`.
 */
export async function deleteByCollaborator(
  storeNames: StoreName[],
  collaboratorId: string,
): Promise<void> {
  const db = await getDatabase()
  const transaction = db.transaction(storeNames, 'readwrite')
  for (const storeName of storeNames) {
    const index = transaction.objectStore(storeName).index('byCollaborator')
    const request = index.openKeyCursor(IDBKeyRange.only(collaboratorId))
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        transaction.objectStore(storeName).delete(cursor.primaryKey)
        cursor.continue()
      }
    }
  }
  await promisifyTransaction(transaction)
}

/** Substitui todo o conteúdo de um store (usado na importação de backup). */
export async function replaceStore<T>(storeName: StoreName, records: T[]): Promise<void> {
  const db = await getDatabase()
  const transaction = db.transaction(storeName, 'readwrite')
  const store = transaction.objectStore(storeName)
  store.clear()
  for (const record of records) {
    store.put(record)
  }
  await promisifyTransaction(transaction)
}

/** Apaga todos os dados da aplicação. */
export async function clearAllStores(): Promise<void> {
  const db = await getDatabase()
  const transaction = db.transaction(ALL_STORE_NAMES, 'readwrite')
  for (const storeName of ALL_STORE_NAMES) {
    transaction.objectStore(storeName).clear()
  }
  await promisifyTransaction(transaction)
}
