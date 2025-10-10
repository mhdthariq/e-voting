// Core User Types
export type UserRole = "admin" | "organization" | "voter";
export type UserStatus = "active" | "inactive";

export interface User {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  publicKey?: string;
  privateKeyEncrypted?: string;
  status: UserStatus;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole;
}

// Election Types
export type ElectionStatus = "draft" | "active" | "ended";

export interface Election {
  id: number;
  title: string;
  description: string;
  organizationId: number;
  status: ElectionStatus;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

export interface CreateElectionRequest {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  candidates: CreateCandidateRequest[];
  voters: CreateVoterRequest[];
}

// Candidate Types
export interface Candidate {
  id: number;
  electionId: number;
  name: string;
  description: string;
  createdAt: Date;
}

export interface CreateCandidateRequest {
  name: string;
  description: string;
}

// Voter Types
export interface CreateVoterRequest {
  name: string;
  email: string;
}

export interface VoterCredentials {
  username: string;
  password: string;
  email: string;
  electionId: number;
}

// Vote Types
export interface Vote {
  id: number;
  electionId: number;
  voterId: number;
  blockHash: string;
  transactionHash: string;
  votedAt: Date;
}

export interface VoteTransaction {
  voteId: string;
  electionId: number;
  voterPublicKey: string;
  candidateId: number;
  timestamp: Date;
  signature: string;
}

export interface CastVoteRequest {
  candidateId: number;
  signature: string;
}

// Blockchain Types
export interface Block {
  index: number;
  previousHash: string;
  merkleRoot: string;
  timestamp: Date;
  electionId: number;
  nonce: number;
  hash: string;
  votes: VoteTransaction[];
}

export interface BlockchainBlock {
  id: number;
  blockIndex: number;
  previousHash: string;
  merkleRoot: string;
  timestamp: Date;
  electionId: number;
  nonce: number;
  hash: string;
  votesData: string; // JSON string of VoteTransaction[]
  createdAt: Date;
}

// Blockchain Validation Types
export interface BlockchainValidationResult {
  isValid: boolean;
  errors: string[];
  totalBlocks: number;
  validBlocks: number;
}

export interface VoteValidationResult {
  isValid: boolean;
  error?: string;
  voteHash?: string;
}

// Authentication Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    role: UserRole;
  };
  error?: string;
}

export interface JWTPayload {
  userId: number;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Election Results Types
export interface ElectionResult {
  electionId: number;
  title: string;
  totalVotes: number;
  results: CandidateResult[];
  blockchainValidation: BlockchainValidationResult;
  completedAt: Date;
}

export interface CandidateResult {
  candidateId: number;
  name: string;
  votes: number;
  percentage: number;
}

// Email Types
export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailRequest {
  to: string[];
  template: "voter_invitation" | "election_results" | "election_update";
  data: Record<string, unknown>;
}

// Audit Types
export interface AuditLog {
  id: number;
  userId: number;
  action: string;
  resource: string;
  resourceId?: number;
  details: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

// Dashboard Types
export interface AdminDashboardData {
  totalOrganizations: number;
  activeElections: number;
  totalVotes: number;
  recentElections: Election[];
  systemHealth: {
    blockchainIntegrity: boolean;
    databaseConnected: boolean;
    emailServiceActive: boolean;
  };
}

export interface OrganizationDashboardData {
  activeElections: Election[];
  draftElections: Election[];
  completedElections: Election[];
  totalVoters: number;
  totalVotes: number;
}

export interface VoterDashboardData {
  availableElections: Election[];
  votedElections: number[];
  upcomingElections: Election[];
}

// Error Types
export interface ValidationError {
  field: string;
  message: string;
}

export interface BlockchainError {
  type:
    | "HASH_MISMATCH"
    | "INVALID_SIGNATURE"
    | "TAMPERED_BLOCK"
    | "BROKEN_CHAIN";
  message: string;
  blockIndex?: number;
  details?: Record<string, unknown>;
}

// Utility Types
export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface HashResult {
  hash: string;
  algorithm: "SHA256";
  iterations: number;
}

// Configuration Types
export interface BlockchainConfig {
  difficulty: number;
  storagePath: string;
  proofOfWorkEnabled: boolean;
  maxVotesPerBlock: number;
}

export interface EmailConfig {
  service: string;
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

// Statistics Types
export interface ElectionStatistics {
  electionId: number;
  totalRegisteredVoters: number;
  totalVotesCast: number;
  participationRate: number;
  votingStarted: Date;
  lastVoteTime?: Date;
  averageVotingTime?: number;
}

export interface SystemStatistics {
  totalUsers: number;
  totalElections: number;
  totalVotes: number;
  totalBlocks: number;
  averageBlockTime: number;
  systemUptime: number;
}
