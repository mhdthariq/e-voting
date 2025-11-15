import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database/client';
import { log } from '@/utils/logger';

/**
 * POST /api/auth/verify-email
 * Verify user email and activate account
 * Works with both Supabase and manual token verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, token, type } = body;

    let user;

    // Supabase verification (has userId and email)
    if (userId && email) {
      user = await prisma.user.findFirst({
        where: {
          id: parseInt(userId),
          email: email,
        },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }

      // Activate user account
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          status: 'ACTIVE',
          emailVerificationToken: null,
        },
      });

      log.auth('User email verified via Supabase', {
        userId: user.id,
        email: user.email,
      });

      return NextResponse.json({
        success: true,
        message: 'Email verified successfully',
      });
    }

    // Manual token verification (fallback)
    if (token) {
      user = await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
        },
      });

      if (!user) {
        log.security('Invalid email verification token used', { token: token.substring(0, 8) + '...' });
        return NextResponse.json(
          { success: false, message: 'Invalid or expired verification token' },
          { status: 400 }
        );
      }

      // Check if already verified
      if (user.emailVerified && user.status === 'ACTIVE') {
        return NextResponse.json({
          success: true,
          message: 'Email already verified. You can now login.',
        });
      }

      // Activate account
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          status: 'ACTIVE',
          emailVerificationToken: null,
        },
      });

      log.auth('User email verified via manual token', {
        userId: user.id,
        email: user.email,
      });

      return NextResponse.json({
        success: true,
        message: 'Email verified successfully! Your account is now active.',
      });
    }

    return NextResponse.json(
      { success: false, message: 'Missing verification data' },
      { status: 400 }
    );
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
