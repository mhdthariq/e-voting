/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from "../client";
import {
  Block,
  BlockchainBlock,
  VoteTransaction,
  BlockchainValidationResult,
} from "../../../types";

export class BlockchainService {
  // Create a new blockchain block
  static async createBlock(blockData: Block): Promise<BlockchainBlock | null> {
    try {
      const block = await prisma.blockchainBlock.create({
        data: {
          blockIndex: blockData.index,
          previousHash: blockData.previousHash,
          merkleRoot: blockData.merkleRoot,
          timestamp: blockData.timestamp,
          electionId: blockData.electionId,
          nonce: blockData.nonce,
          hash: blockData.hash,
          votesData: JSON.stringify(blockData.votes),
        },
      });

      return this.mapPrismaBlockToBlockchainBlock(block);
    } catch (error) {
      console.error("Error creating blockchain block:", error);
      return null;
    }
  }

  // Get block by hash
  static async getBlockByHash(hash: string): Promise<BlockchainBlock | null> {
    const block = await prisma.blockchainBlock.findUnique({
      where: { hash },
      include: {
        election: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    return block ? this.mapPrismaBlockToBlockchainBlock(block) : null;
  }

  // Get block by index and election
  static async getBlockByIndex(
    electionId: number,
    blockIndex: number,
  ): Promise<BlockchainBlock | null> {
    const block = await prisma.blockchainBlock.findUnique({
      where: {
        electionId_blockIndex: {
          electionId,
          blockIndex,
        },
      },
      include: {
        election: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    return block ? this.mapPrismaBlockToBlockchainBlock(block) : null;
  }

  // Get all blocks for an election
  static async getBlocksByElection(
    electionId: number,
  ): Promise<BlockchainBlock[]> {
    const blocks = await prisma.blockchainBlock.findMany({
      where: { electionId },
      orderBy: { blockIndex: "asc" },
      include: {
        election: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    return blocks.map(this.mapPrismaBlockToBlockchainBlock);
  }

  // Get blockchain for election (all blocks in order)
  static async getBlockchain(electionId: number): Promise<Block[]> {
    const blocks = await prisma.blockchainBlock.findMany({
      where: { electionId },
      orderBy: { blockIndex: "asc" },
    });

    return blocks.map((block) => ({
      index: block.blockIndex,
      previousHash: block.previousHash,
      merkleRoot: block.merkleRoot,
      timestamp: block.timestamp,
      electionId: block.electionId,
      nonce: block.nonce,
      hash: block.hash,
      votes: JSON.parse(block.votesData) as VoteTransaction[],
    }));
  }

  // Get latest block for election
  static async getLatestBlock(
    electionId: number,
  ): Promise<BlockchainBlock | null> {
    const block = await prisma.blockchainBlock.findFirst({
      where: { electionId },
      orderBy: { blockIndex: "desc" },
      include: {
        election: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    return block ? this.mapPrismaBlockToBlockchainBlock(block) : null;
  }

  // Get block count for election
  static async getBlockCount(electionId: number): Promise<number> {
    return await prisma.blockchainBlock.count({
      where: { electionId },
    });
  }

  // Validate blockchain integrity for an election
  static async validateBlockchain(
    electionId: number,
  ): Promise<BlockchainValidationResult> {
    try {
      const blocks = await this.getBlockchain(electionId);

      if (blocks.length === 0) {
        return {
          isValid: true,
          errors: [],
          totalBlocks: 0,
          validBlocks: 0,
        };
      }

      const errors: string[] = [];
      let validBlocks = 0;

      // Validate each block
      for (let i = 0; i < blocks.length; i++) {
        const currentBlock = blocks[i];
        const blockErrors: string[] = [];

        // Check block index sequence
        if (currentBlock.index !== i) {
          blockErrors.push(
            `Block ${i}: Invalid index (expected ${i}, got ${currentBlock.index})`,
          );
        }

        // Check previous hash (skip for genesis block)
        if (i > 0) {
          const previousBlock = blocks[i - 1];
          if (currentBlock.previousHash !== previousBlock.hash) {
            blockErrors.push(`Block ${i}: Invalid previous hash`);
          }
        } else {
          // Genesis block should have empty previous hash
          if (currentBlock.previousHash !== "") {
            blockErrors.push(
              `Block ${i}: Genesis block should have empty previous hash`,
            );
          }
        }

        // Validate block hash (this would require implementing the actual hash function)
        // For now, we'll just check if hash exists and is not empty
        if (!currentBlock.hash || currentBlock.hash.length === 0) {
          blockErrors.push(`Block ${i}: Invalid or missing hash`);
        }

        // Validate merkle root (basic check)
        if (!currentBlock.merkleRoot || currentBlock.merkleRoot.length === 0) {
          blockErrors.push(`Block ${i}: Invalid or missing merkle root`);
        }

        // Validate votes data
        if (!currentBlock.votes || !Array.isArray(currentBlock.votes)) {
          blockErrors.push(`Block ${i}: Invalid votes data`);
        }

        if (blockErrors.length === 0) {
          validBlocks++;
        } else {
          errors.push(...blockErrors);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        totalBlocks: blocks.length,
        validBlocks,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Blockchain validation failed: ${(error as Error).message}`],
        totalBlocks: 0,
        validBlocks: 0,
      };
    }
  }

  // Get blockchain statistics
  static async getBlockchainStatistics(electionId?: number) {
    const where = electionId ? { electionId } : {};

    const [totalBlocks, totalVotes, averageBlockSize] = await Promise.all([
      prisma.blockchainBlock.count({ where }),

      // Count total votes across all blocks
      prisma.blockchainBlock.findMany({ where }).then((blocks) =>
        blocks.reduce((total, block) => {
          const votes = JSON.parse(block.votesData) as VoteTransaction[];
          return total + votes.length;
        }, 0),
      ),

      // Calculate average block size
      prisma.blockchainBlock.findMany({ where }).then((blocks) => {
        if (blocks.length === 0) return 0;
        const totalSize = blocks.reduce((total, block) => {
          const votes = JSON.parse(block.votesData) as VoteTransaction[];
          return total + votes.length;
        }, 0);
        return totalSize / blocks.length;
      }),
    ]);

    return {
      totalBlocks,
      totalVotes,
      averageBlockSize,
    };
  }

  // Search blocks by hash or index
  static async searchBlocks(
    query: string,
    electionId?: number,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;
    const isNumeric = !isNaN(Number(query));

    const where = {
      ...(electionId && { electionId }),
      OR: [
        { hash: { contains: query } },
        ...(isNumeric ? [{ blockIndex: Number(query) }] : []),
      ],
    };

    const [blocks, total] = await Promise.all([
      prisma.blockchainBlock.findMany({
        where,
        skip,
        take: limit,
        orderBy: { blockIndex: "desc" },
        include: {
          election: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      }),
      prisma.blockchainBlock.count({ where }),
    ]);

    return {
      data: blocks.map(this.mapPrismaBlockToBlockchainBlock),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get blocks with pagination
  static async getBlocks(
    page: number = 1,
    limit: number = 10,
    electionId?: number,
  ) {
    const skip = (page - 1) * limit;
    const where = electionId ? { electionId } : {};

    const [blocks, total] = await Promise.all([
      prisma.blockchainBlock.findMany({
        where,
        skip,
        take: limit,
        orderBy: { blockIndex: "desc" },
        include: {
          election: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      }),
      prisma.blockchainBlock.count({ where }),
    ]);

    return {
      data: blocks.map(this.mapPrismaBlockToBlockchainBlock),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Delete blockchain for election (use with extreme caution)
  static async deleteBlockchain(electionId: number): Promise<boolean> {
    try {
      await prisma.blockchainBlock.deleteMany({
        where: { electionId },
      });

      return true;
    } catch (error) {
      console.error("Error deleting blockchain:", error);
      return false;
    }
  }

  // Get block by ID
  static async getBlockById(id: number): Promise<BlockchainBlock | null> {
    const block = await prisma.blockchainBlock.findUnique({
      where: { id },
      include: {
        election: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    return block ? this.mapPrismaBlockToBlockchainBlock(block) : null;
  }

  // Get votes from block
  static async getVotesFromBlock(
    blockHash: string,
  ): Promise<VoteTransaction[]> {
    const block = await prisma.blockchainBlock.findUnique({
      where: { hash: blockHash },
    });

    if (!block) {
      return [];
    }

    return JSON.parse(block.votesData) as VoteTransaction[];
  }

  // Check if block exists
  static async blockExists(hash: string): Promise<boolean> {
    const block = await prisma.blockchainBlock.findUnique({
      where: { hash },
    });

    return !!block;
  }

  // Get blockchain health status
  static async getBlockchainHealth(electionId?: number): Promise<{
    isHealthy: boolean;
    totalBlocks: number;
    lastBlockTime?: Date;
    averageBlockTime: number;
    issues: string[];
  }> {
    const where = electionId ? { electionId } : {};
    const issues: string[] = [];

    const [blocks, totalBlocks] = await Promise.all([
      prisma.blockchainBlock.findMany({
        where,
        orderBy: { blockIndex: "asc" },
        select: {
          timestamp: true,
          blockIndex: true,
          hash: true,
        },
      }),
      prisma.blockchainBlock.count({ where }),
    ]);

    let averageBlockTime = 0;
    let lastBlockTime: Date | undefined;

    if (blocks.length > 0) {
      lastBlockTime = blocks[blocks.length - 1].timestamp;

      // Calculate average time between blocks
      if (blocks.length > 1) {
        let totalTimeDiff = 0;
        for (let i = 1; i < blocks.length; i++) {
          const timeDiff =
            blocks[i].timestamp.getTime() - blocks[i - 1].timestamp.getTime();
          totalTimeDiff += timeDiff;
        }
        averageBlockTime = totalTimeDiff / (blocks.length - 1);
      }

      // Check for gaps in block sequence
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].blockIndex !== i) {
          issues.push(`Missing block at index ${i}`);
        }
      }
    }

    return {
      isHealthy: issues.length === 0,
      totalBlocks,
      lastBlockTime,
      averageBlockTime,
      issues,
    };
  }

  // Helper method to map Prisma block to BlockchainBlock type
  private static mapPrismaBlockToBlockchainBlock(
    prismaBlock: any,
  ): BlockchainBlock {
    return {
      id: prismaBlock.id,
      blockIndex: prismaBlock.blockIndex,
      previousHash: prismaBlock.previousHash,
      merkleRoot: prismaBlock.merkleRoot,
      timestamp: prismaBlock.timestamp,
      electionId: prismaBlock.electionId,
      nonce: prismaBlock.nonce,
      hash: prismaBlock.hash,
      votesData: prismaBlock.votesData,
      createdAt: prismaBlock.createdAt,
    };
  }
}
