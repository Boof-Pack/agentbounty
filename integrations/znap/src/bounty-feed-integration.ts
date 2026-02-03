/**
 * AgentBounty × ZNAP Feed Integration
 * Orchestrates bounty creation/updates between platforms
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { ZNAPClient, ZNAPPost } from './znap-client';

const AGENTBOUNTY_PROGRAM_ID = '9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK';

export class BountyFeedIntegration {
  private znapClient: ZNAPClient;
  private agentBountyProgram: Program;
  
  constructor(
    private connection: Connection,
    private wallet: Wallet,
    znapApiKey?: string
  ) {
    this.znapClient = new ZNAPClient('https://znap.dev', znapApiKey);
    
    // Initialize AgentBounty program
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed'
    });
    // Note: In production, load actual IDL
    // this.agentBountyProgram = new Program(idl, provider);
  }
  
  /**
   * Create bounty and post to ZNAP feed
   */
  async createBountyWithSocialPost(params: {
    title: string;
    description: string;
    reward: number; // SOL
    deadline: number; // Unix timestamp
  }): Promise<{
    bountyId: number;
    post: ZNAPPost;
    signature: string;
  }> {
    // 1. Create bounty on-chain
    // const bounty = await this.agentBountyProgram.methods
    //   .createBounty(params.title, params.description, ...)
    //   .rpc();
    
    // For demo: simulate bounty creation
    const bountyId = Math.floor(Math.random() * 1000);
    const signature = 'demo_signature_' + Date.now();
    
    // 2. Post to ZNAP feed
    const post = await this.znapClient.createPostWithBounty(
      `🎯 New Bounty: ${params.title}\n\n${params.description}\n\n💰 ${params.reward} SOL`,
      {
        reward: params.reward,
        deadline: params.deadline,
        bountyId
      }
    );
    
    console.log(`✅ Created bounty #${bountyId} and posted to ZNAP (${post.id})`);
    
    return {
      bountyId,
      post,
      signature
    };
  }
  
  /**
   * Claim bounty from ZNAP feed
   */
  async claimBountyFromFeed(params: {
    postId: string;
    bountyId: number;
  }): Promise<string> {
    // 1. Claim on-chain
    // const signature = await this.agentBountyProgram.methods
    //   .claimBounty()
    //   .accounts({ bounty: bountyPda, claimer: this.wallet.publicKey })
    //   .rpc();
    
    const signature = 'demo_claim_' + Date.now();
    
    // 2. Update ZNAP post status
    await this.znapClient.updatePostStatus(params.postId, 'claimed');
    
    // 3. Notify original poster
    // await this.znapClient.notify(posterUsername, {
    //   type: 'bounty_claimed',
    //   bountyId: params.bountyId,
    //   message: `Your bounty #${params.bountyId} was claimed!`
    // });
    
    console.log(`✅ Claimed bounty #${params.bountyId} from ZNAP feed`);
    
    return signature;
  }
  
  /**
   * Submit work with social proof
   */
  async submitWorkWithSocialProof(params: {
    bountyId: number;
    proofUrl: string;
    postId: string;
  }): Promise<{
    signature: string;
    proofPostId: string;
  }> {
    // 1. Submit on-chain
    // const signature = await this.agentBountyProgram.methods
    //   .submitWork(params.proofUrl)
    //   .rpc();
    
    const signature = 'demo_submit_' + Date.now();
    
    // 2. Create proof post in ZNAP
    const proofPost = await this.znapClient.createPostWithBounty(
      `✅ Completed bounty #${params.bountyId}\n\nProof: ${params.proofUrl}`,
      {
        reward: 0,
        deadline: 0,
        bountyId: params.bountyId
      }
    );
    
    // 3. Update original post status
    await this.znapClient.updatePostStatus(params.postId, 'submitted');
    
    console.log(`✅ Submitted work for bounty #${params.bountyId} with social proof`);
    
    return {
      signature,
      proofPostId: proofPost.id
    };
  }
  
  /**
   * Listen for bounty events and update ZNAP
   */
  startEventListener(): void {
    console.log('🎧 Listening for bounty events...');
    
    // Subscribe to on-chain events
    // this.connection.onLogs(
    //   new PublicKey(AGENTBOUNTY_PROGRAM_ID),
    //   (logs) => this.handleBountyEvent(logs)
    // );
    
    // Subscribe to ZNAP events
    this.znapClient.subscribeToEvents((event) => {
      console.log('ZNAP event:', event.type);
      
      if (event.type === 'post_created' && event.data.bounty) {
        console.log(`New bounty post: ${event.postId}`);
      }
    });
  }
  
  /**
   * Get bounty feed from ZNAP
   */
  async getBountyFeed(filters?: {
    minReward?: number;
    maxDeadline?: number;
  }): Promise<ZNAPPost[]> {
    return await this.znapClient.getBountyFeed(filters);
  }
  
  /**
   * Find agents by skill using social graph
   */
  async findExpertsForBounty(bountyType: string): Promise<any[]> {
    // Query ZNAP for agents with relevant bounty history
    const experts = await this.znapClient.findAgentsBySkill(bountyType);
    
    return experts.map(profile => ({
      username: profile.username,
      wallet: profile.wallet,
      completions: profile.bountyStats?.completed || 0,
      successRate: profile.bountyStats?.successRate || 0,
      skills: profile.bountyStats?.topSkills || []
    }));
  }
}
