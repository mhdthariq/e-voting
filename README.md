# 🗳️ BlockVote - Secure E-Voting System

BlockVote is a modern, secure, electronic voting application combining the usability of Next.js with the integrity of Blockchain technology.

![Status](https://img.shields.io/badge/Status-Active-success)
![Tests](https://img.shields.io/badge/Tests-Passing-success)
![Tech](https://img.shields.io/badge/Stack-Next.js%20%7C%20Prisma%20%7C%20Blockchain-blue)

## 📖 Documentation

Full documentation is available in the **[docs/](./docs/README.md)** directory.

- **[Quick Setup](./docs/SETUP.md)**
- **[Architecture](./docs/ARCHITECTURE.md)**
- **[Backend](./docs/BACKEND.md)**
- **[Frontend](./docs/FRONTEND.md)**
- **[Security](./docs/SECURITY.md)**

## 🚀 Key Features

### 🔐 Blockchain Integrity

A custom Proof-of-Work blockchain ensures that once a vote is cast and mined, it cannot be altered. Every block is cryptographically linked to the previous one.

### 👥 Multi-Role System

- **Admin**: Oversight and integrity monitoring.
- **Organization**: Election creation and management.
- **Voter**: Secure, private voting interface.

### 🛡️ Secure Architecture

- **Repository-Service Pattern** for clean backend logic.
- **Double SHA-256** Hashing & **Ed25519** Signatures.
- **JWT Authentication** with Stateless Sessions.

## ⚡ Quick Start

1. **Clone & Install**:

   ```bash
   git clone <repo-url>
   npm install
   ```

2. **Setup Env & DB**:

   ```bash
   cp .env.example .env
   npm run db:setup:dev  # Seeds with Admin: admin/admin123
   ```

3. **Run**:
   ```bash
   npm run dev
   ```

## 🧪 Testing

We use Jest for comprehensive Unit and Integration testing.

```bash
npm run test:unit
```

---

_Built for transparency, security, and usability._
