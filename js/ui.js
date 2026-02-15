// ============================================================
//  UI — HUD, menus, screens
// ============================================================
const UI = {
    // Tavern
    tavernItems: [],
    tavernHover: -1,

    drawHUD(ctx, frame, skipDamageNumbers) {
        const W = Renderer.W;
        const H = Renderer.H;

        // HP bar (rum bottle style)
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(8, 8, 120, 36);

        // HP label
        ctx.fillStyle = '#cc4444';
        ctx.font = 'bold 10px "Courier New"';
        ctx.textAlign = 'left';
        ctx.fillText('HP', 14, 20);

        // HP bar
        const hpPct = Math.max(0, Player.hp / Player.maxHp);
        ctx.fillStyle = Sprites.PAL.hpEmpty;
        ctx.fillRect(32, 12, 88, 10);
        ctx.fillStyle = hpPct > 0.5 ? '#cc3344' : hpPct > 0.25 ? '#cc8822' : '#cc2222';
        ctx.fillRect(32, 12, 88 * hpPct, 10);

        // HP text
        ctx.fillStyle = '#fff';
        ctx.font = '9px "Courier New"';
        ctx.fillText(Math.ceil(Player.hp) + '/' + Player.maxHp, 34, 20);

        // Weapon
        ctx.fillStyle = '#e8c872';
        ctx.font = '9px "Courier New"';
        ctx.fillText(Player.weapon.name, 14, 38);

        // Ammo
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(8, 48, 80, 18);
        ctx.fillStyle = '#aaa';
        ctx.font = '9px "Courier New"';
        ctx.fillText('Ammo: ' + Player.ammo + '/' + Player.maxAmmo, 14, 60);

        // Gold
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(8, 70, 80, 18);
        ctx.fillStyle = Sprites.PAL.gold;
        ctx.font = '9px "Courier New"';
        ctx.fillText('Gold: ' + Player.gold, 14, 82);

        // Minimap
        this.drawMinimap(ctx, W - 80, 8, 72, 56);

        // Enemy count
        const alive = Enemies.aliveCount();
        if (alive > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(W / 2 - 50, 8, 100, 18);
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 10px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText('Enemies: ' + alive, W / 2, 20);
        }

        // Controls hint
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(W / 2 - 120, H - 20, 240, 16);
        ctx.fillStyle = '#888';
        ctx.font = '8px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('WASD:Move  SPACE:Dodge  LClick:Melee  RClick:Shoot', W / 2, H - 10);

        // Damage numbers (skip if already drawn in world space)
        if (!skipDamageNumbers) Combat.drawDamageNumbers(ctx);
    },

    drawMinimap(ctx, x, y, w, h) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#555';
        ctx.strokeRect(x, y, w, h);

        const scaleX = w / Island.pixelWidth();
        const scaleY = h / Island.pixelHeight();

        // Draw simplified tiles
        const step = 3; // sample every N tiles
        for (let gy = 0; gy < Island.height; gy += step) {
            for (let gx = 0; gx < Island.width; gx += step) {
                const tile = Island.tiles[gy][gx];
                if (tile === 0) continue;
                let col;
                switch (tile) {
                    case 1: col = '#c8a860'; break;
                    case 2: case 3: col = '#2a7a3a'; break;
                    case 4: col = '#555'; break;
                    case 5: case 6: col = '#8a7a5a'; break;
                    default: col = '#444';
                }
                ctx.fillStyle = col;
                ctx.fillRect(
                    x + gx * Island.TILE * scaleX,
                    y + gy * Island.TILE * scaleY,
                    Math.max(1, step * Island.TILE * scaleX),
                    Math.max(1, step * Island.TILE * scaleY)
                );
            }
        }

        // Player dot
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(
            x + Player.x * scaleX - 1,
            y + Player.y * scaleY - 1,
            3, 3
        );

        // Enemy dots
        for (const e of Enemies.list) {
            if (e.state === 'dead') continue;
            ctx.fillStyle = e.isBoss ? '#ff0000' : '#ffaa00';
            ctx.fillRect(
                x + e.x * scaleX - 1,
                y + e.y * scaleY - 1,
                2, 2
            );
        }
    },

    // Title screen
    drawTitle(ctx, frame) {
        const W = Renderer.W;
        const H = Renderer.H;

        // Ocean bg
        for (let y = 0; y < H; y += 16) {
            for (let x = 0; x < W; x += 16) {
                Sprites.drawWaterTile(ctx, x, y, frame, x / 16, y / 16);
            }
        }

        // Darken
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, W, H);

        // Title
        ctx.save();
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#e8c872';
        ctx.font = 'bold 36px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('TIDE OF FORTUNE', W / 2, 140);
        ctx.restore();

        ctx.fillStyle = '#cc8844';
        ctx.font = '14px "Courier New"';
        ctx.fillText('A Pirate Roguelite', W / 2, 170);

        // Ship art
        GameMap._drawShip(ctx, W / 2, 230, frame);

        // Instructions
        ctx.fillStyle = '#aaa';
        ctx.font = '11px "Courier New"';
        const lines = [
            'Sail the seas. Raid islands. Hunt treasure.',
            '',
            'WASD / Arrows — Move',
            'Left Click — Melee Attack',
            'Right Click — Pistol Shot',
            'Space — Dodge Roll',
        ];
        lines.forEach((l, i) => ctx.fillText(l, W / 2, 290 + i * 18));

        // Start prompt
        const blink = Math.sin(frame * 0.08) > 0;
        if (blink) {
            ctx.save();
            ctx.shadowColor = '#e8c872';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#e8c872';
            ctx.font = 'bold 16px "Courier New"';
            ctx.fillText('[ CLICK TO SET SAIL ]', W / 2, H - 60);
            ctx.restore();
        }
    },

    // Death screen
    drawDeath(ctx, frame) {
        const W = Renderer.W;
        const H = Renderer.H;

        ctx.fillStyle = 'rgba(10,0,0,0.85)';
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.shadowColor = '#ff3333';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ff3333';
        ctx.font = 'bold 30px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('YE HAVE PERISHED', W / 2, 120);
        ctx.restore();

        ctx.fillStyle = '#cc8844';
        ctx.font = '14px "Courier New"';
        ctx.fillText('The sea claims another soul...', W / 2, 160);

        // Stats
        ctx.fillStyle = '#aaa';
        ctx.font = '12px "Courier New"';
        ctx.fillText('Enemies Slain: ' + Player.kills, W / 2, 220);
        ctx.fillText('Gold Collected: ' + Player.gold, W / 2, 245);

        const blink = Math.sin(frame * 0.08) > 0;
        if (blink) {
            ctx.save();
            ctx.shadowColor = '#e8c872';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#e8c872';
            ctx.font = 'bold 14px "Courier New"';
            ctx.fillText('[ CLICK TO TRY AGAIN ]', W / 2, H - 80);
            ctx.restore();
        }
    },

    // Victory screen
    drawVictory(ctx, frame) {
        const W = Renderer.W;
        const H = Renderer.H;

        ctx.fillStyle = 'rgba(0,10,5,0.85)';
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 25;
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 30px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('CAPTAIN BLACKTIDE DEFEATED!', W / 2, 120);
        ctx.restore();

        ctx.fillStyle = '#e8c872';
        ctx.font = '14px "Courier New"';
        ctx.fillText('The treasure is yours, Captain!', W / 2, 160);

        ctx.fillStyle = '#aaa';
        ctx.font = '12px "Courier New"';
        ctx.fillText('Enemies Slain: ' + Player.kills, W / 2, 220);
        ctx.fillText('Gold Collected: ' + Player.gold, W / 2, 245);

        const blink = Math.sin(frame * 0.08) > 0;
        if (blink) {
            ctx.save();
            ctx.shadowColor = '#e8c872';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#e8c872';
            ctx.font = 'bold 14px "Courier New"';
            ctx.fillText('[ CLICK TO SAIL AGAIN ]', W / 2, H - 80);
            ctx.restore();
        }
    },

    // Island complete screen
    drawIslandComplete(ctx, frame) {
        const W = Renderer.W;
        const H = Renderer.H;

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#44cc44';
        ctx.font = 'bold 22px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('ISLAND CLEARED!', W / 2, H / 2 - 30);

        ctx.fillStyle = '#aaa';
        ctx.font = '12px "Courier New"';
        ctx.fillText('Returning to sea...', W / 2, H / 2 + 10);

        const blink = Math.sin(frame * 0.08) > 0;
        if (blink) {
            ctx.fillStyle = '#e8c872';
            ctx.font = '12px "Courier New"';
            ctx.fillText('[ CLICK TO CONTINUE ]', W / 2, H / 2 + 50);
        }
    },

    // Tavern screen
    initTavern() {
        this.tavernItems = [
            { type: 'heal', name: 'Rum Barrel', desc: 'Heal 40 HP', cost: 15, action: () => Player.heal(40) },
            { type: 'ammo', name: 'Ammo Crate', desc: '+8 Ammo', cost: 10, action: () => { Player.ammo = Math.min(Player.maxAmmo, Player.ammo + 8); } },
            { type: 'maxhp', name: 'Surgeon', desc: '+15 Max HP', cost: 30, action: () => { Player.maxHp += 15; Player.hp += 15; } },
        ];

        // Maybe add a weapon
        if (Math.random() > 0.3) {
            const weapons = Loot.weapons.filter(w => w.id !== Player.weapon.id);
            const wep = weapons[Math.floor(Math.random() * weapons.length)];
            if (wep) {
                this.tavernItems.push({
                    type: 'weapon', name: wep.name, desc: wep.desc + ' (DMG:' + wep.damage + ')',
                    cost: 25 + wep.damage * 2,
                    action: () => { Player.weapon = { ...wep }; }
                });
            }
        }
    },

    drawTavern(ctx, frame) {
        const W = Renderer.W;
        const H = Renderer.H;

        // Background
        for (let y = 0; y < H; y += 16) {
            for (let x = 0; x < W; x += 16) {
                Sprites.drawWoodTile(ctx, x, y);
            }
        }
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#e8c872';
        ctx.font = 'bold 20px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('THE SALTY DOG TAVERN', W / 2, 40);

        ctx.fillStyle = '#aaa';
        ctx.font = '11px "Courier New"';
        ctx.fillText('Gold: ' + Player.gold + '  |  HP: ' + Math.ceil(Player.hp) + '/' + Player.maxHp + '  |  Ammo: ' + Player.ammo, W / 2, 65);

        // Items
        this.tavernHover = -1;
        const startX = W / 2 - (this.tavernItems.length * 130) / 2;

        for (let i = 0; i < this.tavernItems.length; i++) {
            const item = this.tavernItems[i];
            const ix = startX + i * 135;
            const iy = 100;
            const iw = 125;
            const ih = 160;

            const hover = Input.mouse.x >= ix && Input.mouse.x <= ix + iw &&
                          Input.mouse.y >= iy && Input.mouse.y <= iy + ih;
            if (hover) this.tavernHover = i;

            const canAfford = Player.gold >= item.cost;

            ctx.fillStyle = hover ? 'rgba(232,200,114,0.15)' : 'rgba(0,0,0,0.5)';
            ctx.fillRect(ix, iy, iw, ih);
            ctx.strokeStyle = hover && canAfford ? '#e8c872' : '#555';
            ctx.lineWidth = hover ? 2 : 1;
            ctx.strokeRect(ix, iy, iw, ih);

            ctx.fillStyle = canAfford ? '#e8c872' : '#666';
            ctx.font = 'bold 11px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText(item.name, ix + iw / 2, iy + 30);

            ctx.fillStyle = '#aaa';
            ctx.font = '9px "Courier New"';
            // Word wrap desc
            const words = item.desc.split(' ');
            let line = '', ly = iy + 55;
            for (const w of words) {
                if (ctx.measureText(line + w).width > iw - 10) {
                    ctx.fillText(line, ix + iw / 2, ly);
                    ly += 14;
                    line = w + ' ';
                } else {
                    line += w + ' ';
                }
            }
            if (line) ctx.fillText(line.trim(), ix + iw / 2, ly);

            // Cost
            ctx.fillStyle = canAfford ? Sprites.PAL.gold : '#cc4444';
            ctx.font = 'bold 12px "Courier New"';
            ctx.fillText(item.cost + ' Gold', ix + iw / 2, iy + ih - 20);
        }

        // Leave button
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(W / 2 - 70, H - 55, 140, 30);
        ctx.strokeStyle = '#e8c872';
        ctx.strokeRect(W / 2 - 70, H - 55, 140, 30);
        ctx.fillStyle = '#e8c872';
        ctx.font = 'bold 12px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('[ SET SAIL ]', W / 2, H - 36);
    },

    handleTavernClick() {
        const W = Renderer.W;
        const H = Renderer.H;

        // Check leave button
        if (Input.mouse.x >= W / 2 - 70 && Input.mouse.x <= W / 2 + 70 &&
            Input.mouse.y >= H - 55 && Input.mouse.y <= H - 25) {
            return 'leave';
        }

        // Check item purchase
        if (this.tavernHover >= 0) {
            const item = this.tavernItems[this.tavernHover];
            if (Player.gold >= item.cost) {
                Player.gold -= item.cost;
                item.action();
                this.tavernItems.splice(this.tavernHover, 1);
                return 'bought';
            }
        }

        return null;
    }
};
