// ============================================================
//  PLAYER — Movement, dodge roll, combat
// ============================================================
const Player = {
    x: 0, y: 0,
    vx: 0, vy: 0,
    speed: 120,
    radius: 6,
    facing: 1, // 1=right, -1=left

    // Health
    hp: 80, maxHp: 80,
    invulnTimer: 0,
    bleedTimer: 0,
    bleedDps: 0,

    // Dodge roll
    isDodging: false,
    dodgeTimer: 0,
    dodgeDuration: 0.2,
    dodgeCooldown: 0,
    dodgeCooldownMax: 0.5,
    dodgeSpeed: 350,
    dodgeDirX: 0,
    dodgeDirY: 0,

    // Melee attack
    weapon: null,
    attackTimer: 0,
    attackDuration: 0.2,
    attackCooldown: 0,
    comboCount: 0,
    comboTimer: 0,
    hasHitThisSwing: false,

    // Ranged
    ammo: 10,
    maxAmmo: 15,
    shootCooldown: 0,
    shootCooldownMax: 0.8,
    bullets: [],

    // Knockback
    knockbackVX: 0,
    knockbackVY: 0,
    knockbackTimer: 0,

    // Stats
    gold: 0,
    kills: 0,

    init(x, y) {
        this.x = x;
        this.y = y;
        this.hp = this.maxHp;
        this.gold = 0;
        this.kills = 0;
        this.ammo = 10;
        this.vx = 0; this.vy = 0;
        this.isDodging = false;
        this.dodgeCooldown = 0;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.shootCooldown = 0;
        this.invulnTimer = 0;
        this.bleedTimer = 0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.knockbackTimer = 0;
        this.bullets = [];
        this.weapon = {
            id: 'rusty_cutlass', name: 'Rusty Cutlass',
            damage: 8, speed: 1.0, range: 28, desc: 'Starter weapon.'
        };
    },

    update(dt) {
        // Timers
        if (this.invulnTimer > 0) this.invulnTimer -= dt;
        if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.shootCooldown > 0) this.shootCooldown -= dt;
        if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.comboCount = 0; }

        // Bleed
        if (this.bleedTimer > 0) {
            this.bleedTimer -= dt;
            this.hp -= this.bleedDps * dt;
        }

        // Knockback
        if (this.knockbackTimer > 0) {
            this.knockbackTimer -= dt;
            this.x += this.knockbackVX * dt;
            this.y += this.knockbackVY * dt;
            this.knockbackVX *= 0.9;
            this.knockbackVY *= 0.9;
            this._clampPosition();
            return;
        }

        // Dodge roll
        if (this.isDodging) {
            this.dodgeTimer -= dt;
            this.x += this.dodgeDirX * this.dodgeSpeed * dt;
            this.y += this.dodgeDirY * this.dodgeSpeed * dt;
            this._clampPosition();
            if (this.dodgeTimer <= 0) {
                this.isDodging = false;
                this.dodgeCooldown = this.dodgeCooldownMax;
            }
            return;
        }

        // Attack animation
        if (this.attackTimer > 0) {
            this.attackTimer -= dt;
        }

        // Movement input
        let mx = 0, my = 0;
        if (Input.isDown('KeyW') || Input.isDown('ArrowUp')) my = -1;
        if (Input.isDown('KeyS') || Input.isDown('ArrowDown')) my = 1;
        if (Input.isDown('KeyA') || Input.isDown('ArrowLeft')) mx = -1;
        if (Input.isDown('KeyD') || Input.isDown('ArrowRight')) mx = 1;

        // Normalize diagonal
        if (mx !== 0 && my !== 0) {
            mx *= 0.707;
            my *= 0.707;
        }

        this.vx = mx * this.speed;
        this.vy = my * this.speed;

        // Apply movement
        const newX = this.x + this.vx * dt;
        const newY = this.y + this.vy * dt;

        // Collision with tiles
        if (Island.isWalkable(newX, this.y)) this.x = newX;
        if (Island.isWalkable(this.x, newY)) this.y = newY;

        // Facing direction
        if (mx !== 0) this.facing = mx > 0 ? 1 : -1;

        // Dodge roll on Space
        if (Input.isDown('Space') && this.dodgeCooldown <= 0 && !this.isDodging) {
            this.isDodging = true;
            this.dodgeTimer = this.dodgeDuration;
            this.invulnTimer = this.dodgeDuration + 0.05;
            if (mx !== 0 || my !== 0) {
                const len = Math.sqrt(mx * mx + my * my);
                this.dodgeDirX = mx / len;
                this.dodgeDirY = my / len;
            } else {
                this.dodgeDirX = this.facing;
                this.dodgeDirY = 0;
            }
            Renderer.spawnBurst(this.x, this.y, 5, '#ffffff', 30, 2, 0.3);
        }

        // Melee on left click
        if (Input.mouse.leftClick && this.attackCooldown <= 0 && this.attackTimer <= 0) {
            this.attackTimer = this.attackDuration;
            this.attackCooldown = this.attackDuration + (0.15 / this.weapon.speed);
            this.hasHitThisSwing = false;
            this.comboCount++;
            this.comboTimer = 0.6;

            // Face toward mouse
            const world = Renderer.screenToWorld(Input.mouse.x, Input.mouse.y);
            if (world.x > this.x) this.facing = 1;
            else this.facing = -1;
        }

        // Ranged on right click
        if (Input.mouse.rightClick && this.shootCooldown <= 0 && this.ammo > 0) {
            this.shoot();
        }

        // Update bullets
        this.updateBullets(dt);
    },

    shoot() {
        const world = Renderer.screenToWorld(Input.mouse.x, Input.mouse.y);
        const dir = Combat.direction(this.x, this.y, world.x, world.y);
        this.bullets.push({
            x: this.x + dir.x * 8,
            y: this.y + dir.y * 8,
            vx: dir.x * 300,
            vy: dir.y * 300,
            damage: 15,
            life: 1.0
        });
        this.ammo--;
        this.shootCooldown = this.shootCooldownMax;
        Renderer.spawnBurst(this.x + dir.x * 10, this.y + dir.y * 10, 3, '#ffcc44', 50, 2, 0.15);
        Renderer.doShake(2, 0.1);
    },

    updateBullets(dt) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;

            // Hit wall
            if (!Island.isWalkable(b.x, b.y)) {
                Renderer.spawnBurst(b.x, b.y, 4, '#ffaa44', 40, 2, 0.2);
                this.bullets.splice(i, 1);
                continue;
            }

            if (b.life <= 0) {
                this.bullets.splice(i, 1);
            }
        }
    },

    // Get melee damage (handles combo crit)
    getMeleeDamage() {
        let dmg = this.weapon.damage;
        if (this.weapon.special === 'combo_crit' && this.comboCount >= 3) {
            dmg *= 2;
            this.comboCount = 0;
        }
        return dmg;
    },

    takeDamage(amount, fromX, fromY) {
        if (this.invulnTimer > 0 || this.isDodging) return;
        this.hp -= amount;
        this.invulnTimer = 0.5;
        Combat.spawnDamageNumber(this.x, this.y - 16, amount, '#ff4444');
        Renderer.doShake(4, 0.15);
        Renderer.spawnBurst(this.x, this.y, 6, '#ff4444', 50, 2, 0.3);
        if (fromX !== undefined) {
            Combat.applyKnockback(this, fromX, fromY, 150);
        }
    },

    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
        Combat.spawnDamageNumber(this.x, this.y - 16, '+' + amount, '#44ff44');
    },

    _clampPosition() {
        // Keep within island bounds
        const T = Island.TILE;
        this.x = Math.max(T, Math.min(Island.pixelWidth() - T, this.x));
        this.y = Math.max(T, Math.min(Island.pixelHeight() - T, this.y));

        // Push out of walls
        if (!Island.isWalkable(this.x, this.y)) {
            // Try to find nearest walkable spot
            for (let r = 1; r <= 3; r++) {
                for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) {
                    if (Island.isWalkable(this.x + dx * T, this.y + dy * T)) {
                        this.x += dx * T;
                        this.y += dy * T;
                        return;
                    }
                }
            }
        }
    },

    draw(ctx, frame) {
        // Invulnerability flash
        if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 10) % 2 === 0) return;

        Sprites.drawPlayer(ctx, this.x, this.y, this.facing, frame,
            this.isDodging,
            this.attackTimer > 0 ? this.attackTimer / this.attackDuration : 0
        );
    },

    drawBullets(ctx) {
        for (const b of this.bullets) {
            Sprites.drawBullet(ctx, b.x, b.y);
        }
    },

    isAlive() {
        return this.hp > 0;
    }
};
