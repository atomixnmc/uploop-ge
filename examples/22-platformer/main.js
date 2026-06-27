/**
 * 22-platformer — Simple platformer with gravity, coins, and goal flag.
 * Arrow keys move, Space jumps. Collect coins, reach the goal flag.
 * Canvas 2D with createGameLoop.
 */
import { createGameLoop } from "@uploop/scene";

const GRAVITY = 900;
const JUMP_SPEED = -380;
const MOVE_SPEED = 220;
const PLAYER_W = 24,
  PLAYER_H = 32;

const LEVEL_W = 3000,
  LEVEL_H = 600;

// Platforms: [x, y, w, h]
const PLATFORMS = [
  [0, LEVEL_H - 20, LEVEL_W, 20], // ground
  [200, 420, 200, 20],
  [500, 350, 160, 20],
  [750, 280, 160, 20],
  [1000, 350, 200, 20],
  [1300, 420, 160, 20],
  [1600, 320, 160, 20],
  [1900, 250, 160, 20],
  [2200, 350, 160, 20],
  [2500, 420, 200, 20],
  [2800, 350, 160, 20],
  [400, 500, 80, 20],
  [900, 480, 80, 20],
  [1500, 550, 80, 20],
  [2100, 500, 80, 20],
];

// Coins: [x, y]
const COIN_POSITIONS = [
  [300, 380],
  [350, 380],
  [550, 310],
  [600, 310],
  [800, 240],
  [1050, 310],
  [1350, 380],
  [1650, 280],
  [1950, 210],
  [2250, 310],
  [2550, 380],
  [2850, 310],
  [430, 460],
  [930, 440],
  [1530, 510],
  [2130, 460],
];

// Goal: [x, y]
const GOAL = [2900, 330];

