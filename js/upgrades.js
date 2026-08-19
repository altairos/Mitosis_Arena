// DNA Mutation Catalog, Synergy Hyper-Mutations & Strain System

// 1. Starter Cell Lineages (初始菌种株系)
const CELL_STRAINS = [
  {
    id: "strain_standard",
    name: "原核标准株",
    icon: "🧪",
    tag: "均衡发展",
    desc: "各项生理机能均衡，标准分裂增殖与聚变清屏体验。",
    apply: (player) => {
      player.maxHp = 100;
      player.hp = 100;
      player.maxCellCap = 16;
      player.moveSpeed = 290;
      player.baseDamage = 16;
    }
  },
  {
    id: "strain_ciliate",
    name: "极速纤毛株",
    icon: "⚡",
    tag: "暴风雨弹幕",
    desc: "最大分裂上限翻倍至 32 个，移速 +25%，分裂冷却 -50%，但单发子弹威力 -25%。",
    apply: (player) => {
      player.maxHp = 90;
      player.hp = 90;
      player.maxCellCap = 32;
      player.moveSpeed = 360;
      player.splitCooldownMax = 0.45;
      player.baseDamage = 12;
    }
  },
  {
    id: "strain_phagocyte",
    name: "单核巨噬株",
    icon: "🛡️",
    tag: "肉盾引力母体",
    desc: "无法进行有丝分裂（恒定 1 个巨核体），生命上限 +120%，开局自带「巨核吞噬」引力光环与反伤护盾。",
    apply: (player) => {
      player.maxHp = 220;
      player.hp = 220;
      player.maxCellCap = 1;
      player.moveSpeed = 260;
      player.baseDamage = 26;
      player.cells[0].radius = 62;
      player.cells[0].targetRadius = 62;
      player.stats.hasPhagocytosis = true;
      player.stats.phagocytosisRange = 60;
      player.stats.hasMergeShield = true;
      player.shield = 40;
    }
  },
  {
    id: "strain_extremophile",
    name: "嗜酸异化株",
    icon: "☣️",
    tag: "生化毒蚀走位",
    desc: "游动时持续遗留高浓酸液轨迹，开局自带神经毒素与吸血，但最大生命 -20%。",
    apply: (player) => {
      player.maxHp = 80;
      player.hp = 80;
      player.maxCellCap = 16;
      player.moveSpeed = 310;
      player.baseDamage = 15;
      player.stats.poisonRank = 1;
      player.stats.vampiricRank = 1;
      player.stats.hasAcidTrail = true;
    }
  }
];

