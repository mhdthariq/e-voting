# Backend Documentation

## Overview

The backend is built around a **Service-Repository** pattern to ensure separation of concerns, testability, and scalability. It lives within the Next.js App Router as API routes.

## Directory Structure

```
src/
├── app/api/               # API Route Handlers
│   ├── admin/             # Admin-specific endpoints
│   ├── auth/              # Authentication endpoints
│   ├── organization/      # Organization endpoints
│   ├── user/              # User-specific endpoints
│   └── voter/             # Voter-specific endpoints
├── lib/
│   ├── auth/              # JWT & Password utilities
│   ├── blockchain/        # Core Blockchain logic
│   └── database/          # Prisma configuration
├── repositories/          # Data Access Layer
└── services/              # Business Logic Layer
```

## API Routes

Routes are organized by domain and role. Start file names with `route.ts`.

### Authentication (`/api/auth`)

- `POST /login`: Authenticates user, returns JWT pairs.
- `POST /refresh`: Refreshes access token.
- `POST /logout`: Clears cookies.

### Admin (`/api/admin`)

- `GET /stats`: System-wide statistics.
- `GET /users`: User management.

### Organization (`/api/organization`)

- `GET /elections`: properties statistics.
- `POST /elections`: Create new election with candidates.

### Voter (`/api/voter`)

- `GET /dashboard`: Personal voting stats and active elections.
- `GET /elections`: List available elections.
- `POST /vote`: Submit a signed vote transaction.

## Service-Repository Pattern

We avoid direct Prisma calls in API routes.

### 1. Repositories (`src/repositories/`)

Extend `BaseRepository`. encapsulate raw Prism calls.

- `UserRepository`: `findById`, `findByEmail`, `create`.
- `ElectionRepository`: `findWithStats`, `createWithCandidates`.

**Example:**

```typescript
export class UserRepository extends BaseRepository<User> {
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
```

### 2. Services (`src/services/`)

Handle business logic, validation, and coordinate between multiple repositories or the Blockchain.

- `UserService`: Profile management, password updates.
- `ElectionService`: Election lifecycle, stats aggregation.

**Example:**

```typescript
export class ElectionService {
  constructor(private electionRepo = new ElectionRepository()) {}

  async createElection(data: CreateElectionDto) {
    // Validate dates
    if (data.endDate <= data.startDate) throw new Error("Invalid dates");
    return this.electionRepo.create(data);
  }
}
```

## Blockchain Implementation

The custom blockchain (`src/lib/blockchain/`) provides the "Trust Layer".

- **VoteTransaction**: Represents a single vote. Signed by the voter's private key.
- **Memory Pool**: Pending votes are held in memory (or temporary file storage via `FileMutex`) until a block is full.
- **Mining**:
  1. `Blockchain.addVoteTransaction()` validates signature and format.
  2. If `pendingVotes.length >= BLOCK_SIZE`, `mineBlock()` is called.
  3. `Block` calculates Merkle Root of votes.
  4. PoW algorithm finds a hash starting with `difficulty` zeros.
  5. New block is appended to the chain and saved to DB.

## Validation

We use **Zod** for runtime request validation.

- Schemas defined in `src/utils/validation.ts`.
- Middleware-like validation in API routes.

```typescript
const body = await request.json();
const validation = schemas.user.login.safeParse(body);
if (!validation.success)
  return NextResponse.json({ error: validation.error }, { status: 400 });
```

## Error Handling

- API routes should wrap logic in `try/catch`.
- Use standard HTTP status codes:
  - `200`: Success
  - `400`: Validation Error
  - `401`: Unauthorized (No/Invalid Token)
  - `403`: Forbidden (Wrong Role)
  - `404`: Not Found
  - `500`: Internal Server Error
- Log errors using `console.error` (or a dedicated logger) before returning responses.
