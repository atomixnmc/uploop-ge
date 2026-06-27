/**
 * 21-breakout — Classic Breakout game. Mouse controls paddle.
 * Ball bounces off walls, paddle, and bricks. Lives + score + game over.
 * Canvas 2D with createGameLoop.
 */
import { createGameLoop } from "@uploop/scene";

const PADDLE_W = 100,
  PADDLE_H = 14,
  PADDLE_Y = 0;
const BALL_R = 7,
  BALL_SPEED = 380;
const BRICK_COLS = 10,
  BRICK_ROWS = 5;
const BRICK_W = 60,
  BRICK_H = 20,
  BRICK_GAP = 4,
  BRICK_TOP = 50;

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

  function initBricks() {
    const bricks = [];
    const totalW = BRICK_COLS * (BRICK_W + BRICK_GAP) - BRICK_GAP;
    const offsetX = (canvas.clientWidth - totalW) / 2;
    for (let row = 0; row < BRICK_ROWS; row++) {
      bricks[row] = [];
      const hue = (row / BRICK_ROWS) * 60 + 200;
      for (let col = 0; col < BRICK_COLS; col++) {
        bricks[row][col] = {
          alive: true,
          x: offsetX + col * (BRICK_W + BRICK_GAP),
          y: BRICK_TOP + row * (BRICK_H + BRICK_GAP),
          color: `hsl(${hue}, 70%, ${50 + row * 5}%)`,
        };
      }
    }
    return bricks;
  }

  function resetState() {
    return {
      paddle: { x: canvas.clientWidth / 2 },
      ball: {
        x: canvas.clientWidth / 2,
        y: canvas.clientHeight - 80,
        vx: 200,
        vy: -BALL_SPEED,
      },
      bricks: initBricks(),
      score: 0,
      lives: 3,
      gameOver: false,
    };
  }

  // ── Mouse tracking ───────────────────────────────────────────
  let mouseX = canvas.clientWidth / 2;
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
  });

  // ── Game Loop ────────────────────────────────────────────────
  const loop = createGameLoop({
    state: resetState(),

    update: {
      tick(s, dt) {
        if (s.gameOver) return s;

        // Paddle follows mouse
        s.paddle.x = Math.max(
          PADDLE_W / 2,
          Math.min(canvas.clientWidth - PADDLE_W / 2, mouseX),
        );

        // Ball movement
        const b = s.ball;
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        const cw = canvas.clientWidth,
          ch = canvas.clientHeight;

        // Wall collisions
        if (b.x - BALL_R < 0) {
          b.x = BALL_R;
          b.vx *= -1;
        }
        if (b.x + BALL_R > cw) {
          b.x = cw - BALL_R;
          b.vx *= -1;
        }
        if (b.y - BALL_R < 0) {
          b.y = BALL_R;
          b.vy *= -1;
        }

        // Paddle collision
        const px = s.paddle.x,
          py = ch - 40;
        if (
          b.y + BALL_R > py - PADDLE_H / 2 &&
          b.y - BALL_R < py + PADDLE_H / 2 &&
          b.x > px - PADDLE_W / 2 &&
          b.x < px + PADDLE_W / 2
        ) {
          b.y = py - PADDLE_H / 2 - BALL_R;
          const hitPos = (b.x - px) / (PADDLE_W / 2);
          const angle = hitPos * Math.PI * 0.35;
          const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          b.vx = Math.sin(angle) * speed;
          b.vy = -Math.abs(Math.cos(angle) * speed);
        }

        // Fall off bottom
        if (b.y > ch + BALL_R) {
          s.lives--;
          if (s.lives <= 0) {
            s.gameOver = true;
            return s;
          }
          b.x = cw / 2;
          b.y = ch - 80;
          b.vx = (Math.random() - 0.5) * 300;
          b.vy = -BALL_SPEED;
        }

        // Brick collisions
        let brickHit = false;
        for (let row = 0; row < BRICK_ROWS; row++) {
          for (let col = 0; col < BRICK_COLS; col++) {
            const br = s.bricks[row][col];
            if (!br.alive) continue;
            if (
              b.x + BALL_R > br.x &&
              b.x - BALL_R < br.x + BRICK_W &&
              b.y + BALL_R > br.y &&
              b.y - BALL_R < br.y + BRICK_H
            ) {
              br.alive = false;
              s.score += 10;
              brickHit = true;

              // Determine bounce direction
              const overlapLeft = b.x + BALL_R - br.x;
              const overlapRight = br.x + BRICK_W - (b.x - BALL_R);
              const overlapTop = b.y + BALL_R - br.y;
              const overlapBottom = br.y + BRICK_H - (b.y - BALL_R);
              const minOverlap = Math.min(
                overlapLeft,
                overlapRight,
                overlapTop,
                overlapBottom,
              );
              if (minOverlap === overlapLeft || minOverlap === overlapRight)
                b.vx *= -1;
              else b.vy *= -1;
            }
          }
        }

        // Check win
        const allDead = s.bricks.every((row) => row.every((br) => !br.alive));
        if (allDead) s.gameOver = true;

        return s;
      },

      restart(s) {
        return resetState();
      },
    },

    render(state, alpha) {
      const cw = canvas.clientWidth,
        ch = canvas.clientHeight;
      ctx.fillStyle = "#0a0a14";
      ctx.fillRect(0, 0, cw, ch);

      // Bricks
      for (const row of state.bricks) {
        for (const br of row) {
          if (!br.alive) continue;
          ctx.fillStyle = br.color;
          ctx.fillRect(br.x, br.y, BRICK_W, BRICK_H);
          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.lineWidth = 1;
          ctx.strokeRect(br.x, br.y, BRICK_W, BRICK_H);
        }
      }

      // Paddle
      const px = state.paddle.x,
        py = ch - 40;
      ctx.fillStyle = "#4d96ff";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(
        px - PADDLE_W / 2,
        py - PADDLE_H / 2,
        PADDLE_W,
        PADDLE_H,
        6,
      );
      ctx.fill();
      ctx.stroke();

      // Ball
      if (!state.gameOver || state.lives > 0) {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(state.ball.x, state.ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
      }

      // Game Over screen
      if (state.gameOver) {
        const won = state.lives > 0;
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = won ? "#6bcb77" : "#ff6b6b";
        ctx.font = "bold 36px monospace";
        ctx.textAlign = "center";
        ctx.fillText(won ? "YOU WIN!" : "GAME OVER", cw / 2, ch / 2 - 10);
        ctx.fillStyle = "#fff";
        ctx.font = "16px monospace";
        ctx.fillText(
          `Score: ${state.score}  |  Click to restart`,
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
    if (loop.getState().gameOver) loop.send("restart");
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
  const livesEl = document.createElement("span");
  for (const el of [scoreEl, livesEl]) {
    el.style.cssText =
      "color:#fff;background:#0008;padding:4px 10px;border-radius:4px;font-size:12px";
  }
  div.append(scoreEl, livesEl);
  canvas.parentElement.appendChild(div);
  return {
    updateOverlay() {
      const s = loop.getState();
      scoreEl.textContent = `Score: ${s.score}`;
      livesEl.textContent = `Lives: ${s.lives}`;
    },
    div,
  };
}
