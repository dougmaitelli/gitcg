let abortController: AbortController | null = null;

export function init3D(card: HTMLElement, foilLayer: HTMLElement, glossLayer: HTMLElement): void {
  if (abortController) abortController.abort();

  abortController = new AbortController();
  const { signal } = abortController;

  card.addEventListener(
    "animationend",
    () => {
      card.style.animation = "none";
    },
    { once: true, signal },
  );

  card.addEventListener(
    "mouseleave",
    () => {
      card.style.removeProperty("--rx");
      card.style.removeProperty("--ry");
      glossLayer.style.removeProperty("--gx");
      glossLayer.style.removeProperty("--gy");
      foilLayer.style.removeProperty("--foil-x");
      foilLayer.style.removeProperty("--foil-y");
    },
    { signal },
  );

  card.addEventListener(
    "mousemove",
    (e) => {
      const rect = card.getBoundingClientRect();
      const rotX = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -13;
      const rotY = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 13;

      card.style.setProperty("--rx", `${rotX}deg`);
      card.style.setProperty("--ry", `${rotY}deg`);

      const foilX = 50 + (rotY / 13) * 50;
      const foilY = 50 - (rotX / 13) * 50;

      glossLayer.style.setProperty("--gx", `${foilX}%`);
      glossLayer.style.setProperty("--gy", `${foilY}%`);

      foilLayer.style.setProperty("--foil-x", `${foilX}`);
      foilLayer.style.setProperty("--foil-y", `${foilY}`);
    },
    { signal },
  );
}
