# Escala Offshore

Gestão de escala 14×14 da mecânica offshore (Firebase Auth + Firestore).

## Arquitetura

```
src/domain/   → lógica pura (ciclo, férias, conflitos) + testes
src/data/     → Firebase, auth, repositórios, DataProvider
src/pages/    → telas
src/components/
```

## Stack

React 19 · TypeScript · Vite · Tailwind 4 · Firebase · date-fns · Vitest

## Scripts

```bash
npm install
npm run dev      # http://localhost:3000
npm test
npm run lint
npm run build
npm start        # preview do build
```

## Segurança

- Login Google (Firebase Auth) + e-mail verificado
- Allowlist no client (UX) e em `firestore.rules` (fonte da verdade)
- Writes em `/admins/{uid}` bloqueados no client

## Deploy

Build estático (`vite build` → `dist`). Publique rules:

```bash
firebase deploy --only firestore:rules
```
