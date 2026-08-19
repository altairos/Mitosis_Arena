// DNA Mutation Catalog & Upgrade State System

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
    desc: "场上每多存在 1 个子细胞，全体细胞的攻击速度与子弹飞行速度提升 12%。",
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

class UpgradeManager {
  constructor() {
    this.mutations = JSON.parse(JSON.stringify(DNA_MUTATIONS));
    // Restore apply functions from master
    this.mutations.forEach((m, idx) => {
      m.apply = DNA_MUTATIONS[idx].apply;
    });
  }

  reset() {
    this.mutations.forEach(m => m.rank = 0);
  }

  getRandomOptions(count = 3) {
    const available = this.mutations.filter(m => m.rank < m.maxRank);
    if (available.length <= count) return available;

    // Weighted random by tier
    const weighted = [];
    available.forEach(m => {
      let weight = 10; // common
      if (m.tier === "epic") weight = 4;
      if (m.tier === "legendary") weight = 1.5;
      for (let i = 0; i < weight * 2; i++) {
        weighted.push(m);
      }
    });

    const chosen = [];
    while (chosen.length < count && weighted.length > 0) {
      const idx = Math.floor(Math.random() * weighted.length);
      const pick = weighted[idx];
      if (!chosen.some(c => c.id === pick.id)) {
        chosen.push(pick);
      }
    }
    return chosen;
  }

  selectUpgrade(mutationId, player) {
    const mut = this.mutations.find(m => m.id === mutationId);
    if (mut && mut.rank < mut.maxRank) {
      mut.rank++;
      mut.apply(player);
      return mut;
    }
    return null;
  }
}

window.upgradeManager = new UpgradeManager();
