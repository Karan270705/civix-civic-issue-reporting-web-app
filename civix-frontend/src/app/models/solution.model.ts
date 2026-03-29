export interface Solution {
  id: number;
  issue_id: number;
  user_id: number;
  solution_text: string;
  created_at: string;
  username?: string;
  upvotes: number;
  user_voted?: boolean;
  is_accepted?: boolean;
}
