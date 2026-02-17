// ============================================================
//  MAIN — Game loop and state machine
// ============================================================
const Game = {
    // States
    STATE: {
        TITLE: 'title',
        PORT: 'port',             // Port shop / contracts / meta
        SAILING: 'sailing',       // Free-roam open sea
        ISLAND: 'island',         // Top-down island combat
        BOSS: 'boss',             // Boss island
        ISLAND_CLEAR: 'island_clear',
        UPGRADE_PICK: 'upgrade_pick',
        DEATH: 'death',
        VICTORY: 'victory',
    },

    state: 'title',
    frame: 0,
    lastTime: 0,
    act: 0,
    islandClearTimer: 0,
    currentPoi: null,

    // Chests on current island
    chests: [],

    init() {
        const canvas = document.getElementById('game');
        Renderer.init(canvas);
        Input.init(canvas);
        this.state = this.STATE.TITLE;
        requestAnimationFrame(ts => this.loop(ts));
    },

    loop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;
        this.frame++;

        this.update(dt);
        this.draw();

        Input.clearClicks();
        requestAnimationFrame(ts => this.loop(ts));
    },

    update(dt) {
        Renderer.updateShake(dt);
        Renderer.updateParticles(dt);
        Combat.updateDamageNumbers(dt);

        switch (this.state) {
            case this.STATE.TITLE:
                if (Input.mouse.leftClick || Input.isDown('Space')) {
                    this.startRun();
                }
                break;

            case this.STATE.PORT:
                this._updatePort();
                break;

            case this.STATE.SAILING:
                this._updateSailing(dt);
                break;

            case this.STATE.ISLAND:
            case this.STATE.BOSS:
                this._updateIsland(dt);
                break;

            case this.STATE.ISLAND_CLEAR:
                this.islandClearTimer -= dt;
                if (this.islandClearTimer <= 0 || Input.mouse.leftClick) {
                    // Go to upgrade picker
                    UI.initUpgradePicker();
                    this.state = this.STATE.UPGRADE_PICK;
                }
                break;

            case this.STATE.UPGRADE_PICK:
                this._updateUpgradePick();
                break;

            case this.STATE.DEATH:
                if (Input.mouse.leftClick || Input.isDown('Space')) {
                    this.state = this.STATE.TITLE;
                }
                break;

            case this.STATE.VICTORY:
                if (Input.mouse.leftClick || Input.isDown('Space')) {
                    this.state = this.STATE.TITLE;
                }
                break;
        }
    },

    draw() {
        const ctx = Renderer.ctx;
        Renderer.clear();

        switch (this.state) {
            case this.STATE.TITLE:
                UI.drawTitle(ctx, this.frame);
                break;

            case this.STATE.PORT:
                UI.drawPort(ctx, this.frame);
                break;

            case this.STATE.SAILING:
                GameMap.draw(ctx, this.frame);
                break;

            case this.STATE.ISLAND:
            case this.STATE.BOSS:
                this._drawIsland(ctx);
                break;

            case this.STATE.ISLAND_CLEAR:
                this._drawIsland(ctx);
                UI.drawIslandComplete(ctx, this.frame);
                break;

            case this.STATE.UPGRADE_PICK:
                UI.drawUpgradePicker(ctx, this.frame);
                break;

            case this.STATE.DEATH:
                UI.drawDeath(ctx, this.frame);
                break;

            case this.STATE.VICTORY:
                UI.drawVictory(ctx, this.frame);
                break;
        }
    },

    // ---- START RUN ----
    startRun() {
        this.act = 0;
        Ship.init();
        Ship.applyMeta();
        Player.init(0, 0);
        GameMap.generate();
        UI.initPort();
        this.state = this.STATE.PORT;
    },

    // ---- PORT ----
    _updatePort() {
        if (Input.mouse.leftClick) {
            const result = UI.handlePortClick();
            if (result === 'leave') {
                this.state = this.STATE.SAILING;
            }
        }
    },

    // ---- SAILING (free-roam sea) ----
    _updateSailing(dt) {
        Renderer.updateCamera(Ship.x, Ship.y, dt);
        const result = GameMap.update(dt);

        if (result) {
            switch (result.event) {
                case 'dock':
                    UI.initPort();
                    this.state = this.STATE.PORT;
                    break;
                case 'land':
                    this.currentPoi = result.poi;
                    this._enterIsland(result.poi.difficulty, result.poi.type === 'boss');
                    break;
                case 'sunk':
                    Ship.onDeath();
                    this.state = this.STATE.DEATH;
                    break;
            }
        }
    },

    // ---- ISLAND ----
    _enterIsland(difficulty, isBoss) {
        Island.generate(difficulty);
        Player.x = Island.spawnX;
        Player.y = Island.spawnY;
        Player.hp = Player.maxHp; // Full HP for island combat
        Enemies.spawnForIsland(difficulty, isBoss);
        Loot.reset();

        // Setup chests
        this.chests = Island.chestPositions.map(c => ({
            x: c.x, y: c.y, opened: false
        }));

        this.state = isBoss ? this.STATE.BOSS : this.STATE.ISLAND;
    },

    _updateIsland(dt) {
        Player.update(dt);
        Enemies.update(dt);
        Loot.update(dt);

        // Combat checks
        Enemies.checkPlayerMelee();
        Enemies.checkPlayerBullets();
        Enemies.checkContactDamage();

        // Loot pickup
        const picked = Loot.checkPickup(Player.x, Player.y, Player.radius);
        for (const item of picked) {
            switch (item.type) {
                case 'gold':
                    Player.gold += item.amount;
                    Combat.spawnDamageNumber(Player.x, Player.y - 20, '+' + item.amount, '#ffd700');
                    break;
                case 'heart':
                    Player.heal(item.healAmount);
                    break;
                case 'ammo':
                    Player.ammo = Math.min(Player.maxAmmo, Player.ammo + item.amount);
                    Combat.spawnDamageNumber(Player.x, Player.y - 20, '+' + item.amount + ' ammo', '#aaaaaa');
                    break;
                case 'weapon':
                    Player.weapon = item.weapon;
                    Combat.spawnDamageNumber(Player.x, Player.y - 20, item.weapon.name, '#ffcc00');
                    break;
            }
        }

        // Chest interaction
        for (const chest of this.chests) {
            if (chest.opened) continue;
            if (Combat.distance(Player.x, Player.y, chest.x, chest.y) < 20) {
                if (Input.isDown('KeyE') || Input.isDown('KeyF')) {
                    chest.opened = true;
                    Loot.spawnChestLoot(chest.x, chest.y, this.act + 1);
                    Renderer.spawnBurst(chest.x, chest.y, 8, '#ffd700', 40, 2, 0.4);
                }
            }
        }

        // Camera follow
        Renderer.updateCamera(Player.x, Player.y, dt);

        // Check death
        if (!Player.isAlive()) {
            Ship.onDeath();
            this.state = this.STATE.DEATH;
            return;
        }

        // Check island clear
        if (this.state === this.STATE.BOSS) {
            if (Enemies.bossDefeated() && Enemies.aliveCount() === 0) {
                this.state = this.STATE.VICTORY;
            }
        } else {
            if (Enemies.aliveCount() === 0) {
                Ship.onIslandClear();
                if (this.currentPoi) {
                    GameMap.markCleared(this.currentPoi);
                }
                this.islandClearTimer = 2;
                this.state = this.STATE.ISLAND_CLEAR;
            }
        }
    },

    _drawIsland(ctx) {
        Renderer.beginCamera();

        // Draw island tiles
        Island.draw(ctx, Renderer.cam.x, Renderer.cam.y, Renderer.W, Renderer.H, this.frame);

        // Draw chests
        for (const chest of this.chests) {
            Sprites.drawChest(ctx, chest.x, chest.y, this.frame, chest.opened);
            // Interaction prompt
            if (!chest.opened && Combat.distance(Player.x, Player.y, chest.x, chest.y) < 25) {
                ctx.fillStyle = '#e8c872';
                ctx.font = '8px "Courier New"';
                ctx.textAlign = 'center';
                ctx.fillText('E/F to open', chest.x, chest.y - 14);
            }
        }

        // Draw loot
        Loot.draw(ctx, this.frame);

        // Draw enemies
        Enemies.draw(ctx, this.frame);

        // Draw player
        Player.draw(ctx, this.frame);
        Player.drawBullets(ctx);

        // Particles (in world space)
        Renderer.drawParticles();

        // Damage numbers (in world space)
        Combat.drawDamageNumbers(ctx);

        Renderer.endCamera();

        // HUD (screen space)
        UI.drawHUD(ctx, this.frame, true);
    },

    // ---- UPGRADE PICK ----
    _updateUpgradePick() {
        const choice = UI.handleUpgradeClick();
        if (choice >= 0 && choice < UI.upgradeChoices.length) {
            Ship.pickUpgrade(UI.upgradeChoices[choice]);
            this.state = this.STATE.SAILING;
        }
    },
};

// ---- BOOT ----
Game.init();
