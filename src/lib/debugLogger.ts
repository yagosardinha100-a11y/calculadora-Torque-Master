/// <reference types="vite/client" />

export interface DebugLogEntry {
  operation: string;
  collection: string;
  docId?: string;
  durationMs: number;
  source: 'cache' | 'server' | 'optimistic';
  timestamp: string;
  details?: unknown;
}

export function logDebugMetric(entry: Omit<DebugLogEntry, 'timestamp'>) {
  if (!(import.meta as any).env?.DEV) return;

  const timestamp = new Date().toISOString();
  console.groupCollapsed(`⚡ [FIRESTORE DEBUG] ${entry.operation} -> ${entry.collection}:${entry.docId || '*'}`);
  console.log('⏱️ Tempo de Execução:', `${entry.durationMs.toFixed(2)} ms`);
  console.log('🌐 Origem:', entry.source);
  console.log('📅 Timestamp:', timestamp);
  if (entry.details) {
    console.log('📊 Detalhes:', entry.details);
  }
  console.groupEnd();
}
