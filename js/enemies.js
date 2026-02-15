// ============================================================
//  ENEMIES — AI, behaviors, spawning
// ============================================================
const Enemies = {
    list: [],
    bulletList: [],

    reset() {
        this.list = [];
        this.bulletList = [];
    },

    // Spawn enemies based on island enemy spawns
    spawnForIsland(difficulty, isBoss) {
        this.reset();

        if (isBoss) {
            // Boss node — spawn the boss
            this.spawnBoss(Island.exitX, Island.exitY - 30);
            // Some adds
            for (let i = 0; i < 2; i++) {
                this.spawn('pirate_melee',
                    Island.exitX + (i === 0 ? -40 : 40),
                    Island.exitY - 20,
                    difficulty);
            }
            return;
        }

        for (const sp of Island.enemySpawns) {
            // Pick enemy type
            const roll = Math.random();
            let type;
            if (roll < 0.4) type = 'crab';
            else if (roll < 0.75) type = 'pirate_melee';
            else type = 'pirate_ranged';

            this.spawn(type, sp.x, sp.y, difficulty);
        }
    },

    spawn(type, x, y, difficulty) {
        const base = {
            x, y, type,
            vx: 0, vy: 0,
            facing: 1,
            frame: Math.random() * 100,
            state: 'idle', // idle, chase, attack, flee, dead
            stateTimer: 0,
            aggroRange: 120 + difficulty * 10,
            attackRange: 24,
            attackCooldown: 0,
            attackDuration: 0.3,
            attackTimer: 0,
            knockbackVX: 0, knockbackVY: 0, knockbackTimer: 0,
            radius: 7,
            isBoss: false,
        };

        switch (type) {
            case 'crab':
                Object.assign(base, {
                    hp: 20 + difficulty * 5, maxHp: 20 + difficulty * 5,
                    speed: 40 + difficulty * 3,
                    damage: 8 + difficulty * 2,
                    attackRange: 18,
                    attackCooldownMax: 1.2,
                    xpValue: 5,
                });
                break;
            case 'pirate_melee':
                Object.assign(base, {
                    hp: 30 + difficulty * 8, maxHp: 30 + difficulty * 8,
                    speed: 55 + difficulty * 4,
                    damage: 10 + difficulty * 3,
                    attackRange: 26,
                    attackCooldownMax: 0.9,
                    xpValue: 10,
                });
                break;
            case 'pirate_ranged':
                Object.assign(base, {
                    hp: 20 + difficulty * 5, maxHp: 20 + difficulty * 5,
                    speed: 45 + difficulty * 3,
                    damage: 12 + difficulty * 2,
                    attackRange: 130,
                    fleeRange: 60,
                    shootCooldownMax: 1.5,
                    shootCooldown: 0,
                    xpValue: 12,
                });
                break;
        }

        this.list.push(base);
    },

    spawnBoss(x, y) {
        this.list.push({
            x, y, type: 'boss',
            vx: 0, vy: 0,
            facing: 1,
            frame: 0,
            state: 'idle',
            stateTimer: 0,
            aggroRange: 200,
            attackRange: 35,
            attackCooldown: 0,
            attackCooldownMax: 0.7,
            attackDuration: 0.4,
            attackTimer: 0,
            knockbackVX: 0, knockbackVY: 0, knockbackTimer: 0,
            radius: 12,
            hp: 200, maxHp: 200,
            speed: 65,
            damage: 18,
            xpValue: 100,
            isBoss: true,
            phase: 1,
            phaseTimer: 0,
            dashTimer: 0,
            dashCooldown: 0,
            summonTimer: 0,
        });
    },

    update(dt) {
        for (const e of this.list) {
            if (e.state === 'dead') continue;
            e.frame += dt * 60;

            // Knockback
            if (e.knockbackTimer > 0) {
                e.knockbackTimer -= dt;
                e.x += e.knockbackVX * dt;
                e.y += e.knockbackVY * dt;
                e.knockbackVX *= 0.9;
                e.knockbackVY *= 0.9;
                this._clampEnemy(e);
                continue;
            }

            if (e.attackTimer > 0) e.attackTimer -= dt;
            if (e.attackCooldown > 0) e.attackCooldown -= dt;

            // Bleed damage
            if (e.bleedTimer > 0) {
                e.bleedTimer -= dt;
                e.hp -= (e.bleedDps || 0) * dt;
                if (e.hp <= 0) {
                    e.state = 'dead';
                    Loot.spawnEnemyDrop(e.x, e.y);
                    Renderer.spawnBurst(e.x, e.y, 8, '#ff4444', 60, 3, 0.4);
                    Player.kills++;
                    continue;
                }
            }

            const distToPlayer = Combat.distance(e.x, e.y, Player.x, Player.y);

            if (e.isBoss) {
                this._updateBoss(e, dt, distToPlayer);
            } else {
                this._updateNormal(e, dt, distToPlayer);
            }
        }

        // Update enemy bullets
        for (let i = this.bulletList.length - 1; i >= 0; i--) {
            const b = this.bulletList[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;
            if (!Island.isWalkable(b.x, b.y) || b.life <= 0) {
                this.bulletList.splice(i, 1);
                continue;
            }
            // Hit player
            if (Combat.circleCollide(b.x, b.y, 3, Player.x, Player.y, Player.radius)) {
                Player.takeDamage(b.damage, b.x, b.y);
                this.bulletList.splice(i, 1);
            }
        }
    },

    _updateNormal(e, dt, distToPlayer) {
        switch (e.state) {
            case 'idle':
                if (distToPlayer < e.aggroRange) {
                    e.state = 'chase';
                }
                break;

            case 'chase':
                if (distToPlayer > e.aggroRange * 1.5) {
                    e.state = 'idle';
                    break;
                }

                // Ranged enemies flee if too close
                if (e.type === 'pirate_ranged' && distToPlayer < (e.fleeRange || 50)) {
                    e.state = 'flee';
                    e.stateTimer = 0.8;
                    break;
                }

                // Move toward player
                if (distToPlayer > e.attackRange) {
                    const dir = Combat.direction(e.x, e.y, Player.x, Player.y);
                    e.x += dir.x * e.speed * dt;
                    e.y += dir.y * e.speed * dt;
                    e.facing = dir.x >= 0 ? 1 : -1;
                    this._clampEnemy(e);
                } else {
                    // Attack
                    if (e.type === 'pirate_ranged') {
                        if ((e.shootCooldown || 0) <= 0) {
                            this._enemyShoot(e);
                            e.shootCooldown = e.shootCooldownMax;
                        } else {
                            e.shootCooldown -= dt;
                        }
                    } else {
                        if (e.attackCooldown <= 0) {
                            e.state = 'attack';
                            e.attackTimer = e.attackDuration;
                            e.attackCooldown = e.attackCooldownMax;
                        }
                    }
                }
                break;

            case 'attack':
                if (e.attackTimer <= 0) {
                    // Deal damage
                    if (distToPlayer < e.attackRange + Player.radius) {
                        Player.takeDamage(e.damage, e.x, e.y);
                    }
                    e.state = 'chase';
                }
                break;

            case 'flee':
                e.stateTimer -= dt;
                const awayDir = Combat.direction(Player.x, Player.y, e.x, e.y);
                e.x += awayDir.x * e.speed * 1.2 * dt;
                e.y += awayDir.y * e.speed * 1.2 * dt;
                e.facing = awayDir.x >= 0 ? 1 : -1;
                this._clampEnemy(e);

                if (e.stateTimer <= 0) {
                    e.state = 'chase';
                }

                // Shoot while fleeing
                if (e.type === 'pirate_ranged') {
                    if ((e.shootCooldown || 0) <= 0) {
                        this._enemyShoot(e);
                        e.shootCooldown = e.shootCooldownMax;
                    } else {
                        e.shootCooldown -= dt;
                    }
                }
                break;
        }
    },

    _updateBoss(e, dt, distToPlayer) {
        // Phase transitions
        if (e.hp < e.maxHp * 0.6 && e.phase < 2) {
            e.phase = 2;
            e.speed = 80;
            // Summon adds
            this.spawn('pirate_melee', e.x - 40, e.y + 20, 2);
            this.spawn('pirate_melee', e.x + 40, e.y + 20, 2);
            Renderer.doShake(6, 0.4);
            Renderer.spawnBurst(e.x, e.y, 15, '#ff4400', 80, 3, 0.5);
        }
        if (e.hp < e.maxHp * 0.25 && e.phase < 3) {
            e.phase = 3;
            e.speed = 100;
            e.damage = 25;
            e.attackCooldownMax = 0.5;
            Renderer.doShake(8, 0.5);
            Renderer.spawnBurst(e.x, e.y, 20, '#8800ff', 100, 4, 0.6);
        }

        // Boss AI
        e.summonTimer -= dt;
        e.dashCooldown -= dt;

        if (e.state === 'idle') {
            if (distToPlayer < e.aggroRange) e.state = 'chase';
            return;
        }

        // Phase 3: shadow dash
        if (e.phase >= 3 && e.dashCooldown <= 0 && distToPlayer > 50 && distToPlayer < 150) {
            const dir = Combat.direction(e.x, e.y, Player.x, Player.y);
            e.x += dir.x * 200;
            e.y += dir.y * 200;
            this._clampEnemy(e);
            e.dashCooldown = 2.5;
            Renderer.spawnBurst(e.x, e.y, 10, '#8800ff', 60, 3, 0.4);
            return;
        }

        // Chase and attack
        if (distToPlayer > e.attackRange) {
            const dir = Combat.direction(e.x, e.y, Player.x, Player.y);
            e.x += dir.x * e.speed * dt;
            e.y += dir.y * e.speed * dt;
            e.facing = dir.x >= 0 ? 1 : -1;
            this._clampEnemy(e);
        } else if (e.attackCooldown <= 0) {
            e.attackTimer = e.attackDuration;
            e.attackCooldown = e.attackCooldownMax;
            // Wide attack
            if (distToPlayer < e.attackRange + Player.radius + 10) {
                Player.takeDamage(e.damage, e.x, e.y);
                Renderer.doShake(3, 0.15);
            }
        }

        // Phase 2+: periodic summon
        if (e.phase >= 2 && e.summonTimer <= 0) {
            e.summonTimer = 8;
            const activeCount = this.list.filter(en => en.state !== 'dead' && !en.isBoss).length;
            if (activeCount < 4) {
                this.spawn('pirate_melee', e.x + (Math.random() - 0.5) * 60, e.y + 30, 2);
            }
        }
    },

    _enemyShoot(e) {
        const dir = Combat.direction(e.x, e.y, Player.x, Player.y);
        this.bulletList.push({
            x: e.x + dir.x * 8,
            y: e.y + dir.y * 8,
            vx: dir.x * 180,
            vy: dir.y * 180,
            damage: e.damage,
            life: 1.2
        });
    },

    _clampEnemy(e) {
        if (!Island.isWalkable(e.x, e.y)) {
            // Push back
            e.x -= e.knockbackVX * 0.02;
            e.y -= e.knockbackVY * 0.02;
        }
        e.x = Math.max(Island.TILE, Math.min(Island.pixelWidth() - Island.TILE, e.x));
        e.y = Math.max(Island.TILE, Math.min(Island.pixelHeight() - Island.TILE, e.y));
    },

    // Take damage from player
    hitEnemy(index, damage, fromX, fromY, knockbackForce) {
        const e = this.list[index];
        if (!e || e.state === 'dead') return;

        e.hp -= damage;
        Combat.spawnDamageNumber(e.x, e.y - 12, damage, '#ffffff');
        Combat.applyKnockback(e, fromX, fromY, knockbackForce || 100);
        Renderer.spawnBurst(e.x, e.y, 4, '#ff8844', 40, 2, 0.2);

        if (e.hp <= 0) {
            e.state = 'dead';
            Loot.spawnEnemyDrop(e.x, e.y);
            Renderer.spawnBurst(e.x, e.y, 8, '#ff4444', 60, 3, 0.4);
            Player.kills++;
            return true; // killed
        }

        // Aggro
        if (e.state === 'idle') e.state = 'chase';
        return false;
    },

    // Check player melee hits
    checkPlayerMelee() {
        if (Player.attackTimer <= 0 || Player.hasHitThisSwing) return;

        const damage = Player.getMeleeDamage();
        const range = Player.weapon.range;

        for (let i = 0; i < this.list.length; i++) {
            const e = this.list[i];
            if (e.state === 'dead') continue;

            if (Combat.meleeHitCheck(Player.x, Player.y, Player.facing, range, 120, e.x, e.y, e.radius)) {
                let knockback = 100;
                if (Player.weapon.special === 'knockback') knockback = 200;

                const killed = this.hitEnemy(i, damage, Player.x, Player.y, knockback);
                Player.hasHitThisSwing = true;

                // Bleed special
                if (Player.weapon.special === 'bleed' && !killed) {
                    e.bleedTimer = 2;
                    e.bleedDps = 3;
                }

                Renderer.doShake(3, 0.1);
                break; // only hit one per swing
            }
        }
    },

    // Check player bullet hits
    checkPlayerBullets() {
        for (let bi = Player.bullets.length - 1; bi >= 0; bi--) {
            const b = Player.bullets[bi];
            for (let ei = 0; ei < this.list.length; ei++) {
                const e = this.list[ei];
                if (e.state === 'dead') continue;
                if (Combat.circleCollide(b.x, b.y, 3, e.x, e.y, e.radius)) {
                    this.hitEnemy(ei, b.damage, b.x, b.y, 60);
                    Player.bullets.splice(bi, 1);
                    break;
                }
            }
        }
    },

    // Check contact damage
    checkContactDamage() {
        for (const e of this.list) {
            if (e.state === 'dead') continue;
            if (e.type === 'crab' && Combat.circleCollide(e.x, e.y, e.radius, Player.x, Player.y, Player.radius)) {
                Player.takeDamage(Math.floor(e.damage * 0.5), e.x, e.y);
            }
        }
    },

    draw(ctx, frame) {
        for (const e of this.list) {
            if (e.state === 'dead') continue;

            switch (e.type) {
                case 'crab':
                    Sprites.drawCrab(ctx, e.x, e.y, e.frame, e.hp, e.maxHp);
                    break;
                case 'pirate_melee':
                    Sprites.drawPirateMelee(ctx, e.x, e.y, e.facing, e.frame, e.hp, e.maxHp,
                        e.attackTimer > 0 ? e.attackTimer / e.attackDuration : 0);
                    break;
                case 'pirate_ranged':
                    Sprites.drawPirateRanged(ctx, e.x, e.y, e.facing, e.frame, e.hp, e.maxHp);
                    break;
                case 'boss':
                    Sprites.drawBoss(ctx, e.x, e.y, e.facing, e.frame, e.hp, e.maxHp, e.phase);
                    break;
            }

            // Bleed indicator (visual only)
            if (e.bleedTimer > 0) {
                Renderer.spawnParticle(e.x + (Math.random() - 0.5) * 6, e.y,
                    0, -15, '#cc0000', 2, 0.3);
            }
        }

        // Enemy bullets
        for (const b of this.bulletList) {
            Sprites.drawEnemyBullet(ctx, b.x, b.y);
        }
    },

    // Count alive enemies
    aliveCount() {
        return this.list.filter(e => e.state !== 'dead').length;
    },

    // Check if boss is dead
    bossDefeated() {
        const boss = this.list.find(e => e.isBoss);
        return boss && boss.state === 'dead';
    }
};
