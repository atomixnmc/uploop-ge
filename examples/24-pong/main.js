/**
 * 24-pong — Retro Pong. W/S keys control left paddle, AI controls right.
 * Ball bounces off walls and paddles. First to 5 wins.
 * Canvas 2D with createGameLoop.
 */
import { createGameLoop } from "@uploop/scene";

const PADDLE_W = 14,
  PADDLE_H = 80;
const BALL_R = 8,
  BALL_SPEED = 350;
const AI_SPEED = 260;
const WIN_SCORE = 5;
const PADDLE_MARGIN = 40;

function buildState() {
  return {
    paddleL: { y: 360 },
    paddleR: { y: 360 },
    ball: { x: 640, y: 360, vx: BALL_SPEED, vy: 0 },
    scoreL: 0,
    scoreR: 0,
  };
}

function resetBall(ball, cw, ch) {
  ball.x = cw / 2;
  ball.y = ch / 2;
  const angle = (Math.random() - 0.5) * Math.PI * 0.6;
  const dir = Math.random() < 0.5 ? 1 : -1;
  ball.vx = Math.cos(angle) * BALL_SPEED * dir;
  ball.vy = Math.sin(angle) * BALL_SPEED;
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
        const cw = canvas.clientWidth,
          ch = canvas.clientHeight;
        const winner = s.scoreL >= WIN_SCORE ? "L" : s.scoreR >= WIN_SCORE ? "R" : null;
        if (winner) return s;

        // Left paddle — player (W/S)
        if (keys.w || keys.W) s.paddleL.y -= 300 * dt;
        if (keys.s || keys.S) s.paddleL.y += 300 * dt;
        s.paddleL.y = Math.max(
          PADDLE_H / 2,
          Math.min(ch - PADDLE_H / 2, s.paddleL.y),
        );

        // Right paddle — AI follows ball with some delay
        const targetY = s.ball.y;
        const diff = targetY - s.paddleR.y;
        const maxMove = AI_SPEED * dt;
        s.paddleR.y += Math.max(-maxMove, Math.min(maxMove, diff));
        s.paddleR.y = Math.max(
          PADDLE_H / 2,
          Math.min(ch - PADDLE_H / 2, s.paddleR.y),
        );

        // Ball movement
        s.ball.x += s.ball.vx * dt;
        s.ball.y += s.ball.vy * dt;

        // Top/bottom walls
        if (s.ball.y - BALL_R < 0) {
          s.ball.y = BALL_R;
          s.ball.vy *= -1;
        }
        if (s.ball.y + BALL_R > ch) {
          s.ball.y = ch - BALL_R;
          s.ball.vy *= -1;
        }

        // Left paddle collision
        if (
          s.ball.vx < 0 &&
          s.ball.x - BALL_R < PADDLE_MARGIN + PADDLE_W &&
          s.ball.x - BALL_R > PADDLE_MARGIN &&
          s.ball.y > s.paddleL.y - PADDLE_H / 2 - BALL_R &&
          s.ball.y < s.paddleL.y + PADDLE_H / 2 + BALL_R
        ) {
          s.ball.x = PADDLE_MARGIN + PADDLE_W + BALL_R;
          const hitPos = (s.ball.y - s.paddleL.y) / (PADDLE_H / 2);
          const angle = hitPos * Math.PI * 0.3;
          s.ball.vx = Math.cos(angle) * BALL_SPEED;
          s.ball.vy = Math.sin(angle) * BALL_SPEED;
        }

        // Right paddle collision
        if (
          s.ball.vx > 0 &&
          s.ball.x + BALL_R > cw - PADDLE_MARGIN - PADDLE_W &&
          s.ball.x + BALL_R < cw - PADDLE_MARGIN &&
          s.ball.y > s.paddleR.y - PADDLE_H / 2 - BALL_R &&
          s.ball.y < s.paddleR.y + PADDLE_H / 2 + BALL_R
        ) {
          s.ball.x = cw - PADDLE_MARGIN - PADDLE_W - BALL_R;
          const hitPos = (s.ball.y - s.paddleR.y) / (PADDLE_H / 2);
          const angle = hitPos * Math.PI * 0.3;
          s.ball.vx = -Math.cos(angle) * BALL_SPEED;
          s.ball.vy = Math.sin(angle) * BALL_SPEED;
        }

        // Scoring
        if (s.ball.x < -BALL_R) {
          s.scoreR++;
          resetBall(s.ball, cw, ch);
        }
        if (s.ball.x > cw + BALL_R) {
          s.scoreL++;
          resetBall(s.ball, cw, ch);
        }

        return s;
      },

      restart(s) {
        const st = buildState();
        const cw = canvas.clientWidth,
          ch = canvas.clientHeight;
        resetBall(st.ball, cw, ch);
        return st;
      },
    },

    render(state, alpha) {
      const cw = canvas.clientWidth,
        ch = canvas.clientHeight;

      // Background
      ctx.fillStyle = "#0a0a14";
      ctx.fillRect(0, 0, cw, ch);

      // Center line (dotted)
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.moveTo(cw / 2, 0);
      ctx.lineTo(cw / 2, ch);
      ctx.stroke();
      ctx.setLineDash([]);

      // Paddles
      ctx.fillStyle = "#4d96ff";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      // Left
      ctx.fillRect(
        PADDLE_MARGIN,
        state.paddleL.y - PADDLE_H / 2,
        PADDLE_W,
        PADDLE_H,
      );
      ctx.strokeRect(
        PADDLE_MARGIN,
        state.paddleL.y - PADDLE_H / 2,
        PADDLE_W,
        PADDLE_H,
      );
      // Right
      ctx.fillRect(
        cw - PADDLE_MARGIN - PADDLE_W,
        state.paddleR.y - PADDLE_H / 2,
        PADDLE_W,
        PADDLE_H,
      );
      ctx.strokeRect(
        cw - PADDLE_MARGIN - PADDLE_W,
        state.paddleR.y - PADDLE_H / 2,
        PADDLE_W,
        PADDLE_H,
      );

      // Ball
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();

      // Score
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font = "bold 48px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${state.scoreL}`, cw / 2 - 60, 60);
      ctx.fillText(`${state.scoreR}`, cw / 2 + 60, 60);

      // Winner overlay
      const winner = state.scoreL >= WIN_SCORE ? "PLAYER 1 WINS!" :
        state.scoreR >= WIN_SCORE ? "AI WINS!" : null;
      if (winner) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = state.scoreL >= WIN_SCORE ? "#6bcb77" : "#ff6b6b";
        ctx.font = "bold 36px monospace";
        ctx.fillText(winner, cw / 2, ch / 2 - 10);
        ctx.fillStyle = "#fff";
        ctx.font = "16px monospace";
        ctx.fillText("Click to restart", cw / 2, ch / 2 + 30);
      }
      ctx.textAlign = "start";

      updateOverlay();
    },
  });

  loop.start();
  canvas._loop = loop;

  // Restart on click
  canvas.addEventListener("click", () => {
    const s = loop.getState();
    if (s.scoreL >= WIN_SCORE || s.scoreR >= WIN_SCORE) loop.send("restart");
  });

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
  hintEl.textContent = "W/S move  |  First to 5";
  div.append(scoreEl, hintEl);
  canvas.parentElement.appendChild(div);
  return {
    updateOverlay() {
      const s = loop.getState();
      scoreEl.textContent = `Score: ${s.scoreL} - ${s.scoreR}`;
    },
    div,
  };
}
