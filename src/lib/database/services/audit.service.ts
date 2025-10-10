import prisma from "../client";
import { UserService } from "./user.service";

export interface AuditLogEntry {
  id: number;
  userId: number;
  action: string;
  resource: string;
  resourceId: number | null;
  details: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

export interface AuditLogQuery {
  userId?: number;
  action?: string;
  resource?: string;
  resourceId?: number;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
}

export class AuditService {
  // Create audit log entry
  static async createAuditLog(
    userId: number,
    action: string,
    resource: string,
    resourceId?: number,
    details?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId,
          details: details || "",
          ipAddress: ipAddress || "unknown",
          userAgent: userAgent || "unknown",
        },
      });
    } catch (error) {
      console.error("Failed to create audit log:", error);
      // Don't throw error to avoid disrupting the main operation
    }
  }

  // Get audit logs with pagination and filtering
  static async getAuditLogs(
    page: number = 1,
    limit: number = 50,
    query?: AuditLogQuery,
  ) {
    const skip = (page - 1) * limit;

    const where: {
      userId?: number;
      action?: string;
      resource?: string;
      resourceId?: number;
      ipAddress?: { contains: string };
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (query) {
      if (query.userId) where.userId = query.userId;
      if (query.action) where.action = query.action;
      if (query.resource) where.resource = query.resource;
      if (query.resourceId) where.resourceId = query.resourceId;
      if (query.ipAddress) where.ipAddress = { contains: query.ipAddress };

      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) where.createdAt.gte = query.startDate;
        if (query.endDate) where.createdAt.lte = query.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs.map((log) => ({
        ...log,
        user: log.user
          ? {
              ...log.user,
              role: log.user.role.toLowerCase(),
            }
          : undefined,
      })) as AuditLogEntry[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get audit logs for a specific user
  static async getUserAuditLogs(
    userId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    return this.getAuditLogs(page, limit, { userId });
  }

  // Get audit logs for a specific resource
  static async getResourceAuditLogs(
    resource: string,
    resourceId?: number,
    page: number = 1,
    limit: number = 20,
  ) {
    return this.getAuditLogs(page, limit, { resource, resourceId });
  }

  // Get recent audit logs (last 24 hours)
  static async getRecentAuditLogs(limit: number = 100) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return this.getAuditLogs(1, limit, { startDate: yesterday });
  }

  // Get audit log statistics
  static async getAuditStatistics(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalLogs,
      userLogins,
      userLogouts,
      tokenRefreshes,
      userCreations,
      userUpdates,
      electionActions,
      voteActions,
    ] = await Promise.all([
      prisma.auditLog.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.auditLog.count({
        where: {
          action: "USER_LOGIN",
          createdAt: { gte: startDate },
        },
      }),
      prisma.auditLog.count({
        where: {
          action: "USER_LOGOUT",
          createdAt: { gte: startDate },
        },
      }),
      prisma.auditLog.count({
        where: {
          action: "TOKEN_REFRESH",
          createdAt: { gte: startDate },
        },
      }),
      prisma.auditLog.count({
        where: {
          action: "USER_CREATE",
          createdAt: { gte: startDate },
        },
      }),
      prisma.auditLog.count({
        where: {
          action: "USER_UPDATE",
          createdAt: { gte: startDate },
        },
      }),
      prisma.auditLog.count({
        where: {
          resource: "ELECTION",
          createdAt: { gte: startDate },
        },
      }),
      prisma.auditLog.count({
        where: {
          resource: "VOTE",
          createdAt: { gte: startDate },
        },
      }),
    ]);

    return {
      period: `Last ${days} days`,
      totalLogs,
      actionBreakdown: {
        userLogins,
        userLogouts,
        tokenRefreshes,
        userCreations,
        userUpdates,
      },
      resourceBreakdown: {
        electionActions,
        voteActions,
        userActions:
          userLogins +
          userLogouts +
          tokenRefreshes +
          userCreations +
          userUpdates,
      },
    };
  }

  // Get top users by activity
  static async getTopUsersByActivity(limit: number = 10, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const userActivity = await prisma.auditLog.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: startDate },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: limit,
    });

    // Get user details for each active user
    const usersWithActivity = await Promise.all(
      userActivity.map(async (activity) => {
        const user = await UserService.findById(activity.userId);
        return {
          user: user
            ? {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
              }
            : null,
          activityCount: activity._count.id,
        };
      }),
    );

    return usersWithActivity.filter((item) => item.user !== null);
  }

  // Delete old audit logs (for maintenance)
  static async deleteOldAuditLogs(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      const result = await prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });

      return result.count;
    } catch (error) {
      console.error("Failed to delete old audit logs:", error);
      return 0;
    }
  }

  // Export audit logs to JSON
  static async exportAuditLogs(
    query?: AuditLogQuery,
    includeUser: boolean = true,
  ): Promise<AuditLogEntry[]> {
    const where: {
      userId?: number;
      action?: string;
      resource?: string;
      resourceId?: number;
      ipAddress?: { contains: string };
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (query) {
      if (query.userId) where.userId = query.userId;
      if (query.action) where.action = query.action;
      if (query.resource) where.resource = query.resource;
      if (query.resourceId) where.resourceId = query.resourceId;
      if (query.ipAddress) where.ipAddress = { contains: query.ipAddress };

      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) where.createdAt.gte = query.startDate;
        if (query.endDate) where.createdAt.lte = query.endDate;
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: includeUser
        ? {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                role: true,
              },
            },
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });

    return logs.map((log) => {
      const logWithUser = log as typeof log & {
        user?: {
          id: number;
          username: string;
          email: string;
          role: string;
        };
      };

      return {
        ...log,
        user: logWithUser.user
          ? {
              ...logWithUser.user,
              role: logWithUser.user.role.toLowerCase(),
            }
          : undefined,
      };
    }) as AuditLogEntry[];
  }

  // Audit log helper methods for common actions
  static async logUserLogin(
    userId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.createAuditLog(
      userId,
      "USER_LOGIN",
      "USER",
      userId,
      "User logged in successfully",
      ipAddress,
      userAgent,
    );
  }

  static async logUserLogout(
    userId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.createAuditLog(
      userId,
      "USER_LOGOUT",
      "USER",
      userId,
      "User logged out successfully",
      ipAddress,
      userAgent,
    );
  }

  static async logTokenRefresh(
    userId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.createAuditLog(
      userId,
      "TOKEN_REFRESH",
      "USER",
      userId,
      "User refreshed authentication token",
      ipAddress,
      userAgent,
    );
  }

  static async logUserCreation(
    createdByUserId: number,
    newUserId: number,
    details?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.createAuditLog(
      createdByUserId,
      "USER_CREATE",
      "USER",
      newUserId,
      details || "New user account created",
      ipAddress,
      userAgent,
    );
  }

  static async logUserUpdate(
    updatedByUserId: number,
    targetUserId: number,
    details?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.createAuditLog(
      updatedByUserId,
      "USER_UPDATE",
      "USER",
      targetUserId,
      details || "User account updated",
      ipAddress,
      userAgent,
    );
  }

  static async logElectionAction(
    userId: number,
    action: string,
    electionId: number,
    details?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.createAuditLog(
      userId,
      action,
      "ELECTION",
      electionId,
      details,
      ipAddress,
      userAgent,
    );
  }

  static async logVoteAction(
    userId: number,
    action: string,
    voteId?: number,
    details?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.createAuditLog(
      userId,
      action,
      "VOTE",
      voteId,
      details,
      ipAddress,
      userAgent,
    );
  }
}
