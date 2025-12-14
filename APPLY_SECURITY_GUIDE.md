# How to Apply Security to All API Endpoints

## 🎯 Overview

You currently have **34 API endpoints** but security is only applied to **1 endpoint**. This guide shows you how to quickly secure all your APIs using the security middleware helper.

---

## 📋 Quick Summary

### ✅ Already Secured (1/34):
- `/api/organization/elections/[id]` ✅

### ⚠️ Need Security (33/34):
- All authentication endpoints (login, register, etc.)
- All admin endpoints
- All organization endpoints
- All voter endpoints
- All user profile endpoints

---

## 🚀 How to Apply Security (Easy Way)

### Step 1: Import Security Middleware

```typescript
import {
  securityMiddleware,
  SecurityPresets,
  validateIdParam,
  validateOwnership,
  createAuditLog,
} from "@/lib/security/middleware";
import { createSecureResponse, addRateLimitHeaders } from "@/lib/security/headers";
```

### Step 2: Apply Security at Start of Handler

**Before (Unsecured):**
```typescript
export async function GET(req: NextRequest) {
  try {
    // Your code here
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
```

**After (Secured):**
```typescript
export async function GET(req: NextRequest) {
  // Apply security middleware
  const { error, context } = await securityMiddleware(req, SecurityPresets.organizationRead);
  if (error) return error;

  try {
    // Your code here - now you have context.userId, context.user, etc.
    const data = await fetchData(context!.userId);
    
    // Return secure response with rate limit headers
    const response = createSecureResponse(
      { success: true, data },
      200,
      req.headers.get("origin")
    );
    
    return addRateLimitHeaders(
      response,
      context!.rateLimit.limit,
      context!.rateLimit.remaining,
      context!.rateLimit.resetTime
    );
  } catch (error) {
    console.error("Error:", error);
    return createSecureResponse(
      { success: false, message: "Internal server error" },
      500,
      req.headers.get("origin")
    );
  }
}
```

---

## 🎨 Security Presets (Choose the Right One)

### For Authentication Endpoints
```typescript
const { error, context } = await securityMiddleware(req, SecurityPresets.auth);
```
- ❌ No authentication required
- ⏱️ Strict rate limiting (5 req/15min)
- 📝 Audit logging enabled

