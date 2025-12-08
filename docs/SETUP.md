# Setup & Installation Guide

## Prerequisites

- **Node.js**: v18.17 or higher.
- **npm** or **yarn**.
- **Database**: SQLite (default for dev) or PostgreSQL.

## 1. Clone the Repository

```bash
git clone https://github.com/mhdthariq/e-voting.git
cd e-voting
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Environment Configuration

Create a `.env` file in the root directory. You can copy `.env.example`:

```bash
cp .env.example .env
```

**Required Variables**:

```env
# Database
DATABASE_URL="file:./dev.db"  # Or your PostgreSQL connection string

# Authentication
JWT_SECRET="super-secret-key-change-this-in-prod"

# Environment
NODE_ENV="development"
```

## 4. Database Setup

We use Prisma ORM.

1. **Generate Client**:

   ```bash
   npm run db:generate
   ```

2. **Run Migrations**:
   This creates the tables in your database.

   ```bash
   npm run db:migrate
   ```

3. **Seed Data** (Optional but Recommended):
   Populates DB with Admin, Organization, and Voter accounts.

   ```bash
   npm run db:seed
   ```

   **Default Credentials**:

   - **Admin**: `admin` / `admin123`
   - **Org**: `org1` / `org123`
   - **Voter**: `voter1` / `voter123`

## 5. Running the Application

### Development

Starts the Next.js dev server with Turbopack.

```bash
npm run dev
```

Visit `http://localhost:3000`.

### Production

Builds and starts the optimized application.

```bash
npm run build
npm start
```

## 6. Running Tests

We have a comprehensive Jest test suite.

```bash
# Run all unit and integration tests
npm run test:unit

# Watch mode
npm run test:unit:watch
```

## Troubleshooting

- **Prisma Error**: If you see "Prisma Client not initialized", run `npm run db:generate`.
- **Blockchain Error**: If blockchain validation fails on startup, ensure the `blockchain_data/` directory exists and is writable, or reset the chain by deleting the data file (in dev).
