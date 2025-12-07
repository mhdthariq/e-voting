import { Blockchain } from "@/lib/blockchain/blockchain";
import { CryptoUtils, BlockchainSecurity } from "@/lib/blockchain/crypto-utils";
import { VoteTransaction } from "@/types/index";
import fs from "fs";
import path from "path";

const TEST_DATA_DIR = "./data/test-blockchain-unit";

describe("Blockchain System", () => {
  // Setup and Teardown
  beforeAll(() => {
    // Ensure test directory exists
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Clean up specific election subdirectories before each test if needed
    // or just rely on unique election IDs
  });

  describe("CryptoUtils", () => {
    test("should generate valid RSA key pair", () => {
      const { publicKey, privateKey } = CryptoUtils.generateKeyPair();
      expect(publicKey).toContain("BEGIN PUBLIC KEY");
      expect(privateKey).toContain("BEGIN PRIVATE KEY");
      expect(CryptoUtils.isValidPublicKey(publicKey)).toBe(true);
      expect(CryptoUtils.isValidPrivateKey(privateKey)).toBe(true);
    });

    test("should sign and verify data correctly", () => {
      const { publicKey, privateKey } = CryptoUtils.generateKeyPair();
      const data = Buffer.from("test-data");
      const signature = CryptoUtils.signData(data, privateKey);
      
      const isValid = CryptoUtils.verifySignature(data, signature, publicKey);
      expect(isValid).toBe(true);

      const isInvalid = CryptoUtils.verifySignature(Buffer.from("tampered-data"), signature, publicKey);
      expect(isInvalid).toBe(false);
    });

    test("should generate correct double SHA-256 hash", () => {
      const data = Buffer.from("test-data");
      const hash = CryptoUtils.doubleSha256(data);
      expect(hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex string format
    });

    test("should generate unique vote IDs", () => {
      const id1 = CryptoUtils.generateVoteId();
      const id2 = CryptoUtils.generateVoteId();
      expect(id1).not.toBe(id2);
      expect(CryptoUtils.isValidHash(id1)).toBe(true);
    });
  });

  describe("Blockchain Class", () => {
    let blockchain: Blockchain;
    const ELECTION_ID = 999;
    const DIFFICULTY = 1; // Low difficulty for fast tests

    beforeEach(() => {
        // clear any existing blockchain for this election
        const storagePath = path.join(TEST_DATA_DIR, `election-${ELECTION_ID}`);
         if (fs.existsSync(storagePath)) {
            fs.rmSync(storagePath, { recursive: true, force: true });
        }
        blockchain = new Blockchain(ELECTION_ID, DIFFICULTY, storagePath);
    });

    test("should initialize with genesis block", () => {
      expect(blockchain.getLength()).toBe(1);
      const genesisBlock = blockchain.getLatestBlock();
      expect(genesisBlock.index).toBe(0);
      expect(genesisBlock.previousHash).toBe("0");
      expect(genesisBlock.votes).toHaveLength(0);
    });

    test("should add valid vote transaction", async () => {
      const { publicKey, privateKey } = CryptoUtils.generateKeyPair();
      
      const vote: VoteTransaction = {
        voteId: CryptoUtils.generateVoteId(),
        electionId: ELECTION_ID,
        voterPublicKey: publicKey,
        candidateId: 101,
        timestamp: new Date(),
        signature: ""
      };

      // Sign vote
      const signedData = CryptoUtils.canonicalSerializeVote(vote);
      vote.signature = CryptoUtils.signData(signedData, privateKey);

      const result = await blockchain.addVoteTransaction(vote);
      expect(result).toBe(true);
      
      // Check pending votes stats (accessing private property via public getter if available, or indirectly via mining/stats)
      const stats = blockchain.getStatistics();
      expect(stats.pendingVotes).toBe(1);
    });

    test("should prevent duplicate votes from same voter", async () => {
       const { publicKey, privateKey } = CryptoUtils.generateKeyPair();
       
       const vote1: VoteTransaction = {
         voteId: CryptoUtils.generateVoteId(),
         electionId: ELECTION_ID,
         voterPublicKey: publicKey,
         candidateId: 101,
         timestamp: new Date(),
         signature: ""
       };
 
       vote1.signature = CryptoUtils.signData(CryptoUtils.canonicalSerializeVote(vote1), privateKey);
       await blockchain.addVoteTransaction(vote1);

       // Attempt second vote
       const vote2: VoteTransaction = {
        voteId: CryptoUtils.generateVoteId(),
        electionId: ELECTION_ID,
        voterPublicKey: publicKey,
        candidateId: 102, // Different candidate
        timestamp: new Date(),
        signature: ""
      };
      
      vote2.signature = CryptoUtils.signData(CryptoUtils.canonicalSerializeVote(vote2), privateKey);
      const result = await blockchain.addVoteTransaction(vote2);
      
      expect(result).toBe(false);
    });

    test("should reject invalid signatures", async () => {
        const { publicKey } = CryptoUtils.generateKeyPair();
        const { privateKey: wrongPrivateKey } = CryptoUtils.generateKeyPair();

        const vote: VoteTransaction = {
            voteId: CryptoUtils.generateVoteId(),
            electionId: ELECTION_ID,
            voterPublicKey: publicKey,
            candidateId: 101,
            timestamp: new Date(),
            signature: ""
        };

        // Sign with WRONG key
        vote.signature = CryptoUtils.signData(CryptoUtils.canonicalSerializeVote(vote), wrongPrivateKey);

        const result = await blockchain.addVoteTransaction(vote);
        expect(result).toBe(false);
    });

    test("should mine block correctly", async () => {
        // Add a vote
        const { publicKey, privateKey } = CryptoUtils.generateKeyPair();
        const vote: VoteTransaction = {
            voteId: CryptoUtils.generateVoteId(),
            electionId: ELECTION_ID,
            voterPublicKey: publicKey,
            candidateId: 101,
            timestamp: new Date(),
            signature: ""
        };
        vote.signature = CryptoUtils.signData(CryptoUtils.canonicalSerializeVote(vote), privateKey);
        await blockchain.addVoteTransaction(vote);

        // Mine
        const newBlock = blockchain.mineBlock();
        expect(newBlock).not.toBeNull();
        expect(newBlock?.index).toBe(1);
        expect(newBlock?.votes).toHaveLength(1);
        
        // Verify chain length
        expect(blockchain.getLength()).toBe(2);
    });

    test("should validate chain integrity", async () => {
        // Mine a few blocks
        for (let i = 0; i < 3; i++) {
            const { publicKey, privateKey } = CryptoUtils.generateKeyPair();
            const vote: VoteTransaction = {
                voteId: CryptoUtils.generateVoteId(),
                electionId: ELECTION_ID,
                voterPublicKey: publicKey,
                candidateId: 101,
                timestamp: new Date(),
                signature: ""
            };
            vote.signature = CryptoUtils.signData(CryptoUtils.canonicalSerializeVote(vote), privateKey);
            await blockchain.addVoteTransaction(vote);
            blockchain.mineBlock();
        }

        const validation = blockchain.validateChain();
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
        expect(validation.validBlocks).toBe(blockchain.getLength());
    });

    test("should detect hash tampering", async () => {
        // Mine a block
        const { publicKey, privateKey } = CryptoUtils.generateKeyPair();
        const vote: VoteTransaction = {
            voteId: CryptoUtils.generateVoteId(),
            electionId: ELECTION_ID,
            voterPublicKey: publicKey,
            candidateId: 101,
            timestamp: new Date(),
            signature: ""
        };
        vote.signature = CryptoUtils.signData(CryptoUtils.canonicalSerializeVote(vote), privateKey);
        await blockchain.addVoteTransaction(vote);
        blockchain.mineBlock();

        // Tamper with the chain directly (simulated attack)
        // Access private chain via getChain (returns copy) - we need to modify internal chain
        // Since 'chain' is private, and we can't easily access it without using 'any' or changing visibility.
        // For testing, we can reload from storage, modify the file, and assume loadFromStorage picks it up?
        // Or we can use 'any' casting for unit testing purposes.
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const internalChain = (blockchain as any).chain;
        internalChain[1].votes[0].candidateId = 999; // Change the vote!

        // Validate
        // Note: validateChain recomputes hash from data. If we change data but not hash, hash check fails.
        const validation = blockchain.validateChain();
        expect(validation.isValid).toBe(false);
        // Expect either "invalid hash" or "is invalid" depending on which check fails first
        expect(validation.errors.join(",")).toMatch(/invalid/i);
    });
  });
});
