// Core Game Engine & Wave Orchestrator for Mitosis Arena (High Density & Swarm Surges)

class GameEngine {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.renderer = new window.GameRenderer(this.canvas);
    this.player = new window.PlayerGroup();

    this.arenaRadius = 1650;
    this.state = "MENU"; // MENU, PLAYING, LEVEL_UP, PAUSED, GAMEOVER, VICTORY
    this.difficultyMult = 1.0; // 1.0 Normal, 1.5 Insane

    this.gameTime = 0;
    this.wave = 1;
    this.score = 0;
    this.enemiesKilled = 0;
    this.bossesDefeated = 0;
    this.maxCellsFormed = 1;

    this.enemies = [];
    this.projectiles = [];
    this.shockwaves = [];
    this.acidPools = [];
    this.atpOrbs = [];
    this.floatingTexts = [];

    this.activeBoss = null;
    this.spawnTimer = 0;
    this.waveTimer = 0;
    this.surgeTimer = 0;
    this.surgeInterval = 25; // Swarm Surge every 25 seconds

    this.lastTime = performance.now();
    this.init();
  }

  init() {
    window.inputManager.onSplitAction = () => {
      if (this.state === "PLAYING") {
        if (this.player.split(this.projectiles)) {
          this.renderer.addShake(4);
          this.maxCellsFormed = Math.max(this.maxCellsFormed, this.player.cells.length);
        }
      }
    };

    window.inputManager.onMergeAction = () => {
      if (this.state === "PLAYING") {
        if (this.player.merge(this.shockwaves, this.acidPools)) {
          this.renderer.addShake(12);
        }
      }
    };

    window.inputManager.onPauseAction = () => {
      if (this.state === "PLAYING") this.pauseGame();
      else if (this.state === "PAUSED") this.resumeGame();
    };

    // Difficulty buttons
    const btnNormal = document.getElementById("diff-normal");
    const btnInsane = document.getElementById("diff-insane");

    if (btnNormal && btnInsane) {
      btnNormal.addEventListener("click", () => {
        this.difficultyMult = 1.0;
        btnNormal.classList.add("active");
        btnInsane.classList.remove("active");
      });
      btnInsane.addEventListener("click", () => {
        this.difficultyMult = 1.5;
        btnInsane.classList.add("active");
        btnNormal.classList.remove("active");
      });
    }

    document.getElementById("btn-start").addEventListener("click", () => this.startGame());
    document.getElementById("btn-restart").addEventListener("click", () => this.startGame());
    
    const soundBtn = document.getElementById("btn-sound");
    if (soundBtn) {
      soundBtn.addEventListener("click", () => {
        const muted = window.soundEngine.toggleMute();
        soundBtn.innerHTML = muted ? "🔇" : "🔊";
      });
    }

    const pauseBtn = document.getElementById("btn-pause");
    if (pauseBtn) {
      pauseBtn.addEventListener("click", () => {
        if (this.state === "PLAYING") this.pauseGame();
        else if (this.state === "PAUSED") this.resumeGame();
      });
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  startGame() {
    window.soundEngine.init();
    this.hideAllModals();

    this.player.reset();
    this.enemies = [];
    this.projectiles = [];
    this.shockwaves = [];
    this.acidPools = [];
    this.atpOrbs = [];
    this.floatingTexts = [];
    
    this.gameTime = 0;
    this.wave = 1;
    this.score = 0;
    this.enemiesKilled = 0;
    this.bossesDefeated = 0;
    this.maxCellsFormed = 1;
    this.activeBoss = null;
    this.spawnTimer = 0;
    this.waveTimer = 0;
    this.surgeTimer = 0;

    window.upgradeManager.reset();
    this.state = "PLAYING";
    this.lastTime = performance.now();
  }

  pauseGame() {
    this.state = "PAUSED";
    document.getElementById("modal-pause").classList.remove("hidden");
  }

  resumeGame() {
    this.state = "PLAYING";
    document.getElementById("modal-pause").classList.add("hidden");
    this.lastTime = performance.now();
  }

  hideAllModals() {
    document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.add("hidden"));
  }

  loop(currentTime) {
    const dt = Math.min(0.05, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    if (this.state === "PLAYING") {
      this.update(dt);
    }

    this.render(currentTime / 1000, dt);
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.gameTime += dt;
    this.waveTimer += dt;
    this.surgeTimer += dt;

    // Wave Progression every 30 seconds
    if (this.waveTimer >= 30) {
      this.waveTimer = 0;
      this.wave++;
      
      if (this.wave % 5 === 0 && !this.activeBoss) {
        this.spawnBoss();
      }
    }

    // Swarm Surge Red Alert event every 25s
    if (this.surgeTimer >= this.surgeInterval) {
      this.surgeTimer = 0;
      this.triggerSwarmSurge();
    }

    const mousePos = window.inputManager.mouse;
    const worldMouse = this.renderer.screenToWorld(mousePos.x, mousePos.y);
    const moveVec = window.inputManager.getMovementVector();

    this.player.update(
      dt, moveVec, worldMouse, this.arenaRadius,
      this.shockwaves, this.acidPools, this.projectiles, this.enemies
    );

    this.renderer.updateCamera(
      this.player.centroid.x,
      this.player.centroid.y,
      this.player.centroid.spread,
      dt
    );

    this.updateSpawning(dt);

    this.enemies = this.enemies.filter(e => {
      const dead = e.update(dt, this.player.centroid, this.projectiles, this.enemies);
      if (dead) this.handleEnemyDeath(e);
      return !dead;
    });

    this.projectiles = this.projectiles.filter(p => !p.update(dt));
    this.shockwaves = this.shockwaves.filter(sw => !sw.update(dt));
    this.acidPools = this.acidPools.filter(pool => !pool.update(dt));

    this.atpOrbs.forEach(orb => {
      orb.update(dt, this.player.centroid.x, this.player.centroid.y, this.player.magnetRadius);
    });

    this.floatingTexts = this.floatingTexts.filter(t => {
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.alpha -= dt * 1.2;
      return t.alpha > 0;
    });

    this.checkCollisions(dt);
    this.updateHUD();

    if (this.player.hp <= 0) {
      this.gameOver();
    }
  }

  triggerSwarmSurge() {
    window.soundEngine.playBossAlert();
    this.renderer.addShake(10);
    
    // Show banner
    const banner = document.getElementById("surge-banner");
    if (banner) {
      banner.style.display = "block";
      setTimeout(() => { banner.style.display = "none"; }, 3000);
    }

    // Spawn high-density surrounding ring of 20~35 swarmers
    const surgeCount = 18 + Math.min(25, this.wave * 4);
    for (let i = 0; i < surgeCount; i++) {
      const angle = (i * Math.PI * 2) / surgeCount;
      const dist = 750 + Math.random() * 80;
      const x = this.player.centroid.x + Math.cos(angle) * dist;
      const y = this.player.centroid.y + Math.sin(angle) * dist;

      const dFromOrigin = Math.hypot(x, y);
      if (dFromOrigin < this.arenaRadius - 50) {
        const type = (i % 4 === 0 && this.wave >= 2) ? "phage" : "bacterium";
        this.enemies.push(new window.Enemy(x, y, type, this.wave + 1, this.difficultyMult));
      }
    }
  }

  updateSpawning(dt) {
    this.spawnTimer += dt;
    const spawnInterval = Math.max(0.12, 0.75 - this.wave * 0.05);
    const maxEnemies = Math.min(280, 50 + this.wave * 25);

    if (this.spawnTimer >= spawnInterval && this.enemies.length < maxEnemies) {
      this.spawnTimer = 0;
      this.spawnEnemyWave();
    }
  }

  spawnEnemyWave() {
    const types = ["bacterium"];
    if (this.wave >= 2) types.push("phage");
    if (this.wave >= 3) types.push("nematode");
    if (this.wave >= 4) types.push("spore");
    if (this.wave >= 6) types.push("amoeba");

    const count = 3 + Math.floor(this.wave * 1.5);
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = 700 + Math.random() * 250;
      const x = this.player.centroid.x + Math.cos(angle) * dist;
      const y = this.player.centroid.y + Math.sin(angle) * dist;

      const dFromOrigin = Math.hypot(x, y);
      if (dFromOrigin < this.arenaRadius - 60) {
        this.enemies.push(new window.Enemy(x, y, type, this.wave, this.difficultyMult));
      }
    }
  }

  spawnBoss() {
    window.soundEngine.playBossAlert();
    this.renderer.addShake(18);
    const bossType = (this.wave >= 10) ? "apex" : "queen";
    const angle = Math.random() * Math.PI * 2;
    const x = this.player.centroid.x + Math.cos(angle) * 700;
    const y = this.player.centroid.y + Math.sin(angle) * 700;
    
    this.activeBoss = new window.BossEnemy(x, y, bossType, this.wave, this.difficultyMult);
    this.enemies.push(this.activeBoss);

    const bossPanel = document.getElementById("boss-bar-panel");
    const bossTitle = document.getElementById("boss-title");
    if (bossPanel && bossTitle) {
      bossTitle.innerText = this.activeBoss.name;
      bossPanel.style.display = "flex";
    }
  }

  checkCollisions(dt) {
    const player = this.player;

    // 1. Player Projectiles vs Enemies
    this.projectiles.forEach(p => {
      if (p.isEnemy) return;
      for (let e of this.enemies) {
        if (p.hitList.has(e)) continue;
        const d = Math.hypot(p.x - e.x, p.y - e.y);
        if (d < p.radius + e.radius) {
          p.hitList.add(e);
          e.hp -= p.damage;
          e.hitFlashTimer = 0.08;

          if (p.poison) {
            e.poisonDuration = 4.0;
            e.poisonDmgPerSec = 16;
          }

          this.addFloatingText(e.x, e.y, Math.round(p.damage), p.isCrit ? "#ffaa00" : "#00f0ff");

          e.x += (p.vx / 650) * 14;
          e.y += (p.vy / 650) * 14;

          p.pierce--;
          if (p.pierce <= 0) {
            p.life = 0;
            break;
          }
        }
      }
    });

    // 2. Enemy Projectiles vs Player Cells
    this.projectiles.forEach(p => {
      if (!p.isEnemy) return;
      for (let cell of player.cells) {
        const d = Math.hypot(p.x - cell.x, p.y - cell.y);
        if (d < p.radius + cell.radius) {
          p.life = 0;
          player.takeDamage(p.damage, this.acidPools);
          this.renderer.addShake(4);
          this.addFloatingText(cell.x, cell.y, "-" + Math.round(p.damage), "#ff0055");
          break;
        }
      }
    });

    // 3. Shockwaves vs Enemies
    this.shockwaves.forEach(sw => {
      for (let e of this.enemies) {
        if (sw.hitList.has(e)) continue;
        const d = Math.hypot(sw.x - e.x, sw.y - e.y);
        if (Math.abs(d - sw.radius) < sw.thickness + e.radius) {
          sw.hitList.add(e);
          e.hp -= sw.damage;
          e.hitFlashTimer = 0.12;
          this.addFloatingText(e.x, e.y, Math.round(sw.damage), "#ff0077");
          if (d > 0) {
            e.x += ((e.x - sw.x) / d) * 70;
            e.y += ((e.y - sw.y) / d) * 70;
          }
        }
      }
    });

    // 4. Acid Pools vs Enemies
    this.acidPools.forEach(pool => {
      for (let e of this.enemies) {
        const d = Math.hypot(pool.x - e.x, pool.y - e.y);
        if (d < pool.radius + e.radius) {
          e.hp -= pool.damagePerSec * dt;
          e.poisonDuration = 1.0;
          e.poisonDmgPerSec = 12;
        }
      }
    });

    // 5. Electric Web vs Enemies
    if (player.stats.hasElectricWeb && player.cells.length >= 2) {
      for (let i = 0; i < player.cells.length; i++) {
        for (let j = i + 1; j < player.cells.length; j++) {
          const c1 = player.cells[i];
          const c2 = player.cells[j];
          const dist = Math.hypot(c1.x - c2.x, c1.y - c2.y);
          if (dist < 420) {
            for (let e of this.enemies) {
              const dLine = this.distToSegment(e.x, e.y, c1.x, c1.y, c2.x, c2.y);
              if (dLine < e.radius + 6) {
                const webDmg = player.baseDamage * 2.5 * player.stats.webDamageMult * dt;
                e.hp -= webDmg;
                e.hitFlashTimer = 0.05;
                if (Math.random() < 0.08) window.soundEngine.playElectric();
              }
            }
          }
        }
      }
    }

    // 6. Phagocytosis Gravitational Vortex
    if (player.stats.hasPhagocytosis && player.cells.length === 1) {
      const prime = player.cells[0];
      const suctionRange = 140 + player.stats.phagocytosisRange;
      for (let e of this.enemies) {
        if (e.isBoss) continue;
        const d = Math.hypot(prime.x - e.x, prime.y - e.y);
        if (d < suctionRange) {
          e.x += ((prime.x - e.x) / d) * 180 * dt;
          e.y += ((prime.y - e.y) / d) * 180 * dt;
          
          if (d < prime.radius + e.radius) {
            e.hp -= 90 * dt;
            if (e.hp <= 0) {
              player.hp = Math.min(player.maxHp, player.hp + 8);
              this.addFloatingText(prime.x, prime.y, "+DIGEST", "#00ffaa");
            }
          }
        }
      }
    }

    // 7. Enemy Contact vs Player Cells
    for (let e of this.enemies) {
      for (let cell of player.cells) {
        const d = Math.hypot(cell.x - e.x, cell.y - e.y);
        if (d < cell.radius + e.radius) {
          player.takeDamage(e.damage * dt * 3.2, this.acidPools);
          this.renderer.addShake(2.5);
          if (d > 0) {
            e.x += ((e.x - cell.x) / d) * 160 * dt;
            e.y += ((e.y - cell.y) / d) * 160 * dt;
          }
        }
      }
    }

    // 8. ATP Orbs Collection
    this.atpOrbs = this.atpOrbs.filter(orb => {
      const d = Math.hypot(player.centroid.x - orb.x, player.centroid.y - orb.y);
      if (d < player.cells[0].radius + 24) {
        this.score += orb.value * 10;
        const levelUp = player.addAtp(orb.value);
        if (levelUp) {
          this.triggerLevelUp();
        }
        return false;
      }
      return true;
    });
  }

  handleEnemyDeath(enemy) {
    this.enemiesKilled++;
    this.score += enemy.atpValue * 15;
    window.soundEngine.playEnemyDeath();

    this.atpOrbs.push(new window.AtpOrb(enemy.x, enemy.y, enemy.atpValue));

    if (this.player.stats.droneSpawnChance > 0 && Math.random() < this.player.stats.droneSpawnChance) {
      this.player.drones.push(new window.FriendlyDrone(enemy.x, enemy.y));
    }

    if (enemy.canSplit) {
      for (let i = 0; i < 2; i++) {
        const mini = new window.Enemy(
          enemy.x + (i === 0 ? -20 : 20),
          enemy.y + (i === 0 ? -20 : 20),
          "amoeba",
          this.wave,
          this.difficultyMult
        );
        mini.radius = 20;
        mini.maxHp = 50;
        mini.hp = 50;
        mini.canSplit = false;
        this.enemies.push(mini);
      }
    }

    if (enemy.isBoss) {
      this.bossesDefeated++;
      this.activeBoss = null;
      this.renderer.addShake(22);
      document.getElementById("boss-bar-panel").style.display = "none";
      for (let i = 0; i < 10; i++) {
        this.atpOrbs.push(new window.AtpOrb(
          enemy.x + (Math.random() - 0.5) * 100,
          enemy.y + (Math.random() - 0.5) * 100,
          65
        ));
      }
    }
  }

  triggerLevelUp() {
    this.state = "LEVEL_UP";
    const options = window.upgradeManager.getRandomOptions(3);
    const deck = document.getElementById("cards-deck");
    deck.innerHTML = "";

    options.forEach(opt => {
      const card = document.createElement("div");
      card.className = "mutation-card tier-" + opt.tier;
      card.innerHTML = `
        <div class="card-icon">${opt.icon}</div>
        <div class="card-title">${opt.name}</div>
        <div class="card-tier">${opt.tier} (RANK ${opt.rank + 1}/${opt.maxRank})</div>
        <div class="card-desc">${opt.desc}</div>
      `;
      card.addEventListener("click", () => {
        window.upgradeManager.selectUpgrade(opt.id, this.player);
        this.hideAllModals();
        this.state = "PLAYING";
        this.lastTime = performance.now();
      });
      deck.appendChild(card);
    });

    document.getElementById("modal-mutation").classList.remove("hidden");
  }

  addFloatingText(x, y, text, color = "#00f0ff") {
    this.floatingTexts.push({
      x: x + (Math.random() - 0.5) * 15,
      y: y - 10,
      text: text.toString(),
      color: color,
      alpha: 1.0,
      vx: (Math.random() - 0.5) * 20,
      vy: -45
    });
  }

  distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  updateHUD() {
    const p = this.player;

    const hpPct = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100));
    document.getElementById("hp-fill").style.width = hpPct + "%";
    document.getElementById("hp-text").innerText = Math.ceil(p.hp) + " / " + p.maxHp;

    const atpPct = Math.max(0, Math.min(100, (p.atp / p.atpNeeded) * 100));
    document.getElementById("atp-fill").style.width = atpPct + "%";
    document.getElementById("level-text").innerText = "LV." + p.level;

    document.getElementById("cell-count-text").innerText = p.cells.length + " CELLS";

    const mins = Math.floor(this.gameTime / 60).toString().padStart(2, "0");
    const secs = Math.floor(this.gameTime % 60).toString().padStart(2, "0");
    document.getElementById("timer-display").innerText = mins + ":" + secs;

    document.getElementById("wave-text").innerText = "WAVE " + this.wave;
    document.getElementById("score-text").innerText = "SCORE: " + this.score;

    if (this.activeBoss) {
      const bossHpPct = Math.max(0, Math.min(100, (this.activeBoss.hp / this.activeBoss.maxHp) * 100));
      document.getElementById("boss-bar-fill").style.width = bossHpPct + "%";
    }
  }

  gameOver() {
    this.state = "GAMEOVER";
    document.getElementById("stat-time").innerText = document.getElementById("timer-display").innerText;
    document.getElementById("stat-kills").innerText = this.enemiesKilled;
    document.getElementById("stat-cells").innerText = this.maxCellsFormed;
    document.getElementById("stat-score").innerText = this.score;

    document.getElementById("modal-gameover").classList.remove("hidden");
  }

  render(time, dt) {
    this.renderer.beginFrame();

    this.renderer.drawPetriDish(this.arenaRadius, time);

    this.acidPools.forEach(pool => this.renderer.drawAcidPool(pool, time));

    if (this.player.stats.hasElectricWeb) {
      this.renderer.drawElectricWeb(this.player.cells, time);
    }

    this.atpOrbs.forEach(orb => this.renderer.drawAtp(orb, time));

    this.player.cells.forEach((cell, idx) => {
      this.renderer.drawPlayerCell(cell, time, idx === 0 && this.player.cells.length === 1);
    });

    this.player.drones.forEach(d => this.renderer.drawDrone(d, time));

    this.enemies.forEach(e => this.renderer.drawEnemy(e, time));

    this.projectiles.forEach(p => this.renderer.drawProjectile(p));

    this.shockwaves.forEach(sw => this.renderer.drawShockwave(sw));

    this.floatingTexts.forEach(t => {
      this.renderer.drawFloatingTexts([t]);
    });

    this.renderer.endFrame();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.game = new GameEngine();
});
