// Entities & Physics Engine for Mitosis Arena (Balanced & Hardcore Swarm Tuning)

// 1. Projectile Class
class Projectile {
  constructor(x, y, vx, vy, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = options.radius || 4;
    this.damage = options.damage || 15;
    this.isEnemy = options.isEnemy || false;
    this.isLaser = options.isLaser || false;
    this.isThorn = options.isThorn || false;
    this.isCrit = options.isCrit || false;
    this.pierce = options.pierce || 1;
    this.poison = options.poison || false;
    this.life = options.life || 2.5;
    this.length = options.length || 20;
    this.width = options.width || 6;
    this.angle = Math.atan2(vy, vx);
    this.hitList = new Set();
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    return this.life <= 0;
  }
}

// 2. Shockwave Class
class Shockwave {
  constructor(x, y, maxRadius, damage, isSupernova = false) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.maxRadius = maxRadius;
    this.damage = damage;
    this.isSupernova = isSupernova;
    this.thickness = isSupernova ? 36 : 22;
    this.speed = (maxRadius - 10) / 0.42; // Expands in 0.42s
    this.hitList = new Set();
  }

  update(dt) {
    this.radius += this.speed * dt;
    return this.radius >= this.maxRadius;
  }
}

// 3. Acid Pool Class
class AcidPool {
  constructor(x, y, radius, damagePerSec, duration = 5.0) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.damagePerSec = damagePerSec;
    this.maxDuration = duration;
    this.duration = duration;
    this.tickTimer = 0;
  }

  update(dt) {
    this.duration -= dt;
    this.tickTimer += dt;
    return this.duration <= 0;
  }
}

// 4. ATP Pickup Orb Class
class AtpOrb {
  constructor(x, y, value = 10) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.radius = Math.min(9, 4 + Math.sqrt(value) * 0.85);
    this.phase = Math.random() * Math.PI * 2;
    this.vx = (Math.random() - 0.5) * 80;
    this.vy = (Math.random() - 0.5) * 80;
  }

  update(dt, targetX, targetY, magnetRadius) {
    this.vx *= Math.pow(0.92, dt * 60);
    this.vy *= Math.pow(0.92, dt * 60);
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < magnetRadius) {
      const pull = Math.min(900, (1 - dist / magnetRadius) * 750 + 220);
      this.vx += (dx / dist) * pull * dt;
      this.vy += (dy / dist) * pull * dt;
    }
  }
}

// 5. Friendly Drone Class
class FriendlyDrone {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.life = 8.0;
    this.fireTimer = 0;
  }

  update(dt, enemies, playerCentroid, projectiles) {
    this.life -= dt;
    const angle = Date.now() * 0.0035;
    const targetX = playerCentroid.x + Math.cos(angle) * 75;
    const targetY = playerCentroid.y + Math.sin(angle) * 75;
    
    this.x += (targetX - this.x) * 7 * dt;
    this.y += (targetY - this.y) * 7 * dt;

    let closest = null;
    let minDist = 420;
    for (let e of enemies) {
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < minDist) {
        minDist = d;
        closest = e;
      }
    }

    if (closest) {
      this.angle = Math.atan2(closest.y - this.y, closest.x - this.x);
      this.fireTimer += dt;
      if (this.fireTimer >= 0.24) {
        this.fireTimer = 0;
        const spd = 620;
        projectiles.push(new Projectile(
          this.x, this.y,
          Math.cos(this.angle) * spd,
          Math.sin(this.angle) * spd,
          { radius: 3.5, damage: 16 }
        ));
      }
    }

    return this.life <= 0;
  }
}

// 6. Player Cell Group System
class PlayerGroup {
  constructor() {
    this.reset();
  }

  reset() {
    this.maxHp = 100;
    this.hp = 100;
    this.shield = 0;
    this.maxShield = 60;
    
    this.level = 1;
    this.atp = 0;
    this.atpNeeded = 25;
    this.totalAtp = 0;
    
    this.baseDamage = 16;
    this.bulletSpeed = 680;
    this.baseFireCooldown = 0.25;
    this.fireTimer = 0;
    
    this.moveSpeed = 290;
    this.moveSpeedMult = 1.0;
    this.magnetRadius = 150;

    this.maxCellCap = 16;
    this.splitCooldown = 0;
    this.splitCooldownMax = 0.9;
    this.mergeCooldown = 0;
    this.mergeCooldownMax = 1.4;
    this.isMerging = false;

    this.stats = {
      hasElectricWeb: false,
      webDamageMult: 1.0,
      supernovaRank: 0,
      fusionDamageMult: 1.0,
      splitThornsRank: 0,
      hasPhagocytosis: false,
      phagocytosisRange: 60,
      mitochondrialRank: 0,
      acidPoolRank: 0,
      vampiricRank: 0,
      hasMergeShield: false,
      laserRank: 0,
      bulletPierce: 1,
      poisonRank: 0,
      droneSpawnChance: 0,
      critChance: 0.05,
      critMult: 1.5,
      damageReduction: 0
    };

    this.cells = [
      {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 46,
        targetRadius: 46,
        wobbleOffset: 0,
        hasShield: false
      }
    ];

    this.centroid = { x: 0, y: 0, spread: 0 };
    this.drones = [];
  }