function buildState() {
  return {
    player: { x: 80, y: 300, vx: 0, vy: 0, onGround: false },
    platforms: PLATFORMS.map(([x, y, w, h]) => ({ x, y, w, h })),
    coins: COIN_POSITIONS.map(([x, y]) => ({ x, y, collected: false })),
    camera: { x: 0, y: 0 },
    score: 0,
    goalReached: false,
  };
}

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

  // ── Game Loop ────────────────────────────────────────────────
  const loop = createGameLoop({
    state: buildState(),

    update: {
      tick(s, dt) {
        if (s.goalReached) return s;

        const p = s.player;

        // Input
        p.vx = 0;
        if (keys.ArrowLeft || keys.a) p.vx = -MOVE_SPEED;
        if (keys.ArrowRight || keys.d) p.vx = MOVE_SPEED;
        if ((keys.ArrowUp || keys.w || keys[" "]) && p.onGround) {
          p.vy = JUMP_SPEED;
          p.onGround = false;
        }

        // Gravity
        p.vy += GRAVITY * dt;

        // Move
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Platform collisions
        p.onGround = false;
        for (const plat of s.platforms) {
          if (
            p.x + PLAYER_W / 2 > plat.x &&
            p.x - PLAYER_W / 2 < plat.x + plat.w &&
            p.y + PLAYER_H / 2 > plat.y &&
            p.y - PLAYER_H / 2 < plat.y + plat.h
          ) {
            // Resolve collision based on penetration
            const overlapLeft = p.x + PLAYER_W / 2 - plat.x;
            const overlapRight = plat.x + plat.w - (p.x - PLAYER_W / 2);
            const overlapTop = p.y + PLAYER_H / 2 - plat.y;
            const overlapBottom = plat.y + plat.h - (p.y - PLAYER_H / 2);
            const min = Math.min(
              overlapLeft,
              overlapRight,
              overlapTop,
              overlapBottom,
            );

            if (min === overlapTop && p.vy >= 0) {
              p.y = plat.y - PLAYER_H / 2;
              p.vy = 0;
              p.onGround = true;
            } else if (min === overlapBottom && p.vy < 0) {
              p.y = plat.y + plat.h + PLAYER_H / 2;
              p.vy = 0;
            } else if (min === overlapLeft) {
              p.x = plat.x - PLAYER_W / 2;
              p.vx = 0;
            } else if (min === overlapRight) {
              p.x = plat.x + plat.w + PLAYER_W / 2;
              p.vx = 0;
            }
          }
        }

        // Clamp to level
        p.x = Math.max(PLAYER_W / 2, Math.min(LEVEL_W - PLAYER_W / 2, p.x));

        // Coin collection
        for (const coin of s.coins) {
          if (coin.collected) continue;
          const dx = coin.x - p.x,
            dy = coin.y - p.y;
          if (Math.sqrt(dx * dx + dy * dy) < 22) {
            coin.collected = true;
            s.score++;
          }
        }

        // Goal check
        const gx = GOAL[0],
          gy = GOAL[1];
        const dx = gx - p.x,
          dy = gy - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < 30) {
          s.goalReached = true;
        }

        // Camera
        const cw = canvas.clientWidth,
          ch = canvas.clientHeight;
        s.camera.x = p.x - cw / 2;
        s.camera.y = p.y - ch / 2 - 50;
        s.camera.x = Math.max(0, Math.min(LEVEL_W - cw, s.camera.x));
        s.camera.y = Math.max(0, Math.min(LEVEL_H - ch, s.camera.y));

        return s;
      },

      restart(s) {
        return buildState();
      },
    },

    render(state, alpha) {
      const cw = canvas.clientWidth,
        ch = canvas.clientHeight;
      const cx = state.camera.x,
        cy = state.camera.y;

      // Sky
      ctx.fillStyle = "#1a1a3e";
      ctx.fillRect(0, 0, cw, ch);

      // Background mountains (decorative)
      ctx.fillStyle = "#252550";
      const sx = cx * 0.3;
      for (let i = -1; i < cw / 200 + 2; i++) {
        const bx = i * 200 - (sx % 200);
        ctx.beginPath();
        ctx.moveTo(bx, ch - 20);
        ctx.lineTo(bx + 100, ch - 100 - Math.sin(i * 2.3) * 30);
        ctx.lineTo(bx + 200, ch - 20);
        ctx.fill();
      }

      // Platforms
      for (const plat of state.platforms) {
        const sx2 = plat.x - cx,
          sy2 = plat.y - cy;
        if (
          sx2 + plat.w < -50 ||
          sx2 > cw + 50 ||
          sy2 + plat.h < -50 ||
          sy2 > ch + 50
        )
          continue;
        ctx.fillStyle = "#3d6b3d";
        ctx.fillRect(sx2, sy2, plat.w, plat.h);
        ctx.fillStyle = "#2d4a2d";
        ctx.fillRect(sx2, sy2, plat.w, 4);
        ctx.strokeStyle = "#4a8a4a";
        ctx.lineWidth = 1;
        ctx.strokeRect(sx2, sy2, plat.w, plat.h);
      }

      // Coins
      for (const coin of state.coins) {
        if (coin.collected) continue;
        const sx2 = coin.x - cx,
          sy2 = coin.y - cy;
        if (sx2 < -20 || sx2 > cw + 20 || sy2 < -20 || sy2 > ch + 20) continue;
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.arc(sx2, sy2, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Goal flag
      {
        const gsx = GOAL[0] - cx,
          gsy = GOAL[1] - cy;
        if (gsx > -50 && gsx < cw + 50 && gsy > -50 && gsy < ch + 50) {
          ctx.fillStyle = "#8b5e3c";
          ctx.fillRect(gsx - 2, gsy + 5, 4, 60);
          ctx.fillStyle = "#ff6b6b";
          ctx.fillRect(gsx, gsy + 5, 30, 20);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 18px monospace";
          ctx.fillText("🏁", gsx - 12, gsy - 4);
        }
      }

      // Player
      {
        const psx = state.player.x - cx,
          psy = state.player.y - cy;
        ctx.fillStyle = "#4d96ff";
        ctx.fillRect(
          psx - PLAYER_W / 2,
          psy - PLAYER_H / 2,
          PLAYER_W,
          PLAYER_H,
        );
        ctx.fillStyle = "#fff";
        ctx.fillRect(psx - 6, psy - PLAYER_H / 2 + 4, 5, 5);
        ctx.fillRect(psx + 1, psy - PLAYER_H / 2 + 4, 5, 5);
        ctx.fillStyle = "#fff";
        ctx.fillRect(psx - PLAYER_W / 2, psy + 4, PLAYER_W, 4);
      }

      // Game complete screen
      if (state.goalReached) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 36px monospace";
        ctx.textAlign = "center";
        ctx.fillText("LEVEL COMPLETE!", cw / 2, ch / 2 - 10);
        ctx.fillStyle = "#fff";
        ctx.font = "16px monospace";
        ctx.fillText(
          `Score: ${state.score} / ${state.coins.length} coins  |  Click to restart`,
          cw / 2,
          ch / 2 + 30,
        );
        ctx.textAlign = "start";
      }

      updateOverlay();
    },
  });

  loop.start();
  canvas._loop = loop;

  // Restart on click
  canvas.addEventListener("click", () => {
    if (loop.getState().goalReached) loop.send("restart");
  });

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
  const scoreEl = document.createElement("span");
  const hintEl = document.createElement("span");
  scoreEl.style.cssText =
    "color:#ffd700;background:#0008;padding:4px 10px;border-radius:4px;font-size:12px";
  hintEl.style.cssText =
    "color:#aaa;background:#0008;padding:4px 10px;border-radius:4px;font-size:11px";
  hintEl.textContent = "← → move  |  Space jump";
  div.append(scoreEl, hintEl);
  canvas.parentElement.appendChild(div);
  return {
    updateOverlay() {
      const s = loop.getState();
      const collected = s.coins.filter((c) => c.collected).length;
      scoreEl.textContent = `Coins: ${collected} / ${s.coins.length}`;
    },
    div,
  };
}
