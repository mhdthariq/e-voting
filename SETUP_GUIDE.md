# 🚀 BlockVote Cross-Platform Setup Guide

**Version**: 1.0  
**Last Updated**: November 2025  
**Supported Platforms**: Windows 10/11, macOS 12+, Linux (Ubuntu 20.04+)

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps)
  - [Windows Setup](#windows-setup)
  - [macOS Setup](#macos-setup)
  - [Linux Setup](#linux-setup)
- [Database Setup](#database-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)

## 🎯 Overview

BlockVote uses:
- **Next.js 15** - Full-stack React framework
- **Prisma ORM** - Database toolkit with support for SQLite, PostgreSQL, and MySQL
- **TypeScript** - Type-safe development
- **Node.js 18+** - JavaScript runtime

This guide provides step-by-step instructions for setting up BlockVote on all major operating systems.

## 📦 Prerequisites

### All Platforms

1. **Node.js 18 or higher**
   - Download from: https://nodejs.org/
   - Verify installation:
     ```bash
     node --version  # Should be 18.x or higher
     npm --version   # Should be 9.x or higher
     ```

2. **Git**
   - Windows: https://git-scm.com/download/win
   - macOS: `xcode-select --install` or https://git-scm.com/download/mac
   - Linux: `sudo apt-get install git` or `sudo yum install git`
   - Verify: `git --version`

3. **Text Editor / IDE**
   - Recommended: Visual Studio Code (https://code.visualstudio.com/)
   - Alternatives: WebStorm, Sublime Text, or any editor you prefer

### Optional (for Production)

- **PostgreSQL 14+** (for production database)
- **MySQL 8+** (alternative production database)
- **Docker** (for containerized deployment)

## 🔧 Installation Steps

### Windows Setup

#### Method 1: Using Command Prompt or PowerShell

1. **Open Command Prompt or PowerShell as Administrator**
   - Press `Win + X` and select "Windows Terminal (Admin)" or "PowerShell (Admin)"

2. **Clone the Repository**
   ```powershell
   cd C:\Users\YourUsername\Documents
   git clone https://github.com/mhdthariq/e-voting.git
   cd e-voting
   ```

3. **Install Dependencies**
   ```powershell
   npm install
   ```
   
   **If you encounter errors**, try:
   ```powershell
   # Clean npm cache
   npm cache clean --force
   
   # Delete node_modules and package-lock.json
   Remove-Item -Recurse -Force node_modules
   Remove-Item -Force package-lock.json
   
   # Reinstall
   npm install
   ```

4. **Setup Environment File**
   ```powershell
   # Copy the example environment file
   copy env.example .env
   
   # Edit .env file
   notepad .env
   ```

5. **Generate Prisma Client**
   ```powershell
   npx prisma generate
   ```

6. **Setup Database**
   ```powershell
   # For development (SQLite)
   npx prisma db push
   
   # Seed database with test data
   npm run db:seed
   ```

7. **Start Development Server**
   ```powershell
   npm run dev
   ```

8. **Open Browser**
   - Navigate to http://localhost:3000

#### Method 2: Using WSL 2 (Windows Subsystem for Linux)

**Recommended for advanced users and better compatibility**

1. **Install WSL 2**
   ```powershell
   # In PowerShell as Administrator
   wsl --install
   
   # Restart computer
   ```

2. **Install Ubuntu from Microsoft Store**
   - Open Microsoft Store
   - Search for "Ubuntu 22.04 LTS"
   - Install and launch

3. **Follow Linux Setup Instructions Below**
   - WSL uses Linux commands
   - All Linux instructions apply

#### Windows-Specific Issues and Fixes

**Issue: `npm install` fails with EACCES or permission errors**
```powershell
# Run as Administrator or:
npm install --unsafe-perm=true --allow-root
```

**Issue: Prisma Client generation fails**
```powershell
# Ensure you're using PowerShell (not CMD)
# Or try explicitly:
npx.cmd prisma generate
```

**Issue: SQLite database locked**
```powershell
# Close any applications accessing dev.db
# Delete the database and recreate:
Remove-Item dev.db
npx prisma db push
npm run db:seed
```

**Issue: Path too long errors**
```powershell
# Enable long paths in Windows
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

### macOS Setup

1. **Open Terminal**
   - Press `Cmd + Space`, type "Terminal", and press Enter

2. **Install Homebrew (if not installed)**
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

3. **Install Node.js (if not installed)**
   ```bash
   brew install node@18
   ```

4. **Clone the Repository**
   ```bash
   cd ~/Documents
   git clone https://github.com/mhdthariq/e-voting.git
   cd e-voting
   ```

5. **Install Dependencies**
   ```bash
   npm install
   ```

6. **Setup Environment File**
   ```bash
   cp env.example .env
   nano .env  # or use: open -e .env
   ```

7. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

8. **Setup Database**
   ```bash
   # For development (SQLite)
   npx prisma db push
   
   # Seed database with test data
   npm run db:seed
   ```

9. **Start Development Server**
   ```bash
   npm run dev
   ```

10. **Open Browser**
    - Navigate to http://localhost:3000

#### macOS-Specific Issues and Fixes

**Issue: Permission denied when running npm**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

**Issue: Command not found: node**
```bash
# Add Node to PATH
echo 'export PATH="/usr/local/opt/node@18/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Issue: Prisma binary incompatible with M1/M2 Mac**
```bash
# Ensure you're using ARM64 Node
arch -arm64 npm install
arch -arm64 npx prisma generate
```

### Linux Setup

#### Ubuntu/Debian

1. **Open Terminal**
   - Press `Ctrl + Alt + T`

2. **Update Package List**
   ```bash
   sudo apt update
   ```

3. **Install Node.js 18**
   ```bash
   # Install Node.js 18.x from NodeSource
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Verify installation
   node --version
   npm --version
   ```

4. **Install Build Tools**
   ```bash
   sudo apt-get install -y build-essential
   ```

5. **Clone the Repository**
   ```bash
   cd ~
   git clone https://github.com/mhdthariq/e-voting.git
   cd e-voting
   ```

6. **Install Dependencies**
   ```bash
   npm install
   ```

7. **Setup Environment File**
   ```bash
   cp env.example .env
   nano .env  # or use: vim .env
   ```

8. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

9. **Setup Database**
   ```bash
   # For development (SQLite)
   npx prisma db push
   
   # Seed database with test data
   npm run db:seed
   ```

10. **Start Development Server**
    ```bash
    npm run dev
    ```

11. **Open Browser**
    - Navigate to http://localhost:3000

#### Fedora/RHEL/CentOS

```bash
# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# Install build tools
sudo dnf groupinstall "Development Tools"

# Follow steps 5-11 from Ubuntu setup
```

#### Arch Linux

```bash
# Install Node.js
sudo pacman -S nodejs npm

# Install build tools
sudo pacman -S base-devel

# Follow steps 5-11 from Ubuntu setup
```

#### Linux-Specific Issues and Fixes

**Issue: EACCES permission error during npm install**
```bash
# Option 1: Use sudo (not recommended for development)
sudo npm install --unsafe-perm=true

# Option 2: Fix npm permissions (recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

**Issue: SQLite not installed**
```bash
# Ubuntu/Debian
sudo apt-get install sqlite3 libsqlite3-dev

# Fedora
sudo dnf install sqlite sqlite-devel

# Arch
sudo pacman -S sqlite
```

## 🗄️ Database Setup

### Development (SQLite)

**All Platforms - Quick Setup:**

```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Push schema to database
npx prisma db push

# 3. Seed database with test data
npm run db:seed
```

**Configuration (.env):**
```env
DATABASE_URL="file:./dev.db"
```

**Default Test Accounts:**
- Admin: `admin@blockvote.com` / `admin123!`
- Organization: `council@university.edu` / `org123!`
- Voter: `alice.johnson@student.edu` / `voter123!`

### Production (PostgreSQL)

#### Windows

1. **Download PostgreSQL**
   - Visit: https://www.postgresql.org/download/windows/
   - Download and run installer
   - Remember the password you set for postgres user

2. **Create Database**
   ```powershell
   # Open psql (PostgreSQL shell)
   # From Start Menu: SQL Shell (psql)
   
   # Create database
   CREATE DATABASE blockvote;
   
   # Create user
   CREATE USER blockvote_user WITH PASSWORD 'your_secure_password';
   
   # Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE blockvote TO blockvote_user;
   ```

3. **Update .env**
   ```env
   DATABASE_URL="postgresql://blockvote_user:your_secure_password@localhost:5432/blockvote"
   ```

4. **Run Migrations**
   ```powershell
   npx prisma migrate deploy
   npm run db:seed
   ```

#### macOS

1. **Install PostgreSQL**
   ```bash
   brew install postgresql@15
   brew services start postgresql@15
   ```

2. **Create Database**
   ```bash
   # Create database
   createdb blockvote
   
   # Create user (optional)
   psql -d postgres -c "CREATE USER blockvote_user WITH PASSWORD 'your_secure_password';"
   psql -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE blockvote TO blockvote_user;"
   ```

3. **Update .env and Migrate**
   ```bash
   # Update DATABASE_URL in .env
   # Then:
   npx prisma migrate deploy
   npm run db:seed
   ```

#### Linux

1. **Install PostgreSQL**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   
   # Fedora
   sudo dnf install postgresql-server postgresql-contrib
   sudo postgresql-setup --initdb
   sudo systemctl start postgresql
   
   # Arch
   sudo pacman -S postgresql
   sudo -u postgres initdb -D /var/lib/postgres/data
   sudo systemctl start postgresql
   ```

2. **Create Database**
   ```bash
   sudo -u postgres psql
   
   # In psql:
   CREATE DATABASE blockvote;
   CREATE USER blockvote_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE blockvote TO blockvote_user;
   \q
   ```

3. **Update .env and Migrate**
   ```bash
   # Update DATABASE_URL in .env
   npx prisma migrate deploy
   npm run db:seed
   ```

### Production (MySQL)

Similar steps for MySQL on each platform. Replace PostgreSQL commands with MySQL equivalents.

## ⚙️ Environment Configuration

### Basic Configuration (.env)

```env
# Database Configuration
DATABASE_URL="file:./dev.db"  # For SQLite
# DATABASE_URL="postgresql://user:password@localhost:5432/blockvote"  # For PostgreSQL
# DATABASE_URL="mysql://user:password@localhost:3306/blockvote"  # For MySQL

# Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production-minimum-32-chars"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"
BCRYPT_SALT_ROUNDS=12

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="BlockVote"
NODE_ENV="development"

# Email Configuration (optional for development)
EMAIL_SERVICE="gmail"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
EMAIL_FROM="BlockVote <noreply@blockvote.org>"

# Blockchain Configuration
BLOCKCHAIN_DIFFICULTY=2
PROOF_OF_WORK_ENABLED=true

# Security
RATE_LIMIT_MAX=100
SESSION_SECRET="your-session-secret-change-this"
```

### Platform-Specific Notes

**Windows:**
- Use forward slashes in paths: `file:./dev.db` ✅
- Avoid backslashes: `file:.\dev.db` ❌
- Use double quotes in .env file

**macOS/Linux:**
- Single or double quotes work fine
- Paths are case-sensitive

## 🏃 Running the Application

### Development Mode

**All Platforms:**
```bash
npm run dev
```

The application will be available at http://localhost:3000

### Production Mode

**Build and Start:**
```bash
# Build the application
npm run build

# Start production server
npm start
```

The production server runs on http://localhost:3000 by default.

### Available Scripts

| Command | Description | Platform |
|---------|-------------|----------|
| `npm run dev` | Start development server | All |
| `npm run build` | Build for production | All |
| `npm start` | Start production server | All |
| `npm run lint` | Run ESLint | All |
| `npm run db:generate` | Generate Prisma Client | All |
| `npm run db:push` | Push schema to database | All |
| `npm run db:migrate` | Create and run migration | All |
| `npm run db:seed` | Seed database with test data | All |
| `npm run db:studio` | Open Prisma Studio (DB GUI) | All |
| `npm run db:reset` | Reset database (⚠️ deletes all data) | All |

## 🔧 Troubleshooting

### Common Issues Across All Platforms

#### Issue: Port 3000 already in use

**Solution:**
```bash
# Find process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:3000
kill -9 $(lsof -ti:3000)

# Or use a different port:
PORT=3001 npm run dev
```

#### Issue: Database locked error

**Solution:**
```bash
# Close all applications accessing the database
# Delete and recreate database

# Windows:
del dev.db
npx prisma db push
npm run db:seed

# macOS/Linux:
rm dev.db
npx prisma db push
npm run db:seed
```

#### Issue: Module not found errors

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json  # macOS/Linux
# or
Remove-Item -Recurse -Force node_modules, package-lock.json  # Windows

npm cache clean --force
npm install
npx prisma generate
```

#### Issue: TypeScript errors during build

**Solution:**
```bash
# Check TypeScript version
npm list typescript

# Ensure correct version
npm install typescript@5.9.3

# Clear Next.js cache
rm -rf .next  # macOS/Linux
# or
Remove-Item -Recurse -Force .next  # Windows

npm run build
```

#### Issue: Prisma Client not generated

**Solution:**
```bash
npx prisma generate
npx prisma db push
```

### Windows-Specific Issues

#### Issue: Git line ending issues

**Solution:**
```powershell
# Configure Git to handle line endings
git config --global core.autocrlf true

# Re-clone repository
git clone https://github.com/mhdthariq/e-voting.git
```

#### Issue: Scripts not running in PowerShell

**Solution:**
```powershell
# Enable script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Issue: SQLite DLL not found

**Solution:**
```powershell
# Install Visual C++ Redistributable
# Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe

# Or reinstall better-sqlite3
npm uninstall better-sqlite3
npm install better-sqlite3 --build-from-source
```

### macOS-Specific Issues

#### Issue: M1/M2 Compatibility

**Solution:**
```bash
# Use Rosetta 2 for Intel binaries
arch -x86_64 npm install

# Or use ARM64 native
arch -arm64 npm install
arch -arm64 npx prisma generate
```

#### Issue: xcrun error

**Solution:**
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

### Linux-Specific Issues

#### Issue: ENOSPC error (file watcher limit)

**Solution:**
```bash
# Increase file watcher limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### Issue: OpenSSL errors

**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get install libssl-dev

# Fedora
sudo dnf install openssl-devel
```

## 🚀 Production Deployment

### Using Docker (All Platforms)

1. **Install Docker**
   - Windows/Mac: https://www.docker.com/products/docker-desktop
   - Linux: `sudo apt-get install docker.io docker-compose`

2. **Create Dockerfile** (example provided in repo)

3. **Build and Run**
   ```bash
   docker build -t blockvote .
   docker run -p 3000:3000 blockvote
   ```

### Using Vercel (Recommended for Next.js)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Set Environment Variables** in Vercel dashboard

### Traditional Server Deployment

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Start with PM2**
   ```bash
   # Install PM2
   npm install -g pm2
   
   # Start application
   pm2 start npm --name "blockvote" -- start
   
   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

3. **Configure Nginx** (optional)
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Node.js Documentation](https://nodejs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MySQL Documentation](https://dev.mysql.com/doc/)

## 📞 Getting Help

If you encounter issues not covered in this guide:

1. Check the [GitHub Issues](https://github.com/mhdthariq/e-voting/issues)
2. Review [API Integration Guide](./API_INTEGRATION.md)
3. Check [Database Documentation](./DATABASE.md)
4. Review [Development Roadmap](./DEVELOPMENT_ROADMAP.md)

---

**Last Updated**: November 2025  
**Version**: 1.0  
**Tested On**: Windows 11, macOS 13 (Ventura), Ubuntu 22.04 LTS

