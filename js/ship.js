// ============================================================
//  SHIP — Player ship stats, upgrades, meta-progression
// ============================================================
const Ship = {
    // Hull (ship HP while sailing)
    hull: 100,
    maxHull: 100,

    // Movement
    speed: 80,
    turnSpeed: 2.5,
    angle: -Math.PI / 2, // facing up initially
    velX: 0,
    velY: 0,
    drag: 0.97,

    // Cannons
    cannonDamage: 15,
    cannonRange: 120,
    cannonCooldown: 0,
    cannonCooldownMax: 1.2,
    broadsideLeft: false,

    // Crew bonuses
    crewMorale: 0,    // +player HP on islands
    boardingBonus: 0,  // +melee dmg
    gunnerBonus: 0,    // +ranged dmg
    surgeonHeal: 0,    // heal after island
    scoutRange: 0,     // fog reveal bonus
    goldBonus: 0,      // +% gold find
    ramDamage: 0,      // contact damage to enemy ships

    // Upgrade tracking
    upgrades: [],
    islandsCleared: 0,

    // Meta-progression (persists through death)
    doubloons: 0,          // meta currency
    metaUpgrades: new Set(), // purchased meta upgrades

    // Position on sea map
    x: 0, y: 0,

    // All possible upgrades (roguelite picks)
    UPGRADE_POOL: [
        { id: 'hull_plate', name: 'Hull Plating', icon: '[ ]', desc: '+30 Max Hull', cat: 'HULL',
          apply() { Ship.maxHull += 30; Ship.hull += 30; } },
        { id: 'hull_patch', name: 'Hull Patch', icon: '[+]', desc: 'Repair 40 Hull', cat: 'HULL',
          apply() { Ship.hull = Math.min(Ship.maxHull, Ship.hull + 40); } },
        { id: 'swift_sails', name: 'Swift Sails', icon: '>>>', desc: '+15% Sail Speed', cat: 'SAILS',
          apply() { Ship.speed *= 1.15; } },
        { id: 'nimble_helm', name: 'Nimble Helm', icon: '<->', desc: '+20% Turn Speed', cat: 'SAILS',
          apply() { Ship.turnSpeed *= 1.2; } },
        { id: 'extra_cannon', name: 'Extra Cannons', icon: 'ooo', desc: '+25% Cannon Damage', cat: 'GUNS',
          apply() { Ship.cannonDamage = Math.floor(Ship.cannonDamage * 1.25); } },
        { id: 'fast_reload', name: 'Fast Reload', icon: '(o)', desc: '-20% Cannon Cooldown', cat: 'GUNS',
          apply() { Ship.cannonCooldownMax *= 0.8; } },
        { id: 'grapeshot', name: 'Grapeshot', icon: '***', desc: 'Cannons deal AoE damage', cat: 'GUNS',
          apply() { Ship.upgrades.push('grapeshot'); } },
        { id: 'ram_prow', name: 'Ram Prow', icon: '/V\\', desc: 'Ram enemies for 30 dmg', cat: 'HULL',
          apply() { Ship.ramDamage = 30; } },
        { id: 'crows_nest', name: "Crow's Nest", icon: 'T_T', desc: '+40% Fog Reveal Range', cat: 'CREW',
          apply() { Ship.scoutRange += 60; } },
        { id: 'boarding_party', name: 'Boarding Party', icon: 'XXX', desc: '+20% Melee Dmg on Islands', cat: 'CREW',
          apply() { Ship.boardingBonus += 0.2; } },
        { id: 'morale_boost', name: 'Crew Morale', icon: '!!!', desc: '+20 Max HP on Islands', cat: 'CREW',
          apply() { Ship.crewMorale += 20; } },
        { id: 'surgeon', name: 'Ship Surgeon', icon: '+HP', desc: 'Heal 25 HP after each island', cat: 'CREW',
          apply() { Ship.surgeonHeal += 25; } },
        { id: 'lucky_charm', name: 'Lucky Charm', icon: '$$$', desc: '+30% Gold Find', cat: 'CREW',
          apply() { Ship.goldBonus += 0.3; } },
        { id: 'powder_stores', name: 'Powder Stores', icon: 'oOo', desc: '+5 Max Ammo', cat: 'GUNS',
          apply() { Player.maxAmmo += 5; Player.ammo += 5; } },
        { id: 'gunner_training', name: 'Gunner Training', icon: '(+)', desc: '+20% Pistol Dmg on Islands', cat: 'CREW',
          apply() { Ship.gunnerBonus += 0.2; } },
    ],

    init() {
        this.hull = 100;
        this.maxHull = 100;
        this.speed = 80;
        this.turnSpeed = 2.5;
        this.angle = -Math.PI / 2;
        this.velX = 0;
        this.velY = 0;
        this.cannonDamage = 15;
        this.cannonRange = 120;
        this.cannonCooldown = 0;
        this.cannonCooldownMax = 1.2;
        this.crewMorale = 0;
        this.boardingBonus = 0;
        this.gunnerBonus = 0;
        this.surgeonHeal = 0;
        this.scoutRange = 0;
        this.goldBonus = 0;
        this.ramDamage = 0;
        this.upgrades = [];
        this.islandsCleared = 0;
    },

    // Apply meta upgrades at run start
    applyMeta() {
        if (this.metaUpgrades.has('iron_hull')) { this.maxHull += 20; this.hull += 20; }
        if (this.metaUpgrades.has('veteran_crew')) { this.crewMorale += 10; }
        if (this.metaUpgrades.has('trade_routes')) { this.goldBonus += 0.15; }
    },

    // Get 3 random upgrade choices (no repeats)
    getUpgradeChoices() {
        const owned = new Set(this.upgrades);
        // Filter: remove exact id dupes (allow stacking for some)
        const stackable = new Set(['hull_plate','hull_patch','swift_sails','extra_cannon','fast_reload',
            'boarding_party','morale_boost','surgeon','lucky_charm','powder_stores','gunner_training',
            'crows_nest','nimble_helm']);
        const available = this.UPGRADE_POOL.filter(u => stackable.has(u.id) || !owned.has(u.id));
        // Shuffle and pick 3
        const shuffled = available.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 3);
    },

    // Pick an upgrade
    pickUpgrade(upgrade) {
        upgrade.apply();
        this.upgrades.push(upgrade.id);
    },

    hasUpgrade(id) {
        return this.upgrades.includes(id);
    },

    // After island clear
    onIslandClear() {
        this.islandsCleared++;
        if (this.surgeonHeal > 0) {
            Player.heal(this.surgeonHeal);
        }
    },

    // Sail update
    updateSailing(dt) {
        if (this.cannonCooldown > 0) this.cannonCooldown -= dt;

        // Turning
        if (Input.isDown('KeyA') || Input.isDown('ArrowLeft')) {
            this.angle -= this.turnSpeed * dt;
        }
        if (Input.isDown('KeyD') || Input.isDown('ArrowRight')) {
            this.angle += this.turnSpeed * dt;
        }

        // Thrust
        let thrust = 0;
        if (Input.isDown('KeyW') || Input.isDown('ArrowUp')) thrust = 1;
        if (Input.isDown('KeyS') || Input.isDown('ArrowDown')) thrust = -0.4;

        this.velX += Math.cos(this.angle) * thrust * this.speed * dt;
        this.velY += Math.sin(this.angle) * thrust * this.speed * dt;

        // Drag
        this.velX *= this.drag;
        this.velY *= this.drag;

        // Clamp velocity
        const spd = Math.sqrt(this.velX * this.velX + this.velY * this.velY);
        const maxSpd = this.speed * 1.2;
        if (spd > maxSpd) {
            this.velX = (this.velX / spd) * maxSpd;
            this.velY = (this.velY / spd) * maxSpd;
        }

        this.x += this.velX * dt;
        this.y += this.velY * dt;
    },

    // Fire broadside
    fireBroadside(side) {
        if (this.cannonCooldown > 0) return null;
        this.cannonCooldown = this.cannonCooldownMax;

        const perpAngle = this.angle + (side === 'left' ? -Math.PI / 2 : Math.PI / 2);
        return {
            x: this.x + Math.cos(perpAngle) * 12,
            y: this.y + Math.sin(perpAngle) * 12,
            dirX: Math.cos(perpAngle),
            dirY: Math.sin(perpAngle),
            damage: this.cannonDamage,
            range: this.cannonRange,
            aoe: this.hasUpgrade('grapeshot'),
        };
    },

    takeDamage(amount) {
        this.hull -= amount;
        Renderer.doShake(3, 0.15);
        if (this.hull <= 0) this.hull = 0;
    },

    isAlive() {
        return this.hull > 0;
    },

    // Meta currency on death
    onDeath() {
        // Keep 20% of gold as doubloons
        const earned = Math.floor(Player.gold * 0.2) + this.islandsCleared * 5;
        this.doubloons += earned;
        return earned;
    },

    // Current speed
    currentSpeed() {
        return Math.sqrt(this.velX * this.velX + this.velY * this.velY);
    },

    META_UPGRADES: [
        { id: 'iron_hull', name: 'Iron Hull', desc: 'Start with +20 Hull', cost: 30 },
        { id: 'veteran_crew', name: 'Veteran Crew', desc: 'Start with +10 HP', cost: 25 },
        { id: 'trade_routes', name: 'Trade Routes', desc: '+15% Gold Find', cost: 40 },
    ],
};
