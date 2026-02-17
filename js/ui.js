// ============================================================
//  UI — HUD, menus, screens, port, upgrade picker
// ============================================================
const UI = {
    // Palette (matches nautical chart)
    INK: '#3a2a1a',
    INK_LIGHT: '#6a5a4a',
    INK_FAINT: '#9a8a7a',
    PARCHMENT: '#e8d5a3',
    PARCHMENT_DARK: '#d4c090',

    // Tavern / port
    tavernItems: [],
    tavernHover: -1,
    portTab: 'shop', // shop, contracts, meta

    // Upgrade picker
    upgradeChoices: [],
    upgradeHover: -1,

    // ---- Island HUD ----
    drawHUD(ctx, frame, skipDamageNumbers) {
        const W = Renderer.W;
        const H = Renderer.H;

        // HP bar
        const hx = 8, hy = 8, hw = 130, hh = 50;
        ctx.fillStyle = 'rgba(232,213,163,0.85)';
        ctx.fillRect(hx, hy, hw, hh);
        ctx.strokeStyle = this.INK;
        ctx.lineWidth = 1;
        ctx.strokeRect(hx, hy, hw, hh);

        ctx.fillStyle = this.INK;
        ctx.font = 'bold 9px "Courier New"';
        ctx.textAlign = 'left';
        ctx.fillText('HP', hx + 6, hy + 14);

        const hpPct = Math.max(0, Player.hp / Player.maxHp);
        ctx.fillStyle = 'rgba(58,42,26,0.2)';
        ctx.fillRect(hx + 24, hy + 6, 98, 10);
        ctx.fillStyle = hpPct > 0.5 ? '#6a3a2a' : hpPct > 0.25 ? '#8a5a1a' : '#8a2a1a';
        ctx.fillRect(hx + 24, hy + 6, 98 * hpPct, 10);

        ctx.fillStyle = this.INK;
        ctx.font = '8px "Courier New"';
        ctx.fillText(Math.ceil(Player.hp) + '/' + Player.maxHp, hx + 26, hy + 14);

        // Weapon
        ctx.fillStyle = this.INK;
        ctx.font = '8px "Courier New"';
        ctx.fillText(Player.weapon.name, hx + 6, hy + 28);

        // Ammo + Gold
        ctx.fillText('Ammo: ' + Player.ammo + '/' + Player.maxAmmo, hx + 6, hy + 38);
        ctx.fillText('Gold: ' + Player.gold, hx + 6, hy + 48);

        // Minimap
        this.drawMinimap(ctx, W - 80, 8, 72, 56);

        // Enemy count
        const alive = Enemies.aliveCount();
        if (alive > 0) {
            ctx.fillStyle = 'rgba(232,213,163,0.85)';
            ctx.fillRect(W / 2 - 45, 8, 90, 18);
            ctx.strokeStyle = this.INK;
            ctx.strokeRect(W / 2 - 45, 8, 90, 18);
            ctx.fillStyle = '#6a1a1a';
            ctx.font = 'bold 9px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText('Enemies: ' + alive, W / 2, 20);
        }

        // Controls
        ctx.fillStyle = 'rgba(232,213,163,0.7)';
        ctx.fillRect(W / 2 - 130, H - 18, 260, 14);
        ctx.fillStyle = this.INK_FAINT;
        ctx.font = '7px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('WASD:Move  SPACE:Dodge  LClick:Melee  RClick:Shoot  E/F:Open', W / 2, H - 9);

        if (!skipDamageNumbers) Combat.drawDamageNumbers(ctx);
    },

    drawMinimap(ctx, x, y, w, h) {
        ctx.fillStyle = 'rgba(232,213,163,0.8)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = this.INK;
        ctx.strokeRect(x, y, w, h);

        const scaleX = w / Island.pixelWidth();
        const scaleY = h / Island.pixelHeight();

        const step = 3;
        for (let gy = 0; gy < Island.height; gy += step) {
            for (let gx = 0; gx < Island.width; gx += step) {
                const tile = Island.tiles[gy][gx];
                if (tile === 0) continue;
                let col;
                switch (tile) {
                    case 1: col = '#b8a060'; break;
                    case 2: case 3: col = '#5a7a3a'; break;
                    case 4: col = this.INK_LIGHT; break;
                    case 5: case 6: col = '#8a7a5a'; break;
                    default: col = '#666';
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

        ctx.fillStyle = '#8a2a1a';
        ctx.fillRect(x + Player.x * scaleX - 1, y + Player.y * scaleY - 1, 3, 3);

        for (const e of Enemies.list) {
            if (e.state === 'dead') continue;
            ctx.fillStyle = e.isBoss ? '#6a1a1a' : this.INK;
            ctx.fillRect(x + e.x * scaleX - 1, y + e.y * scaleY - 1, 2, 2);
        }
    },

    // ---- TITLE SCREEN ----
    drawTitle(ctx, frame) {
        const W = Renderer.W;
        const H = Renderer.H;

        // Parchment bg
        ctx.fillStyle = this.PARCHMENT;
        ctx.fillRect(0, 0, W, H);

        // Stains
        ctx.save();
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = '#6a4a2a';
        ctx.beginPath(); ctx.arc(W * 0.3, H * 0.4, 120, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(W * 0.7, H * 0.6, 80, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Border
        ctx.strokeStyle = this.INK;
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, W - 40, H - 40);
        ctx.strokeRect(24, 24, W - 48, H - 48);

        // Title
        ctx.save();
        ctx.fillStyle = this.INK;
        ctx.font = 'bold 32px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('TIDE OF FORTUNE', W / 2, 100);
        ctx.restore();

        // Decorative line
        ctx.strokeStyle = this.INK;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(W / 2 - 100, 115);
        ctx.lineTo(W / 2 + 100, 115);
        ctx.stroke();

        ctx.fillStyle = this.INK_LIGHT;
        ctx.font = '12px "Courier New"';
        ctx.fillText('A Pirate Roguelite', W / 2, 135);

        // Compass rose
        GameMap._drawCompassRose(ctx, W / 2, 200, 50);

        // Instructions
        ctx.fillStyle = this.INK_LIGHT;
        ctx.font = '10px "Courier New"';
        const lines = [
            'Set sail from port into uncharted waters.',
            'Explore islands. Raid for treasure. Hunt the boss.',
            'Upgrade your ship between islands.',
            '',
            'W/S: Sail forward/back    A/D: Turn',
            'LClick/RClick: Fire cannons    E: Interact',
            'On islands: WASD + Mouse combat',
        ];
        lines.forEach((l, i) => ctx.fillText(l, W / 2, 270 + i * 16));

        // Meta currency
        if (Ship.doubloons > 0) {
            ctx.fillStyle = this.INK;
            ctx.font = '10px "Courier New"';
            ctx.fillText('Doubloons: ' + Ship.doubloons + ' (persist through death)', W / 2, 405);
        }

        // Start prompt
        const blink = Math.sin(frame * 0.06) > 0;
        if (blink) {
            ctx.fillStyle = this.INK;
            ctx.font = 'bold 14px "Courier New"';
            ctx.fillText('[ CLICK TO SET SAIL ]', W / 2, H - 50);
        }
    },

    // ---- DEATH SCREEN ----
    drawDeath(ctx, frame) {
        const W = Renderer.W;
        const H = Renderer.H;

        ctx.fillStyle = this.PARCHMENT_DARK;
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = this.INK;
        ctx.lineWidth = 2;
        ctx.strokeRect(30, 30, W - 60, H - 60);

        // Skull and crossbones (text)
        ctx.fillStyle = this.INK;
        ctx.font = 'bold 28px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('YE HAVE PERISHED', W / 2, 100);

        ctx.fillStyle = this.INK_LIGHT;
        ctx.font = '12px "Courier New"';
        ctx.fillText('The sea claims another soul...', W / 2, 135);

        // Stats
        ctx.fillStyle = this.INK;
        ctx.font = '11px "Courier New"';
        ctx.fillText('Enemies Slain: ' + Player.kills, W / 2, 190);
        ctx.fillText('Gold Collected: ' + Player.gold, W / 2, 210);
        ctx.fillText('Islands Cleared: ' + Ship.islandsCleared, W / 2, 230);
        ctx.fillText('Upgrades Earned: ' + Ship.upgrades.length, W / 2, 250);

        // Meta progress
        const doubloonsEarned = Math.floor(Player.gold * 0.2) + Ship.islandsCleared * 5;
        ctx.fillStyle = '#6a4a1a';
        ctx.font = 'bold 11px "Courier New"';
        ctx.fillText('+ ' + doubloonsEarned + ' Doubloons saved', W / 2, 290);
        ctx.font = '9px "Courier New"';
        ctx.fillStyle = this.INK_LIGHT;
        ctx.fillText('(Doubloons persist — spend at port)', W / 2, 308);

        const blink = Math.sin(frame * 0.06) > 0;
        if (blink) {
            ctx.fillStyle = this.INK;
            ctx.font = 'bold 12px "Courier New"';
            ctx.fillText('[ CLICK TO TRY AGAIN ]', W / 2, H - 60);
        }
    },

    // ---- VICTORY SCREEN ----
    drawVictory(ctx, frame) {
        const W = Renderer.W;
        const H = Renderer.H;

        ctx.fillStyle = this.PARCHMENT;
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = '#6a5a1a';
        ctx.lineWidth = 3;
        ctx.strokeRect(25, 25, W - 50, H - 50);

        ctx.fillStyle = '#5a3a0a';
        ctx.font = 'bold 26px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('CAPTAIN BLACKTIDE', W / 2, 90);
        ctx.fillText('DEFEATED!', W / 2, 120);

        ctx.fillStyle = this.INK_LIGHT;
        ctx.font = '12px "Courier New"';
        ctx.fillText('The treasure is yours, Captain!', W / 2, 155);

        ctx.fillStyle = this.INK;
        ctx.font = '11px "Courier New"';
        ctx.fillText('Enemies Slain: ' + Player.kills, W / 2, 210);
        ctx.fillText('Gold Collected: ' + Player.gold, W / 2, 230);
        ctx.fillText('Islands Cleared: ' + Ship.islandsCleared, W / 2, 250);

        const blink = Math.sin(frame * 0.06) > 0;
        if (blink) {
            ctx.fillStyle = this.INK;
            ctx.font = 'bold 12px "Courier New"';
            ctx.fillText('[ CLICK TO SAIL AGAIN ]', W / 2, H - 60);
        }
    },

    // ---- ISLAND COMPLETE (overlay) ----
    drawIslandComplete(ctx, frame) {
        const W = Renderer.W;
        const H = Renderer.H;

        ctx.fillStyle = 'rgba(232,213,163,0.8)';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = this.INK;
        ctx.font = 'bold 22px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('ISLAND CLEARED!', W / 2, H / 2 - 40);

        if (Ship.surgeonHeal > 0) {
            ctx.fillStyle = '#4a6a2a';
            ctx.font = '10px "Courier New"';
            ctx.fillText('Ship surgeon heals +' + Ship.surgeonHeal + ' HP', W / 2, H / 2 - 10);
        }

        const blink = Math.sin(frame * 0.06) > 0;
        if (blink) {
            ctx.fillStyle = this.INK;
            ctx.font = 'bold 12px "Courier New"';
            ctx.fillText('[ CLICK TO CHOOSE UPGRADE ]', W / 2, H / 2 + 30);
        }
    },

    // ---- UPGRADE PICKER (1 of 3) ----
    initUpgradePicker() {
        this.upgradeChoices = Ship.getUpgradeChoices();
        this.upgradeHover = -1;
    },

    drawUpgradePicker(ctx, frame) {
        const W = Renderer.W;
        const H = Renderer.H;

        // Parchment bg
        ctx.fillStyle = this.PARCHMENT;
        ctx.fillRect(0, 0, W, H);

        // Border
        ctx.strokeStyle = this.INK;
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, W - 40, H - 40);

        // Title
        ctx.fillStyle = this.INK;
        ctx.font = 'bold 18px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('CHOOSE YOUR UPGRADE', W / 2, 60);

        ctx.fillStyle = this.INK_LIGHT;
        ctx.font = '10px "Courier New"';
        ctx.fillText('Select one to improve your ship', W / 2, 80);

        // 3 cards
        this.upgradeHover = -1;
        const cardW = 160;
        const cardH = 220;
        const spacing = 20;
        const totalW = this.upgradeChoices.length * cardW + (this.upgradeChoices.length - 1) * spacing;
        const startX = W / 2 - totalW / 2;

        for (let i = 0; i < this.upgradeChoices.length; i++) {
            const u = this.upgradeChoices[i];
            const cx = startX + i * (cardW + spacing);
            const cy = 110;

            const hover = Input.mouse.x >= cx && Input.mouse.x <= cx + cardW &&
                          Input.mouse.y >= cy && Input.mouse.y <= cy + cardH;
            if (hover) this.upgradeHover = i;

            // Card bg
            ctx.fillStyle = hover ? 'rgba(200,180,130,0.5)' : 'rgba(232,213,163,0.3)';
            ctx.fillRect(cx, cy, cardW, cardH);
            ctx.strokeStyle = hover ? this.INK : this.INK_LIGHT;
            ctx.lineWidth = hover ? 2 : 1;
            ctx.strokeRect(cx, cy, cardW, cardH);

            // Category
            ctx.fillStyle = this.INK_FAINT;
            ctx.font = '8px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText(u.cat, cx + cardW / 2, cy + 20);

            // Icon (large)
            ctx.fillStyle = this.INK;
            ctx.font = 'bold 20px "Courier New"';
            ctx.fillText(u.icon, cx + cardW / 2, cy + 60);

            // Name
            ctx.fillStyle = this.INK;
            ctx.font = 'bold 11px "Courier New"';
            ctx.fillText(u.name, cx + cardW / 2, cy + 95);

            // Desc (wrapped)
            ctx.fillStyle = this.INK_LIGHT;
            ctx.font = '9px "Courier New"';
            this._wrapText(ctx, u.desc, cx + 10, cy + 120, cardW - 20, 14);

            // Key hint
            ctx.fillStyle = hover ? this.INK : this.INK_FAINT;
            ctx.font = 'bold 10px "Courier New"';
            ctx.fillText('[ ' + (i + 1) + ' ]', cx + cardW / 2, cy + cardH - 15);
        }
    },

    handleUpgradeClick() {
        // Key press
        if (Input.isDown('Digit1') || Input.isDown('Numpad1')) return 0;
        if (Input.isDown('Digit2') || Input.isDown('Numpad2')) return 1;
        if (Input.isDown('Digit3') || Input.isDown('Numpad3')) return 2;

        // Mouse click
        if (Input.mouse.leftClick && this.upgradeHover >= 0) {
            return this.upgradeHover;
        }

        return -1;
    },

    // ---- PORT SCREEN ----
    initPort() {
        this.portTab = 'shop';
        this.tavernItems = [
            { name: 'Hull Repair', desc: 'Repair 40 Hull', cost: 15,
              action() { Ship.hull = Math.min(Ship.maxHull, Ship.hull + 40); } },
            { name: 'Rum Barrel', desc: 'Heal 40 HP', cost: 15,
              action() { Player.heal(40); } },
            { name: 'Ammo Crate', desc: '+8 Ammo', cost: 10,
              action() { Player.ammo = Math.min(Player.maxAmmo, Player.ammo + 8); } },
            { name: 'Surgeon', desc: '+15 Max HP', cost: 30,
              action() { Player.maxHp += 15; Player.hp += 15; } },
        ];

        // Maybe add a weapon
        if (Math.random() > 0.3) {
            const weapons = Loot.weapons.filter(w => w.id !== Player.weapon.id);
            const wep = weapons[Math.floor(Math.random() * weapons.length)];
            if (wep) {
                this.tavernItems.push({
                    name: wep.name, desc: wep.desc + ' (DMG:' + wep.damage + ')',
                    cost: 25 + wep.damage * 2,
                    action() { Player.weapon = { ...wep }; }
                });
            }
        }

        this.tavernHover = -1;
    },

    drawPort(ctx, frame) {
        const W = Renderer.W;
        const H = Renderer.H;

        // Parchment bg
        ctx.fillStyle = this.PARCHMENT;
        ctx.fillRect(0, 0, W, H);

        // Wood plank overlay at top
        ctx.fillStyle = '#c8a878';
        ctx.fillRect(0, 0, W, 50);
        ctx.strokeStyle = this.INK;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, 50); ctx.lineTo(W, 50); ctx.stroke();

        // Title
        ctx.fillStyle = this.INK;
        ctx.font = 'bold 18px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('PORT — THE SALTY DOG', W / 2, 30);

        // Player stats bar
        ctx.fillStyle = this.INK_LIGHT;
        ctx.font = '9px "Courier New"';
        ctx.fillText('Gold: ' + Player.gold + '   Hull: ' + Math.ceil(Ship.hull) + '/' + Ship.maxHull +
                     '   HP: ' + Math.ceil(Player.hp) + '/' + Player.maxHp + '   Ammo: ' + Player.ammo, W / 2, 46);

        // Tabs
        const tabs = [
            { id: 'shop', label: 'SHOP' },
            { id: 'contracts', label: 'CONTRACTS' },
            { id: 'meta', label: 'DOUBLOONS' },
        ];
        const tabW = 100, tabH = 22;
        const tabStartX = W / 2 - (tabs.length * (tabW + 5)) / 2;
        for (let i = 0; i < tabs.length; i++) {
            const tx = tabStartX + i * (tabW + 5);
            const ty = 58;
            const active = this.portTab === tabs[i].id;

            ctx.fillStyle = active ? this.PARCHMENT : this.PARCHMENT_DARK;
            ctx.fillRect(tx, ty, tabW, tabH);
            ctx.strokeStyle = this.INK;
            ctx.lineWidth = active ? 2 : 1;
            ctx.strokeRect(tx, ty, tabW, tabH);

            ctx.fillStyle = active ? this.INK : this.INK_FAINT;
            ctx.font = active ? 'bold 9px "Courier New"' : '9px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText(tabs[i].label, tx + tabW / 2, ty + 14);

            // Click detection
            if (Input.mouse.leftClick &&
                Input.mouse.x >= tx && Input.mouse.x <= tx + tabW &&
                Input.mouse.y >= ty && Input.mouse.y <= ty + tabH) {
                this.portTab = tabs[i].id;
            }
        }

        // Tab content
        switch (this.portTab) {
            case 'shop': this._drawShopTab(ctx, W, H); break;
            case 'contracts': this._drawContractsTab(ctx, W, H); break;
            case 'meta': this._drawMetaTab(ctx, W, H); break;
        }

        // Leave button
        const bx = W / 2 - 60, by = H - 50, bw = 120, bh = 28;
        ctx.fillStyle = 'rgba(200,180,130,0.6)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = this.INK;
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = this.INK;
        ctx.font = 'bold 11px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('[ SET SAIL ]', W / 2, by + 18);
    },

    _drawShopTab(ctx, W, H) {
        this.tavernHover = -1;
        const startX = W / 2 - (this.tavernItems.length * 120) / 2;

        for (let i = 0; i < this.tavernItems.length; i++) {
            const item = this.tavernItems[i];
            const ix = startX + i * 125;
            const iy = 100;
            const iw = 115;
            const ih = 150;

            const hover = Input.mouse.x >= ix && Input.mouse.x <= ix + iw &&
                          Input.mouse.y >= iy && Input.mouse.y <= iy + ih;
            if (hover) this.tavernHover = i;
            const canAfford = Player.gold >= item.cost;

            ctx.fillStyle = hover ? 'rgba(200,180,130,0.4)' : 'rgba(232,213,163,0.3)';
            ctx.fillRect(ix, iy, iw, ih);
            ctx.strokeStyle = hover && canAfford ? this.INK : this.INK_FAINT;
            ctx.lineWidth = hover ? 2 : 1;
            ctx.strokeRect(ix, iy, iw, ih);

            ctx.fillStyle = canAfford ? this.INK : this.INK_FAINT;
            ctx.font = 'bold 10px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText(item.name, ix + iw / 2, iy + 25);

            ctx.fillStyle = this.INK_LIGHT;
            ctx.font = '8px "Courier New"';
            this._wrapText(ctx, item.desc, ix + 8, iy + 45, iw - 16, 13);

            ctx.fillStyle = canAfford ? '#5a3a0a' : '#8a2a1a';
            ctx.font = 'bold 10px "Courier New"';
            ctx.fillText(item.cost + ' Gold', ix + iw / 2, iy + ih - 15);
        }
    },

    _drawContractsTab(ctx, W, H) {
        ctx.fillStyle = this.INK;
        ctx.font = 'bold 10px "Courier New"';
        ctx.textAlign = 'left';
        ctx.fillText('Available Contracts:', 60, 115);

        for (let i = 0; i < GameMap.contracts.length; i++) {
            const c = GameMap.contracts[i];
            const cy = 140 + i * 55;

            ctx.fillStyle = c.completed ? 'rgba(100,150,100,0.15)' :
                            c.accepted ? 'rgba(200,180,100,0.2)' : 'rgba(232,213,163,0.3)';
            ctx.fillRect(50, cy, W - 100, 45);
            ctx.strokeStyle = c.accepted ? this.INK : this.INK_FAINT;
            ctx.strokeRect(50, cy, W - 100, 45);

            ctx.fillStyle = c.completed ? '#4a6a2a' : this.INK;
            ctx.font = '9px "Courier New"';
            ctx.textAlign = 'left';
            ctx.fillText(c.desc, 60, cy + 18);

            ctx.fillStyle = '#6a5a1a';
            ctx.fillText('Reward: ' + c.reward + ' Gold', 60, cy + 32);

            // Accept / status
            ctx.textAlign = 'right';
            if (c.completed) {
                ctx.fillStyle = '#4a6a2a';
                ctx.fillText('COMPLETED', W - 60, cy + 25);
            } else if (c.accepted) {
                ctx.fillStyle = this.INK;
                ctx.fillText('ACCEPTED', W - 60, cy + 25);
            } else {
                const hover = Input.mouse.x >= W - 120 && Input.mouse.x <= W - 55 &&
                              Input.mouse.y >= cy + 10 && Input.mouse.y <= cy + 35;
                ctx.fillStyle = hover ? this.INK : this.INK_LIGHT;
                ctx.fillText('[ACCEPT]', W - 60, cy + 25);
                if (hover && Input.mouse.leftClick) {
                    c.accepted = true;
                }
            }
        }

        if (GameMap.contracts.length === 0) {
            ctx.fillStyle = this.INK_FAINT;
            ctx.font = '10px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText('No contracts available', W / 2, 160);
        }
    },

    _drawMetaTab(ctx, W, H) {
        ctx.fillStyle = this.INK;
        ctx.font = 'bold 10px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('Doubloons: ' + Ship.doubloons, W / 2, 115);

        ctx.fillStyle = this.INK_LIGHT;
        ctx.font = '9px "Courier New"';
        ctx.fillText('Doubloons persist through death — permanent upgrades', W / 2, 135);

        for (let i = 0; i < Ship.META_UPGRADES.length; i++) {
            const mu = Ship.META_UPGRADES[i];
            const my = 160 + i * 50;
            const owned = Ship.metaUpgrades.has(mu.id);

            ctx.fillStyle = owned ? 'rgba(100,150,100,0.15)' : 'rgba(232,213,163,0.3)';
            ctx.fillRect(120, my, W - 240, 40);
            ctx.strokeStyle = owned ? '#4a6a2a' : this.INK_FAINT;
            ctx.strokeRect(120, my, W - 240, 40);

            ctx.fillStyle = owned ? '#4a6a2a' : this.INK;
            ctx.font = 'bold 10px "Courier New"';
            ctx.textAlign = 'left';
            ctx.fillText(mu.name, 135, my + 17);

            ctx.fillStyle = this.INK_LIGHT;
            ctx.font = '8px "Courier New"';
            ctx.fillText(mu.desc, 135, my + 30);

            ctx.textAlign = 'right';
            if (owned) {
                ctx.fillStyle = '#4a6a2a';
                ctx.font = '9px "Courier New"';
                ctx.fillText('OWNED', W - 135, my + 24);
            } else {
                const canAfford = Ship.doubloons >= mu.cost;
                const hover = Input.mouse.x >= W - 200 && Input.mouse.x <= W - 125 &&
                              Input.mouse.y >= my + 5 && Input.mouse.y <= my + 35;
                ctx.fillStyle = canAfford ? (hover ? this.INK : this.INK_LIGHT) : this.INK_FAINT;
                ctx.font = '9px "Courier New"';
                ctx.fillText(mu.cost + ' dbl [BUY]', W - 135, my + 24);
                if (hover && canAfford && Input.mouse.leftClick) {
                    Ship.doubloons -= mu.cost;
                    Ship.metaUpgrades.add(mu.id);
                }
            }
        }
    },

    handlePortClick() {
        const W = Renderer.W;
        const H = Renderer.H;

        // Leave button
        const bx = W / 2 - 60, by = H - 50, bw = 120, bh = 28;
        if (Input.mouse.leftClick &&
            Input.mouse.x >= bx && Input.mouse.x <= bx + bw &&
            Input.mouse.y >= by && Input.mouse.y <= by + bh) {
            return 'leave';
        }

        // Shop purchase
        if (this.portTab === 'shop' && Input.mouse.leftClick && this.tavernHover >= 0) {
            const item = this.tavernItems[this.tavernHover];
            if (Player.gold >= item.cost) {
                Player.gold -= item.cost;
                item.action();
                this.tavernItems.splice(this.tavernHover, 1);
                return 'bought';
            }
        }

        return null;
    },

    // Alias for backwards compat
    initTavern() { this.initPort(); },
    drawTavern(ctx, frame) { this.drawPort(ctx, frame); },
    handleTavernClick() { return this.handlePortClick(); },

    // ---- HELPER ----
    _wrapText(ctx, text, x, y, maxW, lineH) {
        const words = text.split(' ');
        let line = '';
        let cy = y;
        for (const word of words) {
            const test = line + word + ' ';
            if (ctx.measureText(test).width > maxW && line !== '') {
                ctx.fillText(line.trim(), x + maxW / 2, cy);
                cy += lineH;
                line = word + ' ';
            } else {
                line = test;
            }
        }
        if (line.trim()) ctx.fillText(line.trim(), x + maxW / 2, cy);
    },
};
