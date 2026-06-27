/**
 * 25-asteroids — Asteroids. Arrow keys rotate/thrust, Space shoots.
 * Momentum-based movement. 3 asteroid sizes. Wrap-around world.
 * Canvas 2D with createGameLoop.
 */
import { createGameLoop } from "@uploop/scene";

const ROTATE_SPEED = 4.5; // rad/s
const THRUST = 280;
const DRAG = 0.99;
const BULLET_SPEED = 500;
const BULLET_LIFE = 1.8; // seconds
const SHOOT_COOLDOWN = 0.25;
const INVULN_TIME = 2.0;
const ASTEROID_SIZES = [
  { radius: 40, score: 20 },
  { radius: 22, score: 50 },
  { radius: 12, score: 100 },
];
const INITIAL_ASTEROIDS = 5;

function buildState(cw, ch) {
  return {
    ship: { x: cw / 2, y: ch / 2, angle: -Math.PI / 2, vx: 0, vy: 0 },
    bullets: [],
    asteroids: Array.from({ length: INITIAL_ASTEROIDS }, () =>
      spawnAsteroid(cw, ch, 0),
    ),
    score: 0,
    lives: 3,
    gameOver: false,
    shootTimer: 0,
    invulnTimer: 0,
  };
}

function spawnAsteroid(cw, ch, size) {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) {
    x = Math.random() * cw;
    y = -40;
  } else if (edge === 1) {
    x = cw + 40;
    y = Math.random() * ch;
  } else if (edge === 2) {
    x = Math.random() * cw;
    y = ch + 40;
  } else {
    x = -40;
    y = Math.random() * ch;
  }
  const angle = Math.random() * Math.PI * 2;
  const speed = 40 + Math.random() * 80;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: ASTEROID_SIZES[size].radius,
    size,
    // Precompute jagged offsets
    offsets: Array.from({ length: 12 }, () => 0.7 + Math.random() * 0.3),
  };
}

