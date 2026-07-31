/// <reference types="vite/client" />
import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const message = error instanceof Error ? error.message : String(error);
  if (import.meta.env.DEV) {
    console.error('[FIRESTORE]', { message, operationType, path, uid: auth.currentUser?.uid });
  }
  throw new Error(message);
}