  split(projectiles) {
    if (this.splitCooldown > 0) return false;
    if (this.cells.length >= this.maxCellCap) return false;

    const newCells = [];
    const thornCount = 12;

    this.cells.forEach(cell => {
      const newRadius = Math.max(14, cell.radius * 0.707);
      const splitAngle = Math.random() * Math.PI * 2;
      const pushDist = newRadius * 1.4;
      const pushSpeed = 190;

      newCells.push({
        x: cell.x + Math.cos(splitAngle) * pushDist,
        y: cell.y + Math.sin(splitAngle) * pushDist,
        vx: cell.vx + Math.cos(splitAngle) * pushSpeed,
        vy: cell.vy + Math.sin(splitAngle) * pushSpeed,
        radius: newRadius,
        targetRadius: newRadius,
        wobbleOffset: Math.random() * Math.PI * 2,
        hasShield: cell.hasShield
      });

      newCells.push({
        x: cell.x - Math.cos(splitAngle) * pushDist,
        y: cell.y - Math.sin(splitAngle) * pushDist,
        vx: cell.vx - Math.cos(splitAngle) * pushSpeed,
        vy: cell.vy - Math.sin(splitAngle) * pushSpeed,
        radius: newRadius,
        targetRadius: newRadius,
        wobbleOffset: Math.random() * Math.PI * 2,
        hasShield: cell.hasShield
      });

      if (this.stats.splitThornsRank > 0 && projectiles) {
        const thornDmg = this.baseDamage * (0.8 + 0.35 * this.stats.splitThornsRank);
        for (let i = 0; i < thornCount; i++) {
          const a = (i * Math.PI * 2) / thornCount;
          const spd = 650;
          projectiles.push(new Projectile(
            cell.x, cell.y,
            Math.cos(a) * spd,
            Math.sin(a) * spd,
            { radius: 4, damage: thornDmg, isThorn: true, pierce: 3, life: 1.8 }
          ));
        }
      }
    });

    this.cells = newCells;
    this.splitCooldown = this.splitCooldownMax;
    window.soundEngine.playSplit();
    return true;
  }

  merge(shockwaves, acidPools) {
    if (this.cells.length <= 1 || this.isMerging) return false;
    this.isMerging = true;
    return true;
  }

  completeFusion(shockwaves, acidPools) {
    const fusedCount = this.cells.length;
    const cx = this.centroid.x;
    const cy = this.centroid.y;

    this.cells = [
      {
        x: cx,
        y: cy,
        vx: 0,
        vy: 0,
        radius: 46,
        targetRadius: 46,
        wobbleOffset: 0,
        hasShield: this.stats.hasMergeShield
      }
    ];

    const swRadius = 150 + fusedCount * 25;
    const swDmg = this.baseDamage * (fusedCount * 1.8) * this.stats.fusionDamageMult;
    const isSupernova = this.stats.supernovaRank > 0;

    shockwaves.push(new Shockwave(
      cx, cy,
      isSupernova ? swRadius * 1.6 : swRadius,
      swDmg,
      isSupernova
    ));

    if (this.stats.hasMergeShield) {
      this.shield = Math.min(this.maxShield, this.shield + 25 + fusedCount * 5);
    }

    if (isSupernova && acidPools) {
      acidPools.push(new AcidPool(cx, cy, swRadius * 0.85, 55, 6.0));
    }

    this.isMerging = false;
    this.mergeCooldown = this.mergeCooldownMax;
    window.soundEngine.playMerge(fusedCount / 4);
  }

