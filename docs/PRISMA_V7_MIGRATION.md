# Prisma v7 Migration Guide

This document provides a step-by-step guide for migrating from Prisma ORM v6 to v7 when you're ready to upgrade.

## Current Setup (Prisma v6.19.1)

Currently, this project uses Prisma v6.19.1 with the following configuration:

- **Schema location**: `prisma/schema.prisma`
- **Seed configuration**: Defined in `package.json` under the `prisma` field
- **Database URL**: Configured in `prisma/schema.prisma` datasource block

### Current Configuration

**package.json:**
```json
{
  "prisma": {
    "seed": "npx ts-node prisma/seed.ts"
  }
}
```

**prisma/schema.prisma:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## Migration to Prisma v7

### Step 1: Update Prisma Dependencies

```bash
npm install prisma@latest @prisma/client@latest
```

### Step 2: Install dotenv

Prisma v7 requires explicit environment variable loading:

```bash
npm install dotenv
```

### Step 3: Create `prisma.config.ts`

Create a new file `prisma.config.ts` in your project root:

```typescript
import 'dotenv/config'
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx ts-node prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

**Alternative approach using TypeScript types:**

```typescript
import 'dotenv/config'
import type { PrismaConfig } from "prisma";
import { env } from "prisma/config";

export default {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx ts-node prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
} satisfies PrismaConfig;
```

### Step 4: Update `prisma/schema.prisma`

Remove the `url` field from the datasource block (it's now in `prisma.config.ts`):

**Before (v6):**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**After (v7):**
```prisma
datasource db {
  provider = "postgresql"
}
```

### Step 5: Remove `package.json#prisma` Configuration

Remove the `prisma` field from `package.json`:

```json
{
  // Remove this:
  "prisma": {
    "seed": "npx ts-node prisma/seed.ts"
  }
}
```

### Step 6: Update Build Scripts (if needed)

Your current build script should continue to work:

```json
{
  "scripts": {
    "build": "prisma generate --no-engine && next build --turbopack"
  }
}
```

### Step 7: Test the Migration

1. **Generate Prisma Client:**
   ```bash
   npm run db:generate
   ```

2. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

3. **Test seeding:**
   ```bash
   npm run db:seed
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

## Key Changes in Prisma v7

### 1. Database URL Configuration
- **v6**: URL in `schema.prisma` datasource block
- **v7**: URL in `prisma.config.ts` datasource object

### 2. Seed Configuration
- **v6**: Defined in `package.json`
- **v7**: Defined in `prisma.config.ts` migrations object

### 3. Seeding Behavior
- **v6**: Auto-runs after `prisma migrate dev` and `prisma migrate reset`
- **v7**: Only runs when explicitly called with `npx prisma db seed`

### 4. Environment Variables
- **v6**: Automatically loaded by Prisma
- **v7**: Must explicitly import `dotenv/config` in `prisma.config.ts`

### 5. Removed Features
- `experimental.adapter` flag
- `experimental.studio` flag
- `adapter` property
- `studio` property
- `datasource.directUrl` (merged into `url`)
- `engine` property

## Environment Variable Handling

### Using the `env()` Helper (Recommended)

```typescript
import { env } from "prisma/config";

export default defineConfig({
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

**Note:** The `env()` helper throws an error if the variable doesn't exist. This is safe for most use cases.

### Using `process.env` Directly (Optional Variables)

If you need to support scenarios where the database URL might not be set (e.g., CI/CD pipelines that only run `prisma generate`):

```typescript
export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
```

### Type-Safe Environment Variables

```typescript
type Env = {
  DATABASE_URL: string;
}

export default defineConfig({
  datasource: {
    url: env<Env>('DATABASE_URL'),
  },
});
```

## Troubleshooting

### Error: "Failed to parse syntax of config file"

**Solution:** Ensure you have:
1. Installed `dotenv`
2. Added `import 'dotenv/config'` at the top of `prisma.config.ts`
3. Used proper TypeScript syntax

### Error: "Missing required environment variable: DATABASE_URL"

**Solution:** 
- Make sure your `.env` file exists and contains `DATABASE_URL`
- Check that `dotenv/config` is imported in `prisma.config.ts`
- Or use `process.env.DATABASE_URL` instead of `env('DATABASE_URL')`

### Warning: "Could not find Prisma Schema"

**Solution:** Run commands from the project root, or use the `--config` flag:
```bash
npx prisma validate --config ./prisma.config.ts
```

## Rollback Plan

If you encounter issues after upgrading to v7:

1. **Downgrade Prisma:**
   ```bash
   npm install prisma@6.19.1 @prisma/client@6.19.1
   ```

2. **Restore `package.json#prisma`:**
   ```json
   {
     "prisma": {
       "seed": "npx ts-node prisma/seed.ts"
     }
   }
   ```

3. **Restore `schema.prisma` datasource:**
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

4. **Delete `prisma.config.ts`**

5. **Regenerate client:**
   ```bash
   npm run db:generate
   ```

## References

- [Prisma v7 Migration Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
- [Prisma Config Reference](https://pris.ly/prisma-config)
- [Environment Variables in Prisma v7](https://www.prisma.io/docs/orm/prisma-schema/overview/using-environment-variables)

## When to Migrate

Consider migrating to Prisma v7 when:

1. You need new features only available in v7
2. You want to clean up deprecation warnings
3. Prisma v6 reaches end-of-life
4. You're starting a new major version of your application

## Current Status

✅ **Ready for migration** - All documentation and prerequisites are in place  
⏳ **Waiting** - Migrating during active development may introduce unnecessary risks  
📋 **Recommended** - Plan migration during a maintenance window or before a major release

---

**Last Updated:** January 2025  
**Current Prisma Version:** 6.19.1  
**Target Prisma Version:** 7.x