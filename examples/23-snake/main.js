/**
 * 23-snake — Classic Snake game. Arrow keys change direction.
 * Snake moves on a grid every 150ms. Eat food to grow + score.
 * Collision with walls or self = game over. Space to restart.
 * Canvas 2D with createGameLoop.
 */
import { createGameLoop } from "@uploop/scene";

const MOVE_INTERVAL = 0.15; // 150ms
const DIRS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};
const OPPOSITE = {
  ArrowUp: "ArrowDown",
  ArrowDown: "ArrowUp",
  ArrowLeft: "ArrowRight",
  ArrowRight: "ArrowLeft",
};

function buildState() {
  const gs = 20;
  const cols = Math.floor(1280 / gs);
  const rows = Math.floor(720 / gs);
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  return {
    snake: [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ],
    direction: "ArrowRight",
    food: randomFood([{ x: cx, y: cy }], cols, rows),
    score: 0,
    gameOver: false,
    gridSize: gs,
    cols,
    rows,
    moveAccum: 0,
  };
}

function randomFood(snake, cols, rows) {
  let fx, fy;
  do {
    fx = Math.floor(Math.random() * cols);
    fy = Math.floor(Math.random() * rows);
  } while (snake.some((s) => s.x === fx && s.y === fy));
  return { x: fx, y: fy };
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
  let nextDir = "ArrowRight";
  window.addEventListener("keydown", (e) => {
    if (e.key === " " && loop.getState().gameOver) {
      loop.send("restart");
      return;
    }
    if (DIRS[e.key]) {
      // Prevent reverse
      const s = loop.getState();
      if (e.key !== OPPOSITE[s.direction]) {
        nextDir = e.key;
      }
      e.preventDefault();
    }
  });

  // ── Game Loop ────────────────────────────────────────────────
  const loop = createGameLoop({
    state: buildState(),

    update: {
      tick(s, dt) {
        if (s.gameOver) return s;

        // Accumulator-based movement
        s.moveAccum += dt;
        if (s.moveAccum < MOVE_INTERVAL) return s;
        s.moveAccum -= MOVE_INTERVAL;

        // Apply direction
        s.direction = nextDir;
        const dir = DIRS[s.direction];
        const head = s.snake[0];
        const newHead = { x: head.x + dir.x, y: head.y + dir.y };

        // Wall collision
        if (
          newHead.x < 0 ||
          newHead.x >= s.cols ||
          newHead.y < 0 ||
          newHead.y >= s.rows
        ) {
          s.gameOver = true;
          return s;
        }

        // Self collision (check against all except tail, which will move away)
        if (s.snake.slice(0, -1).some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
          s.gameOver = true;
          return s;
        }

        // Move snake
        s.snake.unshift(newHead);

        // Eat food?
        if (newHead.x === s.food.x && newHead.y === s.food.y) {
          s.score++;
          s.food = randomFood(s.snake, s.cols, s.rows);
        } else {
          s.snake.pop();
        }

        return s;
      },

      restart(s) {
        const st = buildState();
        nextDir = "ArrowRight";
        return st;
      },
    },

    render(state, alpha) {
      const cw = canvas.clientWidth,
        ch = canvas.clientHeight;
      const gs = state.gridSize;

      // Background
      ctx.fillStyle = "#0a0a14";
      ctx.fillRect(0, 0, cw, ch);

      // Grid lines (subtle)
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= cw; x += gs) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ch);
        ctx.stroke();
      }
      for (let y = 0; y <= ch; y += gs) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cw, y);
        ctx.stroke();
      }

      // Food
      ctx.fillStyle = "#ff6b6b";
      ctx.shadowColor = "#ff6b6b";
      ctx.shadowBlur = 8;
      ctx.fillRect(
        state.food.x * gs + 2,
        state.food.y * gs + 2,
        gs - 4,
        gs - 4,
      );
      ctx.shadowBlur = 0;

      // Snake
      for (let i = 0; i < state.snake.length; i++) {
        const seg = state.snake[i];
        const alpha2 = 1 - i / (state.snake.length + 10);
        ctx.fillStyle = `rgba(77, 150, 255, ${alpha2.toFixed(2)})`;
        ctx.fillRect(seg.x * gs + 1, seg.y * gs + 1, gs - 2, gs - 2);
        if (i === 0) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(seg.x * gs + 1, seg.y * gs + 1, gs - 2, gs - 2);
        }
      }

      // Game Over
      if (state.gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = "#ff6b6b";
        ctx.font = "bold 36px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", cw / 2, ch / 2 - 10);
        ctx.fillStyle = "#fff";
        ctx.font = "16px monospace";
        ctx.fillText(
          `Score: ${state.score}  |  Space to restart`,
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

  // ── Overlay ──────────────────────────────────────────────────
  const { updateOverlay, div: overlay } = createOverlay(canvas, loop);

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
    "color:#4d96ff;background:#0008;padding:4px 10px;border-radius:4px;font-size:12px";
  hintEl.style.cssText =
    "color:#aaa;background:#0008;padding:4px 10px;border-radius:4px;font-size:11px";
  hintEl.textContent = "Arrow keys move";
  div.append(scoreEl, hintEl);
  canvas.parentElement.appendChild(div);
  return {
    updateOverlay() {
      const s = loop.getState();
      scoreEl.textContent = `Score: ${s.score}`;
    },
    div,
  };
}
