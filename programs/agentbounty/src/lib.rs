use anchor_lang::prelude::*;

declare_id!("9XsneLeHEpV7xFfqoTjFUeDS1tbq74PuXytSxsBy8BK");

#[program]
pub mod agentbounty {
    use super::*;

    /// Initialize the protocol
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let protocol = &mut ctx.accounts.protocol;
        protocol.authority = ctx.accounts.authority.key();
        protocol.total_bounties = 0;
        protocol.total_completed = 0;
        protocol.total_volume = 0;
        protocol.fee_bps = 250; // 2.5% platform fee
        Ok(())
    }

    /// Create a new bounty
    pub fn create_bounty(
        ctx: Context<CreateBounty>,
        title: String,
        description: String,
        reward_lamports: u64,
        deadline_ts: i64,
    ) -> Result<()> {
        require!(title.len() <= 100, ErrorCode::TitleTooLong);
        require!(description.len() <= 1000, ErrorCode::DescriptionTooLong);
        require!(reward_lamports >= 100_000_000, ErrorCode::RewardTooLow); // Min 0.1 SOL
        require!(reward_lamports <= 10_000_000_000, ErrorCode::RewardTooHigh); // Max 10 SOL
        
        let clock = Clock::get()?;
        require!(deadline_ts > clock.unix_timestamp, ErrorCode::InvalidDeadline);

        let protocol = &mut ctx.accounts.protocol;
        let bounty = &mut ctx.accounts.bounty;
        
        bounty.id = protocol.total_bounties;
        bounty.poster = ctx.accounts.poster.key();
        bounty.title = title;
        bounty.description = description;
        bounty.reward_lamports = reward_lamports;
        bounty.created_at = clock.unix_timestamp;
        bounty.deadline = deadline_ts;
        bounty.status = BountyStatus::Open;
        bounty.claimer = None;
        bounty.claimed_at = None;
        bounty.submission = None;
        bounty.completed_at = None;

        // Transfer SOL to escrow
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.poster.key(),
            &ctx.accounts.escrow.key(),
            reward_lamports,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.poster.to_account_info(),
                ctx.accounts.escrow.to_account_info(),
            ],
        )?;

        protocol.total_bounties += 1;
        protocol.total_volume += reward_lamports;

        emit!(BountyCreated {
            bounty_id: bounty.id,
            poster: bounty.poster,
            reward: reward_lamports,
            deadline: deadline_ts,
        });

        Ok(())
    }

    /// Claim a bounty
    pub fn claim_bounty(ctx: Context<ClaimBounty>) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        require!(bounty.status == BountyStatus::Open, ErrorCode::BountyNotOpen);
        
        let clock = Clock::get()?;
        require!(clock.unix_timestamp < bounty.deadline, ErrorCode::BountyExpired);
        require!(bounty.poster != ctx.accounts.claimer.key(), ErrorCode::CannotClaimOwnBounty);

        bounty.status = BountyStatus::Claimed;
        bounty.claimer = Some(ctx.accounts.claimer.key());
        bounty.claimed_at = Some(clock.unix_timestamp);

        emit!(BountyClaimed {
            bounty_id: bounty.id,
            claimer: ctx.accounts.claimer.key(),
        });

        Ok(())
    }

    /// Submit work for a bounty
    pub fn submit_work(ctx: Context<SubmitWork>, submission_url: String) -> Result<()> {
        require!(submission_url.len() <= 500, ErrorCode::SubmissionTooLong);
        
        let bounty = &mut ctx.accounts.bounty;
        require!(bounty.status == BountyStatus::Claimed, ErrorCode::BountyNotClaimed);
        require!(
            bounty.claimer == Some(ctx.accounts.claimer.key()),
            ErrorCode::NotBountyClaimer
        );

        let clock = Clock::get()?;
        require!(clock.unix_timestamp < bounty.deadline, ErrorCode::BountyExpired);

        bounty.status = BountyStatus::Submitted;
        bounty.submission = Some(submission_url.clone());

        emit!(WorkSubmitted {
            bounty_id: bounty.id,
            claimer: ctx.accounts.claimer.key(),
            submission: submission_url,
        });

        Ok(())
    }

    /// Approve work and release payment
    pub fn approve_work(ctx: Context<ApproveWork>) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        require!(bounty.status == BountyStatus::Submitted, ErrorCode::WorkNotSubmitted);
        require!(bounty.poster == ctx.accounts.poster.key(), ErrorCode::NotBountyPoster);

        let protocol = &ctx.accounts.protocol;
        let reward = bounty.reward_lamports;
        let fee = (reward * protocol.fee_bps as u64) / 10_000;
        let payout = reward - fee;

        // Transfer payout to claimer
        **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= payout;
        **ctx.accounts.claimer.to_account_info().try_borrow_mut_lamports()? += payout;

        // Transfer fee to protocol
        **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= fee;
        **ctx.accounts.fee_vault.to_account_info().try_borrow_mut_lamports()? += fee;

        bounty.status = BountyStatus::Completed;
        bounty.completed_at = Some(Clock::get()?.unix_timestamp);

        let protocol_mut = &mut ctx.accounts.protocol;
        protocol_mut.total_completed += 1;

        emit!(WorkApproved {
            bounty_id: bounty.id,
            claimer: bounty.claimer.unwrap(),
            payout,
            fee,
        });

        Ok(())
    }

    /// Cancel a bounty (only if unclaimed)
    pub fn cancel_bounty(ctx: Context<CancelBounty>) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        require!(bounty.status == BountyStatus::Open, ErrorCode::CannotCancelClaimed);
        require!(bounty.poster == ctx.accounts.poster.key(), ErrorCode::NotBountyPoster);

        let reward = bounty.reward_lamports;

        // Refund to poster
        **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= reward;
        **ctx.accounts.poster.to_account_info().try_borrow_mut_lamports()? += reward;

        bounty.status = BountyStatus::Cancelled;

        emit!(BountyCancelled {
            bounty_id: bounty.id,
        });

        Ok(())
    }
}

