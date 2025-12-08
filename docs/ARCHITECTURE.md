# System Architecture

## Overview

BlockVote is a hybrid e-voting system that combines a traditional relational database for user management and election logic with a custom blockchain implementation for vote integrity and immutability.

## High-Level Architecture

```mermaid
graph TD
    Client[Web Client (Next.js)]
    API[Next.js API Routes]
    Service[Service Layer]
    Repo[Repository Layer]
    DB[(PostgreSQL/Prisma)]
    Auth[Authentication (JWT)]
    BC[Blockchain Engine]

    Client -->|HTTP Requests| API
    API -->|Validate & Route| Service
    Service -->|Business Logic| Repo
    Service -->|Vote Transactions| BC
    Repo -->|Data Access| DB
    API -->|Verify| Auth
    BC -->|Store Blocks| DB
```

## Data Flow Lifecycle

### 1. User Request

- **Frontend**: User initiates action (e.g., Cast Vote via `VoteModal`).
- **API Route**: Request hits `/api/votes`.
- **Validation**: Zod schemas validate input (payload, signature).
- **Authentication**: JWT middleware validates user session and role.

### 2. Business Logic Execution

- **Service Layer**: `VoteService` handles density and business rules (e.g., checking if user already voted).
- **Blockchain Interaction**: Valid votes are sent to `Blockchain.addVoteTransaction()`.
- **Mining**: If block capacity is reached, `Blockchain.mineBlock()` is triggered independently or via scheduler.

### 3. Data Persistence

- **Repository Layer**: `UserRepository`, `ElectionRepository` interact with Prisma.
- **Database**:
  - User/Election data stored in relational tables (`users`, `elections`).
  - Blockchain blocks stored in `blockchain_blocks` table (serialized JSON for votes).

### 4. Response

- API returns success/failure to Client.
- Client updates UI (e.g., `VotingAnalytics` refetches data).

## Core Components

### Frontend

- **Framework**: Next.js 15 (App Router).
- **Styling**: Tailwind CSS 4.
- **State**: React Query (TanStack Query) for server state management.
- **UI Lib**: Radix UI primitives + Lucide React icons.

### Backend

- **Framework**: Next.js API Routes.
- **ORM**: Prisma Client.
- **Database**: PostgreSQL (Production) / SQLite (Dev).
- **Auth**: Custom JWT implementation (access/refresh tokens).

### Blockchain Layer

- **Location**: `src/lib/blockchain/`
- **Algorithm**: Proof-of-Work (customizable difficulty).
- **Signatures**: Ed25519 for transactions.
- **Integrity**: Merkle Tree root per block + Hash linking.
