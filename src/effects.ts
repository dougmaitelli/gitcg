let abortController: AbortController | null = null;

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function setTilt(
  card: HTMLElement,
  foilLayer: HTMLElement,
  glossLayer: HTMLElement,
  rotX: number,
  rotY: number,
) {
  card.style.setProperty("--rx", `${rotX}deg`);
  card.style.setProperty("--ry", `${rotY}deg`);
  const foilX = 50 + (rotY / 13) * 50;
  const foilY = 50 - (rotX / 13) * 50;

  glossLayer.style.setProperty("--gx", `${foilX}%`);
  glossLayer.style.setProperty("--gy", `${foilY}%`);
  foilLayer.style.setProperty("--foil-x", `${foilX}`);
  foilLayer.style.setProperty("--foil-y", `${foilY}`);
}

function resetTilt(card: HTMLElement, foilLayer: HTMLElement, glossLayer: HTMLElement) {
  card.style.removeProperty("--rx");
  card.style.removeProperty("--ry");
  glossLayer.style.removeProperty("--gx");
  glossLayer.style.removeProperty("--gy");
  foilLayer.style.removeProperty("--foil-x");
  foilLayer.style.removeProperty("--foil-y");
}

function initMouseTilt(
  card: HTMLElement,
  foilLayer: HTMLElement,
  glossLayer: HTMLElement,
  signal: AbortSignal,
) {
  card.addEventListener("mouseleave", () => resetTilt(card, foilLayer, glossLayer), { signal });

  card.addEventListener(
    "mousemove",
    (e) => {
      const rect = card.getBoundingClientRect();
      const rotX = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -13;
      const rotY = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 13;

      setTilt(card, foilLayer, glossLayer, rotX, rotY);
    },
    { signal },
  );
}

type DOEWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

function initAccelerometer(
  card: HTMLElement,
  foilLayer: HTMLElement,
  glossLayer: HTMLElement,
  signal: AbortSignal,
) {
  const startListening = () => {
    let baselineGamma: number | null = null;
    let baselineBeta: number | null = null;
    let lastTime = performance.now();

    window.addEventListener(
      "deviceorientation",
      (e) => {
        if (e.gamma === null || e.beta === null) return;

        const now = performance.now();
        const elapsed = Math.min(now - lastTime, 100);

        lastTime = now;

        if (baselineGamma === null || baselineBeta === null) {
          baselineGamma = e.gamma;
          baselineBeta = e.beta;

          return;
        }

        // Treat the current viewing angle as neutral. The baseline slowly follows the device,
        // producing a temporary tilt from movement that settles back to center when held still.
        const settleDuration = 1800;
        const follow = 1 - Math.exp((-elapsed * Math.log(100)) / settleDuration);

        baselineGamma += (e.gamma - baselineGamma) * follow;
        baselineBeta += (e.beta - baselineBeta) * follow;

        const relativeGamma = e.gamma - baselineGamma;
        const relativeBeta = e.beta - baselineBeta;
        const rotY = clamp(relativeGamma / 18, -1, 1) * 13;
        const rotX = clamp(relativeBeta / 18, -1, 1) * -13;

        setTilt(card, foilLayer, glossLayer, rotX, rotY);
      },
      { signal },
    );
  };

  // iOS 13+ requires explicit user-gesture permission
  const DOE = DeviceOrientationEvent as DOEWithPermission;

  if (typeof DOE.requestPermission === "function") {
    card.addEventListener(
      "click",
      () => {
        DOE.requestPermission!().then((perm) => {
          if (perm === "granted") startListening();
        });
      },
      { once: true, signal },
    );
  } else {
    startListening();
  }
}

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

  const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  if (isTouch && "DeviceOrientationEvent" in window) {
    initAccelerometer(card, foilLayer, glossLayer, signal);
  } else {
    initMouseTilt(card, foilLayer, glossLayer, signal);
  }
}

export function destroy3D(): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}
