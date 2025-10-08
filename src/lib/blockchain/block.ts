import { CryptoUtils } from "./crypto-utils";
import { MerkleTree } from "./merkle-tree";
import { VoteTransaction } from "../../types";

/**
 * Block class represents a single block in the blockchain
 * Contains vote transactions and maintains integrity through cryptographic hashing
 */
export class Block {
  public index: number;
  public previousHash: string;
  public timestamp: Date;
  public electionId: number;
  public votes: VoteTransaction[];
  public merkleRoot: string;
  public nonce: number;
  public hash: string;

  constructor(
    index: number,
    previousHash: string,
    electionId: number,
    votes: VoteTransaction[] = [],
  ) {
    this.index = index;
    this.previousHash = previousHash;
    this.timestamp = new Date();
    this.electionId = electionId;
    this.votes = votes;
    this.nonce = 0;
    this.merkleRoot = this.calculateMerkleRoot();
    this.hash = this.calculateHash();
  }

  /**
   * Calculate Merkle root from vote transactions
   */
  private calculateMerkleRoot(): string {
    if (this.votes.length === 0) {
      return "";
    }

    const voteHashes = this.votes.map((vote) => CryptoUtils.hashVote(vote));
    const merkleTree = MerkleTree.fromVoteHashes(voteHashes);
    return merkleTree.getRootHash();
  }

  /**
   * Calculate block hash using canonical serialization and double SHA-256
   */
  private calculateHash(): string {
    return CryptoUtils.hashBlock({
      index: this.index,
      previousHash: this.previousHash,
      merkleRoot: this.merkleRoot,
      timestamp: this.timestamp,
      electionId: this.electionId,
      nonce: this.nonce,
    });
  }

  /**
   * Mine block using Proof-of-Work algorithm
   */
  mineBlock(difficulty: number): void {
    const target = "0".repeat(difficulty);

    console.log(`Mining block ${this.index}...`);
    const startTime = Date.now();

    while (!this.hash.startsWith(target)) {
      this.nonce++;
      this.hash = this.calculateHash();

      // Log progress every 100000 attempts
      if (this.nonce % 100000 === 0) {
        console.log(
          `Mining attempt: ${this.nonce}, Current hash: ${this.hash}`,
        );
      }
    }

    const endTime = Date.now();
    console.log(
      `Block ${this.index} mined in ${endTime - startTime}ms with nonce: ${this.nonce}`,
    );
  }

  /**
   * Add vote transaction to block
   */
  addVote(vote: VoteTransaction): boolean {
    try {
      // Validate vote signature
      if (!this.validateVoteSignature(vote)) {
        console.error("Invalid vote signature");
        return false;
      }

      // Check if voter has already voted in this election
      const existingVote = this.votes.find(
        (v) =>
          v.voterPublicKey === vote.voterPublicKey &&
          v.electionId === vote.electionId,
      );

      if (existingVote) {
        console.error("Voter has already voted in this election");
        return false;
      }

      // Add vote
      this.votes.push(vote);

      // Recalculate merkle root and hash
      this.merkleRoot = this.calculateMerkleRoot();
      this.hash = this.calculateHash();

      return true;
    } catch (error) {
      console.error("Error adding vote to block:", error);
      return false;
    }
  }

  /**
   * Validate vote transaction signature
   */
  private validateVoteSignature(vote: VoteTransaction): boolean {
    try {
      const voteData = CryptoUtils.canonicalSerializeVote({
        voteId: vote.voteId,
        electionId: vote.electionId,
        voterPublicKey: vote.voterPublicKey,
        candidateId: vote.candidateId,
        timestamp: vote.timestamp,
      });

      return CryptoUtils.verifySignature(
        voteData,
        vote.signature,
        vote.voterPublicKey,
      );
    } catch (error) {
      console.error("Error validating vote signature:", error);
      return false;
    }
  }

