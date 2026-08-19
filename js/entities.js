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
    this.isPrismatic = options.isPrismatic || false;
    this.isThorn = options.isThorn || false;
    this.isTeslaThorn = options.isTeslaThorn || false;
    this.isCrit = options.isCrit || false;
    this.pierce = options.pierce || 1;
    this.poison = options.poison || false;
    this.life = options.life || 2.5;
    this.length = options.length || 20;
    this.width = options.width || 6;
    this.angle = Math.atan2(vy, vx);
    this.hitList = new Set();
    this.hasRefracted = false;
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
  constructor(x, y, maxRadius, damage, isSupernova = false, isSingularity = false) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.maxRadius = maxRadius;
    this.damage = damage;
    this.isSupernova = isSupernova;
    this.isSingularity = isSingularity;
    this.thickness = isSingularity ? 48 : (isSupernova ? 36 : 22);
    this.speed = (maxRadius - 10) / (isSingularity ? 0.8 : 0.42);
    this.hitList = new Set();
  }

  update(dt) {
    this.radius += this.speed * dt;
    return this.radius >= this.maxRadius;
  }
}

// 3. Acid Pool Class
class AcidPool {
  constructor(x, y, radius, damagePerSec, duration = 5.0, isHyper = false, isEnemy = false) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.damagePerSec = damagePerSec;
    this.maxDuration = duration;
    this.duration = duration;
    this.tickTimer = 0;
    this.isHyper = isHyper;
    this.isEnemy = isEnemy;
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

    if (dist < magnetRadius && dist > 0.001) {
      const pull = Math.min(900, (1 - dist / magnetRadius) * 750 + 220);
      this.vx += (dx / dist) * pull * dt;
      this.vy += (dy / dist) * pull * dt;
    }
  }
}

