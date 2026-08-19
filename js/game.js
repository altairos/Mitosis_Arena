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

    // Strain Selector Cards
    document.querySelectorAll(".strain-card").forEach(card => {
      card.addEventListener("click", () => {
        document.querySelectorAll(".strain-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        const strainId = card.dataset.strain;
        if (strainId) window.upgradeManager.setStrain(strainId);
      });
    });

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
    window.upgradeManager.reset();
    window.upgradeManager.applyStartingStrain(this.player);

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

    // Calculate player screen position for direct touch steering
    const playerScreenPos = this.renderer.worldToScreen(this.player.centroid.x, this.player.centroid.y);
    const moveVec = window.inputManager.getMovementVector(playerScreenPos);

    // Aim target in world coordinates
    let targetWorldPoint;
    if (window.inputManager.touchMove && window.inputManager.touchMove.active) {
      targetWorldPoint = this.renderer.screenToWorld(
        window.inputManager.touchMove.x,
        window.inputManager.touchMove.y
      );
    } else {
      targetWorldPoint = this.renderer.screenToWorld(
        window.inputManager.mouse.x,
        window.inputManager.mouse.y
      );
    }

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
      const dead = e.update(
        dt, this.player.centroid, this.projectiles, this.enemies,
        this.acidPools, this.shockwaves, this.player
      );
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

    // Spawn high-density surrounding ring of 20~40 swarmers
    const surgeCount = 18 + Math.min(25, this.wave * 4);
    for (let i = 0; i < surgeCount; i++) {
      const angle = (i * Math.PI * 2) / surgeCount;
      const dist = 750 + Math.random() * 80;
      const x = this.player.centroid.x + Math.cos(angle) * dist;
      const y = this.player.centroid.y + Math.sin(angle) * dist;

      const dFromOrigin = Math.hypot(x, y);
      if (dFromOrigin < this.arenaRadius - 50) {
        const pool = ["bacterium"];
        if (this.wave >= 2) pool.push("phage");
        if (this.wave >= 3) pool.push("flagellate");
        if (this.wave >= 4) pool.push("spore");
        if (this.wave >= 5) pool.push("ciliate");
        if (this.wave >= 6) pool.push("nematode");
        if (this.wave >= 7) pool.push("tardigrade");
        if (this.wave >= 8) pool.push("macrophage");
        const type = pool[Math.floor(Math.random() * pool.length)];
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
    if (this.wave >= 3) types.push("flagellate");
    if (this.wave >= 4) types.push("nematode", "spore");
    if (this.wave >= 5) types.push("ciliate");
    if (this.wave >= 6) types.push("amoeba");
    if (this.wave >= 7) types.push("tardigrade");
    if (this.wave >= 8) types.push("macrophage");

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

    // Dynamic Boss Progression based on wave:
    // Wave 5: queen
    // Wave 10: apex
    // Wave 15: hydra
    // Wave 20: rotifer
    // Wave 25+: behemoth (or cyclical rotation with scaled difficulty)
    let bossType = "queen";
    const bossIndex = Math.floor(this.wave / 5);
    if (bossIndex === 1) bossType = "queen";
    else if (bossIndex === 2) bossType = "apex";
    else if (bossIndex === 3) bossType = "hydra";
    else if (bossIndex === 4) bossType = "rotifer";
    else if (bossIndex === 5) bossType = "behemoth";
    else {
      const bosses = ["queen", "apex", "hydra", "rotifer", "behemoth"];
      bossType = bosses[(bossIndex - 1) % bosses.length];
    }

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
          let dmg = p.damage;
          if (e.isHardened) dmg *= 0.25; // Tardigrade Cryptobiosis armor
          e.hp -= dmg;
          e.hitFlashTimer = 0.08;

          if (p.poison) {
            e.poisonDuration = 4.0;
            e.poisonDmgPerSec = 16;
          }

          // Prismatic Laser Refraction (Hyper Super Weapon)
          if (p.isPrismatic && !p.hasRefracted) {
            p.hasRefracted = true;
            const refractAngles = [-0.55, 0, 0.55];
            refractAngles.forEach(offset => {
              const ra = p.angle + offset;
              this.projectiles.push(new window.Projectile(
                e.x, e.y,
                Math.cos(ra) * 720,
                Math.sin(ra) * 720,
                {
                  radius: 4.5,
                  damage: p.damage * 0.7,
                  isLaser: true,
                  isCrit: p.isCrit,
                  pierce: 3,
                  poison: p.poison,
                  length: 26
                }
              ));
            });
            if (p.isCrit) {
              player.hp = Math.min(player.maxHp, player.hp + 2.0);
            }
          }

          this.addFloatingText(e.x, e.y, Math.round(dmg), p.isCrit ? "#ffaa00" : (p.isPrismatic ? "#ff00dd" : "#00f0ff"));

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
          let dmg = sw.damage;
          if (e.isHardened) dmg *= 0.25;
          e.hp -= dmg;
          e.hitFlashTimer = 0.12;
          this.addFloatingText(e.x, e.y, Math.round(dmg), sw.isSingularity ? "#ff00ff" : "#ff0077");

          // Gravitational pull for singularity vortex
          if (sw.isSingularity && d > 0 && !e.isBoss) {
            e.x += ((sw.x - e.x) / d) * 180;
            e.y += ((sw.y - e.y) / d) * 180;
          } else if (d > 0) {
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
          const mult = pool.isHyper ? 2.5 : 1.0;
          e.hp -= pool.damagePerSec * mult * dt;
          e.poisonDuration = 1.0;
          e.poisonDmgPerSec = pool.isHyper ? 30 : 12;
          if (pool.isHyper && !e.isBoss) {
            e.vx *= 0.55;
            e.vy *= 0.55;
          }
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
      this.player.drones.push(new window.FriendlyDrone(enemy.x, enemy.y, this.player.stats.hasParasiticHive));
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

    if (enemy.type === "macrophage" && this.acidPools) {
      // Releasing digestive enzymes on death
      this.acidPools.push(new window.AcidPool(enemy.x, enemy.y, 40, 25, 3.0));
    }

    if (enemy.isBoss) {
      this.bossesDefeated++;
      this.activeBoss = null;
      this.renderer.addShake(22);
      document.getElementById("boss-bar-panel").style.display = "none";
      const orbCount = 10 + (enemy.bossType === "behemoth" ? 14 : (enemy.bossType === "rotifer" ? 9 : 5));
      for (let i = 0; i < orbCount; i++) {
        this.atpOrbs.push(new window.AtpOrb(
          enemy.x + (Math.random() - 0.5) * 120,
          enemy.y + (Math.random() - 0.5) * 120,
          75
        ));
      }
    }
  }

  triggerLevelUp() {
    this.state = "LEVEL_UP";
    this.renderMutationDeck();
    document.getElementById("modal-mutation").classList.remove("hidden");
  }

  renderMutationDeck() {
    const options = window.upgradeManager.getRandomOptions(3);
    const deck = document.getElementById("cards-deck");
    deck.innerHTML = "";

    options.forEach(opt => {
      const card = document.createElement("div");
      card.className = "mutation-card tier-" + opt.tier;
      const isHyper = opt.tier === "hyper";
      card.innerHTML = `
        <div class="card-icon">${opt.icon}</div>
        <div class="card-info">
          <div class="card-header-line">
            <span class="card-title">${opt.name}</span>
            <span class="card-tier">${isHyper ? "⚡超武" : opt.tier.toUpperCase() + " (" + (opt.rank + 1) + "/" + opt.maxRank + ")"}</span>
          </div>
          ${opt.reqDesc ? `<div class="card-req">${opt.reqDesc}</div>` : ""}
          <div class="card-desc">${opt.desc}</div>
        </div>
      `;
      card.addEventListener("click", () => {
        window.upgradeManager.selectUpgrade(opt.id, this.player);
        this.hideAllModals();
        this.state = "PLAYING";
        this.lastTime = performance.now();
      });
      deck.appendChild(card);
    });

    // Reroll Button Container
    let rerollBtn = document.getElementById("btn-reroll");
    if (!rerollBtn) {
      rerollBtn = document.createElement("button");
      rerollBtn.id = "btn-reroll";
      rerollBtn.className = "btn-reroll";
      const modal = document.querySelector("#modal-mutation .modal-card");
      modal.appendChild(rerollBtn);
    }
    
    rerollBtn.innerText = `🔄 基因重排 (REROLL ${window.upgradeManager.rerollCount}/${window.upgradeManager.maxRerolls})`;
    rerollBtn.disabled = window.upgradeManager.rerollCount <= 0;
    rerollBtn.onclick = () => {
      if (window.upgradeManager.rerollCount > 0) {
        window.upgradeManager.rerollCount--;
        this.renderMutationDeck();
      }
    };
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