**Use for:**
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/password-reset`

---

### For Admin Read Endpoints
```typescript
const { error, context } = await securityMiddleware(req, SecurityPresets.adminRead);
```
- ✅ Requires authentication
- 👑 Admin role required
- ⏱️ Lenient rate limiting (200 req/min)
- 📝 Audit logging enabled

**Use for:**
- `/api/admin/stats`
- `/api/admin/elections`
- `/api/admin/users`

---

### For Admin Write Endpoints
```typescript
const { error, context } = await securityMiddleware(req, SecurityPresets.adminWrite);
```
- ✅ Requires authentication
- 👑 Admin role required
- ⏱️ Moderate rate limiting (30 req/min)
- 📝 Audit logging enabled

**Use for:**
- `/api/admin/organizations/[id]/approve`
- `/api/admin/organizations/[id]/reject`
- `/api/admin/users` (POST/PUT/DELETE)

---

### For Organization Read Endpoints
```typescript
const { error, context } = await securityMiddleware(req, SecurityPresets.organizationRead);
```
- ✅ Requires authentication
- 🏢 Organization role required
- ⏱️ Normal rate limiting (100 req/min)
- ❌ No audit logging

**Use for:**
- `/api/organization/stats`
- `/api/organization/elections`
- `/api/organization/voters`

---

### For Organization Write Endpoints
```typescript
const { error, context } = await securityMiddleware(req, SecurityPresets.organizationWrite);
```
- ✅ Requires authentication
- 🏢 Organization role required
- ⏱️ Moderate rate limiting (30 req/min)
- 📝 Audit logging enabled

**Use for:**
- `/api/organization/elections` (POST/PUT/DELETE)
- `/api/organization/elections/assign`

---

### For Voter Endpoints
```typescript
const { error, context } = await securityMiddleware(req, SecurityPresets.voterRead);
```
- ✅ Requires authentication
- 🗳️ Voter role required
- ⏱️ Normal rate limiting (100 req/min)
- ❌ No audit logging

**Use for:**
- `/api/voter/dashboard`
- `/api/voter/elections`
- `/api/voter/history`

---

### For Voting (Critical!)
```typescript
const { error, context } = await securityMiddleware(req, SecurityPresets.voting);
```
- ✅ Requires authentication
- 🗳️ Voter role required
- ⏱️ Strict rate limiting (10 req/5min)
- 📝 Audit logging enabled

**Use for:**
- `/api/voter/vote` ⚠️ CRITICAL

---

### For Public Endpoints
```typescript
const { error, context } = await securityMiddleware(req, SecurityPresets.public);
```
- ❌ No authentication required
- ⏱️ Normal rate limiting (100 req/min)
- ❌ No audit logging

**Use for:**
- `/api/health` (if you have one)
- Public documentation endpoints

---

## 📝 Complete Example: Secure an Endpoint

### Example 1: Admin Stats Endpoint

**File:** `/api/admin/stats/route.ts`

```typescript
import { NextRequest } from "next/server";
import prisma from "@/lib/database/client";
import {
  securityMiddleware,
  SecurityPresets,
  createAuditLog,
} from "@/lib/security/middleware";
import { createSecureResponse, addRateLimitHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  // Apply admin read security
  const { error, context } = await securityMiddleware(req, SecurityPresets.adminRead);
  if (error) return error;

  try {
    // Fetch stats
    const stats = await prisma.election.groupBy({
      by: ["status"],
      _count: true,
    });

    // Audit log
    await createAuditLog(
      context!,
      "VIEW",
      "ADMIN_STATS",
      undefined,
      "Viewed admin statistics"
    );

    // Secure response
    const response = createSecureResponse(
      { success: true, data: stats },
      200,
      req.headers.get("origin")
    );

    return addRateLimitHeaders(
      response,
      context!.rateLimit.limit,
      context!.rateLimit.remaining,
      context!.rateLimit.resetTime
    );
  } catch (err) {
    console.error("Error fetching admin stats:", err);
    return createSecureResponse(
      { success: false, message: "Internal server error" },
      500,
      req.headers.get("origin")
    );
  }
}
```

---

### Example 2: Organization Election with Ownership Check

**File:** `/api/organization/elections/[id]/route.ts`

```typescript
import { NextRequest } from "next/server";
import prisma from "@/lib/database/client";
import {
  securityMiddleware,
  SecurityPresets,
  validateIdParam,
  validateOwnership,
  createAuditLog,
} from "@/lib/security/middleware";
import { createSecureResponse, addRateLimitHeaders } from "@/lib/security/headers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply organization read security
  const { error, context } = await securityMiddleware(req, SecurityPresets.organizationRead);
  if (error) return error;

  try {
    // Validate ID parameter
    const { id } = await params;
    const idValidation = validateIdParam(id);
    if (idValidation.error) return idValidation.error;

    const electionId = idValidation.id!;

    // Fetch election
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: { candidates: true },
    });

    // Validate ownership
    const ownershipCheck = await validateOwnership(election, context!.userId, {
      auditLog: true,
      entityType: "ELECTION",
      entityId: electionId,
      ipAddress: context!.ipAddress,
      userAgent: context!.userAgent,
    });
    if (ownershipCheck.error) return ownershipCheck.error;

    // Audit log success
    await createAuditLog(
      context!,
      "VIEW",
      "ELECTION",
      electionId,
      `Viewed election: ${election!.title}`
    );

    // Secure response
    const response = createSecureResponse(
      { success: true, data: election },
      200,
      req.headers.get("origin")
    );

    return addRateLimitHeaders(
      response,
      context!.rateLimit.limit,
      context!.rateLimit.remaining,
      context!.rateLimit.resetTime
    );
  } catch (err) {
    console.error("Error:", err);
    return createSecureResponse(
      { success: false, message: "Internal server error" },
      500,
      req.headers.get("origin")
    );
  }
}
```

---

### Example 3: Login Endpoint (No Auth Required)

**File:** `/api/auth/login/route.ts`

```typescript
import { NextRequest } from "next/server";
import { securityMiddleware, SecurityPresets } from "@/lib/security/middleware";
import { createSecureResponse, addRateLimitHeaders } from "@/lib/security/headers";
import { sanitizeEmail } from "@/lib/security/validation";