// 2. Base DNA Mutations (基础突变)
const DNA_MUTATIONS = [
  {
    id: "swarm_web",
    name: "蜂群电网",
    icon: "⚡",
    tier: "legendary",
    desc: "子细胞之间自动生成高压生物电弧，穿透电网的敌人受到极高频电击与减速。",
    maxRank: 3,
    rank: 0,
    apply: (player) => { player.stats.hasElectricWeb = true; player.stats.webDamageMult += 0.5; }
  },
  {
    id: "supernova_fusion",
    name: "聚变超新星",
    icon: "💥",
    tier: "legendary",
    desc: "合体聚变产生全屏辐射冲击波，击退所有敌人并点燃全场酸性等离子火焰。",
    maxRank: 3,
    rank: 0,
    apply: (player) => { player.stats.supernovaRank += 1; player.stats.fusionDamageMult += 0.6; }
  },
  {
    id: "mitotic_thorns",
    name: "有丝突刺",
    icon: "🗡️",
    tier: "epic",
    desc: "每次进行分裂时，所有细胞向四周齐射 12 枚高速穿透骨刺。",
    maxRank: 3,
    rank: 0,
    apply: (player) => { player.stats.splitThornsRank += 1; }
  },
  {
    id: "phagocytosis",
    name: "巨核吞噬",
    icon: "🕳️",
    tier: "epic",
    desc: "母体形态散发强烈引力漩涡，直接消化接触到的微型敌人并转化为经验与生命。",
    maxRank: 2,
    rank: 0,
    apply: (player) => { player.stats.hasPhagocytosis = true; player.stats.phagocytosisRange += 30; }
  },
  {
    id: "mitochondrial_surge",
    name: "线粒体狂暴",
    icon: "🔋",
    tier: "epic",
    desc: "场上每多存在 1 个子细胞，全体细胞的攻击速度与子弹飞行速度提升 14%。",
    maxRank: 3,
    rank: 0,
    apply: (player) => { player.stats.mitochondrialRank += 1; }
  },
  {
    id: "caustic_lysosomes",
    name: "溶酶体自爆",
    icon: "🧪",
    tier: "common",
    desc: "受到伤害或子细胞阵亡时释放强腐蚀酸液池，对踏入其中的敌人造成大范围融化与减速。",
    maxRank: 3,
    rank: 0,
    apply: (player) => { player.stats.acidPoolRank += 1; }
  },
  {
    id: "vampiric_flagella",
    name: "嗜血鞭毛",
    icon: "🩸",
    tier: "common",
    desc: "吸收 ATP 能量颗粒时立即回复 2% 最大生命值，并在 1 秒内获得 25% 移速暴增。",
    maxRank: 3,
    rank: 0,
    apply: (player) => { player.stats.vampiricRank += 1; }
  },
  {
    id: "hyper_mitosis",
    name: "极限量产",
    icon: "🧬",
    tier: "legendary",
    desc: "最大分裂上限提升至 32 个，分裂冷却时间减少 40%，且子细胞基础移速增加。",
    maxRank: 1,
    rank: 0,
    apply: (player) => { player.maxCellCap = 32; player.splitCooldownMax *= 0.6; }
  },
  {
    id: "chitin_armor",
    name: "几丁质甲壳",
    icon: "🛡️",
    tier: "common",
    desc: "最大生命值 +35%，且每次合体时生成一层可抵挡致命伤害的生物等离子护盾。",
    maxRank: 3,
    rank: 0,
    apply: (player) => { 
      player.maxHp = Math.round(player.maxHp * 1.35); 
      player.hp = Math.min(player.maxHp, player.hp + 50);
      player.stats.hasMergeShield = true;
    }
  },
  {
    id: "bio_laser",
    name: "生物激光",
    icon: "🔦",
    tier: "epic",
    desc: "子细胞射击转化为高能穿透生物激光束，可无视障碍并穿透最多 3 个敌人。",
    maxRank: 2,
    rank: 0,
    apply: (player) => { player.stats.laserRank += 1; player.stats.bulletPierce += 2; }
  },
  {
    id: "neurotoxin",
    name: "神经毒素",
    icon: "☠️",
    tier: "common",
    desc: "所有弹幕附带神经毒素，命中敌人造成 40% 减速并附加剧烈毒性流血伤害。",
    maxRank: 3,
    rank: 0,
    apply: (player) => { player.stats.poisonRank += 1; }
  },
  {
    id: "flagella_boost",
    name: "鞭毛喷射",
    icon: "💨",
    tier: "common",
    desc: "基础移动速度 +25%，急速转向更灵敏，并在移动尾部留下有害微流体推力。",
    maxRank: 3,
    rank: 0,
    apply: (player) => { player.moveSpeedMult *= 1.25; }
  },
  {
    id: "parasitic_drones",
    name: "寄生噬菌",
    icon: "🦠",
    tier: "epic",
    desc: "消灭敌人时有 25% 概率孵化一只友方微型噬菌体僚机，协助索敌射击持续 8 秒。",
    maxRank: 2,
    rank: 0,
    apply: (player) => { player.stats.droneSpawnChance += 0.25; }
  },
  {
    id: "atp_magnet",
    name: "引力共振",
    icon: "🧲",
    tier: "common",
    desc: "ATP 能量球吸引距离 +150%，且母体自动微量牵引周围轻型微生物走向弹幕火网。",
    maxRank: 3,
    rank: 0,
    apply: (player) => { player.magnetRadius *= 1.8; }
  },
  {
    id: "critical_mutation",
    name: "基因暴击",
    icon: "🎯",
    tier: "common",
    desc: "获得 25% 暴击率，暴击时造成 220% 毁灭性伤害并产生微型爆炸碎片。",
    maxRank: 3,
    rank: 0,
    apply: (player) => { player.stats.critChance += 0.25; player.stats.critMult += 0.5; }
  },
  {
    id: "symbiosis_shield",
    name: "共生力场",
    icon: "🌐",
    tier: "common",
    desc: "分裂状态下子细胞彼此靠近形成共生力场，使受到的所有伤害降低 30%。",
    maxRank: 2,
    rank: 0,
    apply: (player) => { player.stats.damageReduction += 0.15; }
  }
];

