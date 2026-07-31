/**
 * Repositório unificado: IndexedDB com fallback transparente em memória.
 */

import {
  ALL_STORE_NAMES,
  getDatabase,
  promisifyRequest,
  promisifyTransaction,
  type StoreName,
} from '@/db/database'
import {
  isMemoryMode,
  memoryClearAll,
  memoryDelete,
  memoryDeleteByCollaborator,
  memoryDeleteMany,
  memoryGetAll,
  memoryPut,
  memoryPutMany,
  memoryReplaceStore,
} from '@/db/memoryStore'

export function storageMode(): 'indexeddb' | 'memory' {
  return isMemoryMode() ? 'memory' : 'indexeddb'
}

export async function getAllRecords<T>(storeName: StoreName): Promise<T[]> {
  if (isMemoryMode()) return memoryGetAll<T>(storeName)
  const db = await getDatabase()
  const transaction = db.transaction(storeName, 'readonly')
  const request = transaction.objectStore(storeName).getAll() as IDBRequest<T[]>
  return promisifyRequest(request)
}

export async function putRecord<T extends { id: string }>(
  storeName: StoreName,
  record: T,
): Promise<void> {
  if (isMemoryMode()) {
    memoryPut(storeName, record)
    return
  }
  const db = await getDatabase()
  const transaction = db.transaction(storeName, 'readwrite')
  transaction.objectStore(storeName).put(record)
  await promisifyTransaction(transaction)
}

export async function putRecords<T extends { id: string }>(
  storeName: StoreName,
  records: T[],
): Promise<void> {
  if (records.length === 0) return
  if (isMemoryMode()) {
    memoryPutMany(storeName, records)
    return
  }
  const db = await getDatabase()
  const transaction = db.transaction(storeName, 'readwrite')
  const store = transaction.objectStore(storeName)
  for (const record of records) {
    store.put(record)
  }
  await promisifyTransaction(transaction)
}

export async function deleteRecord(storeName: StoreName, key: string): Promise<void> {
  if (isMemoryMode()) {
    memoryDelete(storeName, key)
    return
  }
  const db = await getDatabase()
  const transaction = db.transaction(storeName, 'readwrite')
  transaction.objectStore(storeName).delete(key)
  await promisifyTransaction(transaction)
}

export async function deleteRecords(storeName: StoreName, keys: string[]): Promise<void> {
  if (keys.length === 0) return
  if (isMemoryMode()) {
    memoryDeleteMany(storeName, keys)
    return
  }
  const db = await getDatabase()
  const transaction = db.transaction(storeName, 'readwrite')
  const store = transaction.objectStore(storeName)
  for (const key of keys) {
    store.delete(key)
  }
  await promisifyTransaction(transaction)
}

export async function deleteByCollaborator(
  storeNames: StoreName[],
  collaboratorId: string,
): Promise<void> {
  if (isMemoryMode()) {
    memoryDeleteByCollaborator(storeNames, collaboratorId)
    return
  }
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

export async function replaceStore<T extends { id: string }>(
  storeName: StoreName,
  records: T[],
): Promise<void> {
  if (isMemoryMode()) {
    memoryReplaceStore(storeName, records)
    return
  }
  const db = await getDatabase()
  const transaction = db.transaction(storeName, 'readwrite')
  const store = transaction.objectStore(storeName)
  store.clear()
  for (const record of records) {
    store.put(record)
  }
  await promisifyTransaction(transaction)
}

export async function clearAllStores(): Promise<void> {
  if (isMemoryMode()) {
    memoryClearAll()
    return
  }
  const db = await getDatabase()
  const transaction = db.transaction(ALL_STORE_NAMES, 'readwrite')
  for (const storeName of ALL_STORE_NAMES) {
    transaction.objectStore(storeName).clear()
  }
  await promisifyTransaction(transaction)
}
