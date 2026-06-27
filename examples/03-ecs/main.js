/**
 * 03-ecs — Entity Component System using uploop game loop.
 *
 * World with entity/component maps. Systems called in the update/render
 * pipeline. Three entity types:
 *   🪨 Asteroids — brown, drifting & spinning; spawn every 1.5s
 *   🚀 Projectiles — cyan, fast, short-lived; click to shoot
 *   💎 Pickups — green, rotating; collected on projectile hit
 *
 * UI overlay shows entity count and component breakdown.
 */
import { createGameLoop, Transform } from "@uploop/scene";
import { vec3, quat, mat4 } from "@uploop/math";
import { createCube, createSphere } from "@uploop/geometry";
import { createProgram, builtinShaders } from "@uploop/shader";

export function init(canvas) {
  const gl = canvas.getContext("webgl2");
  if (!gl) return console.error("WebGL2 not available");

  // ── GPU Resources ────────────────────────────────────────────
  const shader = createProgram(
    gl,
    builtinShaders.unlit.vertex,
    builtinShaders.unlit.fragment,
  );
  const cubeMesh = createCube(0.4);
  const sphereMesh = createSphere(0.35, 16, 8);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.enableVertexAttribArray(shader.attributes.aPosition.location);
  gl.vertexAttribPointer(
    shader.attributes.aPosition.location,
    3,
    gl.FLOAT,
    false,
    32,
    0,
  );
  gl.enableVertexAttribArray(shader.attributes.aUV.location);
  gl.vertexAttribPointer(
    shader.attributes.aUV.location,
    2,
    gl.FLOAT,
    false,
    32,
    24,
  );

  let curMesh = null;
  function useMesh(mesh) {
    if (curMesh === mesh) return;
    curMesh = mesh;
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
  }

  // ── Responsive canvas (min 720p) ──────────────────────────────
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1280, window.innerWidth * 0.9);
    const h = Math.max(720, window.innerHeight * 0.85);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    gl.viewport(0, 0, canvas.width, canvas.height);
    updateProjection();
  }
  window.addEventListener("resize", resize);

  // ── Camera ───────────────────────────────────────────────────
  const projection = mat4.create();
  const view = mat4.create();
  mat4.lookAt(view, [0, 6, 12], [0, 0, 0], [0, 1, 0]);

  function updateProjection() {
    const aspect = canvas.width / canvas.height;
    mat4.perspective(projection, Math.PI / 4, aspect, 0.1, 100);
  }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.05, 0.05, 0.1, 1);
  resize();

  // ── ECS World ────────────────────────────────────────────────
  const world = {
    entities: new Map(),
    components: {
      transform: new Map(),
      render: new Map(),
      physics: new Map(),
      lifetime: new Map(),
      health: new Map(),
      pickup: new Map(),
    },
    createEntity(comps) {
      const id = `e_${Math.random().toString(36).slice(2, 8)}`;
      this.entities.set(id, true);
      for (const [name, data] of Object.entries(comps))
        if (this.components[name]) this.components[name].set(id, data);
      return id;
    },
    destroyEntity(id) {
      this.entities.delete(id);
      for (const map of Object.values(this.components)) map.delete(id);
    },
    query(...names) {
      const maps = names.map((n) => this.components[n]);
      const result = [];
      for (const id of this.entities.keys())
        if (maps.every((m) => m.has(id))) result.push(id);
      return result;
    },
  };

  // ── Systems ──────────────────────────────────────────────────
  function movementSystem(dt) {
    for (const id of world.query("transform", "physics")) {
      const t = world.components.transform.get(id);
      const p = world.components.physics.get(id);
      t.translate(vec3.scale(vec3.create(), p.velocity, dt));
      if (p.angularSpeed)
        t.rotate(
          quat.fromEuler(
            quat.create(),
            dt * p.angularSpeed * 0.7,
            dt * p.angularSpeed,
            0,
          ),
        );
    }
  }

  function lifetimeSystem() {
    for (const id of world.query("lifetime")) {
      const lt = world.components.lifetime.get(id);
      lt.remaining -= 1 / 60;
      if (lt.remaining <= 0) world.destroyEntity(id);
    }
  }

  let collectedCount = 0;

  function collisionSystem() {
    const pickups = world
      .query("transform", "pickup")
      .filter((id) => !world.components.pickup.get(id).collected);
    const projs = world.query("transform", "physics");
    for (const pid of pickups) {
      const pt = world.components.transform.get(pid).worldPosition;
      for (const rid of projs) {
        if (pid === rid) continue;
        if (
          vec3.distance(pt, world.components.transform.get(rid).worldPosition) <
          0.8
        ) {
          world.components.pickup.get(pid).collected = true;
          world.destroyEntity(pid);
          collectedCount++;
          break;
        }
      }
    }
  }

  // ── Spawners ─────────────────────────────────────────────────
  let asteroidTimer = 0,
    pickupTimer = 0;

  function spawnAsteroid() {
    world.createEntity({
      transform: Transform(
        vec3.create(
          (Math.random() - 0.5) * 10,
          Math.random() * 3 + 1,
          (Math.random() - 0.5) * 10 + 2,
        ),
      ),
      render: { mesh: "cube", color: [0.55, 0.35, 0.2] },
      physics: {
        velocity: vec3.create(
          (Math.random() - 0.5) * 0.8,
          0,
          (Math.random() - 0.5) * 0.8,
        ),
        angularSpeed: (Math.random() - 0.5) * 2,
      },
      health: { hp: 3 },
    });
  }

  function spawnPickup() {
    world.createEntity({
      transform: Transform(
        vec3.create(
          (Math.random() - 0.5) * 8,
          Math.random() * 2 + 1,
          (Math.random() - 0.5) * 8 + 2,
        ),
      ),
      render: { mesh: "sphere", color: [0.2, 0.85, 0.3] },
      pickup: { collected: false },
    });
  }

  function shootProjectile(targetX, targetZ) {
    const origin = vec3.create(0, 1.5, 8);
    const dir = vec3.normalize(
      vec3.create(),
      vec3.subtract(vec3.create(), vec3.create(targetX, 0, targetZ), origin),
    );
    world.createEntity({
      transform: Transform(vec3.clone(origin)),
      render: { mesh: "cube", color: [0.1, 0.8, 1.0] },
      physics: {
        velocity: vec3.scale(vec3.create(), dir, 12),
        angularSpeed: 0,
      },
      lifetime: { remaining: 1.5 },
    });
  }

  for (let i = 0; i < 5; i++) spawnAsteroid();
  for (let i = 0; i < 3; i++) spawnPickup();

  // ── Game Loop ────────────────────────────────────────────────
  const vpInv = mat4.create();

  const loop = createGameLoop({
    state: {},
    update: {
      tick(s, dt) {
        asteroidTimer += dt;
        pickupTimer += dt;
        if (asteroidTimer > 1.5) {
          spawnAsteroid();
          asteroidTimer -= 1.5;
        }
        if (pickupTimer > 4.0) {
          spawnPickup();
          pickupTimer -= 4.0;
        }
        movementSystem(dt);
        lifetimeSystem();
        collisionSystem();
        return s;
      },
    },
    render(state, alpha) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(shader.program);

      for (const id of world.query("transform", "render")) {
        const t = world.components.transform.get(id);
        const r = world.components.render.get(id);
        const mesh = r.mesh === "sphere" ? sphereMesh : cubeMesh;
        useMesh(mesh);

        gl.uniform4f(shader.uniforms.uColor.location, ...r.color, 1);
        gl.uniformMatrix4fv(
          shader.uniforms.uModel.location,
          false,
          t.worldMatrix,
        );
        gl.uniformMatrix4fv(shader.uniforms.uView.location, false, view);
        gl.uniformMatrix4fv(
          shader.uniforms.uProjection.location,
          false,
          projection,
        );
        gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
      }

      updateOverlay();
    },
  });

  gl.useProgram(shader.program);
  gl.uniform1i(shader.uniforms.uHasTexture.location, 0);

  loop.start();
  canvas._loop = loop;

  // ── Input ────────────────────────────────────────────────────
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    mat4.multiply(vpInv, projection, view);
    mat4.invert(vpInv, vpInv);
    const near = vec3.create(nx, ny, -1),
      far = vec3.create(nx, ny, 1);
    vec3.transformMat4(near, near, vpInv);
    vec3.transformMat4(far, far, vpInv);
    const dir = vec3.subtract(vec3.create(), far, near);
    if (Math.abs(dir[1]) < 0.0001) return;
    const t = -near[1] / dir[1];
    if (t < 0) return;
    const wp = vec3.add(vec3.create(), near, vec3.scale(dir, dir, t));
    shootProjectile(wp[0], wp[2]);
  });

  // ── UI Overlay ───────────────────────────────────────────────
  const { updateOverlay, div: overlay } = createOverlay(canvas, world);

  // Return cleanup so the gallery can stop this example on switch
  return () => {
    loop.stop();
    if (overlay) overlay.remove();
  };
}

function createOverlay(canvas, world) {
  const div = document.createElement("div");
  Object.assign(div.style, {
    position: "absolute",
    bottom: "8px",
    left: "8px",
    fontFamily: "monospace",
    zIndex: "10",
    userSelect: "none",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  });

  function panel(text) {
    const el = document.createElement("span");
    el.style.cssText =
      "color:#fff;background:#0008;padding:2px 8px;border-radius:3px;font-size:12px";
    el.textContent = text;
    return el;
  }

  const entityEl = panel("Entities: 0");
  const compEl = panel("Components: —");
  div.append(entityEl, compEl, panel("🖱️ click to shoot"));
  canvas.parentElement.appendChild(div);

  return {
    updateOverlay() {
      const ids = [...world.entities.keys()];
      entityEl.textContent = `Entities: ${ids.length}`;
      const counts = {};
      for (const [name, map] of Object.entries(world.components))
        counts[name] = map.size;
      compEl.textContent =
        "Components: " +
        Object.entries(counts)
          .map(([k, v]) => `${k}:${v}`)
          .join(" ");
    },
    div,
  };
}
