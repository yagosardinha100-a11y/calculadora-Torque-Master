# Escala Offshore

Gestão de escala 14×14 da equipe de mecânica offshore (Firebase Auth + Firestore).

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Firebase (Auth + Firestore)
- date-fns, lucide-react

## Desenvolvimento

```bash
npm install
npm run dev      # http://localhost:3000
npm test
npm run lint
npm run build
```

## Segurança

- Login exclusivo via Firebase Google Auth
- Allowlist de e-mails no client (UX) e em `firestore.rules` (fonte da verdade)
- Writes em `/admins/{uid}` bloqueados no client

## Deploy

Build estático (`vite build` → `dist` / Vercel). Configure Firebase Auth authorized domains no ambiente de produção.

Após alterar regras, publique `firestore.rules` no projeto Firebase (`escala-offshore-cc925` ou o projectId atual):

```bash
firebase deploy --only firestore:rules
```
