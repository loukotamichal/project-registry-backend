# Project Registry — backend

REST API a SQLite úložiště evidence projektů, osob a týmů.

## Technologie

- Node.js 24.22.0 (LTS)
- Fastify 5 a TypeScript
- SQLite přes better-sqlite3

Databáze je soubor na disku. Cestu nastavuje `DATABASE_PATH`. Při každém otevření se zapne a ověří `PRAGMA foreign_keys = ON`. `GET /api/health` provede `SELECT 1`.

## Požadavky

Node.js 24.22.0. V tomto repozitáři ho Volta vybere podle pole `volta` v `package.json`. npm použijte to, které patří k této verzi Node.js.

## Spuštění

```bash
cp .env.example .env
npm install
npm run dev
```

Příkazy `dev` a `start` načtou případný soubor `.env`; proměnné prostředí mají přednost.

API poslouchá na [http://127.0.0.1:3000](http://127.0.0.1:3000). Datový soubor vznikne v ignorované složce `data/`.

```bash
npm test
npm run build
npm start
```

Docker Compose je v tomto repozitáři a staví i sousední frontend. Podrobnosti doplníme se stackem.
