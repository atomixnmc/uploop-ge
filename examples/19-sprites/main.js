/**
 * 19-sprites — 100 2D colored rectangles bouncing around.
 * Canvas 2D API with createGameLoop. FPS + count overlay.
 */
import { createGameLoop } from "@uploop/scene";

export function init(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return console.error("2D context not available");

  const COUNT = 100;
  const colors = [
    "#ff6b6b",
    "#ffd93d",
    "#6bcb77",
    "#4d96ff",
    "#ff922b",
    "#845ef7",
    "#f06595",
    "#20c997",
  ];

  function makeSprite() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 300,
      vy: (Math.random() - 0.5) * 300,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 8 + Math.random() * 20,
    };
  }

  const sprites = Array.from({ length: COUNT }, makeSprite);

  // ── Game Loop ────────────────────────────────────────────────
  const loop = createGameLoop({
    state: { sprites, count: COUNT },

    update: {
      tick(s, dt) {
        const w = canvas.width,
          h = canvas.height;
        for (const sp of s.sprites) {
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt;
          if (sp.x < sp.size / 2) {
            sp.x = sp.size / 2;
            sp.vx *= -1;
          }
          if (sp.x > w - sp.size / 2) {
            sp.x = w - sp.size / 2;
            sp.vx *= -1;
          }
          if (sp.y < sp.size / 2) {
            sp.y = sp.size / 2;
            sp.vy *= -1;
          }
          if (sp.y > h - sp.size / 2) {
            sp.y = h - sp.size / 2;
            sp.vy *= -1;
          }
        }
        return s;
      },
    },

    render(state, alpha) {
      const w = canvas.width,
        h = canvas.height;
      ctx.fillStyle = "#0f0f1a";
      ctx.fillRect(0, 0, w, h);

      for (const sp of state.sprites) {
        ctx.fillStyle = sp.color;
        ctx.fillRect(sp.x - sp.size / 2, sp.y - sp.size / 2, sp.size, sp.size);
      }

      updateOverlay();
    },
  });

  // ── Responsive canvas (min 720p) ──────────────────────────────
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1280, window.innerWidth * 0.9);
    const h = Math.max(720, window.innerHeight * 0.85);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
  }
  resize();
  window.addEventListener("resize", resize);

  loop.start();
  canvas._loop = loop;

  // ── Overlay ──────────────────────────────────────────────────
  const { updateOverlay, div: overlay } = createOverlay(canvas, loop);

  // Return cleanup so the gallery can stop this example on switch
  return () => {
    loop.stop();
    if (overlay) overlay.remove();
  };
}

function createOverlay(canvas, loop) {
  const div = document.createElement("div");
  Object.assign(div.style, {
    position: "absolute",
    bottom: "8px",
    left: "8px",
    fontFamily: "monospace",
    zIndex: "10",
    userSelect: "none",
    display: "flex",
    gap: "8px",
  });
  const fpsEl = document.createElement("span");
  const cntEl = document.createElement("span");
  for (const el of [fpsEl, cntEl]) {
    el.style.cssText =
      "color:#fff;background:#0008;padding:4px 10px;border-radius:4px;font-size:12px";
  }
  div.append(fpsEl, cntEl);
  canvas.parentElement.appendChild(div);
  return {
    updateOverlay() {
      fpsEl.textContent = `FPS: ${loop.fps}`;
      cntEl.textContent = `Sprites: 100`;
    },
    div,
  };
}
