import { CryptoUtils } from "./crypto-utils";

/**
 * Merkle Tree implementation for blockchain vote integrity
 * Provides efficient verification of vote authenticity without revealing individual votes
 */

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  isLeaf: boolean;
  data?: string; // Original data for leaf nodes
}

export interface MerkleProof {
  hash: string;
  direction: "left" | "right";
}

export class MerkleTree {
  private root: MerkleNode | null = null;
  private leaves: MerkleNode[] = [];
  private levels: MerkleNode[][] = [];

  constructor(data: string[] = []) {
    if (data.length > 0) {
      this.buildTree(data);
    }
  }

  /**
   * Build the Merkle tree from an array of data
   */
  private buildTree(data: string[]): void {
    if (data.length === 0) {
      throw new Error("Cannot build tree with empty data");
    }

    // Create leaf nodes
    this.leaves = data.map((item) => ({
      hash: CryptoUtils.sha256(item),
      isLeaf: true,
      data: item,
    }));

    // Initialize levels array with leaves
    this.levels = [this.leaves];

    // Build tree bottom-up
    let currentLevel = this.leaves;

    while (currentLevel.length > 1) {
      const nextLevel: MerkleNode[] = [];

      // Process pairs of nodes
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1];

        if (right) {
          // Pair exists - create parent node
          const parentHash = CryptoUtils.sha256(left.hash + right.hash);
          const parentNode: MerkleNode = {
            hash: parentHash,
            left: left,
            right: right,
            isLeaf: false,
          };
          nextLevel.push(parentNode);
        } else {
          // Odd number of nodes - duplicate the last node
          const duplicatedHash = CryptoUtils.sha256(left.hash + left.hash);
          const parentNode: MerkleNode = {
            hash: duplicatedHash,
            left: left,
            right: left, // Duplicate for odd numbers
            isLeaf: false,
          };
          nextLevel.push(parentNode);
        }
      }

