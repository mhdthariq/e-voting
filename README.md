# 🗳️ BlockVote - Secure E-Voting System with Blockchain

A prototype e-voting system built with Next.js that implements blockchain concepts for secure, transparent, and tamper-proof voting.

## 📋 Project Overview

**BlockVote** is a comprehensive e-voting platform that combines modern web technologies with blockchain security principles. The system supports three distinct user roles and ensures vote integrity through cryptographic validation.

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

## 🚀 Current Status (35% Complete)

### ✅ Completed Features

#### 🔗 Blockchain Infrastructure (95% Complete)
- **CryptoUtils**: Double SHA-256, Ed25519 signatures, canonical serialization
- **MerkleTree**: Vote integrity proofs and validation
- **Block**: Mining, validation, vote storage
- **Blockchain**: Chain validation, security threat detection
- **BlockchainManager**: Multi-election blockchain support

#### 🗄️ Database Layer (70% Complete)
- SQLite database with optimized schema
- User, Election, Candidate, Vote, and Audit tables
- Automatic admin account creation
- Database integrity checking and backup

#### 🏗️ Project Foundation (90% Complete)
- Next.js 15 with TypeScript
- Tailwind CSS styling
- Complete type definitions
- Environment configuration
- Folder structure

### 🚧 In Development

- Database CRUD operations
- Authentication system (JWT + bcrypt)
- API endpoints
- User interfaces

## 🛠️ Technology Stack

- **Framework**: Next.js 15 with TypeScript
- **Database**: SQLite with better-sqlite3
- **Styling**: Tailwind CSS
- **Authentication**: JWT + bcrypt
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
│   ├── database/        # Database configuration
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
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. **Initialize database**
```bash
npm run db:init  # Will create SQLite database and schema
```

5. **Start development server**
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

### Default Admin Account
- **Username**: admin
- **Password**: admin123
- **Email**: admin@blockvote.org

*(Change these credentials in production)*

## 📊 Development Roadmap

### Phase 1: Foundation ✅ (Complete)
- Next.js setup and configuration
- Project structure and dependencies
- Environment configuration

### Phase 2: Database Layer 🚧 (70% Complete)
- ✅ Database schema and configuration
- 🚧 CRUD operations and models
- ⏳ Data validation and testing

### Phase 3: Authentication ⏳ (Planned)
- JWT token implementation
- Login/logout functionality
- Role-based middleware
- Session management

### Phase 4: Blockchain ✅ (95% Complete)
- ✅ Core blockchain classes
- ✅ Cryptographic security
- ✅ Vote validation and mining
- 🚧 Performance optimization

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

### TypeScript Testing
```bash
# Test blockchain functionality
npm run test:blockchain

# Run any TypeScript script directly
npx ts-node --project tsconfig.node.json scripts/filename.ts
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

Configure email settings in `.env.local`:

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
- **Build Artifacts**: `.next/`, `*.tsbuildinfo`, `/build`
- **Dependencies**: `node_modules/`
- **Environment**: `.env*` files (use .env.example as template)
- **System Files**: `.DS_Store`, `*.pem`

### For Contributors
1. Clone repository
2. `npm install` to install dependencies
3. `npm run test:blockchain` to verify functionality
4. `npm run dev` to start development

The project is ready for collaborative development with a clean, professional structure.

---

*Built with ❤️ for secure, transparent democracy*

*Last Updated: December 2024*