  update(dt, inputVector, targetWorldPoint, arenaRadius, shockwaves, acidPools, projectiles, enemies) {
    if (this.splitCooldown > 0) this.splitCooldown -= dt;
    if (this.mergeCooldown > 0) this.mergeCooldown -= dt;

    let sumX = 0;
    let sumY = 0;
    this.cells.forEach(c => {
      sumX += c.x;
      sumY += c.y;
    });
    this.centroid.x = sumX / this.cells.length;
    this.centroid.y = sumY / this.cells.length;

    let maxDist = 0;
    this.cells.forEach(c => {
      const d = Math.hypot(c.x - this.centroid.x, c.y - this.centroid.y);
      if (d > maxDist) maxDist = d;
    });
    this.centroid.spread = maxDist;

    const effectiveSpeed = this.moveSpeed * this.moveSpeedMult;
    const isMerging = this.isMerging;

    this.cells.forEach((cell, i) => {
      if (isMerging) {
        const dx = this.centroid.x - cell.x;
        const dy = this.centroid.y - cell.y;
        const dist = Math.hypot(dx, dy);
        const pull = 1050;
        if (dist > 5) {
          cell.vx += (dx / dist) * pull * dt;
          cell.vy += (dy / dist) * pull * dt;
        }
      } else {
        cell.vx += inputVector.x * effectiveSpeed * 8.5 * dt;
        cell.vy += inputVector.y * effectiveSpeed * 8.5 * dt;

        for (let j = 0; j < this.cells.length; j++) {
          if (i === j) continue;
          const other = this.cells[j];
          const dx = cell.x - other.x;
          const dy = cell.y - other.y;
          const dist = Math.hypot(dx, dy);
          const minDist = cell.radius + other.radius + 10;
          if (dist < minDist && dist > 0) {
            const push = (minDist - dist) * 14;
            cell.vx += (dx / dist) * push * dt;
            cell.vy += (dy / dist) * push * dt;
          }
        }
      }

      cell.vx *= Math.pow(0.85, dt * 60);
      cell.vy *= Math.pow(0.85, dt * 60);

      cell.x += cell.vx * dt;
      cell.y += cell.vy * dt;

      const distFromCenter = Math.hypot(cell.x, cell.y);
      const maxAllowed = arenaRadius - cell.radius;
      if (distFromCenter > maxAllowed) {
        const nx = cell.x / distFromCenter;
        const ny = cell.y / distFromCenter;
        cell.x = nx * maxAllowed;
        cell.y = ny * maxAllowed;
        cell.vx *= -0.5;
        cell.vy *= -0.5;
      }
    });

    if (isMerging) {
      let allClose = true;
      for (let c of this.cells) {
        if (Math.hypot(c.x - this.centroid.x, c.y - this.centroid.y) > 28) {
          allClose = false;
          break;
        }
      }
      if (allClose || this.cells.length <= 1) {
        this.completeFusion(shockwaves, acidPools);
      }
    }

    this.updateShooting(dt, targetWorldPoint, projectiles, enemies);
    this.drones = this.drones.filter(d => !d.update(dt, enemies, this.centroid, projectiles));
  }

  updateShooting(dt, targetWorldPoint, projectiles, enemies) {
    let fireRateMult = 1.0;
    if (this.stats.mitochondrialRank > 0) {
      fireRateMult += (this.cells.length - 1) * (0.14 * this.stats.mitochondrialRank);
    }
    const currentCooldown = this.baseFireCooldown / fireRateMult;

    this.fireTimer += dt;
    if (this.fireTimer >= currentCooldown) {
      this.fireTimer = 0;

      this.cells.forEach(cell => {
        let targetX = targetWorldPoint.x;
        let targetY = targetWorldPoint.y;
        let closest = null;
        let minDist = 550;

        for (let e of enemies) {
          const d = Math.hypot(e.x - cell.x, e.y - cell.y);
          if (d < minDist) {
            minDist = d;
            closest = e;
          }
        }

        if (closest) {
          targetX = closest.x;
          targetY = closest.y;
        }

        const angle = Math.atan2(targetY - cell.y, targetX - cell.x);
        const isCrit = Math.random() < this.stats.critChance;
        let dmg = this.baseDamage * (isCrit ? this.stats.critMult : 1.0);
        
        if (this.cells.length === 1) dmg *= 1.4;

        const isLaser = this.stats.laserRank > 0;
        const spd = this.bulletSpeed;

        projectiles.push(new Projectile(
          cell.x, cell.y,
          Math.cos(angle) * spd,
          Math.sin(angle) * spd,
          {
            radius: isLaser ? 5.5 : 4,
            damage: dmg,
            isLaser: isLaser,
            isCrit: isCrit,
            pierce: isLaser ? (1 + this.stats.laserRank * 2) : this.stats.bulletPierce,
            poison: this.stats.poisonRank > 0,
            length: isLaser ? 32 : 18
          }
        ));
      });

      window.soundEngine.playShoot(1.0 + (this.cells.length > 4 ? 0.3 : 0));
    }
  }

