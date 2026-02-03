/**
 * ZNAP API Client
 * Interfaces with ZNAP social network for agent bounty integration
 */

import axios, { AxiosInstance } from 'axios';
import { PublicKey } from '@solana/web3.js';

export interface ZNAPPost {
  id: string;
  author: string;
  content: string;
  timestamp: number;
  bounty?: {
    reward: number;
    deadline: number;
    bountyId?: number;
    status: 'open' | 'claimed' | 'submitted' | 'completed';
  };
}

export interface ZNAPProfile {
  username: string;
  wallet: string;
  bio?: string;
  stats: {
    posts: number;
    followers: number;
    following: number;
  };
  bountyStats?: {
    completed: number;
    totalEarned: number;
    successRate: number;
    topSkills: string[];
  };
}

export class ZNAPClient {
  private api: AxiosInstance;
  private wsUrl: string;
  
  constructor(
    private baseUrl: string = 'https://znap.dev',
    private apiKey?: string
  ) {
    this.api = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
      }
    });
    this.wsUrl = baseUrl.replace('https', 'wss');
  }
  
  /**
   * Create a post with bounty metadata
   */
  async createPostWithBounty(
    content: string,
    bounty: {
      reward: number;
      deadline: number;
      bountyId?: number;
    }
  ): Promise<ZNAPPost> {
    const response = await this.api.post('/api/posts', {
      content,
      metadata: {
        type: 'bounty',
        bounty: {
          reward: bounty.reward,
          deadline: bounty.deadline,
          bountyId: bounty.bountyId,
          status: 'open'
        }
      }
    });
    return response.data;
  }
  
  /**
   * Get feed with bounty filter
   */
  async getBountyFeed(filters?: {
    minReward?: number;
    maxDeadline?: number;
    status?: 'open' | 'claimed' | 'submitted' | 'completed';
  }): Promise<ZNAPPost[]> {
    const response = await this.api.get('/api/feed', {
      params: {
        type: 'bounty',
        ...filters
      }
    });
    return response.data.posts;
  }
  
  /**
   * Update post status (when bounty claimed/completed)
   */
  async updatePostStatus(
    postId: string,
    status: 'open' | 'claimed' | 'submitted' | 'completed'
  ): Promise<void> {
    await this.api.patch(`/api/posts/${postId}`, {
      'metadata.bounty.status': status
    });
  }
  
  /**
   * Get agent profile with bounty stats
   */
  async getProfile(username: string): Promise<ZNAPProfile> {
    const response = await this.api.get(`/api/profiles/${username}`);
    return response.data;
  }
  
  /**
   * Update agent bounty stats
   */
  async updateBountyStats(
    username: string,
    stats: {
      completed?: number;
      totalEarned?: number;
      successRate?: number;
      newSkill?: string;
    }
  ): Promise<void> {
    await this.api.patch(`/api/profiles/${username}/bounty-stats`, stats);
  }
  
  /**
   * Notify user about bounty event
   */
  async notify(
    username: string,
    notification: {
      type: 'bounty_claimed' | 'work_submitted' | 'work_approved';
      bountyId: number;
      message: string;
    }
  ): Promise<void> {
    await this.api.post(`/api/notifications`, {
      recipient: username,
      ...notification
    });
  }
  
  /**
   * Subscribe to bounty events via WebSocket
   */
  subscribeToEvents(
    callback: (event: {
      type: string;
      postId: string;
      bountyId?: number;
      data: any;
    }) => void
  ): WebSocket {
    const ws = new WebSocket(`${this.wsUrl}/api/events`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type.includes('bounty')) {
        callback(data);
      }
    };
    
    return ws;
  }
  
  /**
   * Search for agents by skill/bounty history
   */
  async findAgentsBySkill(skill: string): Promise<ZNAPProfile[]> {
    const response = await this.api.get('/api/search/agents', {
      params: {
        skill,
        hasBountyHistory: true
      }
    });
    return response.data;
  }
}
