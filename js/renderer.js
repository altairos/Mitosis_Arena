// High Performance Canvas 2D Cellular & Bioluminescent Renderer

class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.resize();

    // Camera
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1.0,
      targetZoom: 1.0,
      shake: 0
    };

    // Ambient floating bio-dust
    this.dustParticles = [];
    for (let i = 0; i < 120; i++) {
      this.dustParticles.push({
        x: (Math.random() - 0.5) * 4000,
        y: (Math.random() - 0.5) * 4000,
        r: Math.random() * 2 + 0.8,
        alpha: Math.random() * 0.4 + 0.1,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2
      });
    }

    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  addShake(amount) {
    this.camera.shake = Math.min(25, this.camera.shake + amount);
  }

  updateCamera(targetX, targetY, cellSpreadRadius, dt) {
    // Smooth camera follow
    this.camera.x += (targetX - this.camera.x) * (5.0 * dt);
    this.camera.y += (targetY - this.camera.y) * (5.0 * dt);

    // Dynamic zoom based on cell spread
    const desiredZoom = Math.max(0.65, Math.min(1.15, 1.05 - (cellSpreadRadius / 800)));
    this.camera.zoom += (desiredZoom - this.camera.zoom) * (3.0 * dt);

    // Shake decay
    if (this.camera.shake > 0) {
      this.camera.shake = Math.max(0, this.camera.shake - 40 * dt);
    }
  }

  worldToScreen(wx, wy) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    return {
      x: cx + (wx - this.camera.x) * this.camera.zoom,
      y: cy + (wy - this.camera.y) * this.camera.zoom
    };
  }

  screenToWorld(sx, sy) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    return {
      x: this.camera.x + (sx - cx) / this.camera.zoom,
      y: this.camera.y + (sy - cy) / this.camera.zoom
    };
  }

  beginFrame() {
    const ctx = this.ctx;
    ctx.save();
    
    // Clear background
    ctx.fillStyle = "#03080e";
    ctx.fillRect(0, 0, this.width, this.height);

    // Camera transform with shake
    const cx = this.width / 2;
    const cy = this.height / 2;

    let sx = 0;
    let sy = 0;
    if (this.camera.shake > 0) {
      sx = (Math.random() - 0.5) * this.camera.shake;
      sy = (Math.random() - 0.5) * this.camera.shake;
    }

    ctx.translate(cx + sx, cy + sy);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);
  }

  endFrame() {
    this.ctx.restore();
  }

  drawPetriDish(arenaRadius, time) {
    const ctx = this.ctx;

    // Outer darkness beyond dish
    ctx.beginPath();
    ctx.arc(0, 0, arenaRadius + 2000, 0, Math.PI * 2);
    ctx.arc(0, 0, arenaRadius, 0, Math.PI * 2, true);
    ctx.fillStyle = "rgba(1, 4, 8, 0.95)";
    ctx.fill();

    // Dish glass rim glow
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, arenaRadius, 0, Math.PI * 2);
    ctx.lineWidth = 14;
    ctx.strokeStyle = "rgba(0, 240, 255, 0.2)";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 25;
    ctx.stroke();

    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0, 255, 170, 0.6)";
    ctx.stroke();
    ctx.restore();

    // Subsurface grid pattern
    ctx.save();
    ctx.strokeStyle = "rgba(0, 240, 255, 0.035)";
    ctx.lineWidth = 1;
    const gridSize = 120;
    const startX = Math.floor((-arenaRadius) / gridSize) * gridSize;
    const endX = Math.ceil(arenaRadius / gridSize) * gridSize;

    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, -arenaRadius);
      ctx.lineTo(x, arenaRadius);
      ctx.stroke();
    }
    for (let y = startX; y <= endX; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(-arenaRadius, y);
      ctx.lineTo(arenaRadius, y);
      ctx.stroke();
    }

    // Ambient floating bio-dust
    this.dustParticles.forEach(d => {
      d.x += d.vx;
      d.y += d.vy;
      const dist = Math.hypot(d.x, d.y);
      if (dist > arenaRadius - 50) {
        d.x *= -0.9;
        d.y *= -0.9;
      }
      const alpha = d.alpha * (0.6 + 0.4 * Math.sin(time * 2 + d.phase));
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 240, 255, " + alpha + ")";
      ctx.fill();
    });
    ctx.restore();
  }

  // Draw Organic Soft-body Cell (Player Daughter Cell)
  drawPlayerCell(cell, time, isLeader = false) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cell.x, cell.y);

    const r = cell.radius;
    const points = 10;
    const angleStep = (Math.PI * 2) / points;

    // Calculate fluid wobbling perimeter
    ctx.beginPath();
    const coords = [];
    for (let i = 0; i < points; i++) {
      const angle = i * angleStep;
      // Wobble wave based on index, time, and cell velocity
      const wobble = Math.sin(time * 6 + i * 1.5 + cell.wobbleOffset) * (r * 0.12)
                   + Math.cos(time * 4 - i * 0.8) * (r * 0.06);
      const pr = Math.max(r * 0.6, r + wobble);
      coords.push({
        x: Math.cos(angle) * pr,
        y: Math.sin(angle) * pr
      });
    }

    // Smooth Bezier Curve around points
    ctx.moveTo((coords[0].x + coords[points - 1].x) / 2, (coords[0].y + coords[points - 1].y) / 2);
    for (let i = 0; i < points; i++) {
      const next = coords[(i + 1) % points];
      const midX = (coords[i].x + next.x) / 2;
      const midY = (coords[i].y + next.y) / 2;
      ctx.quadraticCurveTo(coords[i].x, coords[i].y, midX, midY);
    }
    ctx.closePath();

    // Fill with bioluminescent radial gradient
    const grad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 1.1);
    if (isLeader) {
      grad.addColorStop(0, "rgba(200, 255, 255, 0.95)");
      grad.addColorStop(0.4, "rgba(0, 240, 255, 0.75)");
      grad.addColorStop(0.85, "rgba(0, 150, 255, 0.45)");
      grad.addColorStop(1, "rgba(0, 240, 255, 0.15)");
    } else {
      grad.addColorStop(0, "rgba(180, 255, 240, 0.9)");
      grad.addColorStop(0.4, "rgba(0, 255, 170, 0.7)");
      grad.addColorStop(0.85, "rgba(0, 200, 200, 0.4)");
      grad.addColorStop(1, "rgba(0, 240, 255, 0.15)");
    }

    ctx.fillStyle = grad;
    ctx.shadowColor = isLeader ? "#00f0ff" : "#00ffaa";
    ctx.shadowBlur = 18;
    ctx.fill();

    // Membrane outer border
    ctx.lineWidth = isLeader ? 3.5 : 2.2;
    ctx.strokeStyle = isLeader ? "rgba(220, 255, 255, 0.9)" : "rgba(160, 255, 220, 0.85)";
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Internal Nucleus
    ctx.beginPath();
    const nucleusR = r * 0.38;
    const nX = Math.sin(time * 3 + cell.wobbleOffset) * (r * 0.08);
    const nY = Math.cos(time * 3 + cell.wobbleOffset) * (r * 0.08);
    ctx.arc(nX, nY, nucleusR, 0, Math.PI * 2);
    ctx.fillStyle = isLeader ? "rgba(255, 0, 119, 0.75)" : "rgba(0, 180, 255, 0.75)";
    ctx.fill();

    // Floating organelles inside
    const organelleCount = Math.max(2, Math.floor(r / 8));
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    for (let i = 0; i < organelleCount; i++) {
      const oAngle = time * (1.5 + i * 0.5) + (i * Math.PI * 2) / organelleCount;
      const oDist = r * 0.55;
      const ox = Math.cos(oAngle) * oDist;
      const oy = Math.sin(oAngle) * oDist;
      ctx.beginPath();
      ctx.arc(ox, oy, Math.max(1.5, r * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }

    // Shield Aura if active
    if (cell.hasShield) {
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "rgba(0, 240, 255, 0.8)";
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // Draw Bio-Electric Web (Arcs connecting daughter cells)
  drawElectricWeb(cells, time) {
    if (cells.length < 2) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;

    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const c1 = cells[i];
        const c2 = cells[j];
        const dist = Math.hypot(c1.x - c2.x, c1.y - c2.y);
        if (dist < 420) {
          const alpha = (1 - dist / 420) * 0.85;
          ctx.strokeStyle = "rgba(0, 240, 255, " + alpha + ")";
          ctx.beginPath();
          ctx.moveTo(c1.x, c1.y);

          // Jagged lightning segments
          const segments = 5;
          let curX = c1.x;
          let curY = c1.y;
          const dx = (c2.x - c1.x) / segments;
          const dy = (c2.y - c1.y) / segments;

          for (let s = 1; s < segments; s++) {
            const normalX = -dy;
            const normalY = dx;
            const jitter = (Math.random() - 0.5) * 18;
            curX = c1.x + dx * s + normalX * jitter * 0.15;
            curY = c1.y + dy * s + normalY * jitter * 0.15;
            ctx.lineTo(curX, curY);
          }
          ctx.lineTo(c2.x, c2.y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  // Draw Shockwaves
  drawShockwave(sw) {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    ctx.lineWidth = sw.thickness * (1 - sw.radius / sw.maxRadius);
    const alpha = (1 - sw.radius / sw.maxRadius) * 0.9;
    
    if (sw.isSingularity) {
      // Swirling Gravitational Singularity
      ctx.strokeStyle = "rgba(255, 0, 255, " + alpha + ")";
      ctx.shadowColor = "#ff00ff";
      ctx.shadowBlur = 30;
      ctx.stroke();

      // Inner Event Horizon Vortex
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, Math.max(5, sw.radius * 0.4), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(20, 0, 40, " + (alpha * 0.8) + ")";
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "rgba(0, 240, 255, " + alpha + ")";
      ctx.stroke();
    } else if (sw.isSupernova) {
      ctx.strokeStyle = "rgba(255, 0, 119, " + alpha + ")";
      ctx.shadowColor = "#ff0077";
      ctx.shadowBlur = 20;
      ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(0, 240, 255, " + alpha + ")";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 20;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draw Acid Pools
  drawAcidPool(pool, time) {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pool.x, pool.y, pool.radius, 0, Math.PI * 2);
    const alpha = Math.min(0.7, pool.duration / pool.maxDuration);
    
    if (pool.isHyper) {
      ctx.fillStyle = "rgba(200, 255, 0, " + alpha + ")";
      ctx.shadowColor = "#ccff00";
      ctx.shadowBlur = 22;
    } else {
      ctx.fillStyle = "rgba(0, 255, 128, " + alpha + ")";
      ctx.shadowColor = "#00ff80";
      ctx.shadowBlur = 15;
    }
    ctx.fill();

    // Bubbles
    const bubbleCount = pool.isHyper ? 6 : 4;
    ctx.fillStyle = pool.isHyper ? "rgba(255, 255, 180, " + (alpha + 0.3) + ")" : "rgba(200, 255, 200, " + (alpha + 0.2) + ")";
    for (let i = 0; i < bubbleCount; i++) {
      const bTime = (time * 3 + i * 1.2) % 1.4;
      const bR = (bTime / 1.4) * (pool.radius * 0.35);
      const angle = i * (Math.PI * 2 / bubbleCount) + time * 1.5;
      const bx = pool.x + Math.cos(angle) * (pool.radius * 0.45);
      const by = pool.y + Math.sin(angle) * (pool.radius * 0.45);
      ctx.beginPath();
      ctx.arc(bx, by, Math.max(1, bR), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Draw Enemy Units
  drawEnemy(enemy, time) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    const r = enemy.radius;
    const isHit = enemy.hitFlashTimer > 0;

    // Flash white on hit
    if (isHit) {
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 20;
    }

    if (enemy.type === "bacterium") {
      // Wiggling Rod Bacteria
      ctx.rotate(enemy.angle || 0);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.4, r * 0.75, 0, 0, Math.PI * 2);
      ctx.fillStyle = isHit ? "#ffffff" : "#ff3366";
      ctx.shadowColor = "#ff0055";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffaac4";
      ctx.stroke();

      // Flagella tail
      ctx.beginPath();
      ctx.moveTo(-r * 1.3, 0);
      const tailWiggle = Math.sin(time * 12) * 8;
      ctx.quadraticCurveTo(-r * 2.2, tailWiggle, -r * 3.0, -tailWiggle);
      ctx.strokeStyle = "rgba(255, 80, 120, 0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();

    } else if (enemy.type === "phage") {
      // Geometric Spidery Phage
      ctx.rotate(enemy.angle || 0);
      // Icosahedral Head
      ctx.beginPath();
      const sides = 6;
      for (let i = 0; i < sides; i++) {
        const a = (i * Math.PI * 2) / sides;
        const hx = Math.cos(a) * (r * 0.85);
        const hy = Math.sin(a) * (r * 0.85);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fillStyle = isHit ? "#ffffff" : "#ffaa00";
      ctx.shadowColor = "#ffaa00";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.strokeStyle = "#fff2a8";
      ctx.stroke();

      // Spidery Legs
      ctx.strokeStyle = "rgba(255, 170, 0, 0.85)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const la = (i - 1.5) * 0.6 + Math.PI;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const lx1 = Math.cos(la) * (r * 1.3);
        const ly1 = Math.sin(la) * (r * 1.3);
        const lx2 = lx1 + Math.cos(la - 0.4) * (r * 0.8);
        const ly2 = ly1 + Math.sin(la - 0.4) * (r * 0.8);
        ctx.lineTo(lx1, ly1);
        ctx.lineTo(lx2, ly2);
        ctx.stroke();
      }

    } else if (enemy.type === "nematode") {
      // Segmented Round Worm
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = isHit ? "#ffffff" : "#9900ff";
      ctx.shadowColor = "#cc00ff";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#e6a8ff";
      ctx.stroke();

    } else if (enemy.type === "spore") {
      // Toxic Spore Shooter
      ctx.beginPath();
      const pulse = 1 + Math.sin(time * 5) * 0.1;
      ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
      ctx.fillStyle = isHit ? "#ffffff" : "#00ddaa";
      ctx.shadowColor = "#00ffaa";
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

    } else if (enemy.type === "amoeba") {
      // Giant Shifting Amoeba
      ctx.beginPath();
      const pts = 8;
      for (let i = 0; i < pts; i++) {
        const a = (i * Math.PI * 2) / pts;
        const w = Math.sin(time * 4 + i * 2) * (r * 0.2);
        const pr = r + w;
        const px = Math.cos(a) * pr;
        const py = Math.sin(a) * pr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = isHit ? "#ffffff" : "#e6005c";
      ctx.shadowColor = "#ff0077";
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffa3cc";
      ctx.stroke();

    } else if (enemy.type === "flagellate") {
      // 鞭毛虫: Serpentine Swimming Flagellate with Luminous Tail
      ctx.rotate(enemy.angle || 0);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.35, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fillStyle = isHit ? "#ffffff" : "#00f0aa";
      ctx.shadowColor = "#00f0aa";
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = "#80ffd5";
      ctx.stroke();

      // Long Dual Flagella Tail
      ctx.beginPath();
      ctx.moveTo(-r * 1.3, 0);
      const w1 = Math.sin(time * 16) * 12;
      const w2 = Math.cos(time * 14) * 10;
      ctx.quadraticCurveTo(-r * 2.5, w1, -r * 3.8, -w1 * 0.8);
      ctx.moveTo(-r * 1.3, 0);
      ctx.quadraticCurveTo(-r * 2.2, w2, -r * 3.4, -w2 * 0.8);
      ctx.strokeStyle = "rgba(0, 240, 170, 0.85)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Glowing Nucleus
      ctx.beginPath();
      ctx.arc(r * 0.3, 0, r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

    } else if (enemy.type === "ciliate") {
      // 草履虫: Vibrating Cilia Perimeter & Slipper Body
      ctx.rotate(enemy.angle || 0);
      
      // Jitter if charging leap
      if (enemy.isChargingLeap) {
        ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
      }

      // Slipper Outer Body
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.3, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = isHit ? "#ffffff" : (enemy.isChargingLeap ? "#00ffff" : "#00bbff");
      ctx.shadowColor = "#00e1ff";
      ctx.shadowBlur = enemy.isChargingLeap ? 22 : 12;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#a3eeff";
      ctx.stroke();

      // Vibrating Cilia Hairs
      const hairCount = 14;
      ctx.strokeStyle = "rgba(160, 240, 255, 0.85)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < hairCount; i++) {
        const a = (i * Math.PI * 2) / hairCount;
        const hx = Math.cos(a) * (r * 1.25);
        const hy = Math.sin(a) * (r * 0.8);
        const hLen = 5 + Math.sin(time * 24 + i) * 3;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx + Math.cos(a) * hLen, hy + Math.sin(a) * hLen);
        ctx.stroke();
      }

      // Contractile Vacuoles (伸缩泡)
      ctx.beginPath();
      ctx.arc(-r * 0.4, 0, r * 0.22, 0, Math.PI * 2);
      ctx.arc(r * 0.4, 0, r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fill();

    } else if (enemy.type === "tardigrade") {
      // 水熊虫: Segmented Armored Body with Micro-claws & Cryptobiosis Shield
      ctx.rotate(enemy.angle || 0);

      if (enemy.isHardened) {
        // Cryptobiosis Crystalline Hardened State
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2);
        ctx.fillStyle = isHit ? "#ffffff" : "#d49b00";
        ctx.shadowColor = "#ffcc00";
        ctx.shadowBlur = 24;
        ctx.fill();

        // Hexagonal Shield Crystalline Overlay
        ctx.beginPath();
        const sides = 6;
        for (let i = 0; i < sides; i++) {
          const a = (i * Math.PI * 2) / sides + time * 2;
          const hx = Math.cos(a) * (r * 1.35);
          const hy = Math.sin(a) * (r * 1.35);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "rgba(255, 220, 100, 0.9)";
        ctx.stroke();

      } else {
        // 3 Segmented Body Overlaps
        for (let s = -1; s <= 1; s++) {
          ctx.beginPath();
          ctx.ellipse(s * (r * 0.45), 0, r * 0.55, r * 0.75, 0, 0, Math.PI * 2);
          ctx.fillStyle = isHit ? "#ffffff" : "#c28800";
          ctx.fill();
          ctx.lineWidth = 1.8;
          ctx.strokeStyle = "#ffd166";
          ctx.stroke();
        }

        // Stubby Micro-legs
        ctx.fillStyle = "#e0a300";
        for (let s = -1; s <= 1; s++) {
          const legWiggle = Math.sin(time * 10 + s) * 3;
          ctx.fillRect(s * (r * 0.45) - 3, -r * 0.95 + legWiggle, 6, 6);
          ctx.fillRect(s * (r * 0.45) - 3, r * 0.75 - legWiggle, 6, 6);
        }

        // Armored Eyespots
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(r * 0.7, -r * 0.25, 2.5, 0, Math.PI * 2);
        ctx.arc(r * 0.7, r * 0.25, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (enemy.type === "macrophage") {
      // 巨噬体: Amoeboid Hunter with Reaching Pseudopodia
      ctx.rotate(enemy.angle || 0);

      // Organic Pseudopod Membrane
      ctx.beginPath();
      const points = 10;
      for (let i = 0; i < points; i++) {
        const a = (i * Math.PI * 2) / points;
        // Reach forward pseudopods in facing direction (around angle 0)
        let forwardReach = 0;
        if (Math.cos(a) > 0.3) {
          forwardReach = Math.cos(a) * (r * 0.5) * (0.8 + 0.4 * Math.sin(time * 6 + i));
        }
        const w = Math.sin(time * 4 + i * 2) * (r * 0.18) + forwardReach;
        const pr = r + w;
        const px = Math.cos(a) * pr;
        const py = Math.sin(a) * pr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = isHit ? "#ffffff" : "#800040";
      ctx.shadowColor = "#ff0066";
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#ff4d94";
      ctx.stroke();

      // Glowing Digestive Lysosomes
      const lysCount = 4;
      for (let i = 0; i < lysCount; i++) {
        const la = time * 2 + (i * Math.PI * 2) / lysCount;
        const lx = Math.cos(la) * (r * 0.4);
        const ly = Math.sin(la) * (r * 0.4);
        ctx.beginPath();
        ctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? "#ff0055" : "#00ffff";
        ctx.fill();
      }

    } else if (enemy.isBoss) {
      // Boss Renders: Queen, Apex, Hydra, Rotifer, Behemoth
      if (enemy.bossType === "queen") {
        // Colony Queen: Crown & Petals Carapace
        ctx.rotate(time * 0.8);
        ctx.beginPath();
        const petals = 8;
        for (let i = 0; i < petals; i++) {
          const a = (i * Math.PI * 2) / petals;
          const pr = r * (1 + 0.25 * Math.sin(time * 3 + i));
          const px = Math.cos(a) * pr;
          const py = Math.sin(a) * pr;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = isHit ? "#ffffff" : "rgba(190, 0, 60, 0.9)";
        ctx.shadowColor = "#ff0055";
        ctx.shadowBlur = 26;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#ff6699";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = isHit ? "#ffffff" : "#ff0055";
        ctx.fill();

      } else if (enemy.bossType === "apex") {
        // Apex Phage: Crystalline Multi-Spike Head
        ctx.rotate(time * 1.4);
        ctx.beginPath();
        const spikes = 6;
        for (let i = 0; i < spikes; i++) {
          const a = (i * Math.PI * 2) / spikes;
          const outerR = r * 1.35;
          const innerR = r * 0.75;
          const midA = a + Math.PI / spikes;
          const ox = Math.cos(a) * outerR;
          const oy = Math.sin(a) * outerR;
          const ix = Math.cos(midA) * innerR;
          const iy = Math.sin(midA) * innerR;
          if (i === 0) ctx.moveTo(ox, oy);
          else ctx.lineTo(ox, oy);
          ctx.lineTo(ix, iy);
        }
        ctx.closePath();
        ctx.fillStyle = isHit ? "#ffffff" : "#e67300";
        ctx.shadowColor = "#ffaa00";
        ctx.shadowBlur = 26;
        ctx.fill();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = "#ffea80";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = isHit ? "#ffffff" : "#ffffff";
        ctx.fill();

      } else if (enemy.bossType === "hydra") {
        // Dread Hydra: Central Core + 4-6 Undulating Head Tentacles
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = isHit ? "#ffffff" : "#008f5d";
        ctx.shadowColor = "#00ff99";
        ctx.shadowBlur = 24;
        ctx.fill();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = "#66ffcc";
        ctx.stroke();

        // 4 Orbiting Stalks and Head Nodes
        const tCount = enemy.tentacleCount || 4;
        const timeNow = time * 2.0;
        for (let i = 0; i < tCount; i++) {
          const tAngle = timeNow + (i * Math.PI * 2) / tCount;
          const tx = Math.cos(tAngle) * 80;
          const ty = Math.sin(tAngle) * 80;
          
          // Curved Stalk
          ctx.beginPath();
          ctx.moveTo(0, 0);
          const midWiggleX = Math.cos(tAngle + 0.4) * 45;
          const midWiggleY = Math.sin(tAngle + 0.4) * 45;
          ctx.quadraticCurveTo(midWiggleX, midWiggleY, tx, ty);
          ctx.strokeStyle = "rgba(0, 255, 150, 0.8)";
          ctx.lineWidth = 4;
          ctx.stroke();

          // Tentacle Head
          ctx.beginPath();
          ctx.arc(tx, ty, 14, 0, Math.PI * 2);
          ctx.fillStyle = isHit ? "#ffffff" : "#00ff99";
          ctx.shadowColor = "#00ffaa";
          ctx.shadowBlur = 14;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();

          // Head Core Eye
          ctx.beginPath();
          ctx.arc(tx, ty, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }

      } else if (enemy.bossType === "rotifer") {
        // Vortex Rotifer: Twin Spinning Corona Gears + Whirlpool Field
        ctx.save();
        ctx.rotate(time * 3.5);
        // Outer Gear Teeth
        ctx.beginPath();
        const teeth = 12;
        for (let i = 0; i < teeth; i++) {
          const a = (i * Math.PI * 2) / teeth;
          const tr = r * (i % 2 === 0 ? 1.25 : 0.85);
          const gx = Math.cos(a) * tr;
          const gy = Math.sin(a) * tr;
          if (i === 0) ctx.moveTo(gx, gy);
          else ctx.lineTo(gx, gy);
        }
        ctx.closePath();
        ctx.fillStyle = isHit ? "#ffffff" : "rgba(100, 0, 180, 0.85)";
        ctx.shadowColor = "#b300ff";
        ctx.shadowBlur = 24;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#e085ff";
        ctx.stroke();
        ctx.restore();

        // Inner Counter-Rotating Crown
        ctx.save();
        ctx.rotate(-time * 4.0);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = isHit ? "#ffffff" : "#d97706";
        ctx.shadowColor = "#f59e0b";
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.restore();

        // Central Mastax Maw
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

      } else if (enemy.bossType === "behemoth") {
        // Cytotoxic Behemoth: Massive Faceted Virus with Orbiting Poison Nodes
        const isFrenzy = enemy.hp < enemy.maxHp * 0.35;
        ctx.rotate(time * (isFrenzy ? 2.5 : 1.2));

        // Faceted Octagonal Capsid
        ctx.beginPath();
        const sides = 8;
        for (let i = 0; i < sides; i++) {
          const a = (i * Math.PI * 2) / sides;
          const cr = r * (i % 2 === 0 ? 1.2 : 0.9);
          const cx = Math.cos(a) * cr;
          const cy = Math.sin(a) * cr;
          if (i === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        }
        ctx.closePath();
        ctx.fillStyle = isHit ? "#ffffff" : (isFrenzy ? "#b30000" : "#4a0072");
        ctx.shadowColor = isFrenzy ? "#ff0033" : "#e000ff";
        ctx.shadowBlur = 30;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = isFrenzy ? "#ff6666" : "#ff80df";
        ctx.stroke();

        // 6 Orbiting Poison Satellites
        const satCount = 6;
        for (let i = 0; i < satCount; i++) {
          const sa = -time * 2.2 + (i * Math.PI * 2) / satCount;
          const sx = Math.cos(sa) * (r * 1.45);
          const sy = Math.sin(sa) * (r * 1.45);
          ctx.beginPath();
          ctx.arc(sx, sy, 8, 0, Math.PI * 2);
          ctx.fillStyle = "#00ffcc";
          ctx.shadowColor = "#00ffcc";
          ctx.shadowBlur = 10;
          ctx.fill();
        }

        // Singularity Core
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = isFrenzy ? "#ffffff" : "#ff0077";
        ctx.fill();
      }
    }

    // Mini Health Bar for large units & non-bosses
    if (enemy.maxHp > 30 && !enemy.isBoss) {
      const barW = r * 1.6;
      const barH = 4;
      const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(-barW / 2, -r - 10, barW, barH);
      ctx.fillStyle = "#ff0055";
      ctx.fillRect(-barW / 2, -r - 10, barW * hpPct, barH);
    }

    ctx.restore();
  }

  // Draw Projectiles
  drawProjectile(p) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);

    if (p.isPrismatic) {
      // Prismatic Rainbow Laser
      ctx.rotate(p.angle);
      ctx.beginPath();
      const grad = ctx.createLinearGradient(-p.length / 2, 0, p.length / 2, 0);
      grad.addColorStop(0, "#ff00aa");
      grad.addColorStop(0.5, "#00f0ff");
      grad.addColorStop(1, "#ffff00");
      ctx.fillStyle = grad;
      ctx.shadowColor = "#ff00ff";
      ctx.shadowBlur = 18;
      ctx.fillRect(-p.length / 2, -p.width * 0.7, p.length, p.width * 1.4);
    } else if (p.isLaser) {
      ctx.rotate(p.angle);
      ctx.beginPath();
      ctx.fillStyle = "#00f0ff";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 14;
      ctx.fillRect(-p.length / 2, -p.width / 2, p.length, p.width);
    } else if (p.isTeslaThorn) {
      // Tesla Electric Thorn
      ctx.rotate(p.angle);
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, 4.5);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-10, -4.5);
      ctx.closePath();
      ctx.fillStyle = "#00ffff";
      ctx.shadowColor = "#b300ff";
      ctx.shadowBlur = 16;
      ctx.fill();
    } else if (p.isThorn) {
      ctx.rotate(p.angle);
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-8, 3.5);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, -3.5);
      ctx.closePath();
      ctx.fillStyle = "#ff0077";
      ctx.shadowColor = "#ff0077";
      ctx.shadowBlur = 10;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.isEnemy ? "#ff3366" : "#00ffcc";
      ctx.shadowColor = p.isEnemy ? "#ff0055" : "#00ffaa";
      ctx.shadowBlur = 10;
      ctx.fill();
    }
    ctx.restore();
  }

  // Draw ATP Pickup Orbs
  drawAtp(orb, time) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(orb.x, orb.y);
    
    const pulse = 1 + Math.sin(time * 6 + orb.phase) * 0.2;
    ctx.beginPath();
    ctx.arc(0, 0, orb.radius * pulse, 0, Math.PI * 2);
    ctx.fillStyle = "#00ffaa";
    ctx.shadowColor = "#00ffaa";
    ctx.shadowBlur = 12;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, orb.radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
  }

  // Draw Floating Damage Numbers & Text
  drawFloatingTexts(texts) {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 14px 'Segoe UI', sans-serif";

    texts.forEach(t => {
      ctx.fillStyle = t.color || "#00f0ff";
      ctx.shadowColor = t.color || "#00f0ff";
      ctx.shadowBlur = 8;
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.fillText(t.text, t.x, t.y);
    });
    ctx.restore();
  }

  // Draw Friendly Drones (Standard / Hive Wasp)
  drawDrone(drone, time) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(drone.x, drone.y);
    ctx.rotate(drone.angle);
    
    if (drone.isHive) {
      // Mutated Bio-Wasp
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd000";
      ctx.shadowColor = "#ffbb00";
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#402000";
      ctx.stroke();

      // Fluttering Wings
      const wingFlutter = Math.sin(time * 30) * 8;
      ctx.fillStyle = "rgba(0, 240, 255, 0.75)";
      ctx.beginPath();
      ctx.ellipse(0, -7, 6, Math.abs(wingFlutter), 0, 0, Math.PI * 2);
      ctx.ellipse(0, 7, 6, Math.abs(wingFlutter), 0, 0, Math.PI * 2);
      ctx.fill();

      // Stinger
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-15, 0);
      ctx.strokeStyle = "#ff0055";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-7, 6);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-7, -6);
      ctx.closePath();
      ctx.fillStyle = "#00ffaa";
      ctx.shadowColor = "#00ffaa";
      ctx.shadowBlur = 10;
      ctx.fill();
    }
    ctx.restore();
  }
}

window.GameRenderer = GameRenderer;
