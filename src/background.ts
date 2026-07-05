interface Star {
  x: number;
  y: number;
  r: number;
  o: number;
  s: number;
  t: number;
}

export function initStars(): void {
  const canvas = document.getElementById("bgCanvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  let stars: Star[] = [];

  function resize(): void {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function populate(): void {
    stars = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.1 + 0.2,
      o: Math.random() * 0.45 + 0.08,
      s: Math.random() * 0.4 + 0.05,
      t: Math.random() * Math.PI * 2,
    }));
  }

  function draw(): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = Date.now() / 1000;

    for (const star of stars) {
      const alpha = star.o * (0.5 + 0.5 * Math.sin(now * star.s * 5 + star.t));

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  resize();
  populate();
  draw();
  window.addEventListener("resize", () => {
    resize();
    populate();
  });
}
