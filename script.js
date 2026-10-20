(() => {
  "use strict";

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const stage = document.getElementById("stage");

  const countInput = document.getElementById("count");
  const lengthInput = document.getElementById("length");
  const jointsInput = document.getElementById("joints");
  const countValue = document.getElementById("count-value");
  const lengthValue = document.getElementById("length-value");
  const segmentCount = document.getElementById("segment-count");
  const hint = document.getElementById("hint");
  const resetButton = document.getElementById("reset");

  let width = 0;
  let height = 0;
  let dpr = 1;
  let segments = [];
  let animationFrame = 0;

  const pointer = {
    x: 0,
    y: 0,
    active: false
  };

  class Segment {
    constructor(parent, size, index) {
      this.parent = parent;
      this.size = size;
      this.index = index;

      this.x = parent ? parent.x - size : 0;
      this.y = parent ? parent.y : 0;

      this.xx = 0;
      this.yy = 0;
      this.absAngle = 0;
      this.relAngle = 0;
      this.children = [];

      if (parent && parent.children) {
        parent.children.push(this);
      }
    }

    follow(iter) {
      if (!this.parent) return;

      const x = this.parent.x;
      const y = this.parent.y;

      this.xx = this.x - x;
      this.yy = this.y - y;

      const dist = Math.hypot(this.xx, this.yy);

      if (dist < 0.001) {
        this.xx = 1;
        this.yy = 0;
      }

      const safeDist = Math.max(dist, 0.001);

      this.x = x + this.size * this.xx / safeDist;
      this.y = y + this.size * this.yy / safeDist;

      this.absAngle = Math.atan2(this.yy, this.xx);

      this.relAngle = this.parent.absAngle != null
        ? this.absAngle - this.parent.absAngle
        : this.absAngle;

      this.updateRelative(false, true);

      if (iter) {
        for (let i = 0; i < this.children.length; i++) {
          this.children[i].follow(true);
        }
      }
    }

    updateRelative(updateChildren, keepLength) {
      // Reservado para cálculos adicionais de posição relativa.
      // A posição e o ângulo são atualizados em follow().
    }
  }

  function resizeCanvas() {
    const rect = stage.getBoundingClientRect();

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!pointer.active) {
      pointer.x = width * 0.68;
      pointer.y = height * 0.48;
    }

    resetChain();
  }

  function resetChain() {
    const count = Number(countInput.value);
    const size = Number(lengthInput.value);

    segments = [];

    const root = new Segment(null, size, 0);
    root.x = pointer.x || width * 0.68;
    root.y = pointer.y || height * 0.48;
    root.absAngle = 0;

    segments.push(root);

    let parent = root;

    for (let i = 1; i < count; i++) {
      const segment = new Segment(parent, size, i);

      segment.x = parent.x - size;
      segment.y = parent.y;

      segments.push(segment);
      parent = segment;
    }

    countValue.textContent = count;
    lengthValue.textContent = size;
    segmentCount.textContent = `${count} SEGMENTOS`;
  }

  function movePointer(event) {
    const rect = canvas.getBoundingClientRect();

    pointer.x = Math.max(
      0,
      Math.min(width, event.clientX - rect.left)
    );

    pointer.y = Math.max(
      0,
      Math.min(height, event.clientY - rect.top)
    );

    pointer.active = true;
    hint.style.opacity = "0";
  }

  canvas.addEventListener("pointermove", movePointer);

  canvas.addEventListener("pointerdown", (event) => {
    movePointer(event);

    if (canvas.setPointerCapture) {
      canvas.setPointerCapture(event.pointerId);
    }
  });

  function draw() {
    ctx.clearRect(0, 0, width, height);

    if (!segments.length) {
      animationFrame = requestAnimationFrame(draw);
      return;
    }

    const root = segments[0];

    root.x += (pointer.x - root.x) * 0.22;
    root.y += (pointer.y - root.y) * 0.22;

    // Atualiza cada segmento seguindo o anterior.
    for (let i = 1; i < segments.length; i++) {
      segments[i].follow(false);
    }

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Brilho externo.
    for (let i = 0; i < segments.length - 1; i++) {
      const a = segments[i];
      const b = segments[i + 1];
      const progress = i / Math.max(1, segments.length - 1);

      ctx.strokeStyle =
        `rgba(162, 92, 255, ${0.10 + progress * 0.14})`;

      ctx.lineWidth = Math.max(2, (1 - progress) * 15);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Linha principal em gradiente.
    const last = segments[segments.length - 1];

    const gradient = ctx.createLinearGradient(
      root.x,
      root.y,
      last.x,
      last.y
    );

    gradient.addColorStop(0, "#e4b8ff");
    gradient.addColorStop(0.45, "#b45cff");
    gradient.addColorStop(1, "#665cff");

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(root.x, root.y);

    for (let i = 1; i < segments.length; i++) {
      ctx.lineTo(segments[i].x, segments[i].y);
    }

    ctx.stroke();

    // Desenha as juntas dos segmentos.
    if (jointsInput.checked) {
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const progress = i / Math.max(1, segments.length - 1);
        const radius = Math.max(2, 5.5 - progress * 3.5);

        ctx.beginPath();
        ctx.arc(segment.x, segment.y, radius, 0, Math.PI * 2);

        ctx.fillStyle = i === 0
          ? "#f0d5ff"
          : `hsl(${270 - progress * 30} 100% ${72 - progress * 10}%)`;

        ctx.fill();
      }
    }

    // Indicador da posição do cursor.
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 9, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(226, 190, 255, .6)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#f1dfff";
    ctx.fill();

    ctx.restore();

    animationFrame = requestAnimationFrame(draw);
  }

  countInput.addEventListener("input", resetChain);
  lengthInput.addEventListener("input", resetChain);

  resetButton.addEventListener("click", () => {
    pointer.x = width * 0.68;
    pointer.y = height * 0.48;
    pointer.active = false;

    hint.style.opacity = "1";
    resetChain();
  });

  window.addEventListener("resize", resizeCanvas);

  resizeCanvas();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(draw);
})();
