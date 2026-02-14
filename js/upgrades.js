// ===== UPGRADES.JS - Card-Based Upgrade System =====

const Upgrades = (() => {
  const ALL_UPGRADES = {
    // HARDWARE
    extra_camera: {
      id: 'extra_camera',
      name: 'Extra Camera',
      category: 'HARDWARE',
      icon: '[+CAM]',
      desc: 'Add a 5th camera feed to your monitoring station. More eyes, more coverage.',
      onApply: (state) => { state.maxCameras = Math.min(state.maxCameras + 1, 6); },
    },
    better_zoom: {
      id: 'better_zoom',
      name: 'Enhanced Zoom',
      category: 'HARDWARE',
      icon: '[ZOOM]',
      desc: 'Camera feeds show a wider area around each room, revealing adjacent corridors.',
    },
    night_vision: {
      id: 'night_vision',
      name: 'Night Vision',
      category: 'HARDWARE',
      icon: '[NVIS]',
      desc: 'Cameras see further into dark corridors. Extended visibility range by 3 tiles.',
    },
    backup_power: {
      id: 'backup_power',
      name: 'Backup Power',
      category: 'HARDWARE',
      icon: '[BKUP]',
      desc: '+1 max Action Points per turn. More power means more actions.',
      onApply: (state) => { state.maxAP += 1; },
    },

    // SOFTWARE
    motion_detection: {
      id: 'motion_detection',
      name: 'Motion Detection',
      category: 'SOFTWARE',
      icon: '[MOTN]',
      desc: 'Auto-detect movement in camera rooms. Counters Ghost stealth ability.',
    },
    facial_recognition: {
      id: 'facial_recognition',
      name: 'Facial Recognition',
      category: 'SOFTWARE',
      icon: '[FACE]',
      desc: 'Identify thief types on camera feeds. Know what you\'re dealing with.',
    },
    predictive_pathing: {
      id: 'predictive_pathing',
      name: 'Predictive Pathing',
      category: 'SOFTWARE',
      icon: '[PRED]',
      desc: 'Detect thieves near camera rooms even if not directly in view.',
    },
    fast_reboot: {
      id: 'fast_reboot',
      name: 'Fast Reboot',
      category: 'SOFTWARE',
      icon: '[FAST]',
      desc: 'Alarm cooldown reduced from 5 to 3 turns. React faster to threats.',
      onApply: (state) => { state.alarmCooldownMax = 3; },
    },

    // COUNTERMEASURES
    reinforced_doors: {
      id: 'reinforced_doors',
      name: 'Reinforced Doors',
      category: 'COUNTERMEASURE',
      icon: '[DOOR]',
      desc: 'Locked doors take twice as long to pick. Thieves need 6 pick progress instead of 3.',
      onApply: (state) => { state.doorStrength = 6; },
    },
    emp_trap: {
      id: 'emp_trap',
      name: 'EMP Trap',
      category: 'COUNTERMEASURE',
      icon: '[EMP!]',
      desc: 'Alarm now stuns thieves for 3 turns instead of 2. Disorienting pulse.',
      onApply: (state) => { state.alarmStunDuration = 3; },
    },
    auto_lock: {
      id: 'auto_lock',
      name: 'Auto-Lock',
      category: 'COUNTERMEASURE',
      icon: '[LOCK]',
      desc: 'Doors automatically lock when a thief is detected in an adjacent room.',
    },
    security_drone: {
      id: 'security_drone',
      name: 'Security Drone',
      category: 'COUNTERMEASURE',
      icon: '[DRON]',
      desc: 'Deploy a drone that patrols corridors. Reveals thieves in corridors near cameras.',
    },
  };

  // Get 3 random upgrade cards, avoiding duplicates of already-owned upgrades
  function getChoices(ownedUpgrades, shiftNum) {
    const available = Object.values(ALL_UPGRADES).filter(u => !ownedUpgrades.has(u.id));

    if (available.length <= 3) return available;

    // Weight by category to ensure variety
    const categories = ['HARDWARE', 'SOFTWARE', 'COUNTERMEASURE'];
    const choices = [];

    // Try to pick one from each category
    for (const cat of categories) {
      const catUpgrades = available.filter(u => u.category === cat && !choices.includes(u));
      if (catUpgrades.length > 0) {
        choices.push(catUpgrades[Math.floor(Math.random() * catUpgrades.length)]);
      }
    }

    // Fill remaining slots randomly
    while (choices.length < 3) {
      const remaining = available.filter(u => !choices.includes(u));
      if (remaining.length === 0) break;
      choices.push(remaining[Math.floor(Math.random() * remaining.length)]);
    }

    return choices.slice(0, 3);
  }

  // Render upgrade cards to DOM
  function renderCards(container, choices, onSelect) {
    container.innerHTML = '';
    for (const upgrade of choices) {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `
        <div class="card-category">${upgrade.category}</div>
        <div class="card-icon">${upgrade.icon}</div>
        <div class="card-name">${upgrade.name}</div>
        <div class="card-desc">${upgrade.desc}</div>
      `;
      card.addEventListener('click', () => onSelect(upgrade));
      container.appendChild(card);
    }
  }

  return { ALL_UPGRADES, getChoices, renderCards };
})();