  /**
   * Validate block integrity
   */
  validateBlock(previousBlock?: Block): boolean {
    try {
      // Check hash integrity
      const expectedHash = this.calculateHash();
      if (!CryptoUtils.constantTimeEquals(this.hash, expectedHash)) {
        console.error("Block hash mismatch");
        return false;
      }

      // Check merkle root integrity
      const expectedMerkleRoot = this.calculateMerkleRoot();
      if (
        !CryptoUtils.constantTimeEquals(this.merkleRoot, expectedMerkleRoot)
      ) {
        console.error("Merkle root mismatch");
        return false;
      }

      // Check previous hash link (if not genesis block)
      if (previousBlock && this.previousHash !== previousBlock.hash) {
        console.error("Previous hash mismatch");
        return false;
      }

      // Validate all vote signatures
      for (const vote of this.votes) {
        if (!this.validateVoteSignature(vote)) {
          console.error("Invalid vote signature found in block");
          return false;
        }
      }

      // Check for duplicate votes
      const voterKeys = this.votes.map((v) => v.voterPublicKey);
      const uniqueVoterKeys = new Set(voterKeys);
      if (voterKeys.length !== uniqueVoterKeys.size) {
        console.error("Duplicate votes found in block");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error validating block:", error);
      return false;
    }
  }

  /**
   * Get block statistics
   */
  getStatistics() {
    return {
      index: this.index,
      voteCount: this.votes.length,
      timestamp: this.timestamp,
      electionId: this.electionId,
      hash: this.hash,
      merkleRoot: this.merkleRoot,
      nonce: this.nonce,
      size: this.getBlockSize(),
    };
  }

  /**
   * Calculate block size in bytes (approximate)
   */
  private getBlockSize(): number {
    const blockData = {
      index: this.index,
      previousHash: this.previousHash,
      timestamp: this.timestamp,
      electionId: this.electionId,
      votes: this.votes,
      merkleRoot: this.merkleRoot,
      nonce: this.nonce,
      hash: this.hash,
    };

    return JSON.stringify(blockData).length;
  }

  /**
   * Export block data for storage
   */
  toJSON() {
    return {
      index: this.index,
      previousHash: this.previousHash,
      timestamp: this.timestamp.toISOString(),
      electionId: this.electionId,
      votes: this.votes,
      merkleRoot: this.merkleRoot,
      nonce: this.nonce,
      hash: this.hash,
    };
  }

  /**
   * Create block from JSON data
   */
  static fromJSON(data: {
    index: number;
    previousHash: string;
    electionId: number;
    votes: VoteTransaction[];
    timestamp: string;
    merkleRoot: string;
    nonce: number;
    hash: string;
  }): Block {
    const block = new Block(
      data.index,
      data.previousHash,
      data.electionId,
      data.votes,
    );

    block.timestamp = new Date(data.timestamp);
    block.merkleRoot = data.merkleRoot;
    block.nonce = data.nonce;
    block.hash = data.hash;

    return block;
  }

  /**
   * Create genesis block (first block in chain)
   */
  static createGenesisBlock(electionId: number): Block {
    const genesisBlock = new Block(0, "0", electionId, []);
    genesisBlock.timestamp = new Date();
    genesisBlock.merkleRoot = "";
    // Mine the genesis block to meet proof-of-work requirements
    genesisBlock.mineBlock(2); // Use difficulty 2 for consistency

    return genesisBlock;
  }

  /**
   * Check if this is a genesis block
   */
  isGenesisBlock(): boolean {
    return this.index === 0 && this.previousHash === "0";
  }

  /**
   * Get Merkle proof for a specific vote
   */
  getMerkleProof(voteId: string) {
    const voteIndex = this.votes.findIndex((vote) => vote.voteId === voteId);
    if (voteIndex === -1) {
      throw new Error("Vote not found in block");
    }

    const voteHashes = this.votes.map((vote) => CryptoUtils.hashVote(vote));
    const merkleTree = MerkleTree.fromVoteHashes(voteHashes);

    return merkleTree.generateProof(
      CryptoUtils.hashVote(this.votes[voteIndex]),
    );
  }

  /**
   * Verify Merkle proof for a vote
   */
  verifyMerkleProof(
    vote: VoteTransaction,
    proof: { hash: string; direction: "left" | "right" }[],
  ): boolean {
    const voteHash = CryptoUtils.hashVote(vote);
    return MerkleTree.verifyProof(voteHash, proof, this.merkleRoot);
  }

  /**
   * Get all votes for a specific election
   */
  getVotesForElection(electionId: number): VoteTransaction[] {
    return this.votes.filter((vote) => vote.electionId === electionId);
  }

  /**
   * Check if block contains votes for specific election
   */
  hasVotesForElection(electionId: number): boolean {
    return this.votes.some((vote) => vote.electionId === electionId);
  }

  /**
   * Get unique voter count in block
   */
  getUniqueVoterCount(): number {
    const uniqueVoters = new Set(this.votes.map((vote) => vote.voterPublicKey));
    return uniqueVoters.size;
  }

  /**
   * Clone block (deep copy)
   */
  clone(): Block {
    const clonedVotes = this.votes.map((vote) => ({ ...vote }));
    const clonedBlock = new Block(
      this.index,
      this.previousHash,
      this.electionId,
      clonedVotes,
    );

    clonedBlock.timestamp = new Date(this.timestamp);
    clonedBlock.merkleRoot = this.merkleRoot;
    clonedBlock.nonce = this.nonce;
    clonedBlock.hash = this.hash;

    return clonedBlock;
  }
}
