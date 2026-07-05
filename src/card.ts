import type { UserCardInfo } from "./rarity";
import { METRIC_DEFS } from "./rarity";
import type { GHRepo, GHUser } from "./types";
import { fmt } from "./utils";

const TOP_REPOS = 3;

const LANG_CLASS: Record<string, string> = {
  JavaScript: "Full Stack Architect",
  TypeScript: "Type-Safe Engineer",
  Python: "Data Wizard",
  Rust: "Systems Hacker",
  Go: "Cloud Native",
  Java: "Enterprise Warrior",
  Kotlin: "JVM Artisan",
  "C++": "Low-Level Sage",
  C: "Memory Alchemist",
  Ruby: "Web Craftsman",
  PHP: "Web Survivor",
  Swift: "iOS Conjurer",
  Dart: "Flutter Mage",
  "C#": ".NET Knight",
  Scala: "Functional Monk",
  Haskell: "Lambda Priest",
  Elixir: "Concurrency Sage",
  Shell: "Terminal Wizard",
  HTML: "DOM Sculptor",
  CSS: "Style Artisan",
  Svelte: "Reactive Artist",
  R: "Statistics Oracle",
  Lua: "Scripting Shaman",
  Zig: "Bare Metal Mage",
  Nim: "Efficiency Alchemist",
};

const WEAKNESSES = [
  "Legacy Code",
  "Scope Creep",
  "Merge Conflicts",
  "Undocumented APIs",
  "Mondays",
  "Big Rewrites",
  "Off-by-one Errors",
  "Infinite Loops",
  "Missing Semicolons",
  "Copy-Paste Code",
  "Null Pointers",
  "Dependency Hell",
  "Regex",
  "CSS Centering",
  "Timezone Math",
  "Stack Overflows",
  "Unreviewed PRs",
  "Technical Debt",
  "Interview Pressure",
  "Production Hotfixes",
  "Burnout",
  "The Browser Console",
  "Rubber Duck Unavailable",
  "Async Callbacks",
];

const ART_PALETTES: Record<string, string[]> = {
  "r-common": ["#2d3748", "#3d4f6a", "#4a5e78"],
  "r-uncommon": ["#1c4532", "#2d6a4f", "#1a5c3a"],
  "r-rare": ["#1a3a8a", "#163a6e", "#1e4db7"],
  "r-epic": ["#3b0764", "#4c1d95", "#6d28d9"],
  "r-legendary": ["#451a03", "#78350f", "#92400e"],
};

export function devClass(
  user: GHUser,
  langs: string[],
  totalStars: number,
  repos: GHRepo[],
): string {
  if (user.followers > 5000) return "Open Source Legend";

  if (user.followers > 1000) return "Community Leader";

  if (totalStars > 1000) return "Star Collector";

  if (repos.length > 100) return "Serial Creator";

  if (langs[0] && LANG_CLASS[langs[0]]) return LANG_CLASS[langs[0]];

  return "Software Engineer";
}

export function buildArtShapes(container: HTMLElement, rarityClass: string): void {
  const palette = ART_PALETTES[rarityClass] ?? ART_PALETTES["r-common"];

  container.innerHTML = "";
  const count = 5 + Math.floor(Math.random() * 4);

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");

    el.className = "art-shape";
    const size = 35 + Math.random() * 75;

    el.style.cssText = `
      width:${size}px; height:${size}px;
      background:${palette[i % palette.length]};
      left:${Math.random() * 100}%; top:${Math.random() * 100}%;
      transform:translate(-50%,-50%) rotate(${Math.random() * 360}deg);
      border-radius:${Math.random() > 0.4 ? "50%" : Math.round(Math.random() * 40) + "%"};
    `;
    container.appendChild(el);
  }
}