function wrap(v, max) {
  if (v < 0) return v + max;
  if (v > max) return v - max;
  return v;
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
    if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" ||
      e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
    }
    if (e.key === " " && loop.getState().gameOver) {
      loop.send("restart");
    }
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });

  const cw = canvas.clientWidth,
    ch = canvas.clientHeight;

  // ── Game Loop ────────────────────────────────────────────────
  const loop = createGameLoop({
    state: buildState(cw, ch),

    update: {
      tick(s, dt) {
        if (s.gameOver) return s;

        // Timers
        s.shootTimer = Math.max(0, s.shootTimer - dt);
        s.invulnTimer = Math.max(0, s.invulnTimer - dt);

        const ship = s.ship;

        // Rotation
        if (keys.ArrowLeft) ship.angle -= ROTATE_SPEED * dt;
        if (keys.ArrowRight) ship.angle += ROTATE_SPEED * dt;

        // Thrust
        if (keys.ArrowUp) {
          ship.vx += Math.cos(ship.angle) * THRUST * dt;
          ship.vy += Math.sin(ship.angle) * THRUST * dt;
        }

        // Drag
        ship.vx *= DRAG;
        ship.vy *= DRAG;

        // Ship movement + wrap
        ship.x += ship.vx * dt;
        ship.y += ship.vy * dt;
        ship.x = wrap(ship.x, cw);
        ship.y = wrap(ship.y, ch);

        // Shoot
        if (keys[" "] && s.shootTimer <= 0) {
          s.bullets.push({
            x: ship.x + Math.cos(ship.angle) * 14,
            y: ship.y + Math.sin(ship.angle) * 14,
            vx: Math.cos(ship.angle) * BULLET_SPEED + ship.vx * 0.5,
            vy: Math.sin(ship.angle) * BULLET_SPEED + ship.vy * 0.5,
            life: BULLET_LIFE,
          });
          s.shootTimer = SHOOT_COOLDOWN;
        }

        // Bullets
        for (let i = s.bullets.length - 1; i >= 0; i--) {
          const b = s.bullets[i];
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.x = wrap(b.x, cw);
          b.y = wrap(b.y, ch);
          b.life -= dt;
          if (b.life <= 0) s.bullets.splice(i, 1);
        }

        // Asteroids
        for (const a of s.asteroids) {
          a.x += a.vx * dt;
          a.y += a.vy * dt;
          a.x = wrap(a.x, cw);
          a.y = wrap(a.y, ch);
        }

        // Bullet-asteroid collisions
        for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
          const b = s.bullets[bi];
          for (let ai = s.asteroids.length - 1; ai >= 0; ai--) {
            const a = s.asteroids[ai];
            const dx = b.x - a.x,
              dy = b.y - a.y;
            if (dx * dx + dy * dy < a.radius * a.radius) {
              s.bullets.splice(bi, 1);
              s.score += ASTEROID_SIZES[a.size].score;
              // Split into smaller asteroids
              if (a.size < ASTEROID_SIZES.length - 1) {
                for (let j = 0; j < 2; j++) {
                  const na = {
                    x: a.x,
                    y: a.y,
                    vx: a.vx + (Math.random() - 0.5) * 120,
                    vy: a.vy + (Math.random() - 0.5) * 120,
                    radius: ASTEROID_SIZES[a.size + 1].radius,
                    size: a.size + 1,
                    offsets: Array.from({ length: 12 }, () => 0.7 + Math.random() * 0.3),
                  };
                  s.asteroids.push(na);
                }
              }
              s.asteroids.splice(ai, 1);
              break;
            }
          }
        }

        // Ship-asteroid collision
        if (s.invulnTimer <= 0) {
          for (let ai = s.asteroids.length - 1; ai >= 0; ai--) {
            const a = s.asteroids[ai];
            const dx = ship.x - a.x,
              dy = ship.y - a.y;
            const hitDist = a.radius + 12;
            if (dx * dx + dy * dy < hitDist * hitDist) {
              s.lives--;
              s.invulnTimer = INVULN_TIME;
              ship.x = cw / 2;
              ship.y = ch / 2;
              ship.vx = 0;
              ship.vy = 0;
              ship.angle = -Math.PI / 2;
              if (s.lives <= 0) {
                s.gameOver = true;
                return s;
              }
              break;
            }
          }
        }

        // Spawn new asteroids if low
        if (s.asteroids.length < 3) {
          s.asteroids.push(spawnAsteroid(cw, ch, 0));
        }

        return s;
      },

      restart(s) {
        const st = buildState(cw, ch);
        for (const key of Object.keys(keys)) keys[key] = false;
        return st;
      },
    },

    render(state, alpha) {
      const cw2 = canvas.clientWidth,
        ch2 = canvas.clientHeight;

      // Background
      ctx.fillStyle = "#0a0a14";
      ctx.fillRect(0, 0, cw2, ch2);

      // Stars
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      const starSeed = 42;
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 7919 + starSeed) % cw2);
        const sy = ((i * 6271 + starSeed) % ch2);
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Asteroids
      for (const a of state.asteroids) {
        ctx.strokeStyle = "#aaa";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const n = a.offsets.length;
        for (let i = 0; i < n; i++) {
          const angle = (i / n) * Math.PI * 2;
          const r = a.radius * a.offsets[i];
          const px = a.x + Math.cos(angle) * r;
          const py = a.y + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Bullets
      ctx.fillStyle = "#fff";
      for (const b of state.bullets) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ship
      const ship = state.ship;
      if (state.invulnTimer > 0 && Math.floor(state.invulnTimer * 10) % 2 === 0) {
        // Blink when invulnerable
      } else {
        ctx.strokeStyle = "#4d96ff";
        ctx.fillStyle = state.invulnTimer > 0 ? "rgba(77,150,255,0.4)" : "rgba(77,150,255,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const noseX = ship.x + Math.cos(ship.angle) * 16;
        const noseY = ship.y + Math.sin(ship.angle) * 16;
        const leftX = ship.x + Math.cos(ship.angle + 2.4) * 12;
        const leftY = ship.y + Math.sin(ship.angle + 2.4) * 12;
        const rightX = ship.x + Math.cos(ship.angle - 2.4) * 12;
        const rightY = ship.y + Math.sin(ship.angle - 2.4) * 12;
        ctx.moveTo(noseX, noseY);
        ctx.lineTo(leftX, leftY);
        ctx.lineTo(rightX, rightY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Thrust flame
        if (keys.ArrowUp) {
          ctx.strokeStyle = "#ff6b6b";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const bx = ship.x - Math.cos(ship.angle) * 10;
          const by = ship.y - Math.sin(ship.angle) * 10;
          const fl = 8 + Math.random() * 8;
          ctx.moveTo(
            bx + Math.cos(ship.angle + 1.2) * 6,
            by + Math.sin(ship.angle + 1.2) * 6,
          );
          ctx.lineTo(
            bx - Math.cos(ship.angle) * fl,
            by - Math.sin(ship.angle) * fl,
          );
          ctx.lineTo(
            bx + Math.cos(ship.angle - 1.2) * 6,
            by + Math.sin(ship.angle - 1.2) * 6,
          );
          ctx.stroke();
        }
      }

      // Game Over
      if (state.gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, cw2, ch2);
        ctx.fillStyle = "#ff6b6b";
        ctx.font = "bold 36px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", cw2 / 2, ch2 / 2 - 10);
        ctx.fillStyle = "#fff";
        ctx.font = "16px monospace";
        ctx.fillText(
          `Score: ${state.score}  |  Space to restart`,
          cw2 / 2,
          ch2 / 2 + 30,
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
  const livesEl = document.createElement("span");
  const hintEl = document.createElement("span");
  for (const el of [scoreEl, livesEl, hintEl]) {
    el.style.cssText =
      "color:#fff;background:#0008;padding:4px 10px;border-radius:4px;font-size:12px";
  }
  hintEl.style.color = "#aaa";
  hintEl.style.fontSize = "11px";
  hintEl.textContent = "← → rotate  |  ↑ thrust  |  Space shoot";
  div.append(scoreEl, livesEl, hintEl);
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
