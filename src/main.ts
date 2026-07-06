import "./styles.css";

import { toPng } from "html-to-image";

import { initStars } from "./background";
import { buildArtShapes, buildCard, spawnParticles } from "./card";
import { destroy3D, init3D } from "./effects";
import { fetchGH } from "./github";
import { findTierByName, genCard } from "./rarity";

const getUsername = () => window.location.hash.slice(1).trim();

// ── Background ──
initStars();

// ── DOM refs ──
const hero = document.getElementById("hero")!;
const cardSection = document.getElementById("cardSection")!;
const loading = document.getElementById("loading")!;
const loadingText = document.getElementById("loadingText")!;
const searchForm = document.getElementById("searchForm")!;
const usernameInput = document.getElementById("usernameInput") as HTMLInputElement;
const errorBox = document.getElementById("errorBox")!;
const card = document.getElementById("card")!;
const cardInner = document.getElementById("cardInner")!;
const backBtn = document.getElementById("backBtn")!;
const exportBtn = document.getElementById("exportBtn")!;
const scoreLine = document.getElementById("scoreLine")!;

// ── UI helpers ──
const showErr = (msg: string) => {
  errorBox.textContent = msg;
  errorBox.classList.add("show");
};
const hideErr = () => errorBox.classList.remove("show");
const setLoading = (msg: string) => {
  loadingText.textContent = msg;
  loading.classList.add("show");
};
const hideLoading = () => loading.classList.remove("show");

// ── Generate ──
async function generate(username: string): Promise<void> {
  hideErr();
  setLoading("FETCHING PROFILE DATA...");

  try {
    const userInfo = await fetchGH(username);
    const { user, repos, totalStars, langs } = userInfo;

    setLoading("CALCULATING RARITY...");
    await new Promise((r) => setTimeout(r, 300));

    let cardInfo = genCard(userInfo);

    if (import.meta.env.DEV) {
      const param = new URLSearchParams(window.location.search).get("rarity");
      const override = param ? findTierByName(param) : undefined;

      if (override) cardInfo = { ...cardInfo, tier: override };
    }

    setLoading("MINTING CARD...");
    await new Promise((r) => setTimeout(r, 350));

    card.className = `card ${cardInfo.tier.cls}`;
    cardInner.innerHTML = buildCard(user, totalStars, repos, langs, cardInfo);

    const foilLayer = document.getElementById("foilLayer")!;
    const glossLayer = document.getElementById("glossLayer")!;

    buildArtShapes(document.getElementById("artShapes")!, cardInfo.tier.cls);

    if (cardInfo.tier.cls === "r-legendary") {
      setTimeout(() => {
        const ptcls = document.getElementById("ptcls");

        if (ptcls) spawnParticles(ptcls);
      }, 100);
    }

    scoreLine.textContent = `Score: ${cardInfo.totalScore}/100 · ${cardInfo.tier.name}`;

    foilLayer.style.background = "";
    init3D(card, foilLayer, glossLayer);

    hideLoading();
    hero.style.display = "none";
    cardSection.classList.add("show");
    history.pushState({ username }, "", `#${username}`);
  } catch (err) {
    hideLoading();
    showErr(err instanceof Error ? err.message : "Something went wrong. Please try again.");
  }
}

function showHero(): void {
  destroy3D();
  cardSection.classList.remove("show");
  hero.style.display = "";
  usernameInput.value = "";
  const foilLayer = document.getElementById("foilLayer");

  if (foilLayer) foilLayer.style.background = "";

  card.style.removeProperty("--rx");
  card.style.removeProperty("--ry");
  hideErr();
}

// ── Events ──
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();

  if (!username) {
    showErr("Please enter a GitHub username");

    return;
  }

  generate(username);
});

backBtn.addEventListener("click", () => {
  history.pushState(null, "", window.location.pathname);
  showHero();
});

exportBtn.addEventListener("click", async () => {
  const username = getUsername() || "gitcg";
  const prevRx = card.style.getPropertyValue("--rx");
  const prevRy = card.style.getPropertyValue("--ry");

  card.style.setProperty("--rx", "0deg");
  card.style.setProperty("--ry", "0deg");

  try {
    const dataUrl = await toPng(card, { pixelRatio: 2 });
    const link = document.createElement("a");

    link.download = `${username}-gitcg.png`;
    link.href = dataUrl;
    link.click();
  } finally {
    if (prevRx) {
      card.style.setProperty("--rx", prevRx);
    } else {
      card.style.removeProperty("--rx");
    }

    if (prevRy) {
      card.style.setProperty("--ry", prevRy);
    } else {
      card.style.removeProperty("--ry");
    }
  }
});

window.addEventListener("hashchange", () => {
  const username = getUsername();

  if (username) {
    usernameInput.value = username;
    generate(username);
  } else {
    showHero();
  }
});

usernameInput.addEventListener("input", hideErr);

// ── Load from URL on entry ──
const initialUsername = getUsername();

if (initialUsername) {
  usernameInput.value = initialUsername;
  generate(initialUsername);
}
