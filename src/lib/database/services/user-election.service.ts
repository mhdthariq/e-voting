/**
 * User Election Service for BlockVote
 * Manages user participation in elections, invitations, and voting tracking
 */

import prisma from "../client";
import { UserElectionParticipation, VoterInviteStatus } from "../../../types";
import { log } from "../../../utils/logger";

export class UserElectionService {
  /**
   * Invite a user to participate in an election
   */
  static async inviteUserToElection(
    userId: number,
    electionId: number,
    invitedBy: number,
  ): Promise<UserElectionParticipation | null> {
    try {
      // Check if user is already invited
      const existing = await prisma.userElectionParticipation.findUnique({
        where: {
          userId_electionId: {
            userId,
            electionId,
          },
        },
      });

      if (existing) {
        throw new Error("User is already invited to this election");
      }

      // Create invitation
      const participation = await prisma.userElectionParticipation.create({
        data: {
          userId,
          electionId,
          inviteStatus: "PENDING",
          hasVoted: false,
          invitedAt: new Date(),
        },
      });

      // Log the invitation
      log.info("User invited to election", "USER_ELECTION", {
        userId,
        electionId,
        invitedBy,
      });

      return this.mapPrismaToParticipation(participation);
    } catch (error) {
      log.exception(error as Error, "USER_ELECTION", {
        operation: "inviteUserToElection",
        userId,
        electionId,
      });
      return null;
    }
  }

  /**
   * Get all elections for a user (invited, voted, available)
   */
  static async getUserElections(userId: number) {
    try {
      const participations = await prisma.userElectionParticipation.findMany({
        where: { userId },
        include: {
          election: {
            include: {
              organization: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
              _count: {
                select: {
                  votes: true,
                  voters: true,
                },
              },
            },
          },
        },
        orderBy: { invitedAt: "desc" },
      });

      // Also get all active elections that user could potentially see
      const activeElections = await prisma.election.findMany({
        where: {
          status: "ACTIVE",
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
        include: {
          organization: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          _count: {
            select: {
              votes: true,
              voters: true,
            },
          },
        },
      });

      return {
        participations: participations.map((p) => ({
          ...this.mapPrismaToParticipation(p),
          election: p.election,
        })),
        activeElections,
      };
    } catch (error) {
      log.exception(error as Error, "USER_ELECTION", {
        operation: "getUserElections",
        userId,
      });
      throw error;
    }
  }

  /**
   * Accept invitation to participate in an election
   */
  static async acceptInvitation(
    userId: number,
    electionId: number,
  ): Promise<boolean> {
    try {
      await prisma.userElectionParticipation.update({
        where: {
          userId_electionId: {
            userId,
            electionId,
          },
        },
        data: {
          inviteStatus: "ACCEPTED",
          respondedAt: new Date(),
        },
      });

      log.info("User accepted election invitation", "USER_ELECTION", {
        userId,
        electionId,
      });

      return true;
    } catch (error) {
      log.exception(error as Error, "USER_ELECTION", {
        operation: "acceptInvitation",
        userId,
        electionId,
      });
      return false;
    }
  }

  /**
   * Decline invitation to participate in an election
   */
  static async declineInvitation(
    userId: number,
    electionId: number,
  ): Promise<boolean> {
    try {
      await prisma.userElectionParticipation.update({
        where: {
          userId_electionId: {
            userId,
            electionId,
          },
        },
        data: {
          inviteStatus: "DECLINED",
          respondedAt: new Date(),
        },
      });

      log.info("User declined election invitation", "USER_ELECTION", {
        userId,
        electionId,
      });

      return true;
    } catch (error) {
      log.exception(error as Error, "USER_ELECTION", {
        operation: "declineInvitation",
        userId,
        electionId,
      });
      return false;
    }
  }

  /**
   * Mark user as having voted in an election
   */
  static async markUserAsVoted(
    userId: number,
    electionId: number,
  ): Promise<boolean> {
    try {
      await prisma.userElectionParticipation.upsert({
        where: {
          userId_electionId: {
            userId,
            electionId,
          },
        },
        update: {
          hasVoted: true,
          votedAt: new Date(),
        },
        create: {
          userId,
          electionId,
          inviteStatus: "ACCEPTED",
          hasVoted: true,
          votedAt: new Date(),
          invitedAt: new Date(),
        },
      });

      log.info("User marked as voted", "USER_ELECTION", {
        userId,
        electionId,
      });

      return true;
    } catch (error) {
      log.exception(error as Error, "USER_ELECTION", {
        operation: "markUserAsVoted",
        userId,
        electionId,
      });
      return false;
    }
  }

  /**
   * Get election participation statistics
   */
  static async getElectionParticipationStats(electionId: number) {
    try {
      const stats = await prisma.userElectionParticipation.groupBy({
        by: ["inviteStatus", "hasVoted"],
        where: { electionId },
        _count: true,
      });

      const totalInvited = await prisma.userElectionParticipation.count({
        where: { electionId },
      });

      const totalVoted = await prisma.userElectionParticipation.count({
        where: { electionId, hasVoted: true },
      });

      return {
        totalInvited,
        totalVoted,
        participationRate:
          totalInvited > 0 ? (totalVoted / totalInvited) * 100 : 0,
        breakdown: stats.reduce(
          (acc, stat) => {
            const key = `${stat.inviteStatus}_${stat.hasVoted ? "voted" : "not_voted"}`;
            acc[key] = stat._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
      };
    } catch (error) {
      log.exception(error as Error, "USER_ELECTION", {
        operation: "getElectionParticipationStats",
        electionId,
      });
      throw error;
    }
  }

  /**
   * Get user's voting history
   */
  static async getUserVotingHistory(userId: number) {
    try {
      const history = await prisma.userElectionParticipation.findMany({
        where: {
          userId,
          hasVoted: true,
        },
        include: {
          election: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              startDate: true,
              endDate: true,
              organization: {
                select: {
                  username: true,
                },
              },
            },
          },
        },
        orderBy: { votedAt: "desc" },
      });

      return history.map((record) => ({
        ...this.mapPrismaToParticipation(record),
        election: record.election,
      }));
    } catch (error) {
      log.exception(error as Error, "USER_ELECTION", {
        operation: "getUserVotingHistory",
        userId,
      });
      throw error;
    }
  }

  /**
   * Bulk invite users to an election
   */
  static async bulkInviteUsers(
    userIds: number[],
    electionId: number,
    invitedBy: number,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        await this.inviteUserToElection(userId, electionId, invitedBy);
        success++;
      } catch (error) {
        failed++;
        log.error("Failed to invite user in bulk operation", "USER_ELECTION", {
          userId,
          electionId,
          error: (error as Error).message,
        });
      }
    }

