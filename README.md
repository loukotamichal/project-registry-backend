# Project Registry — backend

Serverová část aplikace pro evidenci projektů, osob a týmů. Poskytuje REST API
pro webové rozhraní a zajišťuje přístup k relační databázi SQLite.
Backend je samostatná aplikace s vlastním sestavením a provozní konfigurací.

Současná verze obsahuje spuštění serveru, správu databázového spojení a kontrolu
stavu služby. Datový model evidence a příslušné CRUD operace zatím nejsou
implementovány.

## Návrh aplikace

HTTP komunikaci obsluhuje Fastify. Vytvoření aplikace je oddělené od otevření
síťového portu, takže endpointy lze testovat bez spouštění samostatného serveru.
Databázové spojení se aplikaci předává při jejím sestavení.

SQLite uchovává data v souboru a nevyžaduje samostatný databázový server.
Knihovna `better-sqlite3` poskytuje rozhraní pro SQL dotazy. Při otevření databáze
se vždy zapíná a ověřuje vynucování cizích klíčů, které bude chránit vztahy mezi
záznamy. Databázový soubor a potřebný adresář vznikají automaticky.

## Hlavní části

- **Konfigurace** (`src/config.ts`) načítá hostitele, port a cestu k databázi
  z prostředí a kontroluje platnost portu.
- **Databáze** (`src/db.ts`) otevírá SQLite a ověřuje nastavení cizích klíčů.
- **HTTP aplikace** (`src/app.ts`) sestavuje Fastify a registruje endpointy.
- **Spuštění a ukončení** (`src/server.ts`) propojuje konfiguraci, databázi
  a server. Při ukončení uzavírá server i databázové spojení.
- **Testy** (`src/health.test.ts`) ověřují cizí klíče a odpovědi endpointu při
  dostupné i nedostupné databázi. Používají oddělenou databázi v paměti.
- **Kontejnerový provoz** (`Dockerfile`, `compose.yaml`) zajišťuje Linux sestavení
  backendu a propojení s frontendem.

## Technologie

Backend používá Node.js 24.22.0, TypeScript a Fastify 5. SQLite je dostupná přes
`better-sqlite3`. Vývojové spouštění zajišťuje `tsx`, testy využívají test runner
Node.js a HTTP simulaci Fastify `inject`. Volta vybírá verzi Node.js podle
`package.json`; konkrétní závislosti zaznamenává `package-lock.json`.

## API

### GET /api/health

Kontrola dostupnosti služby ověří databázi provedením `SELECT 1`.
Při úspěchu vrací HTTP **200**:

```json
{"status":"ok","database":"ok"}
```

Pokud se databázový dotaz nepodaří, vrací HTTP **503**:

```json
{"status":"error","database":"error"}
```

Endpoint je určen také pro Docker healthcheck. Nejde o kontrolu úplnosti
budoucího datového modelu. Databázové schéma a dokumentace dalších endpointů
budou doplněny s implementací evidence.

## Konfigurace a uložení dat

`HOST` určuje síťové rozhraní, `PORT` port služby a `DATABASE_PATH` cestu k SQLite
souboru. Výchozí hodnoty jsou uvedené v `.env.example`. Při lokálním vývoji
příkazy `dev` a `start` načítají případný `.env`; již nastavené proměnné prostředí
mají přednost. Databáze standardně vzniká v ignorované složce `data/`.

Docker Compose provozuje dvě služby: backend a Nginx s frontendem. Navenek je
na portu 8080 dostupný pouze frontend, který předává API požadavky backendu.
SQLite soubor `/app/data/app.sqlite` se ukládá do pojmenovaného volume
`registry-data`, takže přežije nahrazení kontejneru. Lokální databáze a databáze
v Dockeru jsou oddělené. Zastavení přes `docker compose down` volume zachová;
přidání přepínače `-v` jej včetně dat odstraní.

## Spuštění

Lokální vývoj vyžaduje Node.js 24.22.0. Příprava konfigurace a závislostí:

```bash
cp .env.example .env
npm ci
npm run dev
```

API je dostupné na [http://localhost:3000](http://localhost:3000).
`npm test` spustí testy. Pro sestavenou aplikaci slouží `npm run build`
a následně `npm start`.

Celý projekt lze spustit pomocí Dockeru s Compose. Oba repozitáře musí být
naklonované vedle sebe jako `project-registry-backend` a `project-registry-frontend`.
V backendové složce se celek sestaví a spustí příkazem:

```bash
docker compose up --build -d --wait
```

Rozhraní aplikace je potom dostupné na
[http://localhost:8080](http://localhost:8080), kontrola služby na
[http://localhost:8080/api/health](http://localhost:8080/api/health).
