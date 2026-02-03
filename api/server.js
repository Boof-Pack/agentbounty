const express = require('express');
const cors = require('cors');
const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const { Program, AnchorProvider, web3 } = require('@coral-xyz/anchor');
const IDL = require('./idl.json');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const PROGRAM_ID = new PublicKey('9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK');

// Initialize Solana connection
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

// ===== API ENDPOINTS =====

// GET /health - Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    network: 'devnet'
  });
});

// GET /stats - Protocol stats
app.get('/stats', async (req, res) => {
  try {
    const [protocolPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('protocol')],
      PROGRAM_ID
    );
    
    const accountInfo = await connection.getAccountInfo(protocolPDA);
    if (!accountInfo) {
      return res.json({
        total_bounties: 0,
        total_completed: 0,
        total_volume: 0,
        fee_bps: 250
      });
    }

    // Parse protocol account (simplified)
    const data = accountInfo.data;
    // TODO: Proper deserialization with Anchor
    
    res.json({
      total_bounties: 0, // Placeholder
      total_completed: 0,
      total_volume: 0,
      fee_bps: 250
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /bounties - List all bounties
app.get('/bounties', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    // Get all bounty accounts
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          dataSize: 8 + 1700 // Approximate bounty account size
        }
      ]
    });

    // TODO: Parse and filter accounts
    // For now, return mock data
    const bounties = [
      {
        id: 0,
        poster: '5dpw6KEQPn248pnkkaYyWfHwu2nfb3LUMbTucb6LaA8G',
        title: 'Example bounty',
        description: 'This will be populated from on-chain data',
        reward_sol: 0.5,
        status: 'open',
        created_at: Date.now(),
        deadline: Date.now() + 86400000
      }
    ];

    res.json({
      bounties: bounties.slice(offset, offset + limit),
      total: bounties.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /bounties/:id - Get bounty details
app.get('/bounties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [bountyPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('bounty'), Buffer.from(id)],
      PROGRAM_ID
    );

    const accountInfo = await connection.getAccountInfo(bountyPDA);
    if (!accountInfo) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    // TODO: Deserialize bounty data
    res.json({
      id: parseInt(id),
      poster: 'placeholder',
      title: 'Bounty details',
      description: 'TODO: Parse from on-chain data',
      reward_sol: 0.5,
      status: 'open'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /bounties - Create bounty (requires transaction to be built client-side)
app.post('/bounties', async (req, res) => {
  try {
    const { title, description, reward_sol, deadline_hours } = req.body;

    if (!title || !description || !reward_sol) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, description, reward_sol' 
      });
    }

    if (reward_sol < 0.1 || reward_sol > 10) {
      return res.status(400).json({ 
        error: 'Reward must be between 0.1 and 10 SOL' 
      });
    }

    // Return transaction data for client to sign
    // Client will then call POST /bounties/submit with signed transaction
    res.json({
      message: 'Build transaction client-side using Anchor SDK',
      instructions: {
        program_id: PROGRAM_ID.toString(),
        method: 'create_bounty',
        args: {
          title,
          description,
          reward_lamports: reward_sol * 1e9,
          deadline_ts: Math.floor(Date.now() / 1000) + (deadline_hours || 24) * 3600
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /bounties/:id/claim - Claim a bounty
app.post('/bounties/:id/claim', async (req, res) => {
  try {
    const { id } = req.params;
    
    res.json({
      message: 'Build claim transaction client-side',
      method: 'claim_bounty',
      bounty_id: parseInt(id)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /bounties/:id/submit - Submit work
app.post('/bounties/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { submission_url } = req.body;

    if (!submission_url) {
      return res.status(400).json({ error: 'submission_url required' });
    }

    res.json({
      message: 'Build submit transaction client-side',
      method: 'submit_work',
      args: { submission_url }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /bounties/:id/approve - Approve work
app.post('/bounties/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    res.json({
      message: 'Build approve transaction client-side',
      method: 'approve_work',
      bounty_id: parseInt(id)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /bounties/:id/cancel - Cancel bounty
app.post('/bounties/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    
    res.json({
      message: 'Build cancel transaction client-side',
      method: 'cancel_bounty',
      bounty_id: parseInt(id)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 AgentBounty API running on port ${PORT}`);
  console.log(`📍 Network: devnet`);
  console.log(`📦 Program: ${PROGRAM_ID.toString()}`);
});