// ===== ACCOUNTS =====

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Protocol::LEN,
        seeds = [b"protocol"],
        bump
    )]
    pub protocol: Account<'info, Protocol>,
    
    /// CHECK: Protocol fee vault
    #[account(
        seeds = [b"fee_vault"],
        bump
    )]
    pub fee_vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateBounty<'info> {
    #[account(
        mut,
        seeds = [b"protocol"],
        bump
    )]
    pub protocol: Account<'info, Protocol>,
    
    #[account(
        init,
        payer = poster,
        space = 8 + Bounty::LEN,
        seeds = [b"bounty", protocol.total_bounties.to_le_bytes().as_ref()],
        bump
    )]
    pub bounty: Account<'info, Bounty>,
    
    /// CHECK: Escrow PDA for this bounty
    #[account(
        mut,
        seeds = [b"escrow", bounty.key().as_ref()],
        bump
    )]
    pub escrow: AccountInfo<'info>,
    
    #[account(mut)]
    pub poster: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimBounty<'info> {
    #[account(mut)]
    pub bounty: Account<'info, Bounty>,
    pub claimer: Signer<'info>,
}

#[derive(Accounts)]
pub struct SubmitWork<'info> {
    #[account(mut)]
    pub bounty: Account<'info, Bounty>,
    pub claimer: Signer<'info>,
}

#[derive(Accounts)]
pub struct ApproveWork<'info> {
    #[account(
        seeds = [b"protocol"],
        bump
    )]
    pub protocol: Account<'info, Protocol>,
    
    #[account(mut)]
    pub bounty: Account<'info, Bounty>,
    
    /// CHECK: Escrow PDA
    #[account(
        mut,
        seeds = [b"escrow", bounty.key().as_ref()],
        bump
    )]
    pub escrow: AccountInfo<'info>,
    
    /// CHECK: Fee vault
    #[account(
        mut,
        seeds = [b"fee_vault"],
        bump
    )]
    pub fee_vault: AccountInfo<'info>,
    
    /// CHECK: Claimer receives payout
    #[account(mut)]
    pub claimer: AccountInfo<'info>,
    
    pub poster: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelBounty<'info> {
    #[account(mut)]
    pub bounty: Account<'info, Bounty>,
    
    /// CHECK: Escrow PDA
    #[account(
        mut,
        seeds = [b"escrow", bounty.key().as_ref()],
        bump
    )]
    pub escrow: AccountInfo<'info>,
    
    #[account(mut)]
    pub poster: Signer<'info>,
}

// ===== STATE =====

#[account]
pub struct Protocol {
    pub authority: Pubkey,
    pub total_bounties: u64,
    pub total_completed: u64,
    pub total_volume: u64,
    pub fee_bps: u16,
}

impl Protocol {
    pub const LEN: usize = 32 + 8 + 8 + 8 + 2;
}

#[account]
pub struct Bounty {
    pub id: u64,
    pub poster: Pubkey,
    pub title: String,
    pub description: String,
    pub reward_lamports: u64,
    pub created_at: i64,
    pub deadline: i64,
    pub status: BountyStatus,
    pub claimer: Option<Pubkey>,
    pub claimed_at: Option<i64>,
    pub submission: Option<String>,
    pub completed_at: Option<i64>,
}

impl Bounty {
    pub const LEN: usize = 8 + 32 + (4 + 100) + (4 + 1000) + 8 + 8 + 8 + 1 + (1 + 32) + (1 + 8) + (1 + 500) + (1 + 8);
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum BountyStatus {
    Open,
    Claimed,
    Submitted,
    Completed,
    Cancelled,
}

// ===== EVENTS =====

#[event]
pub struct BountyCreated {
    pub bounty_id: u64,
    pub poster: Pubkey,
    pub reward: u64,
    pub deadline: i64,
}

#[event]
pub struct BountyClaimed {
    pub bounty_id: u64,
    pub claimer: Pubkey,
}

#[event]
pub struct WorkSubmitted {
    pub bounty_id: u64,
    pub claimer: Pubkey,
    pub submission: String,
}

#[event]
pub struct WorkApproved {
    pub bounty_id: u64,
    pub claimer: Pubkey,
    pub payout: u64,
    pub fee: u64,
}

#[event]
pub struct BountyCancelled {
    pub bounty_id: u64,
}

// ===== ERRORS =====

#[error_code]
pub enum ErrorCode {
    #[msg("Title must be 100 characters or less")]
    TitleTooLong,
    #[msg("Description must be 1000 characters or less")]
    DescriptionTooLong,
    #[msg("Reward must be at least 0.1 SOL")]
    RewardTooLow,
    #[msg("Reward cannot exceed 10 SOL")]
    RewardTooHigh,
    #[msg("Deadline must be in the future")]
    InvalidDeadline,
    #[msg("Bounty is not open")]
    BountyNotOpen,
    #[msg("Bounty has expired")]
    BountyExpired,
    #[msg("Cannot claim your own bounty")]
    CannotClaimOwnBounty,
    #[msg("Bounty is not claimed")]
    BountyNotClaimed,
    #[msg("You are not the claimer of this bounty")]
    NotBountyClaimer,
    #[msg("Work has not been submitted")]
    WorkNotSubmitted,
    #[msg("You are not the poster of this bounty")]
    NotBountyPoster,
    #[msg("Cannot cancel a claimed bounty")]
    CannotCancelClaimed,
    #[msg("Submission URL must be 500 characters or less")]
    SubmissionTooLong,
}