// 3. Bio-Synergy Hyper-Mutations (5 种组合超武 / 究极基因)
const HYPER_MUTATIONS = [
  {
    id: "hyper_tesla_star",
    name: "「特斯拉脉冲星」",
    icon: "🌠",
    tier: "hyper",
    reqDesc: "前置: 蜂群电网 + 有丝突刺",
    req: ["swarm_web", "mitotic_thorns"],
    desc: "【究极超武】电网升级为等离子电弧，高频向全图敌人链式传导连锁雷击；分裂时的骨刺带电且无限穿透！",
    maxRank: 1,
    rank: 0,
    apply: (player) => {
      player.stats.hasTeslaPulsar = true;
      player.stats.hasElectricWeb = true;
      player.stats.webDamageMult += 1.5;
    }
  },
  {
    id: "hyper_singularity",
    name: "「坍缩引力奇点」",
    icon: "🌌",
    tier: "hyper",
    reqDesc: "前置: 聚变超新星 + 巨核吞噬",
    req: ["supernova_fusion", "phagocytosis"],
    desc: "【究极超武】聚变合体时在中心生成持续 6 秒的微观黑洞，持续牵引撕碎周围所有非首领敌人与射弹！",
    maxRank: 1,
    rank: 0,
    apply: (player) => {
      player.stats.hasSingularityVortex = true;
      player.stats.supernovaRank += 2;
    }
  },
  {
    id: "hyper_wasp_swarm",
    name: "「寄生自爆蜂群」",
    icon: "🐝",
    tier: "hyper",
    reqDesc: "前置: 寄生噬菌 + 神经毒素",
    req: ["parasitic_drones", "neurotoxin"],
    desc: "【究极超武】噬菌体僚机进化为生化巨蜂，发射穿透毒针，并在消亡时产生剧毒大爆炸，向八方喷射追踪毒孢！",
    maxRank: 1,
    rank: 0,
    apply: (player) => {
      player.stats.hasParasiticHive = true;
      player.stats.droneSpawnChance = Math.max(player.stats.droneSpawnChance, 0.45);
    }
  },
  {
    id: "hyper_prismatic_ray",
    name: "「棱镜死亡射线」",
    icon: "💎",
    tier: "hyper",
    reqDesc: "前置: 生物激光 + 基因暴击",
    req: ["bio_laser", "critical_mutation"],
    desc: "【究极超武】激光束命中敌人时光束折射分裂出 3 道次级折射激光，激光暴击造成 300% 伤害并吸取生命！",
    maxRank: 1,
    rank: 0,
    apply: (player) => {
      player.stats.hasPrismaticLaser = true;
      player.stats.laserRank = Math.max(player.stats.laserRank, 2);
      player.stats.critChance += 0.35;
      player.stats.critMult += 1.0;
    }
  },
  {
    id: "hyper_acid_overload",
    name: "「过载酸蚀核」",
    icon: "🌋",
    tier: "hyper",
    reqDesc: "前置: 溶酶体自爆 + 线粒体狂暴",
    req: ["caustic_lysosomes", "mitochondrial_surge"],
    desc: "【究极超武】母体与子细胞移动时持续生成高浓腐蚀酸液带，酸液伤害提升 250% 并附带 60% 强力减速，敌人死于酸液时发生连锁酸爆！",
    maxRank: 1,
    rank: 0,
    apply: (player) => {
      player.stats.hasHyperAcid = true;
      player.stats.hasAcidTrail = true;
      player.stats.acidPoolRank += 2;
    }
  }
];

