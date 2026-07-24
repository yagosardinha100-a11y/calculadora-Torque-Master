/**
 * Gera um identificador único. Usa `crypto.randomUUID` quando disponível
 * (contextos seguros) com fallback determinístico para ambientes antigos.
 */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const random = () => Math.random().toString(36).slice(2, 10)
  return `${Date.now().toString(36)}-${random()}-${random()}`
}