      this.levels.push(nextLevel);
      currentLevel = nextLevel;
    }

    // Set root node
    this.root = currentLevel[0];
  }

  /**
   * Get the Merkle root hash
   */
  getRootHash(): string {
    if (!this.root) {
      return "";
    }
    return this.root.hash;
  }

  /**
   * Get the root node
   */
  getRoot(): MerkleNode | null {
    return this.root;
  }

  /**
   * Get all leaf nodes
   */
  getLeaves(): MerkleNode[] {
    return this.leaves;
  }

  /**
   * Add new data to the tree
   */
  addData(data: string[]): void {
    if (data.length === 0) {
      return;
    }

    // Get existing data
    const existingData = this.leaves.map((leaf) => leaf.data!);
    const allData = [...existingData, ...data];

    // Rebuild tree with all data
    this.buildTree(allData);
  }

  /**
   * Generate proof for a specific leaf
   */
  generateProof(leafData: string): MerkleProof[] {
    const leafHash = CryptoUtils.sha256(leafData);
    const proof: MerkleProof[] = [];

    // Find leaf index
    const leafIndex = this.leaves.findIndex((leaf) => leaf.hash === leafHash);
    if (leafIndex === -1) {
      throw new Error("Leaf not found in tree");
    }

    let currentIndex = leafIndex;

    // Traverse up the tree to collect proof
    for (let level = 0; level < this.levels.length - 1; level++) {
      const currentLevelNodes = this.levels[level];
      const isEven = currentIndex % 2 === 0;
      const siblingIndex = isEven ? currentIndex + 1 : currentIndex - 1;

      if (siblingIndex < currentLevelNodes.length) {
        const sibling = currentLevelNodes[siblingIndex];
        proof.push({
          hash: sibling.hash,
          direction: isEven ? "right" : "left",
        });
      }

      // Move to parent index for next level
      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }

  /**
   * Verify a proof against the root hash
   */
  static verifyProof(
    leafData: string,
    proof: MerkleProof[],
    rootHash: string,
  ): boolean {
    let currentHash = CryptoUtils.sha256(leafData);

    for (const proofElement of proof) {
      if (proofElement.direction === "left") {
        currentHash = CryptoUtils.sha256(proofElement.hash + currentHash);
      } else {
        currentHash = CryptoUtils.sha256(currentHash + proofElement.hash);
      }
    }

    return CryptoUtils.constantTimeEquals(currentHash, rootHash);
  }

  /**
   * Verify the integrity of the entire tree
   */
  verifyTree(): boolean {
    if (!this.root) {
      return false;
    }

    return this.verifyNode(this.root);
  }

  /**
   * Recursively verify a node and its children
   */
  private verifyNode(node: MerkleNode): boolean {
    if (node.isLeaf) {
      // Leaf node - verify hash matches data
      if (!node.data) {
        return false;
      }
      const expectedHash = CryptoUtils.sha256(node.data);
      return CryptoUtils.constantTimeEquals(node.hash, expectedHash);
    }

    // Internal node - verify children and hash
    if (!node.left || !node.right) {
      return false;
    }

    // Recursively verify children
    const leftValid = this.verifyNode(node.left);
    const rightValid = this.verifyNode(node.right);

    if (!leftValid || !rightValid) {
      return false;
    }

    // Verify parent hash
    const expectedHash = CryptoUtils.sha256(node.left.hash + node.right.hash);
    return CryptoUtils.constantTimeEquals(node.hash, expectedHash);
  }

  /**
   * Get tree statistics
   */
  getStatistics(): {
    totalNodes: number;
    leafCount: number;
    treeHeight: number;
    rootHash: string;
  } {
    const totalNodes = this.levels.reduce(
      (sum, level) => sum + level.length,
      0,
    );

    return {
      totalNodes,
      leafCount: this.leaves.length,
      treeHeight: this.levels.length,
      rootHash: this.getRootHash(),
    };
  }

  /**
   * Export tree structure for debugging
   */
  exportTree(): unknown {
    if (!this.root) {
      return null;
    }

    return this.exportNode(this.root);
  }

  /**
   * Export a node structure recursively
   */
  private exportNode(node: MerkleNode): Record<string, unknown> {
    const exported: Record<string, unknown> = {
      hash: node.hash,
      isLeaf: node.isLeaf,
    };

    if (node.isLeaf && node.data) {
      exported.data = node.data;
    }

    if (node.left) {
      exported.left = this.exportNode(node.left);
    }

    if (node.right && node.right !== node.left) {
      exported.right = this.exportNode(node.right);
    }

    return exported;
  }

  /**
   * Create Merkle tree from vote hashes
   */
  static fromVoteHashes(voteHashes: string[]): MerkleTree {
    if (voteHashes.length === 0) {
      // Return empty tree with empty root for empty vote set
      const tree = new MerkleTree();
      tree.root = {
        hash: "",
        isLeaf: false,
      };
      return tree;
    }

    return new MerkleTree(voteHashes);
  }

  /**
   * Create Merkle tree from vote transactions
   */
  static fromVoteTransactions(
    votes: Array<{
      voteId: string;
      electionId: number;
      voterPublicKey: string;
      candidateId: number;
      timestamp: Date;
    }>,
  ): MerkleTree {
    const voteHashes = votes.map((vote) => CryptoUtils.hashVote(vote));
    return MerkleTree.fromVoteHashes(voteHashes);
  }

  /**
   * Batch verify multiple proofs
   */
  static batchVerifyProofs(
    items: Array<{ data: string; proof: MerkleProof[] }>,
    rootHash: string,
  ): boolean[] {
    return items.map((item) =>
      MerkleTree.verifyProof(item.data, item.proof, rootHash),
    );
  }

  /**
   * Check if tree is balanced
   */
  isBalanced(): boolean {
    if (!this.root) {
      return true;
    }

    return this.checkBalance(this.root) !== -1;
  }

  /**
   * Check balance recursively
   */
  private checkBalance(node: MerkleNode): number {
    if (node.isLeaf) {
      return 1;
    }

    if (!node.left || !node.right) {
      return -1;
    }

    const leftHeight = this.checkBalance(node.left);
    if (leftHeight === -1) {
      return -1;
    }

    const rightHeight = this.checkBalance(node.right);
    if (rightHeight === -1) {
      return -1;
    }

    // Tree is balanced if height difference is at most 1
    if (Math.abs(leftHeight - rightHeight) > 1) {
      return -1;
    }

    return Math.max(leftHeight, rightHeight) + 1;
  }

  /**
   * Find all paths from root to leaves
   */
  getAllPaths(): string[][] {
    if (!this.root) {
      return [];
    }

    const paths: string[][] = [];
    this.findPaths(this.root, [], paths);
    return paths;
  }

  /**
   * Recursively find paths
   */
  private findPaths(
    node: MerkleNode,
    currentPath: string[],
    allPaths: string[][],
  ): void {
    currentPath.push(node.hash);

    if (node.isLeaf) {
      allPaths.push([...currentPath]);
    } else {
      if (node.left) {
        this.findPaths(node.left, currentPath, allPaths);
      }
      if (node.right && node.right !== node.left) {
        this.findPaths(node.right, currentPath, allPaths);
      }
    }

    currentPath.pop();
  }
}

/**
 * Utility functions for Merkle tree operations
 */
export class MerkleTreeUtils {
  /**
   * Calculate minimum tree height for given number of leaves
   */
  static calculateMinHeight(leafCount: number): number {
    if (leafCount <= 0) {
      return 0;
    }
    return Math.ceil(Math.log2(leafCount)) + 1;
  }

  /**
   * Calculate maximum number of leaves for given height
   */
  static calculateMaxLeaves(height: number): number {
    if (height <= 0) {
      return 0;
    }
    return Math.pow(2, height - 1);
  }

  /**
   * Validate Merkle proof format
   */
  static validateProofFormat(proof: MerkleProof[]): boolean {
    return proof.every(
      (element) =>
        typeof element.hash === "string" &&
        CryptoUtils.isValidHash(element.hash) &&
        (element.direction === "left" || element.direction === "right"),
    );
  }

  /**
   * Compare two Merkle trees
   */
  static compareTrees(tree1: MerkleTree, tree2: MerkleTree): boolean {
    const root1 = tree1.getRootHash();
    const root2 = tree2.getRootHash();
    return CryptoUtils.constantTimeEquals(root1, root2);
  }

  /**
   * Merge multiple Merkle trees
   */
  static mergeTrees(trees: MerkleTree[]): MerkleTree {
    const allData: string[] = [];

    for (const tree of trees) {
      const leaves = tree.getLeaves();
      for (const leaf of leaves) {
        if (leaf.data) {
          allData.push(leaf.data);
        }
      }
    }

    return new MerkleTree(allData);
  }
}
