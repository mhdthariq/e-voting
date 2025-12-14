# Upcoming Elections Feature

## Overview
This feature adds an "Upcoming Elections" tab to the Voter Dashboard to display elections that voters have accepted invitations for but haven't started yet.

## Problem Statement
Previously, when a voter accepted an election invitation, the election would only appear in their dashboard once the election's start date/time arrived. This meant voters couldn't see which elections they were registered for if those elections hadn't started yet.

## Solution
Added a new "Upcoming Elections" tab and preview section that shows elections where:
- The voter has **accepted** the invitation (`inviteStatus: "ACCEPTED"`)
- The election status is `"ACTIVE"`
- The election `startDate` is in the **future** (not started yet)

## Changes Made

### 1. Backend API (`src/app/api/voter/dashboard/route.ts`)

#### Added Upcoming Elections Query
```typescript
const upcomingElections = await prisma.election.findMany({
  where: {
    status: "ACTIVE",
    startDate: { gt: now }, // Starts in the future
    UserElectionParticipation: {
      some: {
        userId: userId,
        inviteStatus: "ACCEPTED", // Only accepted invitations
      },
    },
  },
  include: {
    organization: {
      select: { id: true, username: true, email: true },
    },
    _count: {
      select: { votes: true, voters: true },
    },
    candidates: {
      select: { id: true, name: true, description: true },
    },
  },
  orderBy: { startDate: "asc" },
});
```

#### Updated Response
Added `upcomingElections` array to the dashboard data response:
```typescript
return NextResponse.json({
  success: true,
  data: {
    participations: allParticipations,
    activeElections,
    upcomingElections, // NEW
    votingHistory,
    pendingInvitations,
    statistics: { ... },
  },
});
```

### 2. Frontend UI (`src/components/voter/VoterDashboard.tsx`)

#### Updated TypeScript Interfaces
```typescript
interface VoterDashboardData {
  participations: UserElectionParticipation[];
  activeElections: Election[];
  upcomingElections: Election[]; // NEW
  votingHistory: UserElectionParticipation[];
  pendingInvitations: UserElectionParticipation[];
  statistics: { ... };
}

type TabKey = "overview" | "active" | "upcoming" | "history" | "invitations"; // Added "upcoming"
```

#### Added Calendar Icon Import
```typescript
import { Calendar } from "lucide-react";
```

#### Added Navigation Tab
New tab button in the navigation bar:
```typescript
{ key: "upcoming", label: "Upcoming Elections" }
```

#### Added Overview Preview Section
Preview card in the Overview tab showing the first 3 upcoming elections with:
- Election title and description
- Organization name
- Start date
- "Upcoming" badge with calendar icon
- "View All Upcoming Elections" button (if there are any)

#### Added Full Upcoming Elections Tab
Dedicated tab displaying all upcoming elections with:
- Full election details
- Start and end dates
- Organization information
- Eligible voter count
- Time remaining until election starts (e.g., "in 2d 5h")
- Visual indicators (blue theme for upcoming vs green for active)
- Progress bar showing 0% (not started)

## User Experience Flow

### Before This Feature
1. Voter receives invitation → Accept invitation
2. Wait for election start date
3. Election appears in "Active Elections" only when it starts

### After This Feature
1. Voter receives invitation → Accept invitation
2. **Election immediately appears in "Upcoming Elections" tab**
3. Voter can see countdown to start date
4. When election starts → Automatically moves to "Active Elections"

## Visual Design

### Color Coding
- **Active Elections**: Green theme (`emerald-500`, `emerald-800`)
- **Upcoming Elections**: Blue theme (`blue-500`, `blue-800`)
- **Pending Invitations**: Yellow/amber theme

### Status Badges
- Active: `ACTIVE` badge (green)
- Upcoming: `UPCOMING` badge (blue)

### Icons
- Active Elections: `Vote` icon
- Upcoming Elections: `Calendar` icon
- Voted: `CheckCircle` icon

## Data Flow

```
User Login
    ↓
GET /api/voter/dashboard
    ↓
Backend Queries:
  - Active Elections (startDate <= now AND endDate >= now)
  - Upcoming Elections (startDate > now) ← NEW
  - Pending Invitations
  - Voting History
    ↓
Frontend Displays:
  - Overview Tab (preview of both active & upcoming)
  - Active Elections Tab (full list)
  - Upcoming Elections Tab (full list) ← NEW
  - Invitations Tab
  - History Tab
```

## Testing Checklist

- [ ] Accept an invitation for an election with future start date
- [ ] Verify election appears in "Upcoming Elections" tab
- [ ] Verify election shows correct countdown timer
- [ ] Verify election moves to "Active Elections" when start date arrives
- [ ] Verify "Upcoming Elections" preview appears in Overview tab
- [ ] Verify empty state message when no upcoming elections
- [ ] Test dark mode and light mode styling
- [ ] Test responsive layout on mobile/tablet/desktop

## Database Queries Performance

The new query is efficient because:
1. Uses indexed fields (`status`, `startDate`)
2. Uses existing `UserElectionParticipation` relation
3. Ordered by `startDate` (indexed)
4. Similar performance profile to existing `activeElections` query

## Future Enhancements

Potential improvements:
- [ ] Add calendar integration (export to Google Calendar, iCal)
- [ ] Email/push notifications X days before election starts
- [ ] "Remind Me" feature for specific elections
- [ ] Filter/sort upcoming elections by date or organization
- [ ] Show candidate preview in upcoming elections

## Related Files

- `src/app/api/voter/dashboard/route.ts` - Backend API
- `src/components/voter/VoterDashboard.tsx` - Frontend UI
- `prisma/schema.prisma` - Database schema (no changes needed)

## Deployment Notes

No database migrations required. This is a pure logic/UI enhancement that uses existing schema.

Deploy steps:
1. Commit changes
2. Push to repository
3. Deploy to production (Vercel/hosting platform)
4. No downtime expected
5. Backward compatible with existing data

---

**Feature Status**: ✅ Implemented and Ready for Testing
**Breaking Changes**: None
**Migration Required**: No