export async function POST(req: NextRequest) {
  // Apply auth security (no authentication required, but strict rate limiting)
  const { error, context } = await securityMiddleware(req, SecurityPresets.auth);
  if (error) return error;

  try {
    const body = await req.json();
    const email = sanitizeEmail(body.email);
    const password = body.password;

    // Your login logic here
    const user = await authenticateUser(email, password);

    // Secure response
    const response = createSecureResponse(
      { success: true, data: user },
      200,
      req.headers.get("origin")
    );

    return addRateLimitHeaders(
      response,
      context!.rateLimit.limit,
      context!.rateLimit.remaining,
      context!.rateLimit.resetTime
    );
  } catch (err) {
    console.error("Login error:", err);
    return createSecureResponse(
      { success: false, message: "Invalid credentials" },
      401,
      req.headers.get("origin")
    );
  }
}
```

---

## 📊 Priority List: Which Endpoints to Secure First

### 🔴 CRITICAL (Do First!)
1. `/api/voter/vote` - **VOTING ENDPOINT** ⚠️
2. `/api/auth/login` - Authentication
3. `/api/auth/register` - User registration
4. `/api/admin/organizations/*/approve` - Admin actions
5. `/api/admin/organizations/*/reject` - Admin actions

### 🟡 HIGH PRIORITY (Do Soon)
6. `/api/organization/elections` (POST/PUT/DELETE)
7. `/api/organization/elections/assign`
8. `/api/admin/users`
9. `/api/user/password`
10. `/api/voter/elections/[id]`

### 🟢 MEDIUM PRIORITY (Do Eventually)
11. All `/api/admin/*` endpoints
12. All `/api/organization/*` endpoints
13. All `/api/voter/*` endpoints
14. `/api/user/profile`

---

## 🔧 Custom Security Configuration

If presets don't fit, create custom config:

```typescript
const { error, context } = await securityMiddleware(req, {
  requireAuth: true,
  requiredRole: ["admin", "organization"], // Multiple roles allowed
  rateLimit: {
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 10 * 60 * 1000, // 10 minutes
  },
  auditLog: true,
  auditAction: "CUSTOM_ACTION",
  auditEntity: "CUSTOM_ENTITY",
});
```

---

## ✅ Checklist for Each Endpoint

Before you finish securing an endpoint:

- [ ] Import security middleware
- [ ] Choose correct preset (or create custom)
- [ ] Apply middleware at start of handler
- [ ] Check `if (error) return error;`
- [ ] Use `context!.userId` for user identification
- [ ] Validate ID parameters if present
- [ ] Check ownership if accessing resources
- [ ] Add audit logging for critical actions
- [ ] Use `createSecureResponse()` for all responses
- [ ] Add rate limit headers to response
- [ ] Handle errors securely (no leaks)
- [ ] Test with invalid auth
- [ ] Test with wrong role
- [ ] Test rate limiting

---

## 🎯 Bulk Apply Script (Optional)

Want to secure multiple files at once? Here's a script template:

```bash
#!/bin/bash

# List of files to update
files=(
  "src/app/api/admin/stats/route.ts"
  "src/app/api/admin/users/route.ts"
  "src/app/api/organization/stats/route.ts"
  # Add more files...
)

for file in "${files[@]}"; do
  echo "Securing: $file"
  # Add your update logic here
done
```

---

## 📈 Progress Tracker

Track your progress securing all endpoints:

### Authentication (5 endpoints)
- [ ] `/api/auth/login` 🔴
- [ ] `/api/auth/register` 🔴
- [ ] `/api/auth/logout` 🟡
- [ ] `/api/auth/refresh` 🟡
- [ ] `/api/auth/password-reset` 🔴

### Admin (11 endpoints)
- [ ] `/api/admin/stats` 🟡
- [ ] `/api/admin/users` 🟡
- [ ] `/api/admin/elections` 🟡
- [ ] `/api/admin/elections/[id]` 🟡
- [ ] `/api/admin/organizations/pending` 🟡
- [ ] `/api/admin/organizations/[id]/approve` 🔴
- [ ] `/api/admin/organizations/[id]/reject` 🔴
- [ ] `/api/admin/blockchain` 🟢
- [ ] `/api/admin/audit` 🟢
- [ ] `/api/admin/audit/stats` 🟢
- [ ] `/api/admin/system` 🔴

### Organization (6 endpoints)
- [x] `/api/organization/elections/[id]` ✅
- [ ] `/api/organization/elections` 🟡
- [ ] `/api/organization/elections/assign` 🔴
- [ ] `/api/organization/stats` 🟢
- [ ] `/api/organization/voters` 🟢
- [ ] `/api/organization/voters/all` 🟢

### Voter (6 endpoints)
- [ ] `/api/voter/vote` 🔴 **CRITICAL!**
- [ ] `/api/voter/dashboard` 🟡
- [ ] `/api/voter/elections` 🟡
- [ ] `/api/voter/elections/[id]` 🟡
- [ ] `/api/voter/history` 🟢
- [ ] `/api/voter/invitations` 🟢

### User (2 endpoints)
- [ ] `/api/user/profile` 🟡
- [ ] `/api/user/password` 🔴

### Other (4 endpoints)
- [ ] `/api/auth/me` 🟢
- [ ] `/api/auth/verify-email` 🟡
- [ ] `/api/auth/register/voter` 🟡
- [ ] `/api/voters` 🟢

**Total: 1/34 secured (3% complete)**

---

## 🚨 Most Critical Endpoints to Secure NOW

These 5 endpoints are the most vulnerable if left unsecured:

1. **`/api/voter/vote`** ⚠️
   - Anyone could submit votes without authentication!
   - Use: `SecurityPresets.voting`

2. **`/api/auth/login`** ⚠️
   - Vulnerable to brute force attacks
   - Use: `SecurityPresets.auth`

3. **`/api/admin/organizations/[id]/approve`** ⚠️
   - Anyone could approve organizations!
   - Use: `SecurityPresets.adminWrite`

4. **`/api/organization/elections/assign`** ⚠️
   - Anyone could assign voters!
   - Use: `SecurityPresets.organizationWrite`

5. **`/api/user/password`** ⚠️
   - Anyone could change passwords!
   - Use: `SecurityPresets.userProfile` with audit logging

---

## 📞 Need Help?

If you run into issues:
1. Check `API_SECURITY.md` for detailed docs
2. Look at `/api/organization/elections/[id]/route.ts` as reference
3. Check console for security middleware errors
4. Verify JWT_SECRET is set in environment variables

---

## ✨ After Securing All Endpoints

Once all endpoints are secured:

1. ✅ Build and deploy: `npm run build && git push`
2. ✅ Test authentication flows
3. ✅ Test rate limiting (make 100+ requests)
4. ✅ Test role-based access (try accessing admin as voter)
5. ✅ Check audit logs in database
6. ✅ Monitor rate limit violations
7. ✅ Celebrate! 🎉

---

**Start with the 5 critical endpoints above, then work through the rest systematically!**