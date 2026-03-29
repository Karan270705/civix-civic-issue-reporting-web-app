export interface User {
  id: number;
  username: string;
  email: string;
  bio?: string;
  profile_image?: string | null;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  username: string;
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  bio?: string;
  profile_image?: string | null;
}

export interface UserStats {
  issuesPosted: number;
  solutionsGiven: number;
  acceptedSolutions: number;
  civicScore: number;
}

export interface Badge {
  id: string;
  label: string;
  description: string;
  icon: string;
  earned: boolean;
}
