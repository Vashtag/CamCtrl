// ============================================================
//  NAVAL COMBAT — Simplified ship-to-ship battle
// ============================================================
const Naval = {
    active: false,
    playerHull: 100,
    playerMaxHull: 100,
    enemyHull: 0,
    enemyMaxHull: 0,
    enemyName: '',

    // Broadside timing
    playerAngle: 0, // ship position around circle
    enemyAngle: Math.PI,
    orbitSpeed: 0.8,

    // Cannon timing bar
    cannonBar: 0,
    cannonBarSpeed: 2.5,
    cannonBarDir: 1,
    canRefire: true,
    fireCooldown: 0,

    // Enemy fire
    enemyFireTimer: 0,
    enemyFireRate: 2.5,

    // Effects
    effects: [],
    result: null, // null | 'win' | 'lose' | 'flee'
    resultTimer: 0,

    start(difficulty) {
        this.active = true;
        this.playerHull = this.playerMaxHull;
        this.enemyHull = 60 + difficulty * 20;
        this.enemyMaxHull = this.enemyHull;
        this.enemyName = 'Navy Patrol';
        this.playerAngle = 0;
        this.enemyAngle = Math.PI;
        this.cannonBar = 0;
        this.cannonBarDir = 1;
        this.canRefire = true;
        this.fireCooldown = 0;
        this.enemyFireTimer = 1 + Math.random() * 2;
        this.effects = [];
        this.result = null;
        this.resultTimer = 0;
    },

    update(dt) {
        if (!this.active) return null;

        if (this.result) {
            this.resultTimer -= dt;
            if (this.resultTimer <= 0) {
                this.active = false;
                return this.result;
            }
            return null;
        }

        // Orbit
        this.playerAngle += this.orbitSpeed * dt * 0.5;
        this.enemyAngle += this.orbitSpeed * dt * 0.5;

        // Cannon timing bar
        this.cannonBar += this.cannonBarSpeed * this.cannonBarDir * dt;
        if (this.cannonBar >= 1) { this.cannonBar = 1; this.cannonBarDir = -1; }
        if (this.cannonBar <= 0) { this.cannonBar = 0; this.cannonBarDir = 1; }

        if (this.fireCooldown > 0) {
            this.fireCooldown -= dt;
            if (this.fireCooldown <= 0) this.canRefire = true;
        }

        // Player fire on click/space
        if ((Input.mouse.leftClick || Input.isDown('Space')) && this.canRefire) {
            this.playerFire();
        }

        // Flee on Escape
        if (Input.isDown('Escape')) {
            this.result = 'flee';
            this.resultTimer = 1;
            this.playerHull -= 20; // take damage fleeing
        }

        // Enemy fire
        this.enemyFireTimer -= dt;
        if (this.enemyFireTimer <= 0) {
            this.enemyFire();
            this.enemyFireTimer = this.enemyFireRate * (0.8 + Math.random() * 0.4);
        }

        // Update effects
        for (let i = this.effects.length - 1; i >= 0; i--) {
            this.effects[i].timer -= dt;
            if (this.effects[i].timer <= 0) this.effects.splice(i, 1);
        }

        // Check win/lose
        if (this.enemyHull <= 0) {
            this.result = 'win';
            this.resultTimer = 1.5;
            Player.gold += 20 + Math.floor(Math.random() * 30);
        }
        if (this.playerHull <= 0) {
            this.result = 'lose';
            this.resultTimer = 1.5;
        }

        return null;
    },

    playerFire() {
        // Damage based on timing bar position (sweet spot at center)
        const accuracy = 1 - Math.abs(this.cannonBar - 0.5) * 2; // 0-1, 1 at center
        const damage = Math.floor(10 + accuracy * 20);
        this.enemyHull -= damage;
        this.canRefire = false;
        this.fireCooldown = 1.2;
        this.cannonBar = 0;
        this.cannonBarDir = 1;

        Combat.spawnDamageNumber(Renderer.W / 2 + 100, 200, damage, '#ffcc44');
        this.effects.push({
            type: 'cannon', x: Renderer.W / 2 - 80, y: 250,
            targetX: Renderer.W / 2 + 100, targetY: 200, timer: 0.3
        });
        Renderer.doShake(3, 0.15);
    },

    enemyFire() {
        const damage = 8 + Math.floor(Math.random() * 12);
        this.playerHull -= damage;
        Combat.spawnDamageNumber(Renderer.W / 2 - 80, 250, damage, '#ff4444');
        this.effects.push({
            type: 'cannon', x: Renderer.W / 2 + 100, y: 200,
            targetX: Renderer.W / 2 - 80, targetY: 250, timer: 0.3
        });
        Renderer.doShake(2, 0.1);
    },

    draw(ctx, frame) {
        const W = Renderer.W;
        const H = Renderer.H;

        // Ocean bg
        for (let y = 0; y < H; y += 16) {
            for (let x = 0; x < W; x += 16) {
                Sprites.drawWaterTile(ctx, x, y, frame, x / 16, y / 16);
            }
        }

        // Title
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 16px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('NAVAL BATTLE — ' + this.enemyName, W / 2, 30);

        // Player ship (left)
        const pBob = Math.sin(frame * 0.06) * 3;
        this._drawBattleShip(ctx, W / 2 - 120, 250 + pBob, false);

        // Enemy ship (right)
        const eBob = Math.sin(frame * 0.06 + 1) * 3;
        this._drawBattleShip(ctx, W / 2 + 120, 200 + eBob, true);

        // Effects
        for (const eff of this.effects) {
            ctx.fillStyle = '#ffcc44';
            const t = 1 - eff.timer / 0.3;
            const ex = eff.x + (eff.targetX - eff.x) * t;
            const ey = eff.y + (eff.targetY - eff.y) * t;
            ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2); ctx.fill();
        }

        // HP bars
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(40, H - 60, 200, 40);
        ctx.fillRect(W - 240, H - 60, 200, 40);

        // Player hull
        ctx.fillStyle = '#aaa';
        ctx.font = '10px "Courier New"';
        ctx.textAlign = 'left';
        ctx.fillText('YOUR HULL', 50, H - 45);
        ctx.fillStyle = '#333';
        ctx.fillRect(50, H - 38, 180, 10);
        ctx.fillStyle = this.playerHull > 30 ? '#44cc44' : '#cc2222';
        ctx.fillRect(50, H - 38, 180 * Math.max(0, this.playerHull / this.playerMaxHull), 10);

        // Enemy hull
        ctx.textAlign = 'right';
        ctx.fillStyle = '#aaa';
        ctx.fillText('ENEMY HULL', W - 50, H - 45);
        ctx.fillStyle = '#333';
        ctx.fillRect(W - 230, H - 38, 180, 10);
        ctx.fillStyle = '#cc4444';
        ctx.fillRect(W - 230, H - 38, 180 * Math.max(0, this.enemyHull / this.enemyMaxHull), 10);

        // Cannon timing bar
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(W / 2 - 100, H - 100, 200, 24);
        ctx.strokeStyle = '#e8c872';
        ctx.strokeRect(W / 2 - 100, H - 100, 200, 24);

        // Sweet spot
        ctx.fillStyle = 'rgba(100,255,100,0.2)';
        ctx.fillRect(W / 2 - 20, H - 98, 40, 20);

        // Bar
        const barX = W / 2 - 98 + this.cannonBar * 196;
        ctx.fillStyle = this.canRefire ? '#ffcc44' : '#666';
        ctx.fillRect(barX - 2, H - 98, 4, 20);

        ctx.fillStyle = '#aaa';
        ctx.font = '9px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText(this.canRefire ? 'CLICK / SPACE to FIRE' : 'Reloading...', W / 2, H - 78);
        ctx.fillText('ESC to Flee (takes damage)', W / 2, H - 68);

        // Result
        if (this.result) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = this.result === 'win' ? '#44cc44' : '#cc4444';
            ctx.font = 'bold 24px "Courier New"';
            ctx.textAlign = 'center';
            const msg = this.result === 'win' ? 'VICTORY!' : this.result === 'lose' ? 'SHIP SUNK!' : 'FLED!';
            ctx.fillText(msg, W / 2, H / 2);
        }

        // Damage numbers
        Combat.drawDamageNumbers(ctx);
    },

    _drawBattleShip(ctx, x, y, isEnemy) {
        ctx.save();
        ctx.translate(x, y);
        if (isEnemy) ctx.scale(-1, 1);

        // Hull
        ctx.fillStyle = isEnemy ? '#4a3020' : '#7a5a3a';
        ctx.fillRect(-25, -5, 50, 16);
        ctx.fillRect(-20, 11, 40, 4);

        // Deck
        ctx.fillStyle = '#9a7a5a';
        ctx.fillRect(-22, -3, 44, 12);

        // Mast
        ctx.fillStyle = '#5a4030';
        ctx.fillRect(-2, -35, 3, 32);

        // Sail
        ctx.fillStyle = isEnemy ? '#ccccaa' : '#eeeecc';
        ctx.beginPath();
        ctx.moveTo(1, -33);
        ctx.lineTo(22, -20);
        ctx.lineTo(1, -8);
        ctx.closePath();
        ctx.fill();

        // Flag
        ctx.fillStyle = isEnemy ? '#225588' : '#cc3333';
        ctx.fillRect(-1, -38, 8, 4);

        // Cannons
        ctx.fillStyle = '#333';
        ctx.fillRect(-18, 8, 4, 4);
        ctx.fillRect(-8, 8, 4, 4);
        ctx.fillRect(4, 8, 4, 4);
        ctx.fillRect(14, 8, 4, 4);

        ctx.restore();
    }
};
