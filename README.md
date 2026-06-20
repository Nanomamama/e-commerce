# Commerce Modular Monolith

Next.js full-stack ecommerce scaffold using PostgreSQL with raw SQL migrations.

## Stack

- Next.js App Router + TypeScript
- PostgreSQL via `pg`
- Raw SQL migrations in `migrations/`
- Redis/BullMQ queue wiring for background jobs
- Custom JWT helper for auth tokens

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set at least:

   ```bash
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/commerce
   JWT_SECRET=replace-with-at-least-32-characters
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=admin12345
   ```

3. Apply migrations:

   ```bash
   npm run db:migrate
   ```

4. Seed starter catalog data and a development admin user:

   ```bash
   npm run db:seed
   ```

5. Start development:

   ```bash
   npm run dev
   ```

## Verification

```bash
npm run typecheck
npm run lint
```

`GET /api/health` checks both the Next.js route and a simple database query.
