import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import { chromium } from "playwright";
import { createServer } from "vite";

const output = resolve(process.argv[2] ?? "assets/card-demo.gif");
const demoAvatar = `data:image/webp;base64,${readFileSync(resolve("assets/demo-avatar.webp")).toString("base64")}`;
const frameRate = 10;
const framesPerCard = 14;
const profiles = [
  {
    login: "octocat",
    tier: "uncommon",
    stars: 20,
    followers: 8,
    prs: 4,
    issues: 2,
    years: 2,
    languages: ["JavaScript", "CSS"],
    repos: ["hello-world", "octo-sketch", "tiny-tools"],
  },
  {
    login: "typewizard",
    tier: "rare",
    stars: 50,
    followers: 15,
    prs: 8,
    issues: 4,
    years: 3,
    languages: ["TypeScript", "HTML"],
    repos: ["typed-paths", "schema-kit", "web-spells", "lint-scrolls"],
  },
  {
    login: "codeoracle",
    tier: "epic",
    stars: 150,
    followers: 40,
    prs: 20,
    issues: 10,
    years: 4,
    languages: ["Python", "Rust", "Shell"],
    repos: ["prophecy", "cargo-cult", "data-sight", "seer-cli", "omens"],
  },
  {
    login: "gitlegend",
    tier: "legendary",
    stars: 500,
    followers: 100,
    prs: 50,
    issues: 20,
    years: 6,
    languages: ["Go", "Rust", "TypeScript", "Python"],
    repos: ["constellation", "pixel-forge", "tiny-cloud", "star-map", "forge", "atlas"],
  },
];

if (
  !existsSync("/usr/sbin/ffmpeg") &&
  !process.env.PATH?.split(":").some((path) => existsSync(`${path}/ffmpeg`))
) {
  throw new Error("ffmpeg is required to generate the GIF");
}

const workDir = mkdtempSync(resolve(tmpdir(), "gitcg-demo-"));
const framesDir = resolve(workDir, "frames");
const palette = resolve(workDir, "palette.png");
mkdirSync(framesDir);
mkdirSync(dirname(output), { recursive: true });

const makeRepos = (profile) => {
  const weights = profile.repos.map((_, index) => profile.repos.length - index);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  let assignedStars = 0;

  return profile.repos.map((name, index) => {
    const isLast = index === profile.repos.length - 1;
    const stars = isLast
      ? profile.stars - assignedStars
      : Math.floor((profile.stars * weights[index]) / weightTotal);

    assignedStars += stars;

    return {
      name,
      language: profile.languages[index % profile.languages.length],
      stargazers_count: stars,
      fork: false,
    };
  });
};

const server = await createServer({
  logLevel: "error",
  server: { host: "127.0.0.1", port: 4173, strictPort: true },
});

let browser;

try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 720, height: 900 },
    deviceScaleFactor: 1,
  });

  await page.route("https://api.github.com/**", async (route) => {
    const url = new URL(route.request().url());
    const profile =
      profiles.find(({ login }) => `${url.pathname}${url.search}`.includes(login)) ?? profiles[0];
    let body;

    if (url.pathname === "/search/issues") {
      body = {
        total_count: url.searchParams.get("q")?.includes("type:pr") ? profile.prs : profile.issues,
      };
    } else if (url.pathname.endsWith("/repos")) {
      body = makeRepos(profile);
    } else {
      body = {
        id: profiles.indexOf(profile) + 100,
        login: profile.login,
        avatar_url: demoAvatar,
        public_repos: profile.repos.length,
        followers: profile.followers,
        created_at: new Date(Date.now() - profile.years * 31_557_600_000).toISOString(),
      };
    }

    await route.fulfill({ json: body });
  });

  let frame = 0;

  for (const profile of profiles) {
    await page.goto(`http://127.0.0.1:4173/#${profile.login}`);
    await page.locator("#cardSection.show").waitFor();
    await page.locator("#card .c-name").filter({ hasText: profile.login }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    const card = page.locator("#card");

    if (
      !(await card.evaluate(
        (element, tier) => element.classList.contains(`r-${tier}`),
        profile.tier,
      ))
    ) {
      throw new Error(
        `${profile.login} did not calculate as ${profile.tier}: ${await card.getAttribute("class")}, ${await page.locator("#scoreLine").textContent()}`,
      );
    }

    const box = await card.boundingBox();

    if (!box) throw new Error("Card was not rendered");

    for (let step = 0; step < framesPerCard; step++) {
      const angle = (step / framesPerCard) * Math.PI * 2;
      await page.mouse.move(
        box.x + box.width * (0.5 + Math.cos(angle) * 0.32),
        box.y + box.height * (0.5 + Math.sin(angle) * 0.25),
      );
      await page.waitForTimeout(70);
      await page.screenshot({
        path: resolve(framesDir, `${String(frame++).padStart(4, "0")}.png`),
      });
    }
  }

  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-framerate",
      String(frameRate),
      "-i",
      resolve(framesDir, "%04d.png"),
      "-vf",
      "scale=540:-1:flags=lanczos,palettegen=stats_mode=diff",
      palette,
    ],
    { stdio: "ignore" },
  );
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-framerate",
      String(frameRate),
      "-i",
      resolve(framesDir, "%04d.png"),
      "-i",
      palette,
      "-lavfi",
      "scale=540:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3",
      "-loop",
      "0",
      output,
    ],
    { stdio: "ignore" },
  );

  console.log(`Generated ${output}`);
} finally {
  await browser?.close();
  await server.close();
  rmSync(workDir, { recursive: true, force: true });
}
