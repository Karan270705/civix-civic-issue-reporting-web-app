// ─── Status / Category / Vote enums ──────────────────────────────────────────

export type IssueCategory = 'pothole' | 'garbage' | 'water' | 'electricity' | 'other';
export type IssueStatus   = 'reported' | 'verified' | 'in_progress' | 'resolved';
export type VoteType      = 'up' | 'down';

// ─── Core Issue model ─────────────────────────────────────────────────────────

export interface Issue {
  id: number;
  title: string;
  description: string;
  image_url: string | null;
  location: string;
  lat: number | null;
  lng: number | null;
  category: IssueCategory;
  status: IssueStatus;
  created_by: number;
  created_at: string;          // ISO string — keeps JSON-safe for localStorage
  username?: string;
  vote_count: number;          // net votes (up - down)
  user_vote: VoteType | null;  // current user's vote on this issue
}

// ─── Filter / sort state ──────────────────────────────────────────────────────

export type SortOption = 'newest' | 'most_voted';

export interface IssueFilter {
  category: IssueCategory | 'all';
  status: IssueStatus | 'all';
  sort: SortOption;
}

// ─── Payload for creating a new issue ────────────────────────────────────────

export interface CreateIssuePayload {
  title: string;
  description: string;
  image_url?: string | null;
  location: string;
  lat?: number | null;
  lng?: number | null;
  category: IssueCategory;
}