    log.info("Bulk invitation completed", "USER_ELECTION", {
      electionId,
      invitedBy,
      totalUsers: userIds.length,
      success,
      failed,
    });

    return { success, failed };
  }

  /**
   * Check if user can vote in an election
   */
  static async canUserVote(
    userId: number,
    electionId: number,
  ): Promise<boolean> {
    try {
      // Check if election is active
      const election = await prisma.election.findFirst({
        where: {
          id: electionId,
          status: "ACTIVE",
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      });

      if (!election) {
        return false;
      }

      // Check if user is invited and hasn't voted yet
      const participation = await prisma.userElectionParticipation.findUnique({
        where: {
          userId_electionId: {
            userId,
            electionId,
          },
        },
      });

      // User can vote if:
      // 1. They are invited and accepted
      // 2. They haven't voted yet
      return (
        participation?.inviteStatus === "ACCEPTED" && !participation.hasVoted
      );
    } catch (error) {
      log.exception(error as Error, "USER_ELECTION", {
        operation: "canUserVote",
        userId,
        electionId,
      });
      return false;
    }
  }

  /**
   * Get pending invitations for a user
   */
  static async getUserPendingInvitations(userId: number) {
    try {
      const pendingInvitations =
        await prisma.userElectionParticipation.findMany({
          where: {
            userId,
            inviteStatus: "PENDING",
          },
          include: {
            election: {
              include: {
                organization: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { invitedAt: "desc" },
        });

      return pendingInvitations.map((invitation) => ({
        ...this.mapPrismaToParticipation(invitation),
        election: invitation.election,
      }));
    } catch (error) {
      log.exception(error as Error, "USER_ELECTION", {
        operation: "getUserPendingInvitations",
        userId,
      });
      throw error;
    }
  }

  /**
   * Helper method to map Prisma model to application type
   */
  private static mapPrismaToParticipation(prismaRecord: {
    id: number;
    userId: number;
    electionId: number;
    inviteStatus: string;
    hasVoted: boolean;
    invitedAt: Date;
    respondedAt: Date | null;
    votedAt: Date | null;
    notificationSent: boolean;
  }): UserElectionParticipation {
    return {
      id: prismaRecord.id,
      userId: prismaRecord.userId,
      electionId: prismaRecord.electionId,
      inviteStatus:
        prismaRecord.inviteStatus.toLowerCase() as VoterInviteStatus,
      hasVoted: prismaRecord.hasVoted,
      invitedAt: prismaRecord.invitedAt,
      respondedAt: prismaRecord.respondedAt || undefined,
      votedAt: prismaRecord.votedAt || undefined,
      notificationSent: prismaRecord.notificationSent,
    };
  }
}
