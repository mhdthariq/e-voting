import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/jwt';
import { password } from '@/lib/auth/password';
import prisma from '@/lib/database/client';
import { AuditService } from '@/lib/database/services/audit.service';

/**
 * PUT /api/user/password
 * Change user password
 */
export async function PUT(request: NextRequest) {
  try {
    // Get token from cookie or header
    let token = null;
    const authHeader = request.headers.get('authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader
          .split(';')
          .map((c) => c.trim())
          .reduce(
            (acc, cookie) => {
              const [key, value] = cookie.split('=');
              if (key && value) {
                acc[key] = decodeURIComponent(value);
              }
              return acc;
            },
            {} as Record<string, string>,
          );
        token = cookies.accessToken;
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify token
    const tokenResult = auth.verifyToken(token);
    if (!tokenResult.isValid || !tokenResult.payload?.userId) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = parseInt(tokenResult.payload.userId);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    // Verify current password
    const isValidPassword = await password.verify(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Validate new password
    const passwordValidation = password.validate(newPassword);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: `Password validation failed: ${passwordValidation.feedback.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await password.hash(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    // Create audit log
    await AuditService.createAuditLog(
      userId,
      'UPDATE',
      'USER_PASSWORD',
      userId,
      'Password changed successfully',
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
