# Frontend Documentation

## Overview

The frontend is a **Next.js 15 (App Router)** application designed for responsiveness, performance, and accessibility. It strictly separates concerns between Admin, Organization, and Voter interfaces.

## Technology Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **UI Components**: Radix UI (dialogs, dropdowns, etc.)
- **Data Fetching**: React Query (planned/in-progress) or `fetch` via Hooks.

## Directory Structure

```
src/app/
├── admin/               # Admin Dashboard Layout & Pages
│   ├── layout.tsx       # Admin Sidebar/Nav
│   └── page.tsx         # /admin path
├── organization/        # Organization Layout & Pages
│   ├── elections/       # Election management
│   └── layout.tsx
├── voter/               # Voter Layout & Pages
│   ├── dashboard/       # Main voter view
│   └── vote/[id]/       # Voting Interface
├── auth/                # Login/Signup Pages
└── layout.tsx           # Root Layout (Providers)
```

## Shared Components

Located in `src/components/`:

- **UI Primitives**: `ui/button.tsx`, `ui/card.tsx`, `ui/input.tsx` (Shadcn-like structure).
- **Navigation**:
  - `AdminNavbar`: Top bar for admins.
  - `DashboardNavbar`: Shared top bar for Orgs/Voters.
- **Voting**:
  - `VoteModal`: Critical component handling the secure voting flow (candidate selection -> confirmation -> signing).

## Design System

The application follows a clean, professional aesthetic using a consistent color palette defined in `tailwind.config.ts` (or CSS variables).

- **Primary Color**: Used for call-to-action buttons (Login, Vote, Create).
- **Secondary Color**: Used for backgrounds and accents.
- **Feedback Colors**:
  - **Green**: Success (Vote Cast, Saved).
  - **Red**: Error (Validation Failed, Network Error).
  - **Amber**: Warning (Irreversible actions).

## Key Workflows

### 1. Voting Flow (Voter)

1. **Dashboard**: User sees "Active Elections".
2. **Details**: Clicks "Vote Now" to open `VoteModal`.
3. **Selection**: User Browse candidates (Image, Description).
4. **Confirmation**: User selects candidate -> Reviews summary.
5. **Signing**: User enters Passphrase (simulated signing) -> Confirms.
6. **Submission**: Payload sent to API -> Success Toast shown -> Redirect/Refresh.

### 2. Election Creation (Organization)

1. **Wizard**: Step-by-step form (Details -> Dates -> Candidates).
2. **Validation**: Client-side validation prevents invalid dates or empty candidate lists.
3. **Submission**: One-shot payload sent to API.

## Code Standards

- **Server Components**: Used by default for layout and initial data fetching (where possible).
- **Client Components**: Marked with `"use client"` only when interactivity (hooks, event listeners) is needed.
- **Hooks**: Custom hooks (e.g., `useAuth`, `useToast`) extracted to `src/hooks/`.