  takeDamage(amount, acidPools) {
    let dmg = amount * (1 - this.stats.damageReduction);
    
    if (this.shield > 0) {
      if (this.shield >= dmg) {
        this.shield -= dmg;
        dmg = 0;
      } else {
        dmg -= this.shield;
        this.shield = 0;
      }
    }

    this.hp = Math.max(0, this.hp - dmg);
    window.soundEngine.playHit();

    if (this.stats.acidPoolRank > 0 && acidPools) {
      acidPools.push(new AcidPool(this.centroid.x, this.centroid.y, 48, 35, 4.0));
    }

    return this.hp <= 0;
  }

  addAtp(amount) {
    this.atp += amount;
    this.totalAtp += amount;

    if (this.stats.vampiricRank > 0) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.02 * this.stats.vampiricRank);
    }

    window.soundEngine.playCollectATP();

    if (this.atp >= this.atpNeeded) {
      this.atp -= this.atpNeeded;
      this.level++;
      this.atpNeeded = Math.round(this.atpNeeded * 1.32 + 18);
      window.soundEngine.playLevelUp();
      return true;
    }
    return false;
  }
}

// 7. Base Enemy & Diverse Archetypes (with Elite & Aggressive Scaling)
class Enemy {
  constructor(x, y, type, wave = 1, difficultyMult = 1.0) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.type = type;
    this.angle = 0;
    this.hitFlashTimer = 0;
    this.poisonDuration = 0;
    this.poisonDmgPerSec = 0;
    this.isBoss = false;

    // Elite mutation roll (8% chance, increases with wave)
    this.isElite = Math.random() < Math.min(0.25, 0.06 + wave * 0.02);

    // Exponential wave scaling
    const scale = (1 + Math.pow(Math.max(0, wave - 1), 1.25) * 0.28) * difficultyMult;

    if (type === "bacterium") {
      this.radius = this.isElite ? 22 : 16;
      this.maxHp = Math.round((this.isElite ? 60 : 22) * scale);
      this.hp = this.maxHp;
      this.speed = (this.isElite ? 220 : 170) + Math.random() * 40;
      this.damage = Math.round((this.isElite ? 22 : 12) * scale);
      this.atpValue = this.isElite ? 35 : 10;
    } else if (type === "phage") {
      this.radius = this.isElite ? 26 : 20;
      this.maxHp = Math.round((this.isElite ? 90 : 38) * scale);
      this.hp = this.maxHp;
      this.speed = this.isElite ? 260 : 230;
      this.dashTimer = 0;
      this.damage = Math.round((this.isElite ? 28 : 16) * scale);
      this.atpValue = this.isElite ? 60 : 22;
    } else if (type === "nematode") {
      this.radius = this.isElite ? 30 : 23;
      this.maxHp = Math.round((this.isElite ? 200 : 85) * scale);
      this.hp = this.maxHp;
      this.speed = this.isElite ? 140 : 120;
      this.damage = Math.round((this.isElite ? 32 : 20) * scale);
      this.atpValue = this.isElite ? 90 : 35;
    } else if (type === "spore") {
      this.radius = this.isElite ? 30 : 24;
      this.maxHp = Math.round((this.isElite ? 120 : 50) * scale);
      this.hp = this.maxHp;
      this.speed = 105;
      this.damage = Math.round((this.isElite ? 24 : 14) * scale);
      this.atpValue = this.isElite ? 75 : 30;
      this.shootCooldown = this.isElite ? 1.4 : 2.0;
      this.shootTimer = Math.random() * 1.5;
    } else if (type === "amoeba") {
      this.radius = this.isElite ? 42 : 33;
      this.maxHp = Math.round((this.isElite ? 280 : 120) * scale);
      this.hp = this.maxHp;
      this.speed = 90;
      this.damage = Math.round((this.isElite ? 36 : 24) * scale);
      this.atpValue = this.isElite ? 120 : 50;
      this.canSplit = true;
    }
  }

  update(dt, playerCentroid, projectiles, enemies) {
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    if (this.poisonDuration > 0) {
      this.poisonDuration -= dt;
      this.hp -= this.poisonDmgPerSec * dt;
    }

    const dx = playerCentroid.x - this.x;
    const dy = playerCentroid.y - this.y;
    const dist = Math.hypot(dx, dy);
    this.angle = Math.atan2(dy, dx);

    let effectiveSpeed = this.speed;
    if (this.poisonDuration > 0) effectiveSpeed *= 0.6;

    if (this.type === "bacterium") {
      const wiggle = Math.sin(Date.now() * 0.009 + this.x) * 0.35;
      const moveAngle = this.angle + wiggle;
      this.vx = Math.cos(moveAngle) * effectiveSpeed;
      this.vy = Math.sin(moveAngle) * effectiveSpeed;

    } else if (this.type === "phage") {
      this.dashTimer += dt;
      if (this.dashTimer >= 1.6) {
        effectiveSpeed *= 2.8;
        if (this.dashTimer >= 2.1) this.dashTimer = 0;
      }
      this.vx = Math.cos(this.angle) * effectiveSpeed;
      this.vy = Math.sin(this.angle) * effectiveSpeed;

    } else if (this.type === "spore") {
      if (dist < 260) {
        this.vx = -Math.cos(this.angle) * effectiveSpeed;
        this.vy = -Math.sin(this.angle) * effectiveSpeed;
      } else if (dist > 340) {
        this.vx = Math.cos(this.angle) * effectiveSpeed;
        this.vy = Math.sin(this.angle) * effectiveSpeed;
      } else {
        this.vx = 0;
        this.vy = 0;
      }

      this.shootTimer += dt;
      if (this.shootTimer >= this.shootCooldown && dist < 500) {
        this.shootTimer = 0;
        const spd = 300;
        projectiles.push(new Projectile(
          this.x, this.y,
          Math.cos(this.angle) * spd,
          Math.sin(this.angle) * spd,
          { radius: 6.5, damage: this.damage, isEnemy: true, life: 3.5 }
        ));
      }

    } else {
      this.vx = Math.cos(this.angle) * effectiveSpeed;
      this.vy = Math.sin(this.angle) * effectiveSpeed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    return this.hp <= 0;
  }
}

