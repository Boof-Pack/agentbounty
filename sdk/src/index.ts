import { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';

export const PROGRAM_ID = new PublicKey('BountyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');

export interface BountyData {
  id: number;
  poster: PublicKey;
  title: string;
  description: string;
  rewardLamports: BN;
  createdAt: BN;
  deadline: BN;
  status: BountyStatus;
  claimer?: PublicKey;
  claimedAt?: BN;
  submission?: string;
  completedAt?: BN;
}

export enum BountyStatus {
  Open = 'Open',
  Claimed = 'Claimed',
  Submitted = 'Submitted',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export class AgentBountyClient {
  private connection: Connection;
  private programId: PublicKey;

  constructor(connection: Connection, programId?: PublicKey) {
    this.connection = connection;
    this.programId = programId || PROGRAM_ID;
  }

  /**
   * Get protocol PDA
   */
  getProtocolPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('protocol')],
      this.programId
    );
  }

  /**
   * Get bounty PDA
   */
  getBountyPDA(bountyId: number): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('bounty'), new BN(bountyId).toArrayLike(Buffer, 'le', 8)],
      this.programId
    );
  }

  /**
   * Get escrow PDA for a bounty
   */
  getEscrowPDA(bountyPubkey: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), bountyPubkey.toBuffer()],
      this.programId
    );
  }

  /**
   * Get fee vault PDA
   */
  getFeeVaultPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('fee_vault')],
      this.programId
    );
  }

  /**
   * Fetch protocol stats
   */
  async getProtocolStats(): Promise<{
    totalBounties: number;
    totalCompleted: number;
    totalVolume: number;
    feeBps: number;
  }> {
    const [protocolPDA] = this.getProtocolPDA();
    const accountInfo = await this.connection.getAccountInfo(protocolPDA);
    
    if (!accountInfo) {
      return {
        totalBounties: 0,
        totalCompleted: 0,
        totalVolume: 0,
        feeBps: 250
      };
    }

    // TODO: Deserialize account data properly
    // For now, return mock data
    return {
      totalBounties: 0,
      totalCompleted: 0,
      totalVolume: 0,
      feeBps: 250
    };
  }

  /**
   * Fetch all bounties
   */
  async getAllBounties(): Promise<BountyData[]> {
    const accounts = await this.connection.getProgramAccounts(this.programId);
    
    // TODO: Filter and deserialize bounty accounts
    return [];
  }

  /**
   * Fetch specific bounty
   */
  async getBounty(bountyId: number): Promise<BountyData | null> {
    const [bountyPDA] = this.getBountyPDA(bountyId);
    const accountInfo = await this.connection.getAccountInfo(bountyPDA);
    
    if (!accountInfo) {
      return null;
    }

    // TODO: Deserialize bounty data
    return null;
  }

  /**
   * Create bounty (returns unsigned transaction)
   */
  async createBounty(params: {
    poster: PublicKey;
    title: string;
    description: string;
    rewardSol: number;
    deadlineHours: number;
  }): Promise<Transaction> {
    const { poster, title, description, rewardSol, deadlineHours } = params;

    if (title.length > 100) {
      throw new Error('Title must be 100 characters or less');
    }
    if (description.length > 1000) {
      throw new Error('Description must be 1000 characters or less');
    }
    if (rewardSol < 0.1 || rewardSol > 10) {
      throw new Error('Reward must be between 0.1 and 10 SOL');
    }

    const [protocolPDA] = this.getProtocolPDA();
    const protocolInfo = await this.connection.getAccountInfo(protocolPDA);
    
    // Get next bounty ID (simplified)
    const bountyId = 0; // TODO: Get from protocol account
    const [bountyPDA] = this.getBountyPDA(bountyId);
    const [escrowPDA] = this.getEscrowPDA(bountyPDA);

    const rewardLamports = rewardSol * LAMPORTS_PER_SOL;
    const deadlineTs = Math.floor(Date.now() / 1000) + deadlineHours * 3600;

    // Build transaction
    // TODO: Use Anchor Program to build proper instruction
    const transaction = new Transaction();
    
    // For now, return empty transaction as placeholder
    // Real implementation would use Anchor Program.methods.createBounty(...)
    
    return transaction;
  }

  /**
   * Claim bounty (returns unsigned transaction)
   */
  async claimBounty(params: {
    bountyId: number;
    claimer: PublicKey;
  }): Promise<Transaction> {
    const { bountyId, claimer } = params;
    const [bountyPDA] = this.getBountyPDA(bountyId);

    // TODO: Build claim transaction with Anchor
    const transaction = new Transaction();
    return transaction;
  }

  /**
   * Submit work (returns unsigned transaction)
   */
  async submitWork(params: {
    bountyId: number;
    claimer: PublicKey;
    submissionUrl: string;
  }): Promise<Transaction> {
    const { bountyId, claimer, submissionUrl } = params;
    
    if (submissionUrl.length > 500) {
      throw new Error('Submission URL must be 500 characters or less');
    }

    const [bountyPDA] = this.getBountyPDA(bountyId);

    // TODO: Build submit transaction with Anchor
    const transaction = new Transaction();
    return transaction;
  }

  /**
   * Approve work (returns unsigned transaction)
   */
  async approveWork(params: {
    bountyId: number;
    poster: PublicKey;
  }): Promise<Transaction> {
    const { bountyId, poster } = params;
    const [bountyPDA] = this.getBountyPDA(bountyId);
    const [escrowPDA] = this.getEscrowPDA(bountyPDA);
    const [protocolPDA] = this.getProtocolPDA();
    const [feeVaultPDA] = this.getFeeVaultPDA();

    // Bounty data needed to get claimer address
    const bountyData = await this.getBounty(bountyId);
    if (!bountyData || !bountyData.claimer) {
      throw new Error('Bounty not found or no claimer');
    }

    // TODO: Build approve transaction with Anchor
    const transaction = new Transaction();
    return transaction;
  }

  /**
   * Cancel bounty (returns unsigned transaction)
   */
  async cancelBounty(params: {
    bountyId: number;
    poster: PublicKey;
  }): Promise<Transaction> {
    const { bountyId, poster } = params;
    const [bountyPDA] = this.getBountyPDA(bountyId);
    const [escrowPDA] = this.getEscrowPDA(bountyPDA);

    // TODO: Build cancel transaction with Anchor
    const transaction = new Transaction();
    return transaction;
  }
}

// Helper function to create client
export function createClient(rpcUrl: string, programId?: string): AgentBountyClient {
  const connection = new Connection(rpcUrl, 'confirmed');
  const pid = programId ? new PublicKey(programId) : PROGRAM_ID;
  return new AgentBountyClient(connection, pid);
}
