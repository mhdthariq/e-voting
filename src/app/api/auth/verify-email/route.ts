import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database/client';
import { supabase } from '@/lib/supabase/client';
import { log } from '@/utils/logger';

/**
 * POST /api/auth/verify-email
 * Verify user email and activate account
 * STRICTLY uses Supabase Auth Token verification
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Get the Authorization Header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
       return NextResponse.json(
        { success: false, message: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // 2. Verify Token with Supabase
    // We use getUser() which validates the JWT signature and expiration
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
    
    if (error || !supabaseUser || !supabaseUser.email) {
      log.security('Failed email verification attempt: Invalid Supabase Token', { error: error?.message });
      return NextResponse.json(
        { success: false, message: 'Invalid or expired verification session' },
        { status: 401 }
      );
    }
    
    // 3. Find User in Our Database
    // We trust the email from the validated Supabase Token
    const user = await prisma.user.findUnique({
      where: { email: supabaseUser.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User account not found' },
        { status: 404 }
      );
    }

    // 4. Activate User if needed
    if (!user.emailVerified || user.status !== 'ACTIVE') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          status: 'ACTIVE',
          emailVerificationToken: null, // Clear any legacy manual tokens
        },
      });

      log.auth('User email verified via Secure Supabase JWT', {
        userId: user.id,
        email: user.email,
        supabaseId: supabaseUser.id
      });
    } else {
        log.info('User already verified, skipping update', 'AUTH', { userId: user.id });
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! Your account is now active.',
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });

  } catch (error) {
    log.exception(error as Error, 'AUTH', {
      operation: 'emailVerification',
    });

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