// 8. Epic Boss Class (Fierce Attack Rhythms)
class BossEnemy extends Enemy {
  constructor(x, y, bossType = "queen", wave = 5, difficultyMult = 1.0) {
    super(x, y, "boss", wave, difficultyMult);
    this.isBoss = true;
    this.bossType = bossType;
    this.radius = 60;

    const scale = (1 + Math.pow(Math.max(0, wave - 1), 1.25) * 0.28) * difficultyMult;

    if (bossType === "queen") {
      this.name = "COLONY QUEEN (蜂群母虫)";
      this.maxHp = Math.round((1800 + wave * 450) * scale);
      this.hp = this.maxHp;
      this.speed = 85;
      this.damage = Math.round(35 * scale);
      this.atpValue = 450;
      this.attackTimer = 0;
    } else {
      this.name = "APEX PHAGE (终极噬菌巨擘)";
      this.maxHp = Math.round((4200 + wave * 750) * scale);
      this.hp = this.maxHp;
      this.speed = 105;
      this.damage = Math.round(48 * scale);
      this.atpValue = 800;
      this.attackTimer = 0;
    }
  }

  update(dt, playerCentroid, projectiles, enemies) {
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
    
    const dx = playerCentroid.x - this.x;
    const dy = playerCentroid.y - this.y;
    const dist = Math.hypot(dx, dy);
    this.angle = Math.atan2(dy, dx);

    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.attackTimer += dt;
    if (this.bossType === "queen") {
      if (this.attackTimer >= 2.6) {
        this.attackTimer = 0;
        const count = 20;
        for (let i = 0; i < count; i++) {
          const a = (i * Math.PI * 2) / count + Date.now() * 0.001;
          const spd = 280;
          projectiles.push(new Projectile(
            this.x, this.y,
            Math.cos(a) * spd,
            Math.sin(a) * spd,
            { radius: 6.5, damage: 18, isEnemy: true, life: 4.0 }
          ));
        }
      }
    } else {
      if (this.attackTimer >= 0.14) {
        this.attackTimer = 0;
        const a = Date.now() * 0.007;
        const spd = 340;
        projectiles.push(new Projectile(
          this.x, this.y,
          Math.cos(a) * spd,
          Math.sin(a) * spd,
          { radius: 7.5, damage: 22, isEnemy: true, life: 3.5 }
        ));
      }
    }

    return this.hp <= 0;
  }
}

window.Projectile = Projectile;
window.Shockwave = Shockwave;
window.AcidPool = AcidPool;
window.AtpOrb = AtpOrb;
window.FriendlyDrone = FriendlyDrone;
window.PlayerGroup = PlayerGroup;
window.Enemy = Enemy;
window.BossEnemy = BossEnemy;