// 5. Friendly Drone Class (With Bio-Swarm Hive Evolution)
class FriendlyDrone {
  constructor(x, y, isHive = false) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.isHive = isHive;
    this.radius = isHive ? 9 : 5;
    this.life = isHive ? 10.0 : 8.0;
    this.fireTimer = 0;
  }

  update(dt, enemies, playerCentroid, projectiles) {
    this.life -= dt;
    const angle = Date.now() * 0.0035;
    const orbitDist = this.isHive ? 95 : 75;
    const targetX = playerCentroid.x + Math.cos(angle) * orbitDist;
    const targetY = playerCentroid.y + Math.sin(angle) * orbitDist;
    
    this.x += (targetX - this.x) * 7 * dt;
    this.y += (targetY - this.y) * 7 * dt;

    let closest = null;
    let minDist = 480;
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
      const cd = this.isHive ? 0.16 : 0.24;
      if (this.fireTimer >= cd) {
        this.fireTimer = 0;
        const spd = 680;
        projectiles.push(new Projectile(
          this.x, this.y,
          Math.cos(this.angle) * spd,
          Math.sin(this.angle) * spd,
          { 
            radius: this.isHive ? 5.0 : 3.5, 
            damage: this.isHive ? 28 : 16,
            poison: this.isHive,
            pierce: this.isHive ? 2 : 1
          }
        ));
      }
    }

    if (this.life <= 0 && this.isHive && projectiles) {
      // Death Spore Nova
      const novaCount = 8;
      for (let i = 0; i < novaCount; i++) {
        const a = (i * Math.PI * 2) / novaCount;
        projectiles.push(new Projectile(
          this.x, this.y,
          Math.cos(a) * 400,
          Math.sin(a) * 400,
          { radius: 6, damage: 35, poison: true, life: 2.5 }
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

    this.strainId = "strain_standard";
    this.trailTimer = 0;
    this.teslaTimer = 0;

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
      damageReduction: 0,
      // Hyper Super-Weapons
      hasTeslaPulsar: false,
      hasSingularityVortex: false,
      hasParasiticHive: false,
      hasPrismaticLaser: false,
      hasHyperAcid: false,
      hasAcidTrail: false
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
    const isTesla = this.stats.hasTeslaPulsar;
    const thornCount = isTesla ? 18 : 12;

    // Each split adds one net cell; only split as many cells as the cap allows
    const splitCount = Math.min(this.cells.length, this.maxCellCap - this.cells.length);

    this.cells.forEach((cell, i) => {
      if (i < splitCount) {
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
      } else {
        // Cell cap reached: carry this cell over unchanged
        newCells.push(cell);
      }

      if ((this.stats.splitThornsRank > 0 || isTesla) && projectiles) {
        const thornDmg = this.baseDamage * (0.8 + 0.35 * this.stats.splitThornsRank) * (isTesla ? 1.6 : 1.0);
        for (let i = 0; i < thornCount; i++) {
          const a = (i * Math.PI * 2) / thornCount;
          const spd = 680;
          projectiles.push(new Projectile(
            cell.x, cell.y,
            Math.cos(a) * spd,
            Math.sin(a) * spd,
            { 
              radius: isTesla ? 5.5 : 4, 
              damage: thornDmg, 
              isThorn: true, 
              isTeslaThorn: isTesla, 
              pierce: isTesla ? 99 : 3, 
              life: isTesla ? 2.2 : 1.8 
            }
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
    if (this.mergeCooldown > 0) return false;
    this.isMerging = true;
    return true;
  }

  completeFusion(shockwaves, acidPools) {
    const fusedCount = this.cells.length;
    const cx = this.centroid.x;
    const cy = this.centroid.y;

    const baseRadius = this.strainId === "strain_phagocyte" ? 62 : 46;
    this.cells = [
      {
        x: cx,
        y: cy,
        vx: 0,
        vy: 0,
        radius: baseRadius,
        targetRadius: baseRadius,
        wobbleOffset: 0,
        hasShield: this.stats.hasMergeShield
      }
    ];

    const isSingularity = this.stats.hasSingularityVortex;
    const swRadius = 150 + fusedCount * 25;
    const swDmg = this.baseDamage * (fusedCount * 1.8) * this.stats.fusionDamageMult * (isSingularity ? 1.8 : 1.0);
    const isSupernova = this.stats.supernovaRank > 0;

    shockwaves.push(new Shockwave(
      cx, cy,
      isSingularity ? swRadius * 2.0 : (isSupernova ? swRadius * 1.6 : swRadius),
      swDmg,
      isSupernova,
      isSingularity
    ));

    if (this.stats.hasMergeShield) {
      this.shield = Math.min(this.maxShield, this.shield + 25 + fusedCount * 5);
    }

    if ((isSupernova || isSingularity) && acidPools) {
      acidPools.push(new AcidPool(cx, cy, swRadius * 0.9, isSingularity ? 80 : 55, 6.0, isSingularity));
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

    // Trail Dropping (Extremophile strain or Hyper Acid)
    if ((this.stats.hasAcidTrail || this.stats.hasHyperAcid) && acidPools) {
      this.trailTimer += dt;
      const isMoving = Math.hypot(inputVector.x, inputVector.y) > 0.1;
      if (this.trailTimer >= 0.18 && isMoving) {
        this.trailTimer = 0;
        const isHyper = this.stats.hasHyperAcid;
        this.cells.forEach(c => {
          acidPools.push(new AcidPool(
            c.x, c.y, 
            isHyper ? 36 : 22, 
            isHyper ? 70 : 25, 
            isHyper ? 4.5 : 2.5,
            isHyper
          ));
        });
      }
    }

    // Tesla Pulsar Auto Lightning Arc Zaps
    if (this.stats.hasTeslaPulsar && this.cells.length >= 2 && enemies) {
      this.teslaTimer += dt;
      if (this.teslaTimer >= 0.45) {
        this.teslaTimer = 0;
        let zapped = 0;
        for (let e of enemies) {
          const d = Math.hypot(e.x - this.centroid.x, e.y - this.centroid.y);
          if (d < 480) {
            e.hp -= this.baseDamage * 3.5;
            e.hitFlashTimer = 0.1;
            zapped++;
            if (zapped >= 3) break;
          }
        }
        if (zapped > 0) window.soundEngine.playElectric();
      }
    }

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
        const isPrismatic = this.stats.hasPrismaticLaser;
        const spd = this.bulletSpeed;

        projectiles.push(new Projectile(
          cell.x, cell.y,
          Math.cos(angle) * spd,
          Math.sin(angle) * spd,
          {
            radius: (isLaser || isPrismatic) ? 5.5 : 4,
            damage: dmg,
            isLaser: isLaser || isPrismatic,
            isPrismatic: isPrismatic,
            isCrit: isCrit,
            pierce: isPrismatic ? 99 : (isLaser ? (1 + this.stats.laserRank * 2) : this.stats.bulletPierce),
            poison: this.stats.poisonRank > 0,
            length: isPrismatic ? 36 : (isLaser ? 32 : 18)
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
    this.phase = Math.random() * Math.PI * 2;

    // Elite mutation roll (8% base chance, increases with wave)
    this.isElite = Math.random() < Math.min(0.30, 0.06 + wave * 0.02);

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
    } else if (type === "flagellate") {
      // 鞭毛虫: Agile serpentine swimmer, leaves periodic acid pools
      this.radius = this.isElite ? 26 : 20;
      this.maxHp = Math.round((this.isElite ? 110 : 48) * scale);
      this.hp = this.maxHp;
      this.speed = this.isElite ? 230 : 190;
      this.damage = Math.round((this.isElite ? 26 : 15) * scale);
      this.atpValue = this.isElite ? 65 : 25;
      this.trailTimer = 0;
    } else if (type === "ciliate") {
      // 草履虫: Vibrating cilia, periodic phase leap teleport
      this.radius = this.isElite ? 28 : 21;
      this.maxHp = Math.round((this.isElite ? 135 : 58) * scale);
      this.hp = this.maxHp;
      this.speed = this.isElite ? 175 : 145;
      this.damage = Math.round((this.isElite ? 30 : 18) * scale);
      this.atpValue = this.isElite ? 75 : 30;
      this.phaseTimer = 0;
      this.isChargingLeap = false;
      this.chargeTime = 0;
    } else if (type === "tardigrade") {
      // 水熊虫: Armored bio-tank, enters cryptobiosis state with high DR
      this.radius = this.isElite ? 38 : 29;
      this.maxHp = Math.round((this.isElite ? 520 : 250) * scale);
      this.hp = this.maxHp;
      this.speed = this.isElite ? 95 : 75;
      this.damage = Math.round((this.isElite ? 42 : 26) * scale);
      this.atpValue = this.isElite ? 180 : 85;
      this.hardenCycleTimer = 0;
      this.isHardened = false;
      this.hardenedTimer = 0;
    } else if (type === "macrophage") {
      // 巨噬体: Predatory amoeboid cell with extending pseudopodia tentacles
      this.radius = this.isElite ? 42 : 32;
      this.maxHp = Math.round((this.isElite ? 380 : 175) * scale);
      this.hp = this.maxHp;
      this.speed = this.isElite ? 135 : 110;
      this.damage = Math.round((this.isElite ? 38 : 22) * scale);
      this.atpValue = this.isElite ? 140 : 60;
      this.pseudopodReach = 0;
    }
  }

  update(dt, playerCentroid, projectiles, enemies, acidPools, shockwaves, playerGroup) {
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

    } else if (this.type === "flagellate") {
      // Sinusoidal movement + leaves toxic droplet behind
      const waveOffset = Math.sin(Date.now() * 0.008 + this.phase) * 0.75;
      const moveAngle = this.angle + waveOffset;
      this.vx = Math.cos(moveAngle) * effectiveSpeed;
      this.vy = Math.sin(moveAngle) * effectiveSpeed;

      this.trailTimer += dt;
      if (this.trailTimer >= 0.85 && acidPools) {
        this.trailTimer = 0;
        acidPools.push(new AcidPool(this.x, this.y, 22, 16, 2.8, false, true));
      }

    } else if (this.type === "ciliate") {
      // Periodic phase leap
      this.phaseTimer += dt;
      if (!this.isChargingLeap && this.phaseTimer >= 2.2) {
        this.isChargingLeap = true;
        this.chargeTime = 0;
      }

      if (this.isChargingLeap) {
        this.chargeTime += dt;
        // Freeze in place & vibrate while charging
        this.vx = (Math.random() - 0.5) * 40;
        this.vy = (Math.random() - 0.5) * 40;
        if (this.chargeTime >= 0.4) {
          // Leap forward instantaneously
          this.isChargingLeap = false;
          this.phaseTimer = 0;
          const leapDist = Math.min(dist * 0.65, 150);
          this.x += Math.cos(this.angle) * leapDist;
          this.y += Math.sin(this.angle) * leapDist;
          this.hitFlashTimer = 0.15;
        }
      } else {
        this.vx = Math.cos(this.angle) * effectiveSpeed;
        this.vy = Math.sin(this.angle) * effectiveSpeed;
      }

    } else if (this.type === "tardigrade") {
      // Cryptobiosis hardening cycle
      this.hardenCycleTimer += dt;
      if (!this.isHardened && this.hardenCycleTimer >= 4.2) {
        this.isHardened = true;
        this.hardenedTimer = 0;
      }

      if (this.isHardened) {
        this.hardenedTimer += dt;
        effectiveSpeed = 25; // Crawls very slowly while armored
        this.vx = Math.cos(this.angle) * effectiveSpeed;
        this.vy = Math.sin(this.angle) * effectiveSpeed;

        // Gravitational slow aura affecting nearby player cells
        if (playerGroup && dist < 170) {
          playerGroup.cells.forEach(c => {
            const cd = Math.hypot(c.x - this.x, c.y - this.y);
            if (cd < 170) {
              c.vx *= Math.pow(0.70, dt * 60);
              c.vy *= Math.pow(0.70, dt * 60);
            }
          });
        }

        if (this.hardenedTimer >= 2.2) {
          this.isHardened = false;
          this.hardenCycleTimer = 0;
        }
      } else {
        // Normal armored lumber
        this.vx = Math.cos(this.angle) * effectiveSpeed;
        this.vy = Math.sin(this.angle) * effectiveSpeed;
      }

    } else if (this.type === "macrophage") {
      // Hunter movement + reaching pseudopods
      this.vx = Math.cos(this.angle) * effectiveSpeed;
      this.vy = Math.sin(this.angle) * effectiveSpeed;

      this.pseudopodReach = Math.min(1.0, this.pseudopodReach + dt * 1.5);
      // Gentle suction pull on player cells if close
      if (playerGroup && dist < 210) {
        playerGroup.cells.forEach(c => {
          const cd = Math.hypot(c.x - this.x, c.y - this.y);
          if (cd < 210 && cd > 10) {
            const pull = 65 * dt;
            c.vx += ((this.x - c.x) / cd) * pull;
            c.vy += ((this.y - c.y) / cd) * pull;
          }
        });
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

// 8. Epic Boss Class (5 Fierce Boss Archetypes with Diverse Mechanics)
class BossEnemy extends Enemy {
  constructor(x, y, bossType = "queen", wave = 5, difficultyMult = 1.0) {
    super(x, y, "boss", wave, difficultyMult);
    this.isBoss = true;
    this.isElite = false;
    this.bossType = bossType;
    this.radius = 62;
    this.attackTimer = 0;
    this.secondaryTimer = 0;
    this.beamAngle = 0;

    const scale = (1 + Math.pow(Math.max(0, wave - 1), 1.25) * 0.28) * difficultyMult;

    if (bossType === "queen") {
      this.name = "COLONY QUEEN (蜂群母虫)";
      this.maxHp = Math.round((1800 + wave * 450) * scale);
      this.hp = this.maxHp;
      this.speed = 85;
      this.damage = Math.round(35 * scale);
      this.atpValue = 450;
    } else if (bossType === "apex") {
      this.name = "APEX PHAGE (终极噬菌巨擘)";
      this.maxHp = Math.round((4200 + wave * 750) * scale);
      this.hp = this.maxHp;
      this.speed = 110;
      this.damage = Math.round(48 * scale);
      this.atpValue = 800;
    } else if (bossType === "hydra") {
      this.name = "DREAD HYDRA (九头水螅母体)";
      this.maxHp = Math.round((7500 + wave * 950) * scale);
      this.hp = this.maxHp;
      this.speed = 88;
      this.damage = Math.round(52 * scale);
      this.atpValue = 1200;
      this.tentacleCount = 4;
      this.tentacleRadius = 80;
    } else if (bossType === "rotifer") {
      this.name = "VORTEX ROTIFER (漩涡轮虫暴君)";
      this.maxHp = Math.round((11500 + wave * 1300) * scale);
      this.hp = this.maxHp;
      this.speed = 95;
      this.damage = Math.round(58 * scale);
      this.atpValue = 1600;
      this.vortexRadius = 380;
    } else if (bossType === "behemoth") {
      this.name = "CYTOTOXIC BEHEMOTH (毒性异化巨兽)";
      this.maxHp = Math.round((18000 + wave * 1800) * scale);
      this.hp = this.maxHp;
      this.speed = 80;
      this.damage = Math.round(68 * scale);
      this.atpValue = 2200;
      this.radius = 72;
    }
  }

  update(dt, playerCentroid, projectiles, enemies, acidPools, shockwaves, playerGroup) {
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
    
    const dx = playerCentroid.x - this.x;
    const dy = playerCentroid.y - this.y;
    const dist = Math.hypot(dx, dy);
    this.angle = Math.atan2(dy, dx);

    let curSpeed = this.speed;
    // Frenzy at low health for late bosses
    if (this.bossType === "behemoth" && this.hp < this.maxHp * 0.35) {
      curSpeed = 135;
    }

    this.vx = Math.cos(this.angle) * curSpeed;
    this.vy = Math.sin(this.angle) * curSpeed;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.attackTimer += dt;
    this.secondaryTimer += dt;

    if (this.bossType === "queen") {
      // Ring burst + periodic minion spawn
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
      if (this.secondaryTimer >= 6.0 && enemies) {
        this.secondaryTimer = 0;
        for (let i = 0; i < 2; i++) {
          enemies.push(new Enemy(this.x + (i ? 30 : -30), this.y + (i ? 30 : -30), "bacterium", 3));
        }
      }

    } else if (this.bossType === "apex") {
      // Rapid continuous spiral fire
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

    } else if (this.bossType === "hydra") {
      // 4 autonomous orbiting tentacle heads shooting aimed spines + 12-way burst
      if (this.attackTimer >= 1.5) {
        this.attackTimer = 0;
        const timeNow = Date.now() * 0.002;
        for (let i = 0; i < this.tentacleCount; i++) {
          const tAngle = timeNow + (i * Math.PI * 2) / this.tentacleCount;
          const tx = this.x + Math.cos(tAngle) * this.tentacleRadius;
          const ty = this.y + Math.sin(tAngle) * this.tentacleRadius;
          const aimAngle = Math.atan2(playerCentroid.y - ty, playerCentroid.x - tx);
          const spd = 370;
          projectiles.push(new Projectile(
            tx, ty,
            Math.cos(aimAngle) * spd,
            Math.sin(aimAngle) * spd,
            { radius: 5.5, damage: 24, isEnemy: true, life: 3.2 }
          ));
        }
      }
      if (this.secondaryTimer >= 4.5) {
        this.secondaryTimer = 0;
        const count = 12;
        for (let i = 0; i < count; i++) {
          const a = (i * Math.PI * 2) / count;
          projectiles.push(new Projectile(
            this.x, this.y,
            Math.cos(a) * 260,
            Math.sin(a) * 260,
            { radius: 8, damage: 20, isEnemy: true, life: 3.5 }
          ));
        }
      }

    } else if (this.bossType === "rotifer") {
      // Fluid vortex suction pulling player cells + dual counter-rotating spirals
      if (playerGroup && dist < this.vortexRadius) {
        playerGroup.cells.forEach(c => {
          const cd = Math.hypot(c.x - this.x, c.y - this.y);
          if (cd < this.vortexRadius && cd > 15) {
            // Inward radial pull + tangential whirlpool swirl
            const normX = (this.x - c.x) / cd;
            const normY = (this.y - c.y) / cd;
            const tangX = -normY;
            const tangY = normX;
            const pull = 85 * dt;
            const swirl = 110 * dt;
            c.vx += (normX * pull + tangX * swirl);
            c.vy += (normY * pull + tangY * swirl);
          }
        });
      }

      // Dual counter-rotating spirals
      if (this.attackTimer >= 0.12) {
        this.attackTimer = 0;
        const a1 = Date.now() * 0.006;
        const a2 = -Date.now() * 0.006 + Math.PI;
        const spd = 320;
        projectiles.push(new Projectile(
          this.x, this.y,
          Math.cos(a1) * spd, Math.sin(a1) * spd,
          { radius: 7.0, damage: 22, isEnemy: true, life: 3.6 }
        ));
        projectiles.push(new Projectile(
          this.x, this.y,
          Math.cos(a2) * spd, Math.sin(a2) * spd,
          { radius: 7.0, damage: 22, isEnemy: true, life: 3.6 }
        ));
      }

      // Targeted cluster shot
      if (this.secondaryTimer >= 3.6) {
        this.secondaryTimer = 0;
        for (let i = -2; i <= 2; i++) {
          const spread = this.angle + i * 0.18;
          projectiles.push(new Projectile(
            this.x, this.y,
            Math.cos(spread) * 440, Math.sin(spread) * 440,
            { radius: 8.5, damage: 32, isEnemy: true, life: 2.8 }
          ));
        }
      }

    } else if (this.bossType === "behemoth") {
      // 8-way rotating sweeping radiation rays + expanding toxic shockwaves
      this.beamAngle += dt * 1.35;
      if (this.attackTimer >= 0.09) {
        this.attackTimer = 0;
        const arms = 8;
        const isFrenzy = this.hp < this.maxHp * 0.35;
        const spd = isFrenzy ? 420 : 330;
        for (let i = 0; i < arms; i++) {
          const a = this.beamAngle + (i * Math.PI * 2) / arms;
          projectiles.push(new Projectile(
            this.x, this.y,
            Math.cos(a) * spd, Math.sin(a) * spd,
            { radius: 7.5, damage: 26, isEnemy: true, life: 3.2 }
          ));
        }
      }

      // Expanding toxic shockwave / acid burst
      if (this.secondaryTimer >= 3.2 && acidPools) {
        this.secondaryTimer = 0;
        acidPools.push(new AcidPool(this.x, this.y, 140, 45, 4.5, false, true));
        const ringBullets = 16;
        for (let i = 0; i < ringBullets; i++) {
          const a = (i * Math.PI * 2) / ringBullets;
          projectiles.push(new Projectile(
            this.x, this.y,
            Math.cos(a) * 220, Math.sin(a) * 220,
            { radius: 9, damage: 35, isEnemy: true, life: 4.0 }
          ));
        }
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

