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
    
    if (sw.isSupernova) {
      ctx.strokeStyle = "rgba(255, 0, 119, " + alpha + ")";
      ctx.shadowColor = "#ff0077";
    } else {
      ctx.strokeStyle = "rgba(0, 240, 255, " + alpha + ")";
      ctx.shadowColor = "#00f0ff";
    }
    ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.restore();
  }

  // Draw Acid Pools
  drawAcidPool(pool, time) {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pool.x, pool.y, pool.radius, 0, Math.PI * 2);
    const alpha = Math.min(0.6, pool.duration / pool.maxDuration);
    ctx.fillStyle = "rgba(0, 255, 128, " + alpha + ")";
    ctx.shadowColor = "#00ff80";
    ctx.shadowBlur = 15;
    ctx.fill();

    // Bubbles
    const bubbleCount = 4;
    ctx.fillStyle = "rgba(200, 255, 200, " + (alpha + 0.2) + ")";
    for (let i = 0; i < bubbleCount; i++) {
      const bTime = (time * 2 + i * 1.3) % 1.5;
      const bR = (bTime / 1.5) * (pool.radius * 0.35);
      const angle = i * (Math.PI * 2 / bubbleCount) + time;
      const bx = pool.x + Math.cos(angle) * (pool.radius * 0.4);
      const by = pool.y + Math.sin(angle) * (pool.radius * 0.4);
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

    } else if (enemy.isBoss) {
      // Boss: Colony Queen or Apex Phage
      ctx.rotate(time * 0.8);
      // Outer Carapace
      ctx.beginPath();
      const petals = enemy.bossType === "queen" ? 8 : 6;
      for (let i = 0; i < petals; i++) {
        const a = (i * Math.PI * 2) / petals;
        const pr = r * (1 + 0.25 * Math.sin(time * 3 + i));
        const px = Math.cos(a) * pr;
        const py = Math.sin(a) * pr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = isHit ? "#ffffff" : "rgba(180, 0, 50, 0.9)";
      ctx.shadowColor = "#ff0055";
      ctx.shadowBlur = 28;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#ff6699";
      ctx.stroke();

      // Pulsing Core
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = isHit ? "#ffffff" : "#ff0055";
      ctx.fill();
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

    if (p.isLaser) {
      ctx.rotate(p.angle);
      ctx.beginPath();
      ctx.fillStyle = "#00f0ff";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 14;
      ctx.fillRect(-p.length / 2, -p.width / 2, p.length, p.width);
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

  // Draw Friendly Drones
  drawDrone(drone, time) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(drone.x, drone.y);
    ctx.rotate(drone.angle);
    
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
    ctx.restore();
  }
}

window.GameRenderer = GameRenderer;
