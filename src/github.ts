import { getCached, setCache } from "./cache";
import type { GHRepo, GHUser, UserStats } from "./types";

const MS_PER_YEAR = 31_557_600_000;

function repositoryLanguageScore(repo: GHRepo, now: number): number {
  const lastActivity = new Date(repo.pushed_at ?? repo.created_at).getTime();
  const ageYears = Number.isFinite(lastActivity)
    ? Math.max(0, (now - lastActivity) / MS_PER_YEAR)
    : 10;
  const starsScore = Math.log10(Math.max(repo.stargazers_count || 0, 0) + 1) * 3;
  const recencyScore = 5 / (1 + ageYears);

  return 1 + starsScore + recencyScore;
}

export async function fetchGH(username: string): Promise<UserStats> {
  const cached = getCached<UserStats>(username);

  if (cached && typeof cached.totalCommits === "number") return cached;

  const [ur, rr, cr, pr, ir] = await Promise.all([
    fetch(`https://api.github.com/users/${username}`),
    fetch(`https://api.github.com/users/${username}/repos?per_page=100&page=1&type=owner`),
    fetch(`https://api.github.com/search/commits?q=author:${username}&per_page=1`),
    fetch(`https://api.github.com/search/issues?q=author:${username}+type:pr&per_page=1`),
    fetch(`https://api.github.com/search/issues?q=author:${username}+type:issue&per_page=1`),
  ]);

  if (!ur.ok) {
    if (ur.status === 404) throw new Error("User not found");

    if (ur.status === 403) {
      const reset = ur.headers.get("X-RateLimit-Reset");
      const secs = reset ? Math.max(0, Math.ceil(Number(reset) - Date.now() / 1000)) : null;
      const when =
        secs === null ? "in a minute" : secs < 60 ? `in ${secs}s` : `in ${Math.ceil(secs / 60)}m`;

      throw new Error(`Rate limit hit — try again ${when}`);
    }

    throw new Error(`GitHub error ${ur.status}`);
  }

  const user: GHUser = (await ur.json()) as GHUser;
  const raw: unknown = rr.ok ? await rr.json() : [];
  const firstPage: GHRepo[] = Array.isArray(raw) ? (raw as GHRepo[]) : [];
  const allRepos = [...firstPage];

  for (let page = 2; firstPage.length === 100; page++) {
    const response = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100&page=${page}&type=owner`,
    );

    if (!response.ok) break;

    const pageData: unknown = await response.json();
    const pageRepos = Array.isArray(pageData) ? (pageData as GHRepo[]) : [];

    allRepos.push(...pageRepos);

    if (pageRepos.length < 100) break;
  }

  // Fork stars belong to the upstream project, so card metrics only use original repositories.
  const arr = allRepos.filter((repo) => !repo.fork);

  const totalStars = arr.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
  const now = Date.now();
  const languageRanks = arr.reduce<Map<string, { score: number; repos: number }>>((ranks, repo) => {
    if (repo.language) {
      const current = ranks.get(repo.language) ?? { score: 0, repos: 0 };

      ranks.set(repo.language, {
        score: current.score + repositoryLanguageScore(repo, now),
        repos: current.repos + 1,
      });
    }

    return ranks;
  }, new Map());
  const langs = [...languageRanks.entries()]
    .sort(
      ([languageA, rankA], [languageB, rankB]) =>
        rankB.score - rankA.score ||
        rankB.repos - rankA.repos ||
        languageA.localeCompare(languageB),
    )
    .slice(0, 3)
    .map(([language]) => language);

  const commitData = cr.ok ? ((await cr.json()) as { total_count: number }) : { total_count: 0 };
  const prData = pr.ok ? ((await pr.json()) as { total_count: number }) : { total_count: 0 };
  const issueData = ir.ok ? ((await ir.json()) as { total_count: number }) : { total_count: 0 };

  const result: UserStats = {
    user,
    repos: arr,
    totalStars,
    totalCommits: commitData.total_count,
    totalPRs: prData.total_count,
    totalIssues: issueData.total_count,
    langs,
  };

  setCache(username, result);

  return result;
}
