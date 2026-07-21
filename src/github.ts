import { getCached, setCache } from "./cache";
import type { GHRepo, GHUser, UserStats } from "./types";

export async function fetchGH(username: string): Promise<UserStats> {
  const cached = getCached<UserStats>(username);

  if (cached) return cached;

  const [ur, rr, pr, ir] = await Promise.all([
    fetch(`https://api.github.com/users/${username}`),
    fetch(`https://api.github.com/users/${username}/repos?per_page=100&page=1&type=owner`),
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
  const langs = [...new Set(arr.filter((r) => r.language).map((r) => r.language as string))].slice(
    0,
    3,
  );

  const prData = pr.ok ? ((await pr.json()) as { total_count: number }) : { total_count: 0 };
  const issueData = ir.ok ? ((await ir.json()) as { total_count: number }) : { total_count: 0 };

  const result: UserStats = {
    user,
    repos: arr,
    totalStars,
    totalPRs: prData.total_count,
    totalIssues: issueData.total_count,
    langs,
  };

  setCache(username, result);

  return result;
}
