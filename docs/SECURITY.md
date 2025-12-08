# Security Documentation

BlockVote employs a defense-in-depth strategy, combining web application security best practices with blockchain cryptography to ensure election integrity.

## 1. Blockchain Guarantees

The core value proposition of BlockVote is the immutable record of votes.

### Double-Vote Prevention

- **Mechanism**: The system checks the `votes` table (database) and the blockchain history.
- **Logic**: `VoteService` checks `hasVoted` flag on `ElectionVoter` record AND existence of a vote transaction from `voterPublicKey` for `electionId` before accepting a new vote.

### Tamper-Resistance (Hashing)

- **Algorithm**: Double SHA-256 (`SHA256(SHA256(data))`).
- **Chain Linking**: Each block contains the `previousHash`. Changing a past vote would invalidate the Merkle Root of that block, changing its Hash, and thus breaking the link to all subsequent blocks.
- **Validation**: `Blockchain.validateChain()` iterates from Genesis block to latest, re-calculating hashes and verifying headers.

### Vote Authenticity (Signatures)

- **Algorithm**: Ed25519 (or RSA, depending on config).
- **Process**:
  1. Voter signs `(electionId + candidateId + timestamp)` with their Private Key.
  2. Vote payload includes `publicKey` and `signature`.
  3. Blockchain verifies signature before adding to Mempool.
  4. **Result**: Nobody (including Admins) can forge a vote for a user.

## 2. Application Security

### Authentication

- **JWT (JSON Web Tokens)**: Used for stateless session management.
  - **Access Token**: Short-lived (e.g., 15-60 min).
  - **Refresh Token**: Long-lived, HTTP-only cookie.
- **Passwords**: Hashed using `bcrypt` (Salt rounds: 10-12).

### Access Control (RBAC)

- **Middleware**: `middleware.ts` intercepts requests.
  - Checks for Token presence.
  - Decodes Token Role.
  - Redirects unauthorized attempts (e.g., Voter trying to access `/admin`).
- **API Level**: API Routes re-verify token and role before processing data.

### Input Validation

- **Zod**: Strict schema validation for all API inputs.
- **Sanitization**: Inputs are trimmed and sanitized to prevent XSS (though React escapes by default).

## 3. Database Transactions

To ensure consistency between the Relational DB and the Blockchain file storage:

- **FileMutex**: A file-based locking mechanism prevents race conditions when multiple processes try to write to the Blockchain file simultaneously.
- **Prisma Transactions**: Critical DB updates (e.g., marking voter as `hasVoted` + inserting `Vote` record) are wrapped in `prisma.$transaction([])` to ensure atomicity.

## 4. Sensitive Operations

### User Creation

- Passwords are **never** logged.
- Private Keys (for voting) are encrypted at rest (AES-256) if stored on server, or managed client-side (future enhancement).

### Audit Logs

- All critical actions (Login, Vote Cast, Election Created, Ban User) create an `AuditLog` entry.
- These logs are immutable (no API to delete/edit logs).
