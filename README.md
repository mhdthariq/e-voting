# 🗳️ BlockVote - Secure E-Voting System with Blockchain

A prototype e-voting system built with Next.js that implements blockchain concepts for secure, transparent, and tamper-proof voting.

## 📋 Project Overview

**BlockVote** is a comprehensive e-voting platform that combines modern web technologies with blockchain security principles. The system supports three distinct user roles and ensures vote integrity through cryptographic validation.

**Current Status**: Complete database implementation with Prisma ORM - ready for authentication development.

### 🎯 Key Features

- **Blockchain Security**: Custom blockchain implementation with proof-of-work
- **Digital Signatures**: Ed25519 cryptographic signatures for vote authenticity
- **Merkle Tree Validation**: Efficient vote integrity verification
- **Role-Based Access**: Admin, Organization, and Voter interfaces
- **Anti-Tampering**: Hash injection and replay attack prevention
- **Transparent Results**: Verifiable election outcomes

### 👥 User Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | System oversight, election monitoring, blockchain validation |
| **Organization** | Create elections, manage candidates, invite voters, view results |
| **Voter** | Receive credentials via email, cast votes securely |

## 🚀 Current Status (65% Complete)

### ✅ Completed Features

#### 🔗 Blockchain Infrastructure (100% Complete)
- **CryptoUtils**: Double SHA-256, Ed25519 signatures, canonical serialization
- **MerkleTree**: Vote integrity proofs and validation
- **Block**: Mining, validation, vote storage
- **Blockchain**: Chain validation, security threat detection
- **BlockchainManager**: Multi-election blockchain support

#### 🗄️ Database Layer (100% Complete)
- **Prisma ORM**: Multi-environment support (SQLite/PostgreSQL/MySQL)
- **11 Database Tables**: Complete schema with all relationships
- **4 Database Services**: UserService, ElectionService, VoteService, BlockchainService
- **Automated Seeding**: 7 test users, 1 election, 3 candidates ready for development
- **Production Ready**: Migration scripts and deployment configuration

#### 🏗️ Project Foundation (100% Complete)
- Next.js 15 with TypeScript
- Tailwind CSS styling
- Complete type definitions
- Environment configuration
- Zero build errors

### 🚧 Next Phase - Authentication System

- JWT token implementation
- Login/logout API endpoints
- Role-based middleware
- Password reset functionality

## 🛠️ Technology Stack

- **Framework**: Next.js 15 with TypeScript
- **Database**: Prisma ORM with SQLite (dev) / PostgreSQL (prod)
- **Styling**: Tailwind CSS
- **Authentication**: JWT + bcrypt (ready for implementation)
- **Blockchain**: Custom implementation with Node.js crypto
- **Email**: Nodemailer
- **UI Components**: Radix UI + Lucide React

## 📁 Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── admin/             # Admin dashboard pages
│   ├── organization/      # Organization pages
│   ├── voter/            # Voter pages
│   ├── api/              # API routes
│   └── auth/             # Authentication pages
├── components/           # Reusable UI components
├── lib/                 # Core utilities
│   ├── blockchain/      # Blockchain implementation
│   │   ├── crypto-utils.ts    # Cryptographic functions
│   │   ├── merkle-tree.ts     # Vote integrity verification
│   │   ├── block.ts           # Blockchain blocks
│   │   └── blockchain.ts      # Main blockchain logic
│   ├── database/        # Prisma database services
│   │   ├── client.ts          # Database connection
│   │   ├── index.ts           # Service exports
│   │   └── services/          # CRUD operations
│   │       ├── user.service.ts
│   │       ├── election.service.ts
│   │       ├── vote.service.ts
│   │       └── blockchain.service.ts
│   ├── auth/           # Authentication utilities
│   └── email/          # Email service
├── types/              # TypeScript definitions
└── utils/              # General utilities
scripts/                # Development & testing scripts
└── test-blockchain.ts  # Blockchain functionality tests
```

## 🔐 Security Features

### Blockchain Security
- **Double SHA-256**: Prevents length extension attacks
- **Digital Signatures**: Ed25519 for vote authenticity
- **Merkle Trees**: Efficient vote integrity verification
- **Canonical Serialization**: Prevents hash injection
- **Proof-of-Work**: Light difficulty for block validation

### Application Security
- **JWT Authentication**: Stateless secure sessions
- **bcrypt Hashing**: Secure password storage
- **Role-Based Access**: Granular permission control
- **Input Validation**: Comprehensive data sanitization
- **Audit Logging**: Complete action tracking

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/mhdthariq/e-voting.git
cd e-voting
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp env.example .env
# Edit .env with your configuration
```

4. **Initialize database**
```bash
npm run db:setup:dev  # Setup development database with test data
```

5. **Start development server**
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

### Default Test Accounts (Development)
- **Admin**: admin@blockvote.com / admin123!
- **Organization**: org@blockvote.com / org123!
- **Voters**: voter1@blockvote.com / voter123! (voter1-5)

*(Automatically created with `npm run db:seed`)*

## 📊 Development Roadmap

### Phase 1: Foundation ✅ (Complete)
- Next.js setup and configuration
- Project structure and dependencies
- Environment configuration

