/**
 * Unit-тесты для StarCanvas (src/background/StarCanvas.ts).
 *
 * Покрывает:
 *  - initStarCanvas возвращает функцию-cleanup (happy path)
 *  - Cleanup вызывает cancelAnimationFrame, clearTimeout, removeEventListener
 *  - ctx.setTransform вызывается при инициализации (не ctx.scale)
 *  - prefersReducedMotion=true: RAF не запускается, сразу рисуется статичный кадр
 *  - Нет элемента #star-canvas: возвращается no-op функция
 *  - Нет 2d-контекста: возвращается no-op функция
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initStarCanvas } from '../background/StarCanvas';

// ---------------------------------------------------------------------------
// Helpers / фабрика мок-канвас
// ---------------------------------------------------------------------------

function makeCtxMock() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    setTransform: vi.fn(),
    // Нарочно НЕТ .scale — чтобы поймать регрессию если кто-то заменит setTransform на scale
    globalAlpha: 1,
    fillStyle: '',
  };
}

function makeCanvasMock(ctx: ReturnType<typeof makeCtxMock> | null) {
  return {
    getContext: vi.fn(() => ctx),
    width: 0,
    height: 0,
    style: { width: '', height: '' },
  };
}

function setupDom(canvasEl: HTMLCanvasElement | null) {
  vi.spyOn(document, 'getElementById').mockReturnValue(canvasEl as HTMLElement | null);
}

// ---------------------------------------------------------------------------
// Глобальные браузерные API-моки
// ---------------------------------------------------------------------------

let rafCallback: ((ts: number) => void) | null = null;

beforeEach(() => {
  rafCallback = null;

  // requestAnimationFrame / cancelAnimationFrame
  vi.stubGlobal('requestAnimationFrame', vi.fn((cb: (ts: number) => void) => {
    rafCallback = cb;
    return 42; // fake rafId
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());

  // setTimeout / clearTimeout
  vi.stubGlobal('setTimeout', vi.fn(() => 99));
  vi.stubGlobal('clearTimeout', vi.fn());

  // window.innerWidth / innerHeight
  vi.stubGlobal('innerWidth', 1024);
  vi.stubGlobal('innerHeight', 768);

  // window.devicePixelRatio
  vi.stubGlobal('devicePixelRatio', 1);

  // window.matchMedia — по умолчанию НЕ предпочитает уменьшенное движение
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: false, // prefers-reduced-motion: no
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));

  // window.addEventListener / removeEventListener
  vi.stubGlobal('addEventListener', vi.fn());
  vi.stubGlobal('removeEventListener', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Тест: нет элемента #star-canvas
// ---------------------------------------------------------------------------

describe('initStarCanvas() — нет DOM-элемента', () => {
  it('возвращает функцию (no-op) если #star-canvas отсутствует', () => {
    setupDom(null);

    const cleanup = initStarCanvas();

    expect(typeof cleanup).toBe('function');
    // no-op: не бросает при вызове
    expect(() => cleanup()).not.toThrow();
  });

  it('не запускает RAF если нет канваса', () => {
    setupDom(null);

    initStarCanvas();

    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Тест: нет 2d-контекста
// ---------------------------------------------------------------------------

describe('initStarCanvas() — нет 2d-контекста', () => {
  it('возвращает no-op функцию если getContext вернул null', () => {
    const canvas = makeCanvasMock(null) as unknown as HTMLCanvasElement;
    setupDom(canvas);

    const cleanup = initStarCanvas();

    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Тест: happy path — корректный канвас
// ---------------------------------------------------------------------------

describe('initStarCanvas() — happy path', () => {
  function buildCanvas() {
    const ctx = makeCtxMock();
    const canvas = makeCanvasMock(ctx) as unknown as HTMLCanvasElement;
    setupDom(canvas);
    return { ctx, canvas };
  }

  it('возвращает функцию', () => {
    buildCanvas();
    const cleanup = initStarCanvas();
    expect(typeof cleanup).toBe('function');
  });

  it('запускает requestAnimationFrame', () => {
    buildCanvas();
    initStarCanvas();
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it('ctx.setTransform вызывается при инициализации (не ctx.scale)', () => {
    const { ctx } = buildCanvas();
    initStarCanvas();
    expect(ctx.setTransform).toHaveBeenCalledTimes(1);
    // ctx.scale не должен существовать или не должен вызываться
    expect((ctx as Record<string, unknown>)['scale']).toBeUndefined();
  });

  it('ctx.setTransform вызывается с dpr=1 (identity-like transform)', () => {
    const { ctx } = buildCanvas();
    initStarCanvas();
    expect(ctx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
  });

  it('addEventListener("resize", ...) вызывается', () => {
    buildCanvas();
    initStarCanvas();
    expect(addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});

// ---------------------------------------------------------------------------
// Тест: cleanup
// ---------------------------------------------------------------------------

describe('initStarCanvas() — cleanup функция', () => {
  function buildCanvas() {
    const ctx = makeCtxMock();
    const canvas = makeCanvasMock(ctx) as unknown as HTMLCanvasElement;
    setupDom(canvas);
    return { ctx, canvas };
  }

  it('cleanup вызывает cancelAnimationFrame с rafId=42', () => {
    buildCanvas();
    const cleanup = initStarCanvas();
    cleanup();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });

  it('cleanup вызывает clearTimeout', () => {
    buildCanvas();
    const cleanup = initStarCanvas();
    cleanup();
    expect(clearTimeout).toHaveBeenCalled();
  });

  it('cleanup вызывает removeEventListener("resize", ...)', () => {
    buildCanvas();
    const cleanup = initStarCanvas();
    cleanup();
    expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('повторный вызов cleanup не бросает ошибку', () => {
    buildCanvas();
    const cleanup = initStarCanvas();
    cleanup();
    expect(() => cleanup()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Тест: prefers-reduced-motion
// ---------------------------------------------------------------------------

describe('initStarCanvas() — prefers-reduced-motion', () => {
  it('не запускает RAF если prefers-reduced-motion=true', () => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: true, // prefers-reduced-motion: reduce
      media: query,
    })));

    const ctx = makeCtxMock();
    const canvas = makeCanvasMock(ctx) as unknown as HTMLCanvasElement;
    setupDom(canvas);

    initStarCanvas();

    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('рисует статичный кадр (clearRect) если prefers-reduced-motion=true', () => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: true,
      media: query,
    })));

    const ctx = makeCtxMock();
    const canvas = makeCanvasMock(ctx) as unknown as HTMLCanvasElement;
    setupDom(canvas);

    initStarCanvas();

    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
  });

  it('возвращает no-op cleanup если prefers-reduced-motion=true', () => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: true,
      media: query,
    })));

    const ctx = makeCtxMock();
    const canvas = makeCanvasMock(ctx) as unknown as HTMLCanvasElement;
    setupDom(canvas);

    const cleanup = initStarCanvas();

    // no-op, не должна бросать и не должна вызывать cancelAnimationFrame
    expect(() => cleanup()).not.toThrow();
    expect(cancelAnimationFrame).not.toHaveBeenCalled();
  });

  it('не добавляет resize listener если prefers-reduced-motion=true', () => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: true,
      media: query,
    })));

    const ctx = makeCtxMock();
    const canvas = makeCanvasMock(ctx) as unknown as HTMLCanvasElement;
    setupDom(canvas);

    initStarCanvas();

    expect(addEventListener).not.toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
