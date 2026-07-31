/**
 * Fallback em memória + localStorage quando IndexedDB falha (padrão Grok 701b).
 * Mantém a mesma API de stores da versão Composer.
 */

import { ALL_STORE_NAMES, type StoreName } from '@/db/database'

const MEMORY_KEY = 'escala-mecanica-unified-v1'

type IdRecord = { id: string; collaboratorId?: string }

const memory = Object.fromEntries(
  ALL_STORE_NAMES.map((name) => [name, new Map<string, IdRecord>()]),
) as Record<StoreName, Map<string, IdRecord>>

let active = false

function persist(): void {
  if (!active) return
  try {
    const payload: Record<string, IdRecord[]> = {}
    for (const name of ALL_STORE_NAMES) {
      payload[name] = [...memory[name].values()]
    }
    localStorage.setItem(MEMORY_KEY, JSON.stringify(payload))
  } catch {
    // quota ou modo privado — mantém só na sessão
  }
}

function load(): void {
  try {
    const raw = localStorage.getItem(MEMORY_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Record<string, IdRecord[]>
    for (const name of ALL_STORE_NAMES) {
      memory[name].clear()
      for (const record of parsed[name] ?? []) {
        memory[name].set(record.id, record)
      }
    }
  } catch {
    for (const name of ALL_STORE_NAMES) memory[name].clear()
  }
}

export function enableMemoryMode(): void {
  active = true
  load()
}

export function isMemoryMode(): boolean {
  return active
}

export function memoryGetAll<T>(storeName: StoreName): T[] {
  return [...memory[storeName].values()] as T[]
}

export function memoryPut<T extends IdRecord>(storeName: StoreName, record: T): void {
  memory[storeName].set(record.id, record)
  persist()
}

export function memoryPutMany<T extends IdRecord>(storeName: StoreName, records: T[]): void {
  for (const record of records) {
    memory[storeName].set(record.id, record)
  }
  persist()
}

export function memoryDelete(storeName: StoreName, key: string): void {
  memory[storeName].delete(key)
  persist()
}

export function memoryDeleteMany(storeName: StoreName, keys: string[]): void {
  for (const key of keys) memory[storeName].delete(key)
  persist()
}

export function memoryDeleteByCollaborator(storeNames: StoreName[], collaboratorId: string): void {
  for (const storeName of storeNames) {
    for (const [key, record] of memory[storeName]) {
      if (record.collaboratorId === collaboratorId) {
        memory[storeName].delete(key)
      }
    }
  }
  persist()
}

export function memoryReplaceStore<T extends IdRecord>(storeName: StoreName, records: T[]): void {
  memory[storeName].clear()
  for (const record of records) {
    memory[storeName].set(record.id, record)
  }
  persist()
}

export function memoryClearAll(): void {
  for (const name of ALL_STORE_NAMES) memory[name].clear()
  persist()
}

export function memoryClearStorage(): void {
  try {
    localStorage.removeItem(MEMORY_KEY)
  } catch {
    /* ignore */
  }
}