### Phase 2: Database Layer ✅ (Complete)
- ✅ Prisma ORM with multi-environment support
- ✅ 11 comprehensive database tables
- ✅ 4 complete database services with CRUD operations
- ✅ Automated seeding with test data
- ✅ Production deployment scripts

### Phase 3: Authentication 🚧 (Next Priority)
- JWT token implementation
- Login/logout functionality
- Role-based middleware
- Session management

### Phase 4: Blockchain ✅ (Complete)
- ✅ Core blockchain classes
- ✅ Cryptographic security
- ✅ Vote validation and mining
- ✅ Multi-election blockchain management

### Phase 5: User Interfaces ⏳ (Planned)
- Admin dashboard
- Organization management
- Voter interface
- Responsive design

### Phase 6: Election Management ⏳ (Planned)
- Election lifecycle
- Candidate management
- Vote processing
- Results calculation

### Phase 7: Email System ⏳ (Planned)
- Voter credential distribution
- Election notifications
- Results delivery
- Template system

### Phase 8: Security & Testing ⏳ (Planned)
- Penetration testing
- Performance optimization
- Security audit
- Load testing

## 🧪 Testing

### Blockchain Testing
```bash
# Test blockchain functionality
npm run test:blockchain
```

### Database Testing
```bash
# Test database health
npm run db:health

# Seed test data
npm run db:seed

# Open database GUI
npm run db:studio
```

### Development Commands
```bash
# Setup development environment
npm run db:setup:dev

# Reset database (development only)
npm run db:reset:dev

# Check build status
npm run build
```

## 📝 API Documentation (Coming Soon)

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Election Endpoints
- `GET /api/elections` - List elections
- `POST /api/elections` - Create election
- `PUT /api/elections/:id` - Update election
- `DELETE /api/elections/:id` - Delete election

### Voting Endpoints
- `POST /api/votes` - Cast vote
- `GET /api/results/:electionId` - Get results

## 🔍 Blockchain Verification

The system provides multiple ways to verify blockchain integrity:

1. **Hash Validation**: Each block hash is cryptographically verified
2. **Signature Verification**: All votes are digitally signed
3. **Merkle Proof**: Individual vote integrity can be proven
4. **Chain Validation**: Complete blockchain integrity checking
5. **Threat Detection**: Automatic security threat identification

## 📧 Email Configuration

Configure email settings in `.env`:

```env
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables (Production)
- Set strong `JWT_SECRET`
- Configure production database
- Set up email service credentials
- Enable HTTPS
- Configure domain settings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Development Guidelines
- Follow TypeScript strict mode (pure TypeScript workflow)
- Use ESLint and Prettier for code quality
- Test blockchain functionality with `npm run test:blockchain`
- Document security considerations thoroughly
- Validate blockchain integrity before commits
- Use proper TypeScript imports (no .js extensions)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- **Documentation**: [View roadmap](./DEVELOPMENT_ROADMAP.md)
- **Current Status**: [View status](./CURRENT_STATUS.md)
- **Project Specification**: [View specs](./ProjectDocument.md)
- **TypeScript Setup**: [View guide](./TYPESCRIPT_SETUP.md)

## 💡 Key Concepts

### Blockchain vs Traditional Database
- **Immutability**: Votes cannot be changed once recorded
- **Transparency**: All votes are cryptographically verifiable
- **Decentralization**: No single point of failure (in concept)
- **Consensus**: Proof-of-work ensures valid blocks

### Privacy Protection
- Vote choices are encrypted and anonymous
- Only vote counts are publicly visible
- Voter identities are protected
- Audit trails maintain integrity without revealing votes

---

## 🎯 Git Repository Status

### Ready for Version Control
- ✅ Clean project structure with organized directories
- ✅ Pure TypeScript codebase (no mixed JS/TS files)
- ✅ Proper .gitignore configured
- ✅ Test data excluded from version control
- ✅ No build artifacts or temporary files
- ✅ Comprehensive documentation

### What's Included
- **Source Code**: Complete TypeScript implementation
- **Documentation**: Project specs, roadmap, and setup guides
- **Configuration**: Environment templates and TypeScript configs
- **Testing**: Blockchain functionality tests
- **Dependencies**: All required packages in package.json

### What's Excluded (via .gitignore)
- **Generated Data**: `/data` directory (blockchain test files)
- **Database Files**: `*.db`, `dev.db*`, `test.db*` (generated locally)
- **Prisma Generated**: `/src/generated/`, `/prisma/migrations/`
- **Build Artifacts**: `.next/`, `*.tsbuildinfo`, `/build`
- **Dependencies**: `node_modules/`
- **Environment**: `.env*` files (use env.example as template)
- **System Files**: `.DS_Store`, `*.pem`

### For Contributors
1. Clone repository
2. `npm install` to install dependencies
3. `npm run db:setup:dev` to setup database with test data
4. `npm run test:blockchain` to verify blockchain functionality
5. `npm run db:health` to verify database connectivity
6. `npm run dev` to start development

The project is ready for collaborative development with a complete database foundation and zero build errors.

### Available Test Data
After running `npm run db:setup:dev`, you'll have:
- 7 user accounts (1 admin, 1 organization, 5 voters)
- 1 sample election with 3 candidates
- All database tables populated and ready for testing

---

*Built with ❤️ for secure, transparent democracy*

*Last Updated: December 2024*
*Database Implementation: Complete ✅*
*Next Phase: Authentication System*
