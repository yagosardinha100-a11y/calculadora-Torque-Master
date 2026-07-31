export interface AuditLogEntry {
  table: string;
  docId: string;
  who: string;
  origin: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
  stack?: string;
}

export function logAuditEntry(entry: Omit<AuditLogEntry, 'timestamp'>) {
  const timestamp = new Date().toISOString();
  const stack = new Error().stack?.split('\n').slice(2, 6).join('\n') || 'N/A';
  const fullEntry: AuditLogEntry = {
    ...entry,
    timestamp,
    stack: entry.stack || stack,
  };

  console.group(`🔍 [AUDIT LOG] ${fullEntry.origin} -> ${fullEntry.table}:${fullEntry.docId}`);
  console.log('⏰ Horário:', fullEntry.timestamp);
  console.log('👤 Quem gravou:', fullEntry.who);
  console.log('📍 Origem:', fullEntry.origin);
  console.log('📄 Documento ID:', fullEntry.docId);
  console.log('⏮️ Valor antigo:', fullEntry.oldValue);
  console.log('⏭️ Valor novo:', fullEntry.newValue);
  console.log('📚 Stack da chamada:\n' + fullEntry.stack);
  console.groupEnd();

  return fullEntry;
}
