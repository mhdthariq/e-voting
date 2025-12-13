

interface AuthResponse {
    success: boolean;
    tokens: {
        accessToken: string;
        refreshToken: string;
    };
    user: {
        id: number;
        role: string;
        email: string;
    };
}

const BASE_URL = 'http://localhost:3000';

describe('Authentication Integration (Requires Running Server)', () => {
    let serverRunning = false;

    beforeAll(async () => {
        try {
            const res = await fetch(`${BASE_URL}/`);
            if (res.status === 200) serverRunning = true;
        } catch {
            console.warn("Server not running. Skipping integration tests.");
        }
    });

    // Valid User Credentials (from seed)
    const admin = { email: "admin@blockvote.com", password: "admin123!" };
    const voter = { email: "alice.johnson@student.edu", password: "voter123!" };

    it('should login successfully as admin', async () => {
        if (!serverRunning) return;

        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ identifier: admin.email, password: admin.password }),
            headers: { 'Content-Type': 'application/json' }
        });

        expect(res.status).toBe(200);
        const data = await res.json() as AuthResponse;
        expect(data.success).toBe(true);
        expect(data.tokens).toBeDefined();
        expect(data.user.role).toBe('ADMIN');
    });

    it('should reject invalid credentials', async () => {
        if (!serverRunning) return;

        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ identifier: admin.email, password: "wrong" }),
            headers: { 'Content-Type': 'application/json' }
        });

        expect(res.status).toBe(401);
    });

    it('should refresh tokens', async () => {
        if (!serverRunning) return;

        // Login first
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ identifier: voter.email, password: voter.password }),
            headers: { 'Content-Type': 'application/json' }
        });
        const loginData = await loginRes.json() as AuthResponse;
        const refreshToken = loginData.tokens.refreshToken;

        // Refresh
        const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
            headers: { 'Content-Type': 'application/json' }
        });

        expect(refreshRes.status).toBe(200);
        const refreshData = await refreshRes.json() as AuthResponse;
        expect(refreshData.success).toBe(true);
        expect(refreshData.tokens.accessToken).toBeDefined();
    });

    it('should enforce role-based access', async () => {
        if (!serverRunning) return;

        // Login as voter
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ identifier: voter.email, password: voter.password }),
            headers: { 'Content-Type': 'application/json' }
        });
        const loginData = await loginRes.json() as AuthResponse;
        const token = loginData.tokens.accessToken;

        // Try accessing admin endpoint
        const adminRes = await fetch(`${BASE_URL}/api/admin/audit`, {
             headers: { Authorization: `Bearer ${token}` }
        });

        expect(adminRes.status).toBe(403);
    });
});
