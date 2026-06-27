/**
 * 20-tilemap — 20×15 tilemap with player movement, camera scroll, and coins.
 * Arrow keys move the player. Collect all coins. Canvas 2D with createGameLoop.
 */
import { createGameLoop } from "@uploop/scene";

const TILE = 32;
const COLS = 20,
  ROWS = 15;
const MAP_W = COLS * TILE,
  MAP_H = ROWS * TILE;

// Tile types
const SKY = 0,
  GROUND = 1,
  BRICK = 2,
  COIN = 3;

// Predefined map (0=sky, 1=ground, 2=brick, 3=coin)
const TILE_MAP = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 3, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 1, 1, 0, 0, 0, 0, 0, 3, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 2, 2, 0, 0, 0, 0,
  0, 0, 3, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 1, 1, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 1, 1, 0, 3, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
];

function buildCoins() {
  const coins = [];
  for (let i = 0; i < TILE_MAP.length; i++) {
    if (TILE_MAP[i] === COIN) {
      const col = i % COLS,
        row = Math.floor(i / COLS);
      coins.push({
        x: col * TILE + TILE / 2,
        y: row * TILE + TILE / 2,
        collected: false,
      });
    }
  }
  return coins;
}

const TILE_COLORS = {
  [SKY]: "#0f0f1a",
  [GROUND]: "#2d5a27",
  [BRICK]: "#8b5e3c",
};

export function init(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return console.error("2D context not available");

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

  // ── Keys ─────────────────────────────────────────────────────
  const keys = {};
  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    e.preventDefault();
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
    e.preventDefault();
  });

  const PLAYER_SPEED = 200;

  // ── Game Loop ────────────────────────────────────────────────
  const loop = createGameLoop({
    state: {
      map: TILE_MAP,
      player: { x: 2 * TILE + TILE / 2, y: 2 * TILE + TILE / 2 },
      camera: { x: 0, y: 0 },
      coins: buildCoins(),
    },

    update: {
      tick(s, dt) {
        let { x, y } = s.player;
        if (keys.ArrowLeft || keys.a) x -= PLAYER_SPEED * dt;
        if (keys.ArrowRight || keys.d) x += PLAYER_SPEED * dt;
        if (keys.ArrowUp || keys.w) y -= PLAYER_SPEED * dt;
        if (keys.ArrowDown || keys.s) y += PLAYER_SPEED * dt;

        // Collision with solid tiles (GROUND, BRICK)
        const r = 10;
        const corners = [
          [x - r, y - r],
          [x + r, y - r],
          [x - r, y + r],
          [x + r, y + r],
        ];
        let blocked = false;
        for (const [cx, cy] of corners) {
          const col = Math.floor(cx / TILE),
            row = Math.floor(cy / TILE);
          if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue;
          const tile = s.map[row * COLS + col];
          if (tile === GROUND || tile === BRICK) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          s.player.x = x;
          s.player.y = y;
        }

        // Coin collection
        for (const coin of s.coins) {
          if (coin.collected) continue;
          const dx = coin.x - s.player.x,
            dy = coin.y - s.player.y;
          if (Math.sqrt(dx * dx + dy * dy) < 18) coin.collected = true;
        }

        // Camera follows player
        const cw = canvas.clientWidth,
          ch = canvas.clientHeight;
        s.camera.x = s.player.x - cw / 2;
        s.camera.y = s.player.y - ch / 2;
        s.camera.x = Math.max(0, Math.min(MAP_W - cw, s.camera.x));
        s.camera.y = Math.max(0, Math.min(MAP_H - ch, s.camera.y));

        return s;
      },
    },

    render(state, alpha) {
      const cw = canvas.clientWidth,
        ch = canvas.clientHeight;
      const cx = state.camera.x,
        cy = state.camera.y;

      ctx.fillStyle = "#0f0f1a";
      ctx.fillRect(0, 0, cw, ch);

      // Draw visible tiles
      const startCol = Math.floor(cx / TILE),
        endCol = Math.ceil((cx + cw) / TILE);
      const startRow = Math.floor(cy / TILE),
        endRow = Math.ceil((cy + ch) / TILE);

      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue;
          const tile = state.map[row * COLS + col];
          const color = TILE_COLORS[tile];
          if (!color) continue;
          const sx = col * TILE - cx,
            sy = row * TILE - cy;
          ctx.fillStyle = color;
          ctx.fillRect(sx, sy, TILE, TILE);
          // Brick pattern
          if (tile === BRICK) {
            ctx.strokeStyle = "#6b3a1f";
            ctx.lineWidth = 1;
            ctx.strokeRect(sx + 0.5, sy + 0.5, TILE - 1, TILE - 1);
            ctx.beginPath();
            ctx.moveTo(sx, sy + TILE / 2);
            ctx.lineTo(sx + TILE, sy + TILE / 2);
            ctx.stroke();
          }
        }
      }

      // Draw coins
      for (const coin of state.coins) {
        if (coin.collected) continue;
        const sx = coin.x - cx,
          sy = coin.y - cy;
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#b8960c";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw player
      const px = state.player.x - cx,
        py = state.player.y - cy;
      ctx.fillStyle = "#4d96ff";
      ctx.fillRect(px - 10, py - 10, 20, 20);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px - 10, py - 10, 20, 20);

      updateOverlay();
    },
  });

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
  });
  const el = document.createElement("span");
  el.style.cssText =
    "color:#ffd700;background:#0008;padding:4px 10px;border-radius:4px;font-size:12px";
  div.append(el);
  canvas.parentElement.appendChild(div);
  return {
    updateOverlay() {
      const s = loop.getState();
      const collected = s.coins.filter((c) => c.collected).length;
      el.textContent = `Coins: ${collected} / ${s.coins.length}`;
    },
    div,
  };
}
