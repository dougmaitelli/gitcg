export interface UserStats {
  user: GHUser;
  repos: GHRepo[];
  totalStars: number;
  totalPRs: number;
  totalIssues: number;
  langs: string[];
}

export interface GHUser {
  id: number;
  login: string;
  avatar_url: string;
  bio: string | null;
  location: string | null;
  blog: string | null;
  company: string | null;
  twitter_username: string | null;
  created_at: string;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
}

export interface GHRepo {
  name: string;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
  open_issues_count: number;
}
