# Developer Guide

## Code Style & Conventions

- **Linting**: We use ESLint with Next.js configuration. Run `npm run lint`.
- **Formatting**: Prettier is standard.
- **Strict Mode**: TypeScript strict mode is enabled. Do not use `any` unless absolutely necessary.

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `user-service.ts`).
- **Classes**: `PascalCase` (e.g., `UserService`).
- **Interfaces**: `PascalCase` (e.g., `User`).
- **Variables/Functions**: `camelCase`.
- **Components**: `PascalCase.tsx` (e.g., `VoteModal.tsx`).

## Folder Structure

```
src/
├── app/          # Next.js App Router (Pages, Layouts, API)
├── components/   # React Components
│   ├── ui/       # Generic UI (Button, Input) - Shadcn style
│   ├── admin/    # Admin-specific components
│   └── ...
├── lib/          # Core libraries (Blockchain, DB Client, Auth)
├── repositories/ # Data Access Layer classes
├── services/     # Business Logic Layer classes
├── types/        # TypeScript interfaces/types
└── utils/        # Shared helper functions
```

## Extending the System

### Adding a New API Route

1. Create `src/app/api/your-feature/route.ts`.
2. Implement `GET`, `POST`, etc.
3. Use **Services** for logic, not raw Prisma.
4. Add **Input Validation** using Zod.
5. Add **Integration Test** in `src/__tests__/integration/`.

### Adding a New Mode/Role

1. Update `UserRole` enum in `prisma/schema.prisma`.
2. Run `npm run db:migrate`.
3. Update `src/middleware.ts` to handle the new role's routing.
4. Create `src/app/new-role/` dashboard.

## Dos & Don'ts

### ✅ Do

- Use **Repositories** for all DB access.
- Use **Services** for complex logic.
- Write **Tests** for new features.
- Validate **All** API inputs.
- Use `try/catch` in API routes.

### ❌ Don't

- Use `prisma` directly in Components or API Routes (leakage of concern).
- Commit `.env` files.
- Put sensitive data (secrets) in public repo.
- Disable lint rules without good reason.

## Testing Strategy

- **Unit Tests**: For util functions, Blockchain core, and Services (mocking repos).
- **Integration Tests**: For API Routes (mocking Services/Auth).

Run tests: `npm run test:unit`
