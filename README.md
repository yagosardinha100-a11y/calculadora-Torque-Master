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

## Configuração do Firebase (seu projeto)

Copie `.env.example` para `.env.local` e preencha com a config do **seu** app web
(Firebase Console → Configurações do projeto → Seus apps → SDK config):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Se nenhuma variável for definida, o app usa `firebase-applet-config.json`.
No Firebase Console, habilite **Authentication → Google** e adicione os domínios
de produção em **Authentication → Settings → Authorized domains**.

## Segurança e permissões (papéis)

- Login via **Firebase Google Auth** (e-mail verificado obrigatório).
- **Dois papéis**, controlados por acesso:
  - **Editor**: vê e edita tudo.
  - **Visualizador**: apenas consulta (não altera nada).
- Acesso gerenciado **por e-mail** na tela **Usuários** (visível só para editores):
  conceda/remova acesso e troque o papel sem mexer em código.
- **Editores bootstrap**: lista fixa em `src/context/AuthContext.tsx`
  (`BOOTSTRAP_EDITORS`), espelhada em `firestore.rules` — garante que o primeiro
  operador consiga entrar e liberar os demais.
- **Fonte da verdade é o servidor**: `firestore.rules` garante que Visualizador
  só lê e que apenas Editores escrevem — não é possível burlar pelo navegador.
- **Persistência offline** do Firestore: o app continua funcionando em quedas de
  conexão e re-sincroniza ao voltar online.

## Deploy

Build estático (`vite build` → `dist` / Vercel). Configure Firebase Auth authorized domains no ambiente de produção.

Após alterar regras, publique `firestore.rules` no projeto Firebase (`escala-offshore-cc925` ou o projectId atual):

```bash
firebase deploy --only firestore:rules
```
