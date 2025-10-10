# 🛠️ BlockVote Scripts Directory

This directory contains essential scripts for testing, debugging, and managing the BlockVote platform. All scripts are written in TypeScript and can be executed using `ts-node` or through npm scripts.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Available Scripts](#available-scripts)
- [Testing Scripts](#testing-scripts)
- [Utility Scripts](#utility-scripts)
- [Development Scripts](#development-scripts)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm dependencies installed (`npm install`)
- Next.js development server running (`npm run dev`)

### Running Tests
```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:database
npm run test:auth
npm run test:blockchain
```

## 📁 Available Scripts

### 🧪 Testing Scripts

#### `test-all.ts`
**Purpose**: Comprehensive test suite that runs all system tests
- **Command**: `npm run test:all`
- **Features**:
  - Database system validation
  - Blockchain functionality testing
  - Authentication system verification
  - Integration testing
  - Performance benchmarking
- **Output**: Detailed report with pass/fail status for all systems

#### `test-database.ts`
**Purpose**: Database system testing and validation
- **Command**: `npm run test:database`
- **Tests**:
  - Database connection and health
  - Schema validation (11 tables)
  - CRUD operations
  - Data integrity constraints
  - Audit logging functionality
  - Query performance
- **Dependencies**: Requires database to be set up

#### `test-authentication.ts`
**Purpose**: Authentication and authorization system testing
- **Command**: `npm run test:auth`
- **Tests**:
  - JWT token generation and validation
  - User login/logout flows
  - Role-based access control (RBAC)
  - Password hashing verification
  - Token refresh mechanisms
  - Audit logging integration
- **Dependencies**: Requires Next.js server to be running

#### `test-blockchain.ts`
**Purpose**: Blockchain implementation testing
- **Command**: `npm run test:blockchain`
- **Tests**:
  - Block creation and mining
  - Transaction validation
  - Merkle tree verification
  - Security threat detection
  - Double voting prevention
  - Export/import functionality

### 🔧 Utility Scripts

#### `database-setup.ts`
**Purpose**: Database management and environment setup
- **Commands**:
  ```bash
  npm run db:setup        # Interactive setup
  npm run db:setup:dev    # Development environment
  npm run db:setup:test   # Test environment
  npm run db:health       # Health check
  ```
- **Features**:
  - Multi-environment support (dev, test, staging, prod)
  - Database migration management
  - Seed data insertion
  - Health monitoring
  - Interactive configuration

### 🐛 Development Scripts

#### `debug-auth.ts`
**Purpose**: Authentication system debugging and diagnostics
- **Usage**: `npx ts-node scripts/debug-auth.ts`
- **Features**:
  - JWT configuration validation
  - Token generation testing
  - Environment variable checking
  - Authentication flow debugging

## 💡 Usage Examples

### Running Individual Tests

```bash
# Test database connectivity
npx ts-node scripts/test-database.ts

# Debug authentication issues
npx ts-node scripts/debug-auth.ts

# Test blockchain functionality
npx ts-node scripts/test-blockchain.ts
```

### Database Management

```bash
# Set up development database
npm run db:setup:dev

# Check database health
npm run db:health

# Reset database (caution!)
npm run db:reset:dev
```

### Comprehensive Testing

```bash
# Run all tests with detailed output
npm run test:all

# Run authentication tests only
npm run test:auth

# Run with debug information
DEBUG=1 npm run test:database
```

## 📊 Test Coverage

### Database Tests (9 categories)
- ✅ Connection & Health (2 tests)
- ✅ Schema & Structure (2 tests)
- ✅ User Management (2 tests)
- ✅ Audit System (1 test)
- ✅ Data & Performance (2 tests)

### Authentication Tests (18 tests)
- ✅ Authentication Flow (8 tests)
- ✅ Token Management (6 tests)
- ✅ Security & Validation (3 tests)
- ✅ Audit System (2 tests)

### Blockchain Tests (23 tests)
- ✅ Block Operations
- ✅ Mining & Validation
- ✅ Security Features
- ✅ Transaction Processing

## 🔍 Script Details

### Test Output Format

All test scripts provide standardized output:
- ✅ **Success**: Green checkmark with descriptive message
- ❌ **Failure**: Red X with error details
- 📊 **Summary**: Overall pass/fail statistics
- 🎯 **Features**: List of tested functionality

### Environment Requirements

| Script | Requirements |
|--------|-------------|
| `test-database.ts` | Database connection, Prisma setup |
| `test-authentication.ts` | Next.js server running on port 3000 |
| `test-blockchain.ts` | Node.js runtime only |
| `database-setup.ts` | Database credentials configured |

## 🛠️ Development Guidelines

### Adding New Tests

1. Create test file following naming convention: `test-[feature].ts`
2. Implement test class with `runAllTests()` method
3. Use standardized result format with `addResult()` method
4. Add npm script in `package.json`
5. Update this README

### Code Standards

- **TypeScript**: Strict typing, no `any` types
- **Error Handling**: Proper try-catch with typed errors
- **Logging**: Consistent output format with emojis
- **Testing**: Comprehensive coverage with edge cases

## 🚨 Troubleshooting

### Common Issues

#### "Server not running" Error
```bash
# Start the development server first
npm run dev
# Then run authentication tests
npm run test:auth
```

#### Database Connection Issues
```bash
# Check database health
npm run db:health
# Reset and setup database
npm run db:setup:dev
```

#### Permission Errors
```bash
# Ensure proper environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Debug Mode

Enable debug output for detailed information:
```bash
DEBUG=1 npm run test:database
NODE_ENV=development npm run test:auth
```

## 📈 Performance Benchmarks

### Expected Test Times
- Database Tests: ~3-5 seconds
- Authentication Tests: ~8-12 seconds  
- Blockchain Tests: ~1-3 seconds
- Comprehensive Suite: ~15-20 seconds

### Performance Thresholds
- Database Operations: <100ms per query
- Authentication Requests: <500ms per request
- Block Mining: <2000ms per block (difficulty 2)

## 🔐 Security Considerations

### Test Data
- All test credentials are randomized
- No production data is used in tests
- Sensitive information is excluded from logs

### Environment Isolation
- Tests use separate database schemas
- Mock data prevents production interference
- Cleanup routines remove test artifacts

## 📝 Contributing

When adding new scripts:

1. Follow TypeScript best practices
2. Include comprehensive error handling
3. Provide detailed test coverage
4. Update this documentation
5. Ensure zero TypeScript errors/warnings

## 🎯 Next Steps

Planned script additions:
- [ ] `test-ui.ts` - Frontend component testing
- [ ] `test-integration.ts` - End-to-end testing
- [ ] `benchmark.ts` - Performance benchmarking
- [ ] `security-audit.ts` - Security vulnerability scanning
- [ ] `load-test.ts` - Load testing utilities

---

**Last Updated**: October 2025  
**Maintainers**: BlockVote Development Team  
**License**: MIT