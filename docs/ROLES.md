# Role-Based Documentation

## Overview

BlockVote defines three distinct user roles, each with a specific scope of access and functionality. Access control is enforced at both the Middleware level (Next.js) and API level.

## 1. Admin

**Goal**: System oversight and integrity maintenance.

### Capabilities

- **System Stats**: View global metrics (Total Users, Total Votes, Uptime, Block Height).
- **User Management**: List, ban, or verify users.
- **Organization Approval**: Verify new Organization accounts.
- **Blockchain Inspector**: View latest blocks, validate chain integrity (Merkle roots, Hashes).
- **Logs**: View system-wide audit logs.

### Dashboard Structure

- **Overview Tab**: Key metrics cards.
- **Elections Tab**: Global election list (monitor only).
- **Settings Tab**: System configuration.

---

## 2. Organization

**Goal**: Election management.

### Capabilities

- **Create Election**: Set title, description, dates, and candidates.
- **Manage Elections**: Edit DRAFT elections, Open/Close voting.
- **Voter Management**: Invite voters via email (bulk or single).
- **Analytics**: View real-time results for their own elections.

### Dashboard Structure

- **Analytics Tab**: Charts showing participation rates.
- **Elections Tab**: List of managed elections + "Create New" Wizard.
- **Voters Tab**: List of invited voters and their status (Pending/Voted).

---

## 3. Voter

**Goal**: Participation.

### Capabilities

- **View Dashboard**: Personalized view of "Invited" and "Active" elections.
- **Cast Vote**: Securely vote in eligible elections. (One vote per election).
- **View Results**: View results of ended elections (or live if public).
- **Profile**: Update personal details (password, name).

### Dashboard Structure

- **Active Elections**: Cards with "Vote Now" actions.
- **History/Results**: List of past elections participated in.
- **Profile**: User settings.

## Access Matrix

| Feature           | Admin | Organization | Voter |
| :---------------- | :---: | :----------: | :---: |
| Login             |  ✅   |      ✅      |  ✅   |
| View Global Stats |  ✅   |      ❌      |  ❌   |
| Create Election   |  ❌   |      ✅      |  ❌   |
| Cast Vote         |  ❌   |      ❌      |  ✅   |
| Manage Users      |  ✅   |      ❌      |  ❌   |
| View Blockchain   |  ✅   |      ❌      |  ❌   |
| View Own Results  |  N/A  |      ✅      |  ✅   |

_Note: Roles are mutually exclusive. An Admin cannot vote unless they register a separate Voter account._
