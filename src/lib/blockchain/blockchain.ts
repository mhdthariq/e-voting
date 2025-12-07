import fs from "fs";
import path from "path";
import { Block } from "./block";
import { CryptoUtils, BlockchainSecurity } from "./crypto-utils";
import { FileMutex } from "../utils/mutex";
// MerkleTree import removed as it's not used directly in this file
import { VoteTransaction, BlockchainValidationResult } from "../../types";

/**
 * Blockchain class manages the entire blockchain for the voting system
 * Implements security measures to prevent hash injection and maintain integrity
 */
export class Blockchain {
  private chain: Block[] = [];
  private pendingVotes: VoteTransaction[] = [];
  private difficulty: number = 2;
  private maxVotesPerBlock: number = 100;
  private storagePath: string;
  private mutex: FileMutex;

  constructor(
    electionId: number,
    difficulty: number = 2,
    storagePath: string = "./data/blockchain",
  ) {
    this.difficulty = difficulty;
    this.storagePath = storagePath;
    this.mutex = new FileMutex(`election-${electionId}`, storagePath);

    // Initialize with genesis block
    this.createGenesisBlock(electionId);

    // Ensure storage directory exists
    this.ensureStorageDirectory();
  }

  /**
   * Create the genesis block (first block in chain)
   */
  private createGenesisBlock(electionId: number): void {
    const genesisBlock = Block.createGenesisBlock(electionId);
    this.chain.push(genesisBlock);
    console.log("Genesis block created for election:", electionId);
  }

  /**
   * Get the latest block in the chain
   */
  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Get the entire blockchain
   */
  getChain(): Block[] {
    return [...this.chain]; // Return copy to prevent external modification
  }

  /**
   * Get blockchain length
   */
  getLength(): number {
    return this.chain.length;
  }

  /**
   * Add a vote transaction to pending votes
   * NOW ASYNC with Mutex locking
   */
  async addVoteTransaction(vote: VoteTransaction): Promise<boolean> {
    return await this.mutex.run(async () => {
      try {
        // Reload chain from storage to ensure we have latest state (concurrency check)
        this.reloadFromStorage();

        // Validate vote format
        if (!this.validateVoteFormat(vote)) {
          console.error("Invalid vote format");
          return false;
        }

        // Check if voter has already voted
        if (this.hasVoterAlreadyVoted(vote.voterPublicKey, vote.electionId)) {
          console.error("Voter has already voted in this election");
          return false;
        }

        // Validate vote signature
        if (!BlockchainSecurity.validateVoteSignature(vote)) {
          console.error("Invalid vote signature");
          return false;
        }

        // Add to pending votes
        this.pendingVotes.push(vote);
        console.log(
          `Vote transaction added for voter: ${vote.voterPublicKey.substring(0, 10)}...`,
        );

        // Auto-mine block if we have enough votes
        if (this.pendingVotes.length >= this.maxVotesPerBlock) {
          this.mineBlock();
        } else {
            // Save pending votes even if not mining yet
            this.saveToStorage();
        }

        return true;
      } catch (error) {
        console.error("Error adding vote transaction:", error);
        return false;
      }
    });
  }

  // Ensure internal reload doesn't break if file missing
  private reloadFromStorage() {
      const loaded = Blockchain.loadFromStorage(this.storagePath);
      if (loaded) {
          this.chain = loaded.chain;
          this.pendingVotes = loaded.pendingVotes; // merge? simpler to replace for single-writer consistency
      }
  }

