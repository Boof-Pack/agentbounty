/**
 * Demo: ZNAP × AgentBounty Integration
 * Shows complete workflow from social post to payment
 */

import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import { BountyFeedIntegration } from './bounty-feed-integration';
import { ZNAPClient } from './znap-client';

async function demo() {
  console.log('\n🎯 ZNAP × AgentBounty Integration Demo\n');
  console.log('='.repeat(50));
  
  // Setup
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const wallet = new Wallet(Keypair.generate()); // Demo wallet
  
  const integration = new BountyFeedIntegration(
    connection,
    wallet,
    process.env.ZNAP_API_KEY
  );
  
  // Demo Scenario 1: Create bounty with social post
  console.log('\n📝 Scenario 1: Create Bounty with Social Post');
  console.log('-'.repeat(50));
  
  const { bountyId, post, signature } = await integration.createBountyWithSocialPost({
    title: 'Research Solana DeFi Trends',
    description: 'Need comprehensive analysis of top DeFi protocols on Solana',
    reward: 0.5,
    deadline: Date.now() + 3600000 // 1 hour
  });
  
  console.log(`✅ Bounty #${bountyId} created`);
  console.log(`📱 ZNAP post: ${post.id}`);
  console.log(`🔗 Transaction: ${signature}`);
  
  // Demo Scenario 2: Get bounty feed
  console.log('\n📋 Scenario 2: Get Bounty Feed from ZNAP');
  console.log('-'.repeat(50));
  
  const feed = await integration.getBountyFeed({
    minReward: 0.1,
    maxDeadline: Date.now() + 86400000 // 24 hours
  });
  
  console.log(`Found ${feed.length} open bounties:`);
  feed.slice(0, 3).forEach((post, i) => {
    console.log(`\n${i + 1}. ${post.content.substring(0, 50)}...`);
    console.log(`   💰 ${post.bounty?.reward} SOL`);
    console.log(`   ⏰ ${new Date(post.bounty?.deadline || 0).toLocaleString()}`);
  });
  
  // Demo Scenario 3: Find experts for task
  console.log('\n🔍 Scenario 3: Find Expert Agents');
  console.log('-'.repeat(50));
  
  const experts = await integration.findExpertsForBounty('research');
  
  console.log(`Found ${experts.length} experts:`);
  experts.slice(0, 3).forEach((expert, i) => {
    console.log(`\n${i + 1}. @${expert.username}`);
    console.log(`   ✅ ${expert.completions} bounties completed`);
    console.log(`   📊 ${(expert.successRate * 100).toFixed(1)}% success rate`);
    console.log(`   🏆 Skills: ${expert.skills.join(', ')}`);
  });
  
  // Demo Scenario 4: Claim bounty from feed
  console.log('\n🤝 Scenario 4: Claim Bounty from Feed');
  console.log('-'.repeat(50));
  
  const claimSig = await integration.claimBountyFromFeed({
    postId: post.id,
    bountyId: bountyId
  });
  
  console.log(`✅ Claimed bounty #${bountyId}`);
  console.log(`🔗 Transaction: ${claimSig}`);
  
  // Demo Scenario 5: Submit work with social proof
  console.log('\n📤 Scenario 5: Submit Work with Social Proof');
  console.log('-'.repeat(50));
  
  const { signature: submitSig, proofPostId } = await integration.submitWorkWithSocialProof({
    bountyId: bountyId,
    proofUrl: 'https://github.com/research/defi-trends',
    postId: post.id
  });
  
  console.log(`✅ Work submitted for bounty #${bountyId}`);
  console.log(`📱 Proof post: ${proofPostId}`);
  console.log(`🔗 Transaction: ${submitSig}`);
  
  // Demo Scenario 6: Start event listener
  console.log('\n🎧 Scenario 6: Real-time Event Listener');
  console.log('-'.repeat(50));
  console.log('Starting listener for bounty events...');
  
  integration.startEventListener();
  
  // Keep alive for demo
  console.log('\nPress Ctrl+C to stop listener\n');
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ Demo Complete!');
  console.log('='.repeat(50));
  console.log('\nThis demo showed:');
  console.log('1. Creating bounty + ZNAP post');
  console.log('2. Browsing bounty feed');
  console.log('3. Finding expert agents');
  console.log('4. Claiming from feed');
  console.log('5. Submitting with social proof');
  console.log('6. Real-time event listening');
  console.log('\n🚀 Ready for production deployment!\n');
}

// Run demo
if (require.main === module) {
  demo().catch(console.error);
}

export { demo };
