import { Blockchain } from '../../lib/blockchain/blockchain';
import { CryptoUtils } from '../../lib/blockchain/crypto-utils';
import { VoteTransaction } from '../../types/index';

describe('Blockchain System', () => {
    let blockchain: Blockchain;

    beforeEach(() => {
        // Reset blockchain for each test
        blockchain = new Blockchain(1, 2); // ID 1, Difficulty 2
    });

    it('should create a genesis block', () => {
        const latestBlock = blockchain.getLatestBlock();
        expect(latestBlock).toBeDefined();
        expect(latestBlock.index).toBe(0);
        expect(latestBlock.previousHash).toBe("0");
    });

    it('should generate valid key pairs', () => {
        const keys = CryptoUtils.generateKeyPair();
        expect(keys.publicKey).toBeDefined();
        expect(keys.privateKey).toBeDefined();
        expect(keys.publicKey).not.toBe(keys.privateKey);
    });

    it('should add valid vote transactions', () => {
        const voterKeys = CryptoUtils.generateKeyPair();
        const vote: VoteTransaction = {
            voteId: CryptoUtils.generateVoteId(),
            electionId: 1,
            voterPublicKey: voterKeys.publicKey,
            candidateId: 101,
            timestamp: new Date(),
            signature: ""
        };

        vote.signature = CryptoUtils.signData(
            CryptoUtils.canonicalSerializeVote(vote),
            voterKeys.privateKey
        );

        const added = blockchain.addVoteTransaction(vote);
        expect(added).toBe(true);
        expect(blockchain.export().pendingVotes.length).toBe(1);
    });

    it('should mine a block successfully', () => {
        // Add a vote first
        const voterKeys = CryptoUtils.generateKeyPair();
        const vote: VoteTransaction = {
            voteId: CryptoUtils.generateVoteId(),
            electionId: 1,
            voterPublicKey: voterKeys.publicKey,
            candidateId: 101,
            timestamp: new Date(),
            signature: ""
        };
        vote.signature = CryptoUtils.signData(
            CryptoUtils.canonicalSerializeVote(vote),
            voterKeys.privateKey
        );
        blockchain.addVoteTransaction(vote);

        const output = blockchain.mineBlock();
        expect(output).toBeDefined();
        if (output) {
            expect(output.index).toBe(1);
            expect(output.previousHash).toBe(blockchain.getChain()[0].hash);
            expect(output.votes.length).toBe(1);
        }
    });

    it('should validate the chain integrity', () => {
        // Basic valid chain
        expect(blockchain.validateChain().isValid).toBe(true);

        // Tamper test via export/import since chain is private
        const exported = blockchain.export();
        // Modify a hash in exported data
        if(exported.chain.length > 0) {
             exported.chain[0].hash = "fake_hash";
             const corruptedBlockchain = Blockchain.import(exported);
             expect(corruptedBlockchain.validateChain().isValid).toBe(false);
        }
    });

    it('should prevent double voting', () => {
        const voterKeys = CryptoUtils.generateKeyPair();
        const vote1: VoteTransaction = {
            voteId: CryptoUtils.generateVoteId(),
            electionId: 1,
            voterPublicKey: voterKeys.publicKey,
            candidateId: 101,
            timestamp: new Date(),
            signature: ""
        };
        vote1.signature = CryptoUtils.signData(
            CryptoUtils.canonicalSerializeVote(vote1),
            voterKeys.privateKey
        );

        blockchain.addVoteTransaction(vote1);
        
        // Mine it to make it permanent in chain (though pending checks also exist)
        blockchain.mineBlock();

        // Try voting again with same public key
        const vote2: VoteTransaction = {
            voteId: CryptoUtils.generateVoteId(), // New vote ID
            electionId: 1,
            voterPublicKey: voterKeys.publicKey, // Same voter
            candidateId: 102, // Different candidate
            timestamp: new Date(),
            signature: ""
        };
        vote2.signature = CryptoUtils.signData(
            CryptoUtils.canonicalSerializeVote(vote2),
            voterKeys.privateKey
        );

        const added = blockchain.addVoteTransaction(vote2);
        expect(added).toBe(false);
    });
});
