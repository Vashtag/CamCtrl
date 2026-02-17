// ============================================================
//  SEA — Procedural open-world sea with nautical chart rendering
//  Replaces old node-based GameMap
// ============================================================
const GameMap = {
    // World size in pixels
    WORLD_W: 3200,
    WORLD_H: 2400,
    CELL: 16, // chart grid cell size

    // Procedural data
    seed: 0,
    landMask: null,   // 2D bool array — true = land
    depthMap: null,    // 2D float — 0=deep, 1=shore
    explored: null,    // 2D bool — fog of war
    GRID_W: 0,
    GRID_H: 0,

    // Points of interest
    pois: [],
    contracts: [],
    enemyShips: [],
    cannonballs: [],
    portX: 0, portY: 0,

    // Nautical chart palette
    INK: '#3a2a1a',
    INK_LIGHT: '#6a5a4a',
    INK_FAINT: '#9a8a7a',
    PARCHMENT: '#e8d5a3',
    PARCHMENT_DARK: '#d4c090',
    PARCHMENT_STAIN: '#c8b080',
    LAND_FILL: '#c8b888',
    LAND_DARK: '#a89868',
    SHALLOWS: '#d0c898',
    DEEP: '#c0b080',
    GRID_COL: 'rgba(58,42,26,0.08)',
    COMPASS_COL: '#5a3a1a',

    // Fog
    fogRevealRadius: 100,

    // Wind
    windAngle: 0,
    windSpeed: 0.3,
    windTimer: 0,

    // Trail
    trail: [],
    trailTimer: 0,

    generate() {
        this.seed = Math.random() * 99999;
        this.GRID_W = Math.ceil(this.WORLD_W / this.CELL);
        this.GRID_H = Math.ceil(this.WORLD_H / this.CELL);
        this.landMask = Array.from({ length: this.GRID_H }, () => Array(this.GRID_W).fill(false));
        this.depthMap = Array.from({ length: this.GRID_H }, () => Array(this.GRID_W).fill(0));
        this.explored = Array.from({ length: this.GRID_H }, () => Array(this.GRID_W).fill(false));
        this.pois = [];
        this.contracts = [];
        this.enemyShips = [];
        this.cannonballs = [];
        this.trail = [];
        this.windAngle = Math.random() * Math.PI * 2;
        this.windSpeed = 0.25 + Math.random() * 0.2;

        // Generate islands using noise
        const islandCenters = [];
        const numIslands = 8 + Math.floor(Math.random() * 5);
        const margin = 200;

        for (let i = 0; i < numIslands * 3 && islandCenters.length < numIslands; i++) {
            const ix = margin + Math.random() * (this.WORLD_W - margin * 2);
            const iy = margin + Math.random() * (this.WORLD_H - margin * 2);
            // Don't overlap port area (center bottom)
            if (ix > this.WORLD_W / 2 - 150 && ix < this.WORLD_W / 2 + 150 &&
                iy > this.WORLD_H - 400) continue;
            // Don't overlap existing islands
            let tooClose = false;
            for (const c of islandCenters) {
                if (Math.sqrt((c.x - ix) ** 2 + (c.y - iy) ** 2) < 250) { tooClose = true; break; }
            }
            if (tooClose) continue;
            islandCenters.push({
                x: ix, y: iy,
                rx: 60 + Math.random() * 80,
                ry: 50 + Math.random() * 60,
                noiseSeed: Math.random() * 1000
            });
        }

        // Rasterize islands into landMask
        for (let gy = 0; gy < this.GRID_H; gy++) {
            for (let gx = 0; gx < this.GRID_W; gx++) {
                const wx = gx * this.CELL + this.CELL / 2;
                const wy = gy * this.CELL + this.CELL / 2;
                let maxLand = 0;
                for (const isl of islandCenters) {
                    const dx = (wx - isl.x) / isl.rx;
                    const dy = (wy - isl.y) / isl.ry;
                    const dist = dx * dx + dy * dy;
                    const noise = Math.sin(wx * 0.02 + isl.noiseSeed) * 0.3 +
                                  Math.sin(wy * 0.025 + isl.noiseSeed * 2) * 0.2 +
                                  Math.sin((wx + wy) * 0.015 + isl.noiseSeed * 3) * 0.15;
                    const val = 1 - dist + noise * 0.5;
                    if (val > maxLand) maxLand = val;
                }
                if (maxLand > 0.3) {
                    this.landMask[gy][gx] = true;
                }
                this.depthMap[gy][gx] = Math.max(0, Math.min(1, maxLand));
            }
        }

        // Place port at bottom-center open water
        this.portX = this.WORLD_W / 2;
        this.portY = this.WORLD_H - 120;

        // Place POIs on each island
        for (let i = 0; i < islandCenters.length; i++) {
            const c = islandCenters[i];
            const isBossIsland = (i === 0); // first island is boss
            let type;
            if (isBossIsland) type = 'boss';
            else if (i <= 2) type = 'raid';
            else if (i <= 4) type = 'explore';
            else type = Math.random() > 0.5 ? 'raid' : 'explore';

            const names_raid = ['Skull Cove', 'Cutthroat Bay', 'Plunder Point', 'Crimson Reef', 'Dead Man\'s Isle'];
            const names_explore = ['Misty Atoll', 'Driftwood Keys', 'Tortuga Shoals', 'Serpent Rocks', 'Foghorn Isle'];
            const nameList = type === 'raid' ? names_raid : names_explore;

            this.pois.push({
                x: c.x, y: c.y,
                type: type,
                name: type === 'boss' ? 'Blacktide Fortress' : nameList[i % nameList.length],
                difficulty: type === 'boss' ? 5 : 1 + Math.floor(i / 2),
                visited: false,
                cleared: false,
                radius: Math.min(c.rx, c.ry) * 0.6,
                islandIdx: i,
            });
        }

        // Reefs / hazards (small patches of land in open water)
        for (let i = 0; i < 12; i++) {
            const rx = 100 + Math.random() * (this.WORLD_W - 200);
            const ry = 100 + Math.random() * (this.WORLD_H - 200);
            const gx = Math.floor(rx / this.CELL);
            const gy = Math.floor(ry / this.CELL);
            if (gx > 0 && gy > 0 && gx < this.GRID_W - 1 && gy < this.GRID_H - 1) {
                if (!this.landMask[gy][gx]) {
                    this.depthMap[gy][gx] = 0.25; // shallow
                }
            }
        }

        // Generate contracts
        this._generateContracts();

        // Place enemy ships
        this._spawnEnemyShips();

        // Start position
        Ship.x = this.portX;
        Ship.y = this.portY + 30;
        Ship.angle = -Math.PI / 2;
        Ship.velX = 0;
        Ship.velY = 0;

        // Reveal area around port
        this._revealFog(this.portX, this.portY, 180);
    },

    _generateContracts() {
        this.contracts = [];
        const types = ['bounty', 'delivery', 'salvage'];
        const poiTargets = this.pois.filter(p => p.type !== 'boss' && !p.cleared);

        for (let i = 0; i < Math.min(3, poiTargets.length); i++) {
            const target = poiTargets[i];
            const ctype = types[i % types.length];
            let desc, reward;
            switch (ctype) {
                case 'bounty':
                    desc = 'Clear enemies at ' + target.name;
                    reward = 30 + target.difficulty * 15;
                    break;
                case 'delivery':
                    desc = 'Scout ' + target.name;
                    reward = 20 + target.difficulty * 10;
                    break;
                case 'salvage':
                    desc = 'Raid the ruins of ' + target.name;
                    reward = 40 + target.difficulty * 12;
                    break;
            }
            this.contracts.push({
                type: ctype,
                desc: desc,
                targetPoi: target,
                reward: reward,
                accepted: false,
                completed: false,
            });
        }
    },

    _spawnEnemyShips() {
        this.enemyShips = [];
        const count = 4 + Math.floor(Ship.islandsCleared * 0.5);
        for (let i = 0; i < count; i++) {
            let ex, ey, attempts = 0;
            do {
                ex = 200 + Math.random() * (this.WORLD_W - 400);
                ey = 200 + Math.random() * (this.WORLD_H - 400);
                attempts++;
            } while (this._isLand(ex, ey) && attempts < 20);

            this.enemyShips.push({
                x: ex, y: ey,
                angle: Math.random() * Math.PI * 2,
                speed: 30 + Math.random() * 20,
                hp: 40 + Ship.islandsCleared * 10,
                maxHp: 40 + Ship.islandsCleared * 10,
                damage: 8 + Ship.islandsCleared * 3,
                fireCooldown: 0,
                fireRate: 2.5,
                state: 'patrol', // patrol, chase, dead
                patrolAngle: Math.random() * Math.PI * 2,
                patrolTimer: 2 + Math.random() * 4,
                aggroRange: 180,
                radius: 10,
                name: ['Navy Sloop', 'Pirate Brig', 'Ghost Ship', 'Corsair'][i % 4],
                sinking: 0,
                goldValue: 15 + Math.floor(Math.random() * 20),
            });
        }
    },

    _isLand(px, py) {
        const gx = Math.floor(px / this.CELL);
        const gy = Math.floor(py / this.CELL);
        if (gx < 0 || gy < 0 || gx >= this.GRID_W || gy >= this.GRID_H) return true;
        return this.landMask[gy][gx];
    },

    _getDepth(px, py) {
        const gx = Math.floor(px / this.CELL);
        const gy = Math.floor(py / this.CELL);
        if (gx < 0 || gy < 0 || gx >= this.GRID_W || gy >= this.GRID_H) return 0;
        return this.depthMap[gy][gx];
    },

    _isExplored(px, py) {
        const gx = Math.floor(px / this.CELL);
        const gy = Math.floor(py / this.CELL);
        if (gx < 0 || gy < 0 || gx >= this.GRID_W || gy >= this.GRID_H) return false;
        return this.explored[gy][gx];
    },

    _revealFog(px, py, radius) {
        const r = radius + Ship.scoutRange;
        const gxMin = Math.max(0, Math.floor((px - r) / this.CELL));
        const gxMax = Math.min(this.GRID_W - 1, Math.floor((px + r) / this.CELL));
        const gyMin = Math.max(0, Math.floor((py - r) / this.CELL));
        const gyMax = Math.min(this.GRID_H - 1, Math.floor((py + r) / this.CELL));
        for (let gy = gyMin; gy <= gyMax; gy++) {
            for (let gx = gxMin; gx <= gxMax; gx++) {
                const wx = gx * this.CELL + this.CELL / 2;
                const wy = gy * this.CELL + this.CELL / 2;
                const dx = wx - px, dy = wy - py;
                if (dx * dx + dy * dy < r * r) {
                    this.explored[gy][gx] = true;
                }
            }
        }
    },

    // ---- UPDATE ----
    update(dt) {
        // Wind shifts slowly
        this.windTimer += dt;
        if (this.windTimer > 15) {
            this.windTimer = 0;
            this.windAngle += (Math.random() - 0.5) * 0.8;
            this.windSpeed = 0.2 + Math.random() * 0.3;
        }

        // Ship movement
        Ship.updateSailing(dt);

        // Wind boost — faster if sailing with wind
        const windAlign = Math.cos(Ship.angle - this.windAngle);
        if (windAlign > 0 && (Input.isDown('KeyW') || Input.isDown('ArrowUp'))) {
            Ship.velX += Math.cos(Ship.angle) * windAlign * this.windSpeed * 20 * dt;
            Ship.velY += Math.sin(Ship.angle) * windAlign * this.windSpeed * 20 * dt;
        }

        // Clamp to world bounds
        Ship.x = Math.max(20, Math.min(this.WORLD_W - 20, Ship.x));
        Ship.y = Math.max(20, Math.min(this.WORLD_H - 20, Ship.y));

        // Land collision — push ship out
        if (this._isLand(Ship.x, Ship.y)) {
            Ship.velX *= -0.5;
            Ship.velY *= -0.5;
            Ship.x -= Ship.velX * dt * 3;
            Ship.y -= Ship.velY * dt * 3;
            // Slight hull dmg
            if (Ship.currentSpeed() > 20) {
                Ship.takeDamage(1);
            }
        }

        // Reveal fog
        this._revealFog(Ship.x, Ship.y, this.fogRevealRadius);

        // Trail
        this.trailTimer += dt;
        if (this.trailTimer > 0.3 && Ship.currentSpeed() > 5) {
            this.trailTimer = 0;
            this.trail.push({ x: Ship.x, y: Ship.y });
            if (this.trail.length > 200) this.trail.shift();
        }

        // Cannon fire
        if (Input.mouse.leftClick) {
            const shot = Ship.fireBroadside('right');
            if (shot) this._fireCannonball(shot);
        }
        if (Input.mouse.rightClick) {
            const shot = Ship.fireBroadside('left');
            if (shot) this._fireCannonball(shot);
        }

        // Update cannonballs
        this._updateCannonballs(dt);

        // Update enemy ships
        this._updateEnemyShips(dt);

        // Check POI proximity
        const nearPoi = this._getNearPoi();

        // Check port proximity
        const nearPort = Combat.distance(Ship.x, Ship.y, this.portX, this.portY) < 40;

        // Return events for main.js
        // Dock at port
        if (nearPort && Input.isDown('KeyE')) {
            return { event: 'dock' };
        }

        // Land on island
        if (nearPoi && !nearPoi.cleared && Input.isDown('KeyE')) {
            return { event: 'land', poi: nearPoi };
        }

        // Ship death
        if (!Ship.isAlive()) {
            return { event: 'sunk' };
        }

        return null;
    },

    _fireCannonball(shot) {
        this.cannonballs.push({
            x: shot.x, y: shot.y,
            vx: shot.dirX * 250 + Ship.velX * 0.3,
            vy: shot.dirY * 250 + Ship.velY * 0.3,
            damage: shot.damage,
            range: shot.range,
            aoe: shot.aoe,
            life: shot.range / 250,
            friendly: true,
        });
        Renderer.doShake(2, 0.1);
    },

    _updateCannonballs(dt) {
        for (let i = this.cannonballs.length - 1; i >= 0; i--) {
            const b = this.cannonballs[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;

            if (b.life <= 0 || this._isLand(b.x, b.y)) {
                // Splash
                Renderer.spawnBurst(b.x, b.y, 3, this.INK_LIGHT, 20, 2, 0.3);
                this.cannonballs.splice(i, 1);
                continue;
            }

            if (b.friendly) {
                // Hit enemy ships
                for (const es of this.enemyShips) {
                    if (es.state === 'dead') continue;
                    if (Combat.distance(b.x, b.y, es.x, es.y) < es.radius + 4) {
                        es.hp -= b.damage;
                        Combat.spawnDamageNumber(es.x, es.y - 15, b.damage, '#3a2a1a');
                        Renderer.spawnBurst(es.x, es.y, 5, '#5a3a1a', 30, 2, 0.3);
                        Renderer.doShake(2, 0.1);
                        if (b.aoe) {
                            // AoE hit nearby enemies too
                            for (const es2 of this.enemyShips) {
                                if (es2 === es || es2.state === 'dead') continue;
                                if (Combat.distance(b.x, b.y, es2.x, es2.y) < 40) {
                                    es2.hp -= Math.floor(b.damage * 0.5);
                                }
                            }
                        }
                        if (es.hp <= 0) {
                            es.state = 'dead';
                            es.sinking = 1.5;
                            Player.gold += Math.floor(es.goldValue * (1 + Ship.goldBonus));
                            Combat.spawnDamageNumber(es.x, es.y - 25, '+' + es.goldValue + 'g', '#8a7a3a');
                        } else if (es.state === 'patrol') {
                            es.state = 'chase';
                        }
                        this.cannonballs.splice(i, 1);
                        break;
                    }
                }
            } else {
                // Hit player ship
                if (Combat.distance(b.x, b.y, Ship.x, Ship.y) < 14) {
                    Ship.takeDamage(b.damage);
                    Combat.spawnDamageNumber(Ship.x, Ship.y - 15, b.damage, '#8a2a1a');
                    Renderer.spawnBurst(Ship.x, Ship.y, 4, '#5a3a1a', 30, 2, 0.3);
                    this.cannonballs.splice(i, 1);
                }
            }
        }
    },

    _updateEnemyShips(dt) {
        for (const es of this.enemyShips) {
            if (es.state === 'dead') {
                es.sinking -= dt;
                continue;
            }

            es.fireCooldown -= dt;
            const dist = Combat.distance(es.x, es.y, Ship.x, Ship.y);

            if (es.state === 'patrol') {
                es.patrolTimer -= dt;
                if (es.patrolTimer <= 0) {
                    es.patrolAngle += (Math.random() - 0.5) * 1.5;
                    es.patrolTimer = 2 + Math.random() * 3;
                }
                es.x += Math.cos(es.patrolAngle) * es.speed * 0.5 * dt;
                es.y += Math.sin(es.patrolAngle) * es.speed * 0.5 * dt;
                es.angle = es.patrolAngle;

                // Land avoidance
                if (this._isLand(es.x + Math.cos(es.angle) * 20, es.y + Math.sin(es.angle) * 20)) {
                    es.patrolAngle += Math.PI * 0.7;
                    es.angle = es.patrolAngle;
                }

                // Aggro check (only if explored / visible to player)
                if (dist < es.aggroRange && this._isExplored(es.x, es.y)) {
                    es.state = 'chase';
                }
            }

            if (es.state === 'chase') {
                const dir = Combat.direction(es.x, es.y, Ship.x, Ship.y);
                const targetAngle = Math.atan2(dir.y, dir.x);

                // Smooth turn
                let angleDiff = targetAngle - es.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                es.angle += angleDiff * 2 * dt;

                es.x += Math.cos(es.angle) * es.speed * dt;
                es.y += Math.sin(es.angle) * es.speed * dt;

                // Land avoidance
                if (this._isLand(es.x, es.y)) {
                    es.x -= Math.cos(es.angle) * es.speed * dt * 2;
                    es.y -= Math.sin(es.angle) * es.speed * dt * 2;
                    es.angle += Math.PI * 0.5;
                }

                // Fire at player
                if (dist < 130 && es.fireCooldown <= 0) {
                    es.fireCooldown = es.fireRate;
                    const perpAngle = es.angle + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
                    this.cannonballs.push({
                        x: es.x + Math.cos(perpAngle) * 8,
                        y: es.y + Math.sin(perpAngle) * 8,
                        vx: dir.x * 180,
                        vy: dir.y * 180,
                        damage: es.damage,
                        range: 130,
                        life: 0.8,
                        friendly: false,
                    });
                }

                // Ram damage
                if (Ship.ramDamage > 0 && dist < 14) {
                    es.hp -= Ship.ramDamage;
                    Ship.takeDamage(5);
                    Combat.spawnDamageNumber(es.x, es.y - 10, Ship.ramDamage, '#3a2a1a');
                    Renderer.doShake(4, 0.2);
                    if (es.hp <= 0) {
                        es.state = 'dead';
                        es.sinking = 1.5;
                        Player.gold += Math.floor(es.goldValue * (1 + Ship.goldBonus));
                    }
                }

                // De-aggro
                if (dist > es.aggroRange * 2) {
                    es.state = 'patrol';
                    es.patrolAngle = es.angle;
                }
            }

            // Keep in bounds
            es.x = Math.max(20, Math.min(this.WORLD_W - 20, es.x));
            es.y = Math.max(20, Math.min(this.WORLD_H - 20, es.y));
        }

        // Remove fully sunk ships
        this.enemyShips = this.enemyShips.filter(e => e.state !== 'dead' || e.sinking > 0);
    },

    _getNearPoi() {
        for (const poi of this.pois) {
            const dist = Combat.distance(Ship.x, Ship.y, poi.x, poi.y);
            if (dist < poi.radius + 30) return poi;
        }
        return null;
    },

    // Mark a POI as cleared (called after island combat)
    markCleared(poi) {
        poi.cleared = true;
        poi.visited = true;
        // Complete contracts
        for (const c of this.contracts) {
            if (c.accepted && c.targetPoi === poi && !c.completed) {
                c.completed = true;
                Player.gold += Math.floor(c.reward * (1 + Ship.goldBonus));
                Combat.spawnDamageNumber(Ship.x, Ship.y - 20, '+' + c.reward + 'g', '#8a7a3a');
            }
        }
    },

    // ---- DRAW ----
    draw(ctx, frame) {
        const W = Renderer.W;
        const H = Renderer.H;
        const camX = Renderer.cam.x;
        const camY = Renderer.cam.y;

        // Parchment base
        ctx.fillStyle = this.PARCHMENT;
        ctx.fillRect(0, 0, W, H);

        // Parchment stain textures (subtle)
        this._drawParchmentTexture(ctx, camX, camY, W, H);

        // Grid lines
        this._drawGridLines(ctx, camX, camY, W, H);

        // Depth contours and land
        this._drawChartTerrain(ctx, camX, camY, W, H, frame);

        // Trail (dotted line)
        this._drawTrail(ctx, camX, camY);

        // POIs
        this._drawPOIs(ctx, camX, camY, frame);

        // Port
        this._drawPort(ctx, camX, camY, frame);

        // Enemy ships
        this._drawEnemyShips(ctx, camX, camY, frame);

        // Cannonballs
        for (const b of this.cannonballs) {
            const sx = b.x - camX, sy = b.y - camY;
            if (sx < -10 || sy < -10 || sx > W + 10 || sy > H + 10) continue;
            ctx.fillStyle = b.friendly ? this.INK : '#8a3a1a';
            ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
        }

        // Player ship
        this._drawPlayerShip(ctx, camX, camY, frame);

        // Fog of war
        this._drawFog(ctx, camX, camY, W, H);

        // Compass rose (fixed UI)
        this._drawCompassRose(ctx, W - 60, 60, 40);

        // Wind indicator
        this._drawWindIndicator(ctx, W - 60, 120, frame);

        // Interaction prompts
        this._drawPrompts(ctx, W, H, frame);

        // Ship HUD
        this._drawShipHUD(ctx, W, H);

        // Damage numbers
        ctx.save();
        ctx.translate(-camX, -camY);
        Combat.drawDamageNumbers(ctx);
        ctx.restore();
    },

    _drawParchmentTexture(ctx, camX, camY, W, H) {
        // Subtle stain circles
        ctx.save();
        ctx.globalAlpha = 0.04;
        const stains = [
            { x: 200, y: 150, r: 100 },
            { x: 500, y: 350, r: 80 },
            { x: 100, y: 400, r: 120 },
        ];
        for (const s of stains) {
            ctx.fillStyle = '#8a6a3a';
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        // Edge darkening
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(0, 0, W, 6);
        ctx.fillRect(0, H - 6, W, 6);
        ctx.fillRect(0, 0, 6, H);
        ctx.fillRect(W - 6, 0, 6, H);
        ctx.restore();
    },

    _drawGridLines(ctx, camX, camY, W, H) {
        ctx.strokeStyle = this.GRID_COL;
        ctx.lineWidth = 1;
        const spacing = 100;

        const startX = Math.floor(camX / spacing) * spacing;
        const startY = Math.floor(camY / spacing) * spacing;

        for (let x = startX; x < camX + W + spacing; x += spacing) {
            const sx = x - camX;
            ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke();
        }
        for (let y = startY; y < camY + H + spacing; y += spacing) {
            const sy = y - camY;
            ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
        }
    },

    _drawChartTerrain(ctx, camX, camY, W, H, frame) {
        const C = this.CELL;
        const gxStart = Math.max(0, Math.floor(camX / C) - 1);
        const gyStart = Math.max(0, Math.floor(camY / C) - 1);
        const gxEnd = Math.min(this.GRID_W, Math.ceil((camX + W) / C) + 1);
        const gyEnd = Math.min(this.GRID_H, Math.ceil((camY + H) / C) + 1);

        for (let gy = gyStart; gy < gyEnd; gy++) {
            for (let gx = gxStart; gx < gxEnd; gx++) {
                const sx = gx * C - camX;
                const sy = gy * C - camY;
                const depth = this.depthMap[gy][gx];
                const isLand = this.landMask[gy][gx];

                if (isLand) {
                    // Land fill — aged map look
                    ctx.fillStyle = this.LAND_FILL;
                    ctx.fillRect(sx, sy, C, C);

                    // Stipple texture
                    if ((gx + gy) % 3 === 0) {
                        ctx.fillStyle = this.LAND_DARK;
                        ctx.fillRect(sx + C * 0.3, sy + C * 0.4, 1, 1);
                    }
                    if ((gx * 7 + gy * 3) % 5 === 0) {
                        ctx.fillStyle = this.LAND_DARK;
                        ctx.fillRect(sx + C * 0.7, sy + C * 0.6, 1, 1);
                    }
                } else if (depth > 0.15) {
                    // Shallows — slightly tinted
                    ctx.fillStyle = this.SHALLOWS;
                    ctx.fillRect(sx, sy, C, C);
                } else if (depth > 0.05) {
                    // Depth tint
                    ctx.save();
                    ctx.globalAlpha = 0.04;
                    ctx.fillStyle = '#6a5a3a';
                    ctx.fillRect(sx, sy, C, C);
                    ctx.restore();
                }

                // Coastline edges — draw ink borders between land and water
                if (isLand) {
                    const neighbors = [
                        [gx, gy - 1], [gx + 1, gy], [gx, gy + 1], [gx - 1, gy]
                    ];
                    for (let n = 0; n < 4; n++) {
                        const [nx, ny] = neighbors[n];
                        if (nx < 0 || ny < 0 || nx >= this.GRID_W || ny >= this.GRID_H) continue;
                        if (!this.landMask[ny][nx]) {
                            ctx.strokeStyle = this.INK;
                            ctx.lineWidth = 1.5;
                            ctx.beginPath();
                            switch (n) {
                                case 0: ctx.moveTo(sx, sy); ctx.lineTo(sx + C, sy); break;
                                case 1: ctx.moveTo(sx + C, sy); ctx.lineTo(sx + C, sy + C); break;
                                case 2: ctx.moveTo(sx, sy + C); ctx.lineTo(sx + C, sy + C); break;
                                case 3: ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + C); break;
                            }
                            ctx.stroke();
                        }
                    }
                }

                // Depth contour lines (dotted)
                if (!isLand && depth > 0.08 && depth < 0.2) {
                    // Check if this is a contour boundary
                    const above = gy > 0 ? this.depthMap[gy - 1][gx] : 0;
                    const left = gx > 0 ? this.depthMap[gy][gx - 1] : 0;
                    if ((above < 0.08 && depth >= 0.08) || (left < 0.08 && depth >= 0.08)) {
                        ctx.save();
                        ctx.setLineDash([2, 3]);
                        ctx.strokeStyle = this.INK_FAINT;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(sx, sy); ctx.lineTo(sx + C, sy + C);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        ctx.restore();
                    }
                }

                // Tiny wave marks on open water
                if (!isLand && depth < 0.05 && (gx * 11 + gy * 7) % 19 === 0) {
                    ctx.save();
                    ctx.globalAlpha = 0.1;
                    ctx.strokeStyle = this.INK_FAINT;
                    ctx.lineWidth = 0.5;
                    const wx = sx + C * 0.3, wy = sy + C * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(wx, wy);
                    ctx.quadraticCurveTo(wx + 3, wy - 2, wx + 6, wy);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }
    },

    _drawTrail(ctx, camX, camY) {
        if (this.trail.length < 2) return;
        ctx.save();
        ctx.setLineDash([3, 5]);
        ctx.strokeStyle = this.INK_FAINT;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x - camX, this.trail[0].y - camY);
        for (let i = 1; i < this.trail.length; i++) {
            ctx.lineTo(this.trail[i].x - camX, this.trail[i].y - camY);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    },

    _drawPOIs(ctx, camX, camY, frame) {
        for (const poi of this.pois) {
            const sx = poi.x - camX;
            const sy = poi.y - camY;
            if (sx < -60 || sy < -60 || sx > Renderer.W + 60 || sy > Renderer.H + 60) continue;
            if (!this._isExplored(poi.x, poi.y)) continue;

            if (poi.cleared) {
                // Crossed out
                ctx.strokeStyle = this.INK_FAINT;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(sx - 8, sy - 8); ctx.lineTo(sx + 8, sy + 8);
                ctx.moveTo(sx + 8, sy - 8); ctx.lineTo(sx - 8, sy + 8);
                ctx.stroke();
                ctx.fillStyle = this.INK_FAINT;
                ctx.font = '7px "Courier New"';
                ctx.textAlign = 'center';
                ctx.fillText(poi.name, sx, sy + 16);
                continue;
            }

            // POI marker
            const pulse = Math.sin(frame * 0.05) * 0.15;
            const isBoss = poi.type === 'boss';

            // Circle marker
            ctx.save();
            if (isBoss) {
                ctx.strokeStyle = '#6a1a1a';
                ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = this.INK;
                ctx.lineWidth = 1.5;
            }
            ctx.beginPath();
            ctx.arc(sx, sy, 10 + pulse * 5, 0, Math.PI * 2);
            ctx.stroke();

            // X marks the spot
            if (poi.type === 'raid' || poi.type === 'boss') {
                ctx.strokeStyle = isBoss ? '#6a1a1a' : this.INK;
                ctx.lineWidth = isBoss ? 2.5 : 1.5;
                ctx.beginPath();
                ctx.moveTo(sx - 5, sy - 5); ctx.lineTo(sx + 5, sy + 5);
                ctx.moveTo(sx + 5, sy - 5); ctx.lineTo(sx - 5, sy + 5);
                ctx.stroke();
            } else {
                // Explore — circle dot
                ctx.fillStyle = this.INK;
                ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();

            // Label
            ctx.fillStyle = isBoss ? '#6a1a1a' : this.INK;
            ctx.font = isBoss ? 'bold 8px "Courier New"' : '7px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText(poi.name, sx, sy + 20);

            // Difficulty stars
            if (!isBoss) {
                const stars = '\u2605'.repeat(Math.min(poi.difficulty, 5));
                ctx.font = '6px "Courier New"';
                ctx.fillText(stars, sx, sy + 28);
            }

            // Proximity prompt
            const dist = Combat.distance(Ship.x, Ship.y, poi.x, poi.y);
            if (dist < poi.radius + 40 && !poi.cleared) {
                ctx.fillStyle = this.INK;
                ctx.font = 'bold 9px "Courier New"';
                ctx.fillText('[E] Land', sx, sy - 18);
            }
        }
    },

    _drawPort(ctx, camX, camY, frame) {
        const sx = this.portX - camX;
        const sy = this.portY - camY;

        // Port dock lines
        ctx.strokeStyle = this.INK;
        ctx.lineWidth = 2;
        ctx.fillStyle = this.LAND_FILL;
        ctx.fillRect(sx - 20, sy - 8, 40, 16);
        ctx.strokeRect(sx - 20, sy - 8, 40, 16);

        // Anchor symbol
        ctx.fillStyle = this.INK;
        ctx.font = 'bold 10px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('\u2693', sx, sy + 4); // anchor

        ctx.font = 'bold 8px "Courier New"';
        ctx.fillText('PORT', sx, sy + 20);

        // Proximity
        const dist = Combat.distance(Ship.x, Ship.y, this.portX, this.portY);
        if (dist < 50) {
            ctx.fillStyle = this.INK;
            ctx.font = 'bold 9px "Courier New"';
            ctx.fillText('[E] Dock', sx, sy - 16);
        }
    },

    _drawEnemyShips(ctx, camX, camY, frame) {
        for (const es of this.enemyShips) {
            if (!this._isExplored(es.x, es.y)) continue;
            const sx = es.x - camX;
            const sy = es.y - camY;
            if (sx < -30 || sy < -30 || sx > Renderer.W + 30 || sy > Renderer.H + 30) continue;

            if (es.state === 'dead') {
                // Sinking
                ctx.save();
                ctx.globalAlpha = Math.max(0, es.sinking / 1.5);
                ctx.translate(sx, sy);
                ctx.rotate(es.angle + es.sinking * 0.5);
                ctx.strokeStyle = this.INK_FAINT;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
                ctx.moveTo(0, -4); ctx.lineTo(0, 4);
                ctx.stroke();
                ctx.restore();
                continue;
            }

            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(es.angle);

            // Hull outline
            ctx.strokeStyle = es.state === 'chase' ? '#6a1a1a' : this.INK;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(-6, -5);
            ctx.lineTo(-8, 0);
            ctx.lineTo(-6, 5);
            ctx.closePath();
            ctx.stroke();

            // Fill
            ctx.fillStyle = es.state === 'chase' ? 'rgba(106,26,26,0.15)' : 'rgba(58,42,26,0.1)';
            ctx.fill();

            // Cross for hostile
            if (es.state === 'chase') {
                ctx.strokeStyle = '#6a1a1a';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-3, -3); ctx.lineTo(3, 3);
                ctx.moveTo(3, -3); ctx.lineTo(-3, 3);
                ctx.stroke();
            }

            ctx.restore();

            // HP bar (only when damaged)
            if (es.hp < es.maxHp) {
                const bw = 16;
                ctx.fillStyle = 'rgba(58,42,26,0.3)';
                ctx.fillRect(sx - bw / 2, sy - 14, bw, 3);
                ctx.fillStyle = es.hp > es.maxHp * 0.3 ? this.INK : '#6a1a1a';
                ctx.fillRect(sx - bw / 2, sy - 14, bw * (es.hp / es.maxHp), 3);
            }
        }
    },

    _drawPlayerShip(ctx, camX, camY, frame) {
        const sx = Ship.x - camX;
        const sy = Ship.y - camY;
        const bob = Math.sin(frame * 0.06) * 1;

        ctx.save();
        ctx.translate(sx, sy + bob);
        ctx.rotate(Ship.angle);

        // Hull — drawn as ink outline
        ctx.strokeStyle = this.INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(14, 0);       // bow
        ctx.lineTo(-8, -7);      // port stern
        ctx.lineTo(-10, 0);      // stern center
        ctx.lineTo(-8, 7);       // starboard stern
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = 'rgba(58,42,26,0.12)';
        ctx.fill();

        // Mast
        ctx.strokeStyle = this.INK;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(2, -8); ctx.lineTo(2, 8);
        ctx.stroke();

        // Sail (filled triangle)
        ctx.fillStyle = 'rgba(58,42,26,0.2)';
        ctx.strokeStyle = this.INK;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(2, -7);
        ctx.lineTo(9, 0);
        ctx.lineTo(2, 7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cannon cooldown dots
        if (Ship.cannonCooldown > 0) {
            ctx.fillStyle = this.INK_FAINT;
            ctx.beginPath(); ctx.arc(0, -10, 2, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.fillStyle = this.INK;
            ctx.beginPath(); ctx.arc(0, -10, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(0, 10, 2, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
    },

    _drawFog(ctx, camX, camY, W, H) {
        const C = this.CELL;
        const gxStart = Math.max(0, Math.floor(camX / C));
        const gyStart = Math.max(0, Math.floor(camY / C));
        const gxEnd = Math.min(this.GRID_W, Math.ceil((camX + W) / C) + 1);
        const gyEnd = Math.min(this.GRID_H, Math.ceil((camY + H) / C) + 1);

        ctx.fillStyle = this.PARCHMENT_DARK;
        for (let gy = gyStart; gy < gyEnd; gy++) {
            for (let gx = gxStart; gx < gxEnd; gx++) {
                if (!this.explored[gy][gx]) {
                    const sx = gx * C - camX;
                    const sy = gy * C - camY;
                    ctx.fillRect(sx, sy, C, C);
                }
            }
        }

        // Fog edge stipple — draw dots at fog boundaries
        ctx.fillStyle = this.INK_FAINT;
        for (let gy = gyStart; gy < gyEnd; gy++) {
            for (let gx = gxStart; gx < gxEnd; gx++) {
                if (this.explored[gy][gx]) continue;
                // Check if neighbor is explored
                let edgeFog = false;
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nx = gx + dx, ny = gy + dy;
                    if (nx >= 0 && ny >= 0 && nx < this.GRID_W && ny < this.GRID_H && this.explored[ny][nx]) {
                        edgeFog = true; break;
                    }
                }
                if (edgeFog) {
                    const sx = gx * C - camX;
                    const sy = gy * C - camY;
                    // Stipple pattern
                    ctx.save();
                    ctx.globalAlpha = 0.15;
                    if ((gx + gy) % 2 === 0) ctx.fillRect(sx + 2, sy + 4, 1, 1);
                    if ((gx + gy) % 3 === 0) ctx.fillRect(sx + 8, sy + 2, 1, 1);
                    if ((gx + gy) % 4 === 0) ctx.fillRect(sx + 5, sy + 10, 1, 1);
                    ctx.restore();
                }
            }
        }

        // "Here be monsters" text on unexplored areas
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = this.INK;
        ctx.font = 'italic 14px "Courier New"';
        ctx.textAlign = 'center';
        const textPositions = [
            { x: 400 - camX, y: 300 - camY }, { x: 2600 - camX, y: 500 - camY },
            { x: 1800 - camX, y: 1800 - camY },
        ];
        for (const tp of textPositions) {
            if (tp.x > -100 && tp.y > -100 && tp.x < W + 100 && tp.y < H + 100) {
                const gx = Math.floor((tp.x + camX) / C);
                const gy = Math.floor((tp.y + camY) / C);
                if (gx >= 0 && gy >= 0 && gx < this.GRID_W && gy < this.GRID_H && !this.explored[gy][gx]) {
                    ctx.fillText('Here be monsters', tp.x, tp.y);
                }
            }
        }
        ctx.restore();
    },

    _drawCompassRose(ctx, cx, cy, size) {
        ctx.save();
        ctx.strokeStyle = this.COMPASS_COL;
        ctx.fillStyle = this.COMPASS_COL;

        // Outer circle
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, size * 0.8, 0, Math.PI * 2); ctx.stroke();

        // Cardinal points
        const dirs = [
            { angle: -Math.PI / 2, label: 'N', major: true },
            { angle: 0, label: 'E', major: true },
            { angle: Math.PI / 2, label: 'S', major: true },
            { angle: Math.PI, label: 'W', major: true },
        ];

        for (const d of dirs) {
            const len = d.major ? size * 0.7 : size * 0.4;
            const ex = cx + Math.cos(d.angle) * len;
            const ey = cy + Math.sin(d.angle) * len;

            // Point line
            ctx.lineWidth = d.major ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(ex, ey);
            ctx.stroke();

            // Label
            const lx = cx + Math.cos(d.angle) * (size * 0.95);
            const ly = cy + Math.sin(d.angle) * (size * 0.95);
            ctx.font = d.major ? 'bold 9px "Courier New"' : '7px "Courier New"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(d.label, lx, ly);
        }

        // Center dot
        ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    },

    _drawWindIndicator(ctx, cx, cy, frame) {
        ctx.save();
        ctx.fillStyle = this.INK_FAINT;
        ctx.font = '7px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('WIND', cx, cy - 12);

        // Arrow
        ctx.translate(cx, cy + 4);
        ctx.rotate(this.windAngle);
        ctx.strokeStyle = this.INK_LIGHT;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(10, 0);
        ctx.lineTo(6, -3);
        ctx.moveTo(10, 0);
        ctx.lineTo(6, 3);
        ctx.stroke();
        ctx.restore();
    },

    _drawPrompts(ctx, W, H, frame) {
        // Current speed
        ctx.fillStyle = this.INK_FAINT;
        ctx.font = '8px "Courier New"';
        ctx.textAlign = 'left';
        ctx.fillText(Math.floor(Ship.currentSpeed()) + ' knots', 10, H - 30);

        // Controls
        ctx.fillStyle = this.INK_FAINT;
        ctx.font = '7px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('W/S: Sail  A/D: Helm  LClick/RClick: Cannons  E: Interact', W / 2, H - 8);
    },

    _drawShipHUD(ctx, W, H) {
        // Hull bar
        const hx = 10, hy = 10, hw = 130, hh = 44;
        ctx.fillStyle = 'rgba(232,213,163,0.9)';
        ctx.fillRect(hx, hy, hw, hh);
        ctx.strokeStyle = this.INK;
        ctx.lineWidth = 1;
        ctx.strokeRect(hx, hy, hw, hh);

        ctx.fillStyle = this.INK;
        ctx.font = 'bold 9px "Courier New"';
        ctx.textAlign = 'left';
        ctx.fillText('HULL', hx + 6, hy + 14);

        const hullPct = Math.max(0, Ship.hull / Ship.maxHull);
        ctx.fillStyle = 'rgba(58,42,26,0.2)';
        ctx.fillRect(hx + 40, hy + 6, 82, 10);
        ctx.fillStyle = hullPct > 0.5 ? this.INK : hullPct > 0.25 ? '#8a5a1a' : '#8a2a1a';
        ctx.fillRect(hx + 40, hy + 6, 82 * hullPct, 10);
        ctx.fillStyle = this.INK;
        ctx.font = '8px "Courier New"';
        ctx.fillText(Math.ceil(Ship.hull) + '/' + Ship.maxHull, hx + 42, hy + 14);

        // Gold + cannon status
        ctx.fillStyle = this.INK;
        ctx.font = '8px "Courier New"';
        ctx.fillText('Gold: ' + Player.gold, hx + 6, hy + 30);
        const cannonReady = Ship.cannonCooldown <= 0;
        ctx.fillText('Cannons: ' + (cannonReady ? 'READY' : Math.ceil(Ship.cannonCooldown * 10) / 10 + 's'), hx + 6, hy + 40);

        // Upgrades count
        if (Ship.upgrades.length > 0) {
            ctx.fillText('Upgrades: ' + Ship.upgrades.length, hx + hw + 8, hy + 14);
        }
        ctx.fillText('Islands: ' + Ship.islandsCleared, hx + hw + 8, hy + 26);
    },
};