  /**
   * Check if voter has already voted in the election
   */
  private hasVoterAlreadyVoted(
    voterPublicKey: string,
    electionId: number,
  ): boolean {
    // Check pending votes
    const pendingVote = this.pendingVotes.find(
      (vote) =>
        vote.voterPublicKey === voterPublicKey &&
        vote.electionId === electionId,
    );

    if (pendingVote) {
      return true;
    }

    // Check all blocks in chain
    for (const block of this.chain) {
      const existingVote = block.votes.find(
        (vote) =>
          vote.voterPublicKey === voterPublicKey &&
          vote.electionId === electionId,
      );

      if (existingVote) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate vote transaction format
   */
  private validateVoteFormat(vote: VoteTransaction): boolean {
    return !!(
      vote.voteId &&
      typeof vote.electionId === "number" &&
      vote.voterPublicKey &&
      typeof vote.candidateId === "number" &&
      vote.timestamp instanceof Date &&
      vote.signature &&
      CryptoUtils.isValidPublicKey(vote.voterPublicKey)
    );
  }

  /**
   * Mine a new block with pending votes
   */
  mineBlock(): Block | null {
    try {
      if (this.pendingVotes.length === 0) {
        console.log("No pending votes to mine");
        return null;
      }

      const latestBlock = this.getLatestBlock();
      const newBlock = new Block(
        latestBlock.index + 1,
        latestBlock.hash,
        this.pendingVotes[0].electionId,
        [...this.pendingVotes],
      );

      // Mine the block (Proof-of-Work)
      newBlock.mineBlock(this.difficulty);

      // Validate the new block
      if (!newBlock.validateBlock(latestBlock)) {
        console.error("Newly mined block is invalid");
        return null;
      }

      // Add block to chain
      this.chain.push(newBlock);

      // Clear pending votes
      this.pendingVotes = [];

      // Save blockchain to storage
      this.saveToStorage();

      console.log(
        `Block ${newBlock.index} mined successfully with ${newBlock.votes.length} votes`,
      );
      return newBlock;
    } catch (error) {
      console.error("Error mining block:", error);
      return null;
    }
  }

  /**
   * Force mine block (for election end)
   */
  forceMinePendingVotes(): Block | null {
    if (this.pendingVotes.length === 0) {
      return null;
    }

    return this.mineBlock();
  }

  /**
   * Validate the entire blockchain
   */
  validateChain(): BlockchainValidationResult {
    const result: BlockchainValidationResult = {
      isValid: true,
      errors: [],
      totalBlocks: this.chain.length,
      validBlocks: 0,
    };

    try {
      for (let i = 0; i < this.chain.length; i++) {
        const currentBlock = this.chain[i];
        const previousBlock = i > 0 ? this.chain[i - 1] : undefined;

        // Validate block
        if (!currentBlock.validateBlock(previousBlock)) {
          result.isValid = false;
          result.errors.push(`Block ${i} is invalid`);
          continue;
        }

        // Check hash integrity
        if (!BlockchainSecurity.validateBlockHash(currentBlock)) {
          result.isValid = false;
          result.errors.push(`Block ${i} has invalid hash`);
          continue;
        }

        // Validate proof-of-work
        if (
          !BlockchainSecurity.validateProofOfWork(
            currentBlock.hash,
            this.difficulty,
          )
        ) {
          result.isValid = false;
          result.errors.push(
            `Block ${i} doesn't meet proof-of-work requirement`,
          );
          continue;
        }

        result.validBlocks++;
      }

      // Additional chain-wide validations
      if (!this.validateChainIntegrity()) {
        result.isValid = false;
        result.errors.push("Chain integrity compromised");
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation error: ${error}`);
    }

    return result;
  }

  /**
   * Validate chain integrity (no gaps, proper linking)
   */
  private validateChainIntegrity(): boolean {
    // Check genesis block
    if (this.chain.length === 0 || !this.chain[0].isGenesisBlock()) {
      return false;
    }

    // Check sequential indexing and hash linking
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      // Check sequential indexing
      if (current.index !== previous.index + 1) {
        console.error(
          `Block index gap detected: ${previous.index} -> ${current.index}`,
        );
        return false;
      }

      // Check hash linking
      if (current.previousHash !== previous.hash) {
        console.error(`Hash chain broken at block ${current.index}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Get election results from blockchain
   */
  getElectionResults(
    electionId: number,
  ): { candidateId: number; votes: number }[] {
    const voteCounts: { [candidateId: number]: number } = {};

    // Count votes from all blocks
    for (const block of this.chain) {
      for (const vote of block.votes) {
        if (vote.electionId === electionId) {
          voteCounts[vote.candidateId] =
            (voteCounts[vote.candidateId] || 0) + 1;
        }
      }
    }

    // Convert to array format
    return Object.entries(voteCounts).map(([candidateId, votes]) => ({
      candidateId: parseInt(candidateId),
      votes,
    }));
  }

  /**
   * Get total vote count for an election
   */
  getTotalVotes(electionId: number): number {
    let total = 0;

    for (const block of this.chain) {
      for (const vote of block.votes) {
        if (vote.electionId === electionId) {
          total++;
        }
      }
    }

    return total;
  }

  /**
   * Get all votes for a specific election
   */
  getElectionVotes(electionId: number): VoteTransaction[] {
    const votes: VoteTransaction[] = [];

    for (const block of this.chain) {
      for (const vote of block.votes) {
        if (vote.electionId === electionId) {
          votes.push(vote);
        }
      }
    }

    return votes;
  }

  /**
   * Get blockchain statistics
   */
  getStatistics() {
    const totalVotes = this.chain.reduce(
      (sum, block) => sum + block.votes.length,
      0,
    );
    const uniqueVoters = new Set();

    for (const block of this.chain) {
      for (const vote of block.votes) {
        uniqueVoters.add(vote.voterPublicKey);
      }
    }

    return {
      totalBlocks: this.chain.length,
      totalVotes,
      uniqueVoters: uniqueVoters.size,
      pendingVotes: this.pendingVotes.length,
      difficulty: this.difficulty,
      latestBlockHash: this.getLatestBlock().hash,
      chainValid: this.validateChain().isValid,
    };
  }

  /**
   * Detect potential security attacks
   */
  detectSecurityThreats(): string[] {
    const threats: string[] = [];

    try {
      // Check for hash injection attempts
      for (let i = 1; i < this.chain.length; i++) {
        const block = this.chain[i];
        const blockData = CryptoUtils.canonicalSerializeBlock(block);

        if (BlockchainSecurity.detectHashInjection(block.hash, blockData)) {
          threats.push(`Hash injection detected in block ${i}`);
        }
      }

      // Check for duplicate votes (replay attacks)
      const seenVotes = new Set();
      for (const block of this.chain) {
        for (const vote of block.votes) {
          const voteSignature = `${vote.voterPublicKey}-${vote.electionId}`;
          if (seenVotes.has(voteSignature)) {
            threats.push(
              `Duplicate vote detected from voter: ${vote.voterPublicKey.substring(0, 10)}...`,
            );
          }
          seenVotes.add(voteSignature);
        }
      }

      // Check for blocks with invalid proof-of-work
      for (let i = 0; i < this.chain.length; i++) {
        const block = this.chain[i];
        if (!CryptoUtils.meetsProofOfWork(block.hash, this.difficulty)) {
          threats.push(`Block ${i} has invalid proof-of-work`);
        }
      }
    } catch (error) {
      threats.push(`Security check error: ${error}`);
    }

    return threats;
  }

  /**
   * Export blockchain for backup
   */
  export(): {
    chain: ReturnType<Block["toJSON"]>[];
    pendingVotes: VoteTransaction[];
    difficulty: number;
    maxVotesPerBlock: number;
    exportedAt: string;
  } {
    return {
      chain: this.chain.map((block) => block.toJSON()),
      pendingVotes: this.pendingVotes,
      difficulty: this.difficulty,
      maxVotesPerBlock: this.maxVotesPerBlock,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Import blockchain from backup
   */
  static import(data: {
    chain: ReturnType<Block["toJSON"]>[];
    pendingVotes: VoteTransaction[];
    difficulty: number;
    maxVotesPerBlock?: number;
  }, storagePath: string = "./data/blockchain"): Blockchain {
    const blockchain = new Blockchain(0, data.difficulty, storagePath);
    blockchain.difficulty = data.difficulty;
    blockchain.maxVotesPerBlock = data.maxVotesPerBlock || 100;
    blockchain.pendingVotes = data.pendingVotes || [];

    // Import chain
    blockchain.chain = data.chain.map((blockData) => Block.fromJSON(blockData));

    return blockchain;
  }

  /**
   * Save blockchain to storage
   */
  private saveToStorage(): void {
    try {
      this.ensureStorageDirectory();
      const filePath = path.join(this.storagePath, "blockchain.json");
      const data = this.export();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log("Blockchain saved to storage");
    } catch (error) {
      console.error("Error saving blockchain:", error);
    }
  }

  /**
   * Load blockchain from storage
   */
  static loadFromStorage(storagePath: string): Blockchain | null {
    try {
      const filePath = path.join(storagePath, "blockchain.json");

      if (!fs.existsSync(filePath)) {
        console.log("No existing blockchain found");
        return null;
      }

      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const blockchain = Blockchain.import(data, storagePath);

      console.log("Blockchain loaded from storage");
      return blockchain;
    } catch (error) {
      console.error("Error loading blockchain:", error);
      return null;
    }
  }

  /**
   * Ensure storage directory exists
   */
  private ensureStorageDirectory(): void {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  /**
   * Reset blockchain (for testing)
   */
  reset(electionId: number): void {
    this.chain = [];
    this.pendingVotes = [];
    this.createGenesisBlock(electionId);
    console.log("Blockchain reset");
  }

  /**
   * Get block by index
   */
  getBlock(index: number): Block | null {
    if (index >= 0 && index < this.chain.length) {
      return this.chain[index];
    }
    return null;
  }

  /**
   * Get block by hash
   */
  getBlockByHash(hash: string): Block | null {
    return this.chain.find((block) => block.hash === hash) || null;
  }

  /**
   * Set mining difficulty
   */
  setDifficulty(difficulty: number): void {
    if (difficulty >= 1 && difficulty <= 6) {
      this.difficulty = difficulty;
      console.log(`Mining difficulty set to: ${difficulty}`);
    } else {
      console.error("Invalid difficulty. Must be between 1 and 6");
    }
  }
}

/**
 * Blockchain manager for handling multiple election blockchains
 */
export class BlockchainManager {
  private static blockchains: Map<number, Blockchain> = new Map();

  /**
   * Get or create blockchain for election
   */
  static getBlockchain(electionId: number): Blockchain {
    if (!this.blockchains.has(electionId)) {
      // Use unique storage path for each election to prevent overwrites
      const storagePath = `./data/blockchain/${electionId}`;
      
      // Try to load existing blockchain from storage
      let blockchain = Blockchain.loadFromStorage(storagePath);
      
      if (!blockchain) {
        console.log(`Creating new blockchain for election ${electionId} at ${storagePath}`);
        blockchain = new Blockchain(electionId, 2, storagePath);
      } else {
        console.log(`Loaded existing blockchain for election ${electionId} from ${storagePath}`);
        // Ensure the loaded blockchain has the correct storage path set (in case it was just imported data)
        // Accessing private property via any cast or we assume loadFromStorage sets it?
        // loadFromStorage -> import -> new Blockchain(0, ...). It doesn't set storagePath! 
        // We need to fix Blockchain.import too or set it here if possible. 
        // But storagePath is private.
        // Let's rely on Blockchain.loadFromStorage creating a blockchain. 
        // Wait, Blockchain.import creates `new Blockchain(0, data.difficulty)`. 
        // It uses default storage path!
        // We must fix Blockchain.import or Blockchain.loadFromStorage to accept storagePath.
      }
      
      this.blockchains.set(electionId, blockchain);
    }

    return this.blockchains.get(electionId)!;
  }

  /**
   * Remove blockchain for completed election
   */
  static removeBlockchain(electionId: number): void {
    this.blockchains.delete(electionId);
  }

  /**
   * Get all active blockchains
   */
  static getAllBlockchains(): Map<number, Blockchain> {
    return new Map(this.blockchains);
  }

  /**
   * Validate all blockchains
   */
  static validateAllBlockchains(): {
    [electionId: number]: BlockchainValidationResult;
  } {
    const results: { [electionId: number]: BlockchainValidationResult } = {};

    for (const [electionId, blockchain] of this.blockchains) {
      results[electionId] = blockchain.validateChain();
    }

    return results;
  }
}
