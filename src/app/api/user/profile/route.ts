import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/jwt';
import prisma from '@/lib/database/client';
import { AuditService } from '@/lib/database/services/audit.service';

// GET /api/user/profile
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const verification = auth.verifyToken(token);
    if (!verification.isValid || !verification.payload) {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    }

    const userId = Number(verification.payload.userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        profileImage: true,
        role: true,
        publicKey: true,
        privateKeyEncrypted: true, // Needed for client-side signing
      }
    });

    if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal Error" }, { status: 500 });
  }
}

/**
 * PUT /api/user/profile
 * Update user profile (username, fullName, profileImage)
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
    const { username, fullName, profileImage, profileImagePath, publicKey, privateKeyEncrypted } = body;

    // Prepare update data
    const updateData: {
      username?: string;
      fullName?: string;
      profileImage?: string;
      profileImagePath?: string;
      publicKey?: string;
      privateKeyEncrypted?: string;
    } = {};

    // Organizations cannot change username
    if (username && user.role !== 'ORGANIZATION') {
      // Check if username is already taken
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json(
          { success: false, message: 'Username already taken' },
          { status: 400 }
        );
      }

      updateData.username = username;
    }

    if (fullName !== undefined) {
      updateData.fullName = fullName;
    }

    if (profileImage !== undefined) {
      updateData.profileImage = profileImage;
    }

    if (profileImagePath !== undefined) {
      updateData.profileImagePath = profileImagePath;
    }
    
    if (publicKey !== undefined) {
      updateData.publicKey = publicKey;
    }
    
    if (privateKeyEncrypted !== undefined) {
      updateData.privateKeyEncrypted = privateKeyEncrypted;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Create audit log
    await AuditService.createAuditLog(
      userId,
      'UPDATE',
      'USER_PROFILE',
      userId,
      `Updated profile: ${Object.keys(updateData).join(', ')}`,
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    );

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        profileImage: updatedUser.profileImage,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