class UpgradeManager {
  constructor() {
    this.strains = CELL_STRAINS;
    this.selectedStrainId = "strain_standard";
    this.rerollCount = 1;
    this.maxRerolls = 1;

    this.mutations = JSON.parse(JSON.stringify(DNA_MUTATIONS));
    this.mutations.forEach((m, idx) => {
      m.apply = DNA_MUTATIONS[idx].apply;
    });

    this.hypers = JSON.parse(JSON.stringify(HYPER_MUTATIONS));
    this.hypers.forEach((h, idx) => {
      h.apply = HYPER_MUTATIONS[idx].apply;
    });
  }

  reset() {
    this.mutations.forEach(m => m.rank = 0);
    this.hypers.forEach(h => h.rank = 0);
    this.rerollCount = this.maxRerolls;
  }

  setStrain(strainId) {
    this.selectedStrainId = strainId;
  }

  applyStartingStrain(player) {
    const strain = this.strains.find(s => s.id === this.selectedStrainId) || this.strains[0];
    strain.apply(player);
    player.strainId = strain.id;
  }

  getRandomOptions(count = 3) {
    // 1. Check eligible hyper mutations whose prerequisites are met
    const availableHypers = this.hypers.filter(h => {
      if (h.rank >= h.maxRank) return false;
      return h.req.every(reqId => {
        const baseMut = this.mutations.find(m => m.id === reqId);
        return baseMut && baseMut.rank >= 1;
      });
    });

    const availableBases = this.mutations.filter(m => m.rank < m.maxRank);
    const chosen = [];

    // Prioritize showing a Hyper-Mutation if unlocked (high exciting moment)
    if (availableHypers.length > 0 && Math.random() < 0.85) {
      const hyperPick = availableHypers[Math.floor(Math.random() * availableHypers.length)];
      chosen.push(hyperPick);
    }

    // Fill remaining with weighted base mutations
    const weighted = [];
    availableBases.forEach(m => {
      let weight = 10; // common
      if (m.tier === "epic") weight = 4;
      if (m.tier === "legendary") weight = 1.5;
      for (let i = 0; i < weight * 2; i++) {
        weighted.push(m);
      }
    });

    while (chosen.length < count && weighted.length > 0) {
      const idx = Math.floor(Math.random() * weighted.length);
      const pick = weighted[idx];
      // Remove every entry of the picked mutation so the pool shrinks
      // and the loop always makes progress (prevents infinite loops)
      for (let i = weighted.length - 1; i >= 0; i--) {
        if (weighted[i] === pick) weighted.splice(i, 1);
      }
      if (!chosen.some(c => c.id === pick.id)) {
        chosen.push(pick);
      }
    }
    return chosen;
  }

  selectUpgrade(mutationId, player) {
    // Check base
    let mut = this.mutations.find(m => m.id === mutationId);
    if (!mut) {
      // Check hyper
      mut = this.hypers.find(h => h.id === mutationId);
    }

    if (mut && mut.rank < mut.maxRank) {
      mut.rank++;
      mut.apply(player);
      return mut;
    }
    return null;
  }
}

window.CELL_STRAINS = CELL_STRAINS;
window.upgradeManager = new UpgradeManager();