export function spawnParticles(container: HTMLElement): void {
  const colors = ["#fde68a", "#fbbf24", "#fff", "#fef9c3", "#fb923c"];

  function makeParticle(): void {
    const p = document.createElement("div");

    p.className = "ptcl";
    const size = Math.random() * 3 + 1;
    const color = colors[Math.floor(Math.random() * colors.length)];

    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      bottom:0;
      background:${color};
      box-shadow:0 0 4px ${color};
      animation-duration:${2.5 + Math.random() * 3}s;
      animation-delay:${Math.random() * 2}s;
    `;
    container.appendChild(p);
    p.addEventListener("animationend", () => {
      p.remove();
      makeParticle();
    });
  }

  for (let i = 0; i < 14; i++) makeParticle();
}

export function buildCard(
  user: GHUser,
  totalStars: number,
  repos: GHRepo[],
  langs: string[],
  cardInfo: UserCardInfo,
): string {
  const cls = devClass(user, langs, totalStars, repos);
  const joinYear = new Date(user.created_at).getFullYear();
  const cardNum = String((Math.abs(user.id) % 999) + 1).padStart(3, "0");
  const weakness = WEAKNESSES[user.id % WEAKNESSES.length];

  const chips = langs
    .slice(0, 3)
    .map((l) => `<span class="lang-chip">${l}</span>`)
    .join("");

  const topRepos = [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, TOP_REPOS);
  const reposHTML = topRepos.length
    ? topRepos
        .map(
          (r) => `
        <div class="repo-row">
          <span class="repo-name">${r.name}</span>
          <span class="repo-meta">
            ${r.language ? `<span class="repo-lang">${r.language}</span>` : ""}
            <span class="repo-stars">★ ${fmt(r.stargazers_count)}</span>
          </span>
        </div>`,
        )
        .join("")
    : "";

  const metricsHTML = `<div class="metric-bars">
    ${METRIC_DEFS.map(
      ({ name, key, rawKey, max }) => `
      <div class="metric-bar-row">
        <span class="metric-bar-name">${name}</span>
        <div class="metric-bar-track">
          <div class="metric-bar-fill" style="width:${Math.min(((cardInfo[key] as number) / max) * 100, 100)}%"></div>
        </div>
        <span class="metric-bar-pct">${fmt(cardInfo.metrics[rawKey])}</span>
      </div>`,
    ).join("")}
  </div>`;

  const particlesSlot =
    cardInfo.tier.cls === "r-legendary" ? '<div class="particles" id="ptcls"></div>' : "";

  return `
    <div class="c-header">
      <div class="c-name">${user.login}</div>
      <div class="c-score">
        <span class="c-score-label">Score&nbsp;</span>
        <span class="c-score-val">${cardInfo.totalScore}</span>
        <span class="c-score-unit">/100</span>
      </div>
    </div>
    <div class="c-art">
      ${particlesSlot}
      <div class="art-shapes" id="artShapes"></div>
      <div class="c-rarity-badge">${cardInfo.tier.name}</div>
      <div class="avatar-ring">
        <img src="${user.avatar_url}" alt="${user.login}" crossorigin="anonymous">
      </div>
    </div>
    <div class="c-type-strip">
      <span class="c-class">${cls}</span>
      ${chips}
    </div>
    <div class="c-repos">${reposHTML}${metricsHTML}</div>
    <div class="c-stats">
      <div class="stat">
        <div class="stat-val">${fmt(user.public_repos || 0)}</div>
        <div class="stat-lbl">Repos</div>
      </div>
      <div class="stat-div"></div>
      <div class="stat">
        <div class="stat-val">${fmt(totalStars)}</div>
        <div class="stat-lbl">Stars</div>
      </div>
      <div class="stat-div"></div>
      <div class="stat">
        <div class="stat-val">${fmt(user.followers || 0)}</div>
        <div class="stat-lbl">Followers</div>
      </div>
    </div>
    <div class="c-footer">
      <span class="c-weakness">WEAKNESS: ${weakness}</span>
      <div class="c-footer-right">
        <span class="c-num">#${cardNum} · Since ${joinYear}</span>
        <span class="c-sym">${cardInfo.tier.sym}</span>
      </div>
    </div>
    <div class="foil-layer" id="foilLayer"></div>
    <div class="gloss-layer" id="glossLayer"></div>
  `;
}
