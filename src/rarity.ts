import type { UserStats } from "./types";

const MS_PER_YEAR = 31_557_600_000;

export interface Tier {
  min: number;
  name: string;
  cls: string;
  sym: string;
  level: number;
}

export interface CardMetrics {
  totalStars: number;
  totalFollowers: number;
  totalCommits: number;
  totalPRs: number;
  totalIssues: number;
  avgStars: number;
  uniqueLangs: number;
  years: number;
}

export interface UserCardInfo {
  tier: Tier;
  metrics: CardMetrics;
  starsScore: number;
  followersScore: number;
  commitsScore: number;
  prsScore: number;
  issuesScore: number;
  avgStarsScore: number;
  languagesScore: number;
  ageScore: number;
  totalScore: number;
}

const TIERS: Tier[] = [
  { name: "Common", cls: "r-common", sym: "●", level: 1, min: 0 },
  { name: "Uncommon", cls: "r-uncommon", sym: "◆", level: 2, min: 20 },
  { name: "Rare", cls: "r-rare", sym: "★", level: 3, min: 40 },
  { name: "Epic", cls: "r-epic", sym: "✦", level: 4, min: 60 },
  { name: "Legendary", cls: "r-legendary", sym: "⬟", level: 5, min: 80 },
];

export interface MetricDef {
  name: string;
  key: keyof UserCardInfo;
  rawKey: keyof CardMetrics;
  max: number;
}

export const METRIC_DEFS: MetricDef[] = [
  { name: "Stars", key: "starsScore", rawKey: "totalStars", max: 35 },
  { name: "Followers", key: "followersScore", rawKey: "totalFollowers", max: 30 },
  { name: "Commits", key: "commitsScore", rawKey: "totalCommits", max: 15 },
  { name: "PRs", key: "prsScore", rawKey: "totalPRs", max: 20 },
  { name: "Issues", key: "issuesScore", rawKey: "totalIssues", max: 15 },
  { name: "Avg. Stars", key: "avgStarsScore", rawKey: "avgStars", max: 15 },
  { name: "Languages", key: "languagesScore", rawKey: "uniqueLangs", max: 10 },
  { name: "Account Age", key: "ageScore", rawKey: "years", max: 10 },
];

export function findTierByName(name: string): Tier | undefined {
  return TIERS.find((t) => t.name.toLowerCase() === name.toLowerCase());
}

export function genCard({
  user,
  repos,
  totalStars,
  totalCommits,
  totalPRs,
  totalIssues,
}: UserStats): UserCardInfo {
  const years = (Date.now() - new Date(user.created_at).getTime()) / MS_PER_YEAR;
  const avgStars = totalStars / Math.max(repos.length, 1);

  const uniqueLangs = new Set(repos.filter((r) => r.language).map((r) => r.language)).size;

  const starsScore = Math.min(Math.log10(totalStars + 1) * 7, 35); // 35 at ~100k stars
  const followersScore = Math.min(Math.log10(user.followers + 1) * 7.5, 30); // 30 at ~10k followers
  const commitsScore = Math.min(Math.log10(totalCommits + 1) * 4.06, 15); // 15 at ~5k commits
  const prsScore = Math.min(Math.log10(totalPRs + 1) * 6.67, 20); // 20 at ~1k PRs
  const issuesScore = Math.min(Math.log10(totalIssues + 1) * 5, 15); // 15 at ~1k issues
  const avgStarsScore = Math.min(Math.log10(avgStars + 1) * 5, 15); // 15 at ~1k avg stars/repo
  const languagesScore = Math.min(uniqueLangs * 2, 10); // ~10 at 5+ languages
  const ageScore = Math.min(years * 1.25, 10); // ~10 at 8+ years

  const userScore = Math.round(
    Math.min(
      starsScore +
        followersScore +
        commitsScore +
        prsScore +
        issuesScore +
        avgStarsScore +
        languagesScore +
        ageScore,
      100,
    ),
  );

  const tier = [...TIERS].reverse().find((t) => userScore >= t.min) ?? TIERS[0];

  const round1 = (n: number) => Math.round(n * 10) / 10;

  return {
    tier,
    metrics: {
      totalStars,
      totalFollowers: user.followers,
      totalCommits,
      totalPRs,
      totalIssues,
      avgStars: round1(avgStars),
      uniqueLangs,
      years: Math.floor(years),
    },
    starsScore: round1(starsScore),
    followersScore: round1(followersScore),
    commitsScore: round1(commitsScore),
    prsScore: round1(prsScore),
    issuesScore: round1(issuesScore),
    avgStarsScore: round1(avgStarsScore),
    languagesScore: round1(languagesScore),
    ageScore: round1(ageScore),
    totalScore: userScore,
  };
}
