interface Star {
  x: number;
  y: number;
  r: number;
  alpha: number;
  speed: number;
  phase: number;
  color: string;
  driftX: number;
  driftY: number;
}

const STAR_COLORS = ['#ffffff', '#a8c4ff', '#ffd9a8'];
const STAR_COUNT = 150;

function createStars(width: number, height: number): Star[] {
  return Array.from({ length: STAR_COUNT }, () => {
    const size = Math.random();
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      r: size < 0.6 ? 0.3 + Math.random() * 0.5 : size < 0.9 ? 0.8 + Math.random() * 0.6 : 1.4 + Math.random() * 0.4,
      alpha: 0.2 + Math.random() * 0.8,
      speed: 0.3 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      driftX: (Math.random() - 0.5) * 0.04,
      driftY: (Math.random() - 0.5) * 0.04,
    };
  });
}

function drawFrame(ctx: CanvasRenderingContext2D, stars: Star[], width: number, height: number, time: number): void {
  ctx.clearRect(0, 0, width, height);
  for (const star of stars) {
    const alpha = star.alpha * (0.5 + 0.5 * Math.sin(time * star.speed + star.phase));
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fillStyle = star.color;
    ctx.globalAlpha = alpha;
    ctx.fill();

    if (star.r > 1.2) {
      star.x += star.driftX;
      star.y += star.driftY;
      if (star.x < 0) star.x = width;
      if (star.x > width) star.x = 0;
      if (star.y < 0) star.y = height;
      if (star.y > height) star.y = 0;
    }
  }
  ctx.globalAlpha = 1;
}

export function initStarCanvas(): () => void {
  const canvas = document.getElementById('star-canvas') as HTMLCanvasElement | null;
  if (!canvas) return () => {};

  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const dpr = window.devicePixelRatio || 1;
  let width = window.innerWidth;
  let height = window.innerHeight;
  let stars = createStars(width, height);
  let rafId = 0;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas!.width = width * dpr;
    canvas!.height = height * dpr;
    canvas!.style.width = `${width}px`;
    canvas!.style.height = `${height}px`;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = createStars(width, height);
  }

  resize();

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    drawFrame(ctx, stars, width, height, 0);
    return () => {};
  }

  let resizeTimer: ReturnType<typeof setTimeout>;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  }

  window.addEventListener('resize', onResize);

  let startTime: number | null = null;
  function animate(timestamp: number) {
    if (!startTime) startTime = timestamp;
    const elapsed = (timestamp - startTime) / 1000;
    drawFrame(ctx!, stars, width, height, elapsed);
    rafId = requestAnimationFrame(animate);
  }

  rafId = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(rafId);
    clearTimeout(resizeTimer);
    window.removeEventListener('resize', onResize);
  };
}
