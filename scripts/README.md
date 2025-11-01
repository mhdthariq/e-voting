# 🛠️ BlockVote Scripts Directory

This directory contains essential scripts for testing, debugging, and managing the BlockVote platform. All scripts are written in TypeScript and can be executed using `ts-node` or through npm scripts.

**✅ Updated for new database design with UserElectionParticipation tracking and enhanced user management.**

**Latest Update**: Scripts have been upgraded to match the newest database design with enhanced user management, permanent accounts, election invitations, and UserElectionParticipation tracking.

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
npm run test:phase3
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

#### `test-phase3.ts`
**Purpose**: Phase 3 authentication enhancements validation
- **Command**: `npm run test:phase3`
- **Features**:
  - **File Structure**: Verifies all required Phase 3 files exist
  - **TypeScript Compilation**: Ensures all files compile without errors
  - **Content Validation**: Checks for required classes, methods, and interfaces
  - **API Endpoints**: Validates HTTP method implementations
  - **Module Exports**: Verifies proper export structures
  - **Configuration Objects**: Confirms configuration objects are defined
- **Output**: Comprehensive structural and compilation validation report

#### `test-database.ts`
**Purpose**: Database system testing and validation
- **Command**: `npm run test:database`
- **Tests**:
  - Database connection and health
  - Schema validation (15 tables including UserElectionParticipation)
  - User CRUD operations with new fields (firstName, lastName, studentId)
  - Data integrity constraints
  - Audit logging functionality
  - Query performance with pagination
  - Seeded data validation (11 users, 3 elections, 14 participations)
- **Dependencies**: Requires database to be set up with latest schema

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
  - Database migration management with Prisma
  - Comprehensive seed data insertion (realistic user data)
  - Health monitoring and diagnostics
  - Interactive configuration with updated credentials
  - Clean database reset capabilities

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
# Set up development database with new schema
npm run db:setup:dev

# Clean and reseed database with updated data
npm run db:seed

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
- ✅ Schema & Structure (2 tests) - Now includes UserElectionParticipation model
- ✅ User Management (2 tests) - Enhanced with firstName, lastName, studentId fields
- ✅ Audit System (1 test)
- ✅ Data & Performance (2 tests) - Tests with realistic seeded data

### Authentication Tests (18 tests)
- ✅ Authentication Flow (8 tests) - Updated with new user credentials
- ✅ Token Management (6 tests)
- ✅ Security & Validation (3 tests)
- ✅ Audit System (2 tests)

**Test Credentials (Updated)**:
- Admin: `admin@blockvote.com` / `admin123!`
- Organization: `council@university.edu` / `org123!`
- Voter: `alice.johnson@student.edu` / `voter123!`

### Phase 3 Enhancement Tests (6 categories)
- ✅ File Structure (All required files exist)
- ✅ TypeScript Compilation (All files compile without errors)
- ✅ Content Validation (Classes, methods, interfaces present)
- ✅ API Endpoints (All required HTTP methods implemented)
- ✅ Module Exports (Proper export structures defined)
- ✅ Configuration Objects (Configuration objects properly defined)

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
| `test-phase3.ts` | TypeScript compiler (tsc) available |
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
- Database Tests: ~3-5 seconds (includes new participation tracking tests)
- Authentication Tests: ~8-12 seconds (with updated credentials)
- Phase 3 Enhancement Tests: ~4-8 seconds
- Blockchain Tests: ~1-3 seconds
- Comprehensive Suite: ~20-30 seconds

### Performance Thresholds
- Database Operations: <100ms per query
- Authentication Requests: <500ms per request
- Block Mining: <2000ms per block (difficulty 2)

## 🔐 Security Considerations

### Test Data
- All test credentials use the updated seeded data format
- No production data is used in tests
- Sensitive information is excluded from logs

### Updated Credentials (2024)
```
Admin: admin@blockvote.com / admin123!
Organizations:
  - council@university.edu / org123! (University Student Council)  
  - cs-dept@university.edu / org123! (Computer Science Department)
Voters: 
  - alice.johnson@student.edu / voter123! (Alice Johnson)
  - bob.smith@student.edu / voter123! (Bob Smith)
  - carol.davis@student.edu / voter123! (Carol Davis)
  - (and 5 more with similar pattern)
```

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

## 🔄 Recent Updates (Latest)

### Database Schema Enhancements
- ✅ Added `UserElectionParticipation` model for invitation tracking
- ✅ Enhanced `User` model with `firstName`, `lastName`, `studentId`, `emailVerified`, `lastLoginAt`
- ✅ Updated seeder with realistic multi-organization scenario
- ✅ Comprehensive election lifecycle data (draft, active, ended)
- ✅ Voter invitation and participation tracking

### Updated Features
- ✅ Clean database reset before seeding
- ✅ Realistic user profiles with student IDs
- ✅ Multiple organization types (Student Council, Department)
- ✅ Enhanced election scenarios with participation tracking
- ✅ Audit logs with comprehensive action history

### Fixed Issues
- ✅ Resolved TypeScript type mismatches in AdminDashboard
- ✅ Fixed UserElectionService null/undefined conversions
- ✅ Updated test credentials across all scripts
- ✅ Removed unused variables and linting warnings
- ✅ Successful build with zero errors/warnings

---

**Last Updated**: December 2024  
**Database Schema Version**: 2.0 (UserElectionParticipation)  
**Maintainers**: BlockVote Development Team  
**License**: MIT