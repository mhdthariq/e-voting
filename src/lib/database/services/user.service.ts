/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import prisma from "../client";
import { User, UserRole, UserStatus, CreateUserRequest } from "../../../types";
import bcrypt from "bcryptjs";

export class UserService {
  // Create a new user
  static async createUser(userData: CreateUserRequest): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const user = await prisma.user.create({
      data: {
        username: userData.username,
        email: userData.email,
        passwordHash: hashedPassword,
        role: userData.role.toUpperCase() as any,
        status: "ACTIVE" as any,
      },
    });

    return this.mapPrismaUserToUser(user);
  }

  // Find user by ID
  static async findById(id: number): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    return user ? this.mapPrismaUserToUser(user) : null;
  }

  // Find user by username
  static async findByUsername(username: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    return user ? this.mapPrismaUserToUser(user) : null;
  }

  // Find user by email
  static async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    return user ? this.mapPrismaUserToUser(user) : null;
  }

  // Find user by username or email
  static async findByUsernameOrEmail(identifier: string): Promise<User | null> {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
      },
    });

    return user ? this.mapPrismaUserToUser(user) : null;
  }

  // Get all users with pagination
  static async getAllUsers(
    page: number = 1,
    limit: number = 10,
    role?: UserRole,
  ) {
    const skip = (page - 1) * limit;

    const where = role ? { role: role.toUpperCase() as any } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users.map(this.mapPrismaUserToUser),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get users by role
  static async getUsersByRole(role: UserRole): Promise<User[]> {
    const users = await prisma.user.findMany({
      where: { role: role.toUpperCase() as any },
      orderBy: { createdAt: "desc" },
    });

    return users.map(this.mapPrismaUserToUser);
  }

  // Update user profile
  static async updateUser(
    id: number,
    updateData: Partial<User>,
  ): Promise<User | null> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(updateData.username && { username: updateData.username }),
          ...(updateData.email && { email: updateData.email }),
          ...(updateData.role && {
            role: updateData.role.toUpperCase() as any,
          }),
          ...(updateData.status && {
            status: updateData.status.toUpperCase() as any,
          }),
          ...(updateData.publicKey && { publicKey: updateData.publicKey }),
          ...(updateData.privateKeyEncrypted && {
            privateKeyEncrypted: updateData.privateKeyEncrypted,
          }),
        },
      });

      return this.mapPrismaUserToUser(user);
    } catch (error) {
      return null;
    }
  }

  // Update user password
  static async updatePassword(
    id: number,
    newPassword: string,
  ): Promise<boolean> {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id },
        data: { passwordHash: hashedPassword },
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  // Update user keys (for blockchain)
  static async updateUserKeys(
    id: number,
    publicKey: string,
    privateKeyEncrypted: string,
  ): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id },
        data: {
          publicKey,
          privateKeyEncrypted,
        },
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  // Activate/Deactivate user
  static async updateUserStatus(
    id: number,
    status: UserStatus,
  ): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id },
        data: { status: status.toUpperCase() as any },
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  // Delete user (soft delete by setting status to inactive)
  static async deleteUser(id: number): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id },
        data: { status: "INACTIVE" as any },
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  // Hard delete user (permanent deletion)
  static async hardDeleteUser(id: number): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  // Check if username exists
  static async usernameExists(
    username: string,
    excludeId?: number,
  ): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: {
        username,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    return !!user;
  }

  // Check if email exists
  static async emailExists(
    email: string,
    excludeId?: number,
  ): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: {
        email,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    return !!user;
  }

  // Verify user password
  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.passwordHash);
  }

  // Get user statistics
  static async getUserStatistics() {
    const [total, admins, organizations, voters, active, inactive] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: "ADMIN" } }),
        prisma.user.count({ where: { role: "ORGANIZATION" } }),
        prisma.user.count({ where: { role: "VOTER" } }),
        prisma.user.count({ where: { status: "ACTIVE" } }),
        prisma.user.count({ where: { status: "INACTIVE" } }),
      ]);

    return {
      total,
      byRole: {
        admins,
        organizations,
        voters,
      },
      byStatus: {
        active,
        inactive,
      },
    };
  }

  // Search users
  static async searchUsers(
    query: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { username: { contains: query, mode: "insensitive" as const } },
        { email: { contains: query, mode: "insensitive" as const } },
      ],
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users.map(this.mapPrismaUserToUser),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Helper method to map Prisma user to application User type
  private static mapPrismaUserToUser(prismaUser: any): User {
    return {
      id: prismaUser.id,
      username: prismaUser.username,
      email: prismaUser.email,
      passwordHash: prismaUser.passwordHash,
      role: prismaUser.role.toLowerCase() as UserRole,
      publicKey: prismaUser.publicKey,
      privateKeyEncrypted: prismaUser.privateKeyEncrypted,
      status: prismaUser.status.toLowerCase() as UserStatus,
      firstName: undefined,
      lastName: undefined,
      organizationName: undefined,
      isActive: prismaUser.status.toLowerCase() === "active",
      lastLoginAt: undefined,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
  }
}
