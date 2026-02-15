// ============================================================
//  MAIN — Game loop and state machine
// ============================================================
const Game = {
    // States
    STATE: {
        TITLE: 'title',
        MAP: 'map',           // Overworld sailing map
        SAILING: 'sailing',    // Sailing animation to next node
        ISLAND: 'island',      // Top-down island combat
        ISLAND_CLEAR: 'island_clear', // Island cleared overlay
        TAVERN: 'tavern',      // Tavern shop
        NAVAL: 'naval',        // Ship-to-ship combat
        BOSS: 'boss',          // Boss island
        DEATH: 'death',
        VICTORY: 'victory',
    },

    state: 'title',
    frame: 0,
    lastTime: 0,
    act: 0,
    pendingNode: null,
    islandClearTimer: 0,

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

            case this.STATE.MAP:
                this._updateMap(dt);
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
                    this.state = this.STATE.MAP;
                }
                break;

            case this.STATE.TAVERN:
                this._updateTavern();
                break;

            case this.STATE.NAVAL:
                this._updateNaval(dt);
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

            case this.STATE.MAP:
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

            case this.STATE.TAVERN:
                UI.drawTavern(ctx, this.frame);
                break;

            case this.STATE.NAVAL:
                Naval.draw(ctx, this.frame);
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
        Player.init(0, 0);
        GameMap.generate(this.act);
        this.state = this.STATE.MAP;
    },

    // ---- MAP ----
    _updateMap(dt) {
        const result = GameMap.update(dt);
        if (result && result.selectedNode !== undefined) {
            this.pendingNode = GameMap.selectNode(result.selectedNode);
            if (this.pendingNode) {
                this.state = this.STATE.SAILING;
            }
        }
    },

    // ---- SAILING ----
    _updateSailing(dt) {
        const arrived = GameMap.update(dt);
        if (arrived && arrived.type) {
            // Arrived at node
            const node = arrived;
            switch (node.type) {
                case 'island':
                    this._enterIsland(node.difficulty, false);
                    break;
                case 'boss':
                    this._enterIsland(node.difficulty, true);
                    break;
                case 'tavern':
                    UI.initTavern();
                    this.state = this.STATE.TAVERN;
                    break;
                case 'sea_battle':
                    Naval.start(node.difficulty);
                    this.state = this.STATE.NAVAL;
                    break;
                default:
                    this.state = this.STATE.MAP;
            }
        }
    },

    // ---- ISLAND ----
    _enterIsland(difficulty, isBoss) {
        Island.generate(difficulty);
        Player.x = Island.spawnX;
        Player.y = Island.spawnY;
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
            this.state = this.STATE.DEATH;
            return;
        }

        // Check island clear (all enemies dead for non-boss, boss dead for boss)
        if (this.state === this.STATE.BOSS) {
            if (Enemies.bossDefeated() && Enemies.aliveCount() === 0) {
                this.state = this.STATE.VICTORY;
            }
        } else {
            if (Enemies.aliveCount() === 0) {
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

        // HUD (screen space — damage numbers already drawn in world space above)
        UI.drawHUD(ctx, this.frame, true);
    },

    // ---- TAVERN ----
    _updateTavern() {
        if (Input.mouse.leftClick) {
            const result = UI.handleTavernClick();
            if (result === 'leave') {
                this.state = this.STATE.MAP;
            }
        }
    },

    // ---- NAVAL ----
    _updateNaval(dt) {
        const result = Naval.update(dt);
        if (result) {
            if (result === 'lose') {
                this.state = this.STATE.DEATH;
            } else {
                // Win or flee — back to map
                if (result === 'win') {
                    // Loot already added in Naval
                }
                this.state = this.STATE.MAP;
            }
        }
    },
};

// ---- BOOT ----
Game.init();
