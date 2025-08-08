# Fut5 — Gestor de Equipas 5×5 (Next.js)

MVP pronto para **deploy na Vercel**.

## Desenvolvimento local
```bash
npm install
npm run dev
# abre http://localhost:3000
```

## Deploy (Vercel)
1. Cria um repositório no GitHub e faz push do projeto.
2. Vai a https://vercel.com → *New Project* → *Import Git Repository* → escolhe o repo.
3. Clica **Deploy**. O link público fica disponível no fim do build.

> Dados guardados em `localStorage` do browser (por utilizador/dispositivo). Para rooms multiuser em tempo real, usa Firebase/Firestore.
