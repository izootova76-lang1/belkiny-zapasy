(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const startScreen = document.getElementById("start-screen");
  const gameoverScreen = document.getElementById("gameover-screen");
  const gameoverText = document.getElementById("gameover-text");
  const hud = document.getElementById("hud");
  const hint = document.getElementById("hint");
  const scoreEl = document.getElementById("score");
  const missesEl = document.getElementById("misses");

  const W = 960;
  const H = 640;
  const MAX_MISSES = 3;

  const lanes = [
    {
      side: "left",
      row: "up",
      points: [
        [118, 168],
        [185, 220],
        [245, 285],
        [305, 350],
        [348, 392],
      ],
      catch: { x: 355, y: 418 },
    },
    {
      side: "left",
      row: "down",
      points: [
        [115, 340],
        [175, 385],
        [240, 440],
        [300, 495],
        [348, 528],
      ],
      catch: { x: 355, y: 548 },
    },
    {
      side: "right",
      row: "up",
      points: [
        [842, 168],
        [775, 220],
        [715, 285],
        [655, 350],
        [612, 392],
      ],
      catch: { x: 605, y: 418 },
    },
    {
      side: "right",
      row: "down",
      points: [
        [845, 340],
        [785, 385],
        [720, 440],
        [660, 495],
        [612, 528],
      ],
      catch: { x: 605, y: 548 },
    },
  ];

  const state = {
    mode: "start",
    side: "left",
    row: "down",
    score: 0,
    misses: 0,
    nut: null,
    speedMs: 2800,
    leaves: [],
    lastTime: 0,
  };

  const art = {
    scene: null,
    squirrel: null,
    cone: null,
    leaf: null,
  };

  function setupCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Не удалось загрузить " + src));
      img.src = src;
    });
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function pointOnPath(points, t) {
    const clamped = Math.min(Math.max(t, 0), 1);
    const segments = points.length - 1;
    const scaled = clamped * segments;
    const i = Math.min(Math.floor(scaled), segments - 1);
    const local = scaled - i;
    return {
      x: lerp(points[i][0], points[i + 1][0], local),
      y: lerp(points[i][1], points[i + 1][1], local),
    };
  }

  function createLeaves() {
    state.leaves = Array.from({ length: 16 }, (_, i) => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: 0.55 + Math.random() * 0.7,
      r: Math.random() * Math.PI,
      speed: 10 + Math.random() * 18,
      sway: 14 + Math.random() * 18,
      spin: 0.25 + Math.random() * 0.45,
    }));
  }

  function spawnNut() {
    const lane = Math.floor(Math.random() * lanes.length);
    state.nut = {
      lane,
      born: performance.now(),
      duration: state.speedMs,
    };
  }

  function playerLaneIndex() {
    const sideIndex = state.side === "left" ? 0 : 2;
    const rowIndex = state.row === "up" ? 0 : 1;
    return sideIndex + rowIndex;
  }

  function finishNut(caught) {
    if (caught) {
      state.score += 1;
    } else {
      state.misses += 1;
    }
    scoreEl.textContent = String(state.score);
    missesEl.textContent = String(state.misses);
    state.speedMs = Math.max(900, state.speedMs * 0.94);

    if (state.misses >= MAX_MISSES) {
      endGame();
      return;
    }
    spawnNut();
  }

  function startGame() {
    state.mode = "play";
    state.side = "left";
    state.row = "down";
    state.score = 0;
    state.misses = 0;
    state.speedMs = 2800;
    scoreEl.textContent = "0";
    missesEl.textContent = "0";
    startScreen.classList.add("hidden");
    gameoverScreen.classList.add("hidden");
    hud.hidden = false;
    hint.hidden = false;
    spawnNut();
  }

  function endGame() {
    state.mode = "over";
    state.nut = null;
    hud.hidden = true;
    hint.hidden = true;
    gameoverText.textContent =
      state.score === 0
        ? "Белка не поймала ни одной шишки. Попробуйте ещё раз!"
        : `Белка собрала ${state.score} ${coneWord(state.score)}. Пропущено: ${state.misses}.`;
    gameoverScreen.classList.remove("hidden");
  }

  function coneWord(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "шишку";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "шишки";
    return "шишек";
  }

  function drawScene() {
    if (art.scene) {
      ctx.drawImage(art.scene, 0, 0, W, H);
      return;
    }
    ctx.fillStyle = "#d4a05a";
    ctx.fillRect(0, 0, W, H);
  }

  function drawCatchMarks() {
    lanes.forEach((lane, i) => {
      const active = state.mode === "play" && playerLaneIndex() === i;
      ctx.save();
      ctx.translate(lane.catch.x, lane.catch.y + 16);
      ctx.strokeStyle = "#fff8e6";
      ctx.lineWidth = active ? 3 : 2;
      ctx.globalAlpha = active ? 0.95 : 0.45;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.ellipse(0, 0, 40, 13, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawGuides() {
    lanes.forEach((lane, i) => {
      const active = state.mode === "play" && state.nut && state.nut.lane === i;
      ctx.save();
      ctx.strokeStyle = "#fff8e6";
      ctx.lineWidth = active ? 2.4 : 1.5;
      ctx.globalAlpha = active ? 0.5 : 0.2;
      ctx.setLineDash([8, 7]);
      ctx.lineCap = "round";
      ctx.beginPath();
      lane.points.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
      });
      ctx.lineTo(lane.catch.x, lane.catch.y);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawCone(x, y, scale = 1, angle = 0) {
    const w = 28 * scale;
    const h = 38 * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (art.cone) {
      ctx.drawImage(art.cone, -w / 2, -h / 2, w, h);
    } else {
      ctx.fillStyle = "#7a431c";
      ctx.beginPath();
      ctx.ellipse(0, 2, 8, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSquirrel() {
    const lane = lanes[playerLaneIndex()];
    const x = lane.catch.x;
    const y = lane.catch.y;
    const facing = state.side === "left" ? 1 : -1;
    const w = 108;
    const h = 120;

    ctx.save();
    ctx.translate(x, y + 10);
    ctx.scale(facing, 1);
    if (art.squirrel) {
      ctx.drawImage(art.squirrel, -w * 0.48, -h * 0.82, w, h);
    }
    ctx.restore();
  }

  function drawLeaves(now) {
    const t = now / 1000;
    state.leaves.forEach((leaf, i) => {
      leaf.y += (leaf.speed * 16) / 1000;
      if (leaf.y > H + 24) {
        leaf.y = -24;
        leaf.x = Math.random() * W;
      }
      const x = leaf.x + Math.sin(t + i) * leaf.sway;
      const w = 22 * leaf.s;
      const h = 26 * leaf.s;
      ctx.save();
      ctx.translate(x, leaf.y);
      ctx.rotate(leaf.r + t * leaf.spin);
      ctx.globalAlpha = 0.92;
      if (art.leaf) {
        ctx.drawImage(art.leaf, -w / 2, -h / 2, w, h);
      }
      ctx.restore();
    });
  }

  function drawIdleCones() {
    if (state.mode !== "start") return;
    lanes.forEach((lane) => {
      const p = lane.points[0];
      drawCone(p[0], p[1], 1, lane.side === "left" ? -0.35 : 0.35);
    });
  }

  function updateNut(now) {
    if (state.mode !== "play" || !state.nut) return;
    const t = (now - state.nut.born) / state.nut.duration;
    if (t >= 1) {
      const caught = playerLaneIndex() === state.nut.lane;
      finishNut(caught);
    }
  }

  function drawCurrentNut(now) {
    if (!state.nut) return;
    const lane = lanes[state.nut.lane];
    const t = Math.min((now - state.nut.born) / state.nut.duration, 1);
    const p = pointOnPath(lane.points, t);
    const look = pointOnPath(lane.points, Math.min(t + 0.03, 1));
    const angle = Math.atan2(look.y - p.y, look.x - p.x) + t * 6;
    drawCone(p.x, p.y, 1.12, angle);
  }

  function draw(now) {
    drawScene();
    drawGuides();
    drawCatchMarks();
    drawIdleCones();
    drawSquirrel();
    drawCurrentNut(now);
    drawLeaves(now);
  }

  function loop(now) {
    if (!state.lastTime) state.lastTime = now;
    updateNut(now);
    draw(now);
    state.lastTime = now;
    requestAnimationFrame(loop);
  }

  function handleKey(event) {
    const key = event.key.toLowerCase();
    if (key === "enter" || key === " ") {
      if (state.mode === "start" || state.mode === "over") {
        event.preventDefault();
        startGame();
      }
      return;
    }
    const map = {
      arrowleft: "left",
      arrowright: "right",
      arrowup: "up",
      arrowdown: "down",
    };
    const action = map[key];
    if (!action) return;
    event.preventDefault();
    if (state.mode !== "play") return;
    if (action === "left" || action === "right") state.side = action;
    if (action === "up" || action === "down") state.row = action;
  }

  document.getElementById("start-btn").addEventListener("click", startGame);
  document.getElementById("retry-btn").addEventListener("click", startGame);
  window.addEventListener("keydown", handleKey);

  setupCanvas();
  createLeaves();

  Promise.all([
    loadImage("assets/scene.svg"),
    loadImage("assets/squirrel.svg"),
    loadImage("assets/cone.svg"),
    loadImage("assets/leaf.svg"),
  ])
    .then(([scene, squirrel, cone, leaf]) => {
      art.scene = scene;
      art.squirrel = squirrel;
      art.cone = cone;
      art.leaf = leaf;
      requestAnimationFrame(loop);
    })
    .catch(() => {
      requestAnimationFrame(loop);
    });
})();
