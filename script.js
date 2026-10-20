(() => {
  "use strict";

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const stage = document.getElementById("stage");

  const sizeInput = document.getElementById("size");
  const speedInput = document.getElementById("speed");
  const glowInput = document.getElementById("glow");
  const trailsInput = document.getElementById("trails");

  const sizeValue = document.getElementById("sizeValue");
  const speedValue = document.getElementById("speedValue");
  const glowValue = document.getElementById("glowValue");
  const hint = document.getElementById("hint");

  let width = 0;
  let height = 0;
  let dpr = 1;
  let lastTime = 0;
  let elapsed = 0;
  let lastPointerTime = -Infinity;
  let animationId = 0;

  const pointer = {
    x: 0,
    y: 0,
    active: false
  };

  const animal = {
    x: 0,
    y: 0,
    angle: 0,
    speed: 0,
    targetX: 0,
    targetY: 0,
    wanderTimer: 0,
    blink: 0,
    blinkTimer: 2.5,
    trail: []
  };

  const TAU = Math.PI * 2;

  const clamp = (v, min, max) =>
    Math.max(min, Math.min(max, v));

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function smoothAngle(current, target, amount) {
    const difference =
      Math.atan2(
        Math.sin(target - current),
        Math.cos(target - current)
      );

    return current + difference * amount;
  }

  function resize() {
    const rect = stage.getBoundingClientRect();

    width = rect.width;
    height = rect.height;

    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!animal.x || !animal.y) {
      animal.x = width * 0.5;
      animal.y = height * 0.52;
      animal.angle = -0.25;
    }

    animal.x = clamp(animal.x, 40, width - 40);
    animal.y = clamp(animal.y, 40, height - 40);

    chooseDestination();
  }

  function chooseDestination() {
    const margin = Math.min(65, width * 0.18);

    animal.targetX = random(
      margin,
      Math.max(margin + 1, width - margin)
    );

    animal.targetY = random(
      Math.min(65, height * 0.2),
      Math.max(66, height - 55)
    );

    animal.wanderTimer = random(2.5, 5);
  }

  function handlePointer(event) {
    const rect = canvas.getBoundingClientRect();

    pointer.x = clamp(event.clientX - rect.left, 0, width);
    pointer.y = clamp(event.clientY - rect.top, 0, height);
    pointer.active = true;

    lastPointerTime = elapsed;
    hint.style.opacity = "0";
  }

  canvas.addEventListener("pointermove", handlePointer);

  canvas.addEventListener("pointerdown", event => {
    handlePointer(event);

    if (canvas.setPointerCapture) {
      canvas.setPointerCapture(event.pointerId);
    }
  });

  function getTarget() {
    // Após um período sem interação, a salamandra
    // volta a explorar o terrário automaticamente.
    if (pointer.active && elapsed - lastPointerTime < 4) {
      return {
        x: pointer.x,
        y: pointer.y,
        userControlled: true
      };
    }

    pointer.active = false;

    animal.wanderTimer -= Math.min(0.05, 1 / 30);

    const distance = Math.hypot(
      animal.targetX - animal.x,
      animal.targetY - animal.y
    );

    if (distance < 35 || animal.wanderTimer <= 0) {
      chooseDestination();
    }

    return {
      x: animal.targetX,
      y: animal.targetY,
      userControlled: false
    };
  }

  function spinePoint(index, time, scale) {
    const t = index / 24;
    const direction = animal.angle;
    const side = direction + Math.PI / 2;

    const length = 78 * scale;
    const wave = Math.sin(time * 5.2 - t * 7) *
      11 * t * scale;

    return {
      x: animal.x
        - Math.cos(direction) * length * t
        + Math.cos(side) * wave,

      y: animal.y
        - Math.sin(direction) * length * t
        + Math.sin(side) * wave
    };
  }

  function drawGlowCircle(x, y, radius, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  function drawLeg(anchor, side, phase, scale, glow) {
    const gait = Math.sin(phase);
    const lift = Math.max(0, Math.cos(phase)) * 5 * scale;

    const shoulder = {
      x: anchor.x + Math.cos(side) * 7 * scale,
      y: anchor.y + Math.sin(side) * 7 * scale
    };

    const elbow = {
      x: anchor.x + Math.cos(side) * 16 * scale
        + Math.cos(animal.angle) * gait * 5 * scale,

      y: anchor.y + Math.sin(side) * 16 * scale
        + Math.sin(animal.angle) * gait * 5 * scale
        - lift
    };

    const foot = {
      x: anchor.x + Math.cos(side) * 27 * scale
        + Math.cos(animal.angle) * gait * 10 * scale,

      y: anchor.y + Math.sin(side) * 27 * scale
        + Math.sin(animal.angle) * gait * 10 * scale
        - lift
    };

    ctx.save();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 5 * scale;
    ctx.strokeStyle = "#7738d5";
    ctx.shadowColor = "#a54bff";
    ctx.shadowBlur = 9 * glow;

    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(elbow.x, elbow.y);
    ctx.lineTo(foot.x, foot.y);
    ctx.stroke();

    ctx.lineWidth = 1.7 * scale;
    ctx.strokeStyle = "#e1a8ff";
    ctx.shadowBlur = 4 * glow;

    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(elbow.x, elbow.y);
    ctx.lineTo(foot.x, foot.y);
    ctx.stroke();

    // Dedos pequenos na ponta de cada pata.
    for (let i = -1; i <= 1; i++) {
      const toeAngle = side + i * 0.55;

      ctx.beginPath();
      ctx.moveTo(foot.x, foot.y);
      ctx.lineTo(
        foot.x + Math.cos(toeAngle) * 6 * scale,
        foot.y + Math.sin(toeAngle) * 6 * scale
      );

      ctx.lineWidth = 1.5 * scale;
      ctx.strokeStyle = "#d6a2ff";
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawSalamander(time) {
    const scale = Number(sizeInput.value);
    const glow = Number(glowInput.value);

    const headX = animal.x;
    const headY = animal.y;

    const direction = animal.angle;
    const side = direction + Math.PI / 2;

    const frontLeft = {
      x: headX + Math.cos(side) * 8 * scale
        - Math.cos(direction) * 9 * scale,
      y: headY + Math.sin(side) * 8 * scale
        - Math.sin(direction) * 9 * scale
    };

    const frontRight = {
      x: headX - Math.cos(side) * 8 * scale
        - Math.cos(direction) * 9 * scale,
      y: headY - Math.sin(side) * 8 * scale
        - Math.sin(direction) * 9 * scale
    };

    const backLeft = spinePoint(7, time, scale);
    const backRight = {
      x: backLeft.x - Math.cos(side) * 9 * scale,
      y: backLeft.y - Math.sin(side) * 9 * scale
    };

    // Cauda articulada: desenhada primeiro, atrás do corpo.
    const tail = [];

    for (let i = 0; i <= 18; i++) {
      const t = i / 18;

      const wave = Math.sin(time * 5.2 - t * 7)
        * 11 * t * scale;

      const distance = (78 + t * 83) * scale;

      tail.push({
        x: headX - Math.cos(direction) * distance
          + Math.cos(side) * wave,

        y: headY - Math.sin(direction) * distance
          + Math.sin(side) * wave
      });
    }

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Brilho da cauda.
    ctx.beginPath();

    tail.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });

    ctx.strokeStyle = "#9c39ff";
    ctx.lineWidth = 8 * scale;
    ctx.shadowColor = "#ac45ff";
    ctx.shadowBlur = 18 * glow;
    ctx.stroke();

    // Interior da cauda, afunilado.
    for (let i = 0; i < tail.length - 1; i++) {
      const a = tail[i];
      const b = tail[i + 1];
      const t = i / (tail.length - 1);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);

      ctx.strokeStyle = t < 0.5 ? "#c66aff" : "#7147ff";
      ctx.lineWidth = Math.max(0.6, 5 * scale * (1 - t));
      ctx.shadowBlur = 5 * glow;
      ctx.stroke();
    }

    // Pontos luminosos ao longo da cauda.
    for (let i = 2; i < tail.length - 2; i += 3) {
      const p = tail[i];

      drawGlowCircle(
        p.x,
        p.y,
        Math.max(0.8, 2 * scale * (1 - i / tail.length)),
        "#f08cff",
        0.85
      );
    }

    ctx.restore();

    // Quatro patas com movimento alternado.
    drawLeg(
      frontLeft,
      side,
      time * 9,
      scale,
      glow
    );

    drawLeg(
      frontRight,
      side + Math.PI,
      time * 9,
      scale,
      glow
    );

    drawLeg(
      backLeft,
      side,
      time * 9 + Math.PI,
      scale,
      glow
    );

    drawLeg(
      backRight,
      side + Math.PI,
      time * 9 + Math.PI,
      scale,
      glow
    );

    // Corpo principal.
    const bodyGradient = ctx.createLinearGradient(
      headX,
      headY - 15 * scale,
      headX,
      headY + 15 * scale
    );

    bodyGradient.addColorStop(0, "#e07cff");
    bodyGradient.addColorStop(0.38, "#8f36dc");
    bodyGradient.addColorStop(1, "#28165d");

    ctx.save();

    ctx.shadowColor = "#a63fff";
    ctx.shadowBlur = 17 * glow;
    ctx.fillStyle = bodyGradient;

    ctx.beginPath();

    ctx.moveTo(
      headX + Math.cos(direction) * 20 * scale,
      headY + Math.sin(direction) * 20 * scale
    );

    ctx.quadraticCurveTo(
      headX + Math.cos(side) * 11 * scale
        - Math.cos(direction) * 25 * scale,
      headY + Math.sin(side) * 11 * scale
        - Math.sin(direction) * 25 * scale,
      headX - Math.cos(direction) * 85 * scale,
      headY - Math.sin(direction) * 85 * scale
    );

    ctx.quadraticCurveTo(
      headX - Math.cos(side) * 12 * scale
        - Math.cos(direction) * 30 * scale,
      headY - Math.sin(side) * 12 * scale
        - Math.sin(direction) * 30 * scale,
      headX + Math.cos(direction) * 20 * scale,
      headY + Math.sin(direction) * 20 * scale
    );

    ctx.closePath();
    ctx.fill();

    // Faixa central brilhante.
    ctx.beginPath();
    ctx.moveTo(
      headX - Math.cos(direction) * 8 * scale
        + Math.cos(side) * 2 * scale,
      headY - Math.sin(direction) * 8 * scale
        + Math.sin(side) * 2 * scale
    );

    ctx.lineTo(
      headX - Math.cos(direction) * 75 * scale
        + Math.cos(side) * 1.5 * scale,
      headY - Math.sin(direction) * 75 * scale
        + Math.sin(side) * 1.5 * scale
    );

    ctx.strokeStyle = "#f1b0ff";
    ctx.lineWidth = 1.5 * scale;
    ctx.shadowBlur = 7 * glow;
    ctx.stroke();

    ctx.restore();

    // Cabeça arredondada.
    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(direction);

    const headGradient = ctx.createRadialGradient(
      5 * scale,
      -5 * scale,
      1,
      0,
      0,
      20 * scale
    );

    headGradient.addColorStop(0, "#ffb5ff");
    headGradient.addColorStop(0.4, "#bc50ff");
    headGradient.addColorStop(1, "#5121a2");

    ctx.fillStyle = headGradient;
    ctx.shadowColor = "#c05bff";
    ctx.shadowBlur = 17 * glow;

    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      20 * scale,
      13 * scale,
      0,
      0,
      TAU
    );
    ctx.fill();

    // Focinho.
    ctx.beginPath();
    ctx.ellipse(
      15 * scale,
      1 * scale,
      7 * scale,
      7 * scale,
      0,
      0,
      TAU
    );

    ctx.fillStyle = "#db8bff";
    ctx.fill();

    // Olhos dos dois lados.
    for (const eyeSide of [-1, 1]) {
      const eyeX = 5 * scale;
      const eyeY = eyeSide * 8 * scale;

      ctx.beginPath();
      ctx.arc(eyeX, eyeY, 4.5 * scale, 0, TAU);
      ctx.fillStyle = "#160a37";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(
        eyeX + 1 * scale,
        eyeY - 0.5 * scale,
        2 * scale,
        0,
        TAU
      );

      ctx.fillStyle = "#49f9ff";
      ctx.shadowColor = "#49f9ff";
      ctx.shadowBlur = 8 * glow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(
        eyeX + 1.5 * scale,
        eyeY - 1 * scale,
        0.8 * scale,
        0,
        TAU
      );

      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }

    // Narinas.
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#4b176b";

    ctx.beginPath();
    ctx.arc(19 * scale, -2 * scale, 1 * scale, 0, TAU);
    ctx.arc(19 * scale, 3 * scale, 1 * scale, 0, TAU);
    ctx.fill();

    ctx.restore();

    // Pequenas manchas luminosas nas costas.
    for (let i = 0; i < 8; i++) {
      const p = spinePoint(3 + i * 2, time, scale);

      drawGlowCircle(
        p.x,
        p.y,
        1.8 * scale,
        i % 2 ? "#ff80ef" : "#7bf7ff",
        0.8
      );
    }
  }

  function drawBackground(time) {
    ctx.clearRect(0, 0, width, height);

    // Partículas flutuantes no terrário.
    for (let i = 0; i < 30; i++) {
      const x = (i * 137.5 + 20) % width;
      const y = (
        i * 79.7 + time * (4 + i % 3)
      ) % height;

      const alpha = 0.15 + (
        Math.sin(time * 2 + i) + 1
      ) * 0.16;

      ctx.fillStyle = `rgba(168, 91, 255, ${alpha})`;

      ctx.beginPath();
      ctx.arc(x, y, i % 4 === 0 ? 1.6 : 0.8, 0, TAU);
      ctx.fill();
    }

    // Rastros suaves deixados pelo animal.
    if (trailsInput.checked) {
      for (let i = 0; i < animal.trail.length; i++) {
        const p = animal.trail[i];
        const alpha = (i / animal.trail.length) * 0.3;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, TAU);
        ctx.fillStyle = `rgba(184, 85, 255, ${alpha})`;
        ctx.fill();
      }
    }
  }

  function update(dt) {
    elapsed += dt;

    const target = getTarget();

    const dx = target.x - animal.x;
    const dy = target.y - animal.y;
    const distance = Math.hypot(dx, dy);

    let desiredAngle = animal.angle;

    if (distance > 2) {
      desiredAngle = Math.atan2(dy, dx);
    }

    animal.angle = smoothAngle(
      animal.angle,
      desiredAngle,
      Math.min(1, dt * 4.5)
    );

    const speedMultiplier = Number(speedInput.value);

    const desiredSpeed = distance > 10
      ? Math.min(100, distance * 1.1) * speedMultiplier
      : 0;

    animal.speed += (
      desiredSpeed - animal.speed
    ) * Math.min(1, dt * 3);

    animal.x += Math.cos(animal.angle)
      * animal.speed * dt;

    animal.y += Math.sin(animal.angle)
      * animal.speed * dt;

    const margin = 35;

    if (animal.x < margin || animal.x > width - margin) {
      animal.targetX = clamp(
        animal.x,
        margin,
        width - margin
      );
    }

    if (animal.y < margin || animal.y > height - margin) {
      animal.targetY = clamp(
        animal.y,
        margin,
        height - margin
      );
    }

    animal.x = clamp(animal.x, 12, width - 12);
    animal.y = clamp(animal.y, 12, height - 12);

    animal.blinkTimer -= dt;

    if (animal.blinkTimer <= 0) {
      animal.blink = 0.14;
      animal.blinkTimer = random(2, 5);
    }

    animal.blink = Math.max(0, animal.blink - dt);

    animal.trail.push({
      x: animal.x - Math.cos(animal.angle) * 65,
      y: animal.y - Math.sin(animal.angle) * 65
    });

    if (animal.trail.length > 28) {
      animal.trail.shift();
    }
  }

  function render(timestamp) {
    if (!lastTime) lastTime = timestamp;

    const dt = Math.min(
      (timestamp - lastTime) / 1000,
      0.04
    );

    lastTime = timestamp;

    update(dt);
    drawBackground(elapsed);
    drawSalamander(elapsed);

    animationId = requestAnimationFrame(render);
  }

  sizeInput.addEventListener("input", () => {
    sizeValue.textContent = Number(sizeInput.value).toFixed(1);
  });

  speedInput.addEventListener("input", () => {
    speedValue.textContent = Number(speedInput.value).toFixed(1);
  });

  glowInput.addEventListener("input", () => {
    glowValue.textContent = Number(glowInput.value).toFixed(1);
  });

  window.addEventListener("resize", resize);

  resize();

  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(render);
})();
