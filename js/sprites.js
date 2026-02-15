// ============================================================
//  PROCEDURAL SPRITE DRAWING
//  All sprites drawn with canvas primitives — no external assets
// ============================================================
const Sprites = {
    TILE: 16,

    // Color palettes
    PAL: {
        water1: '#0e5a7e',
        water2: '#0c4e6e',
        water3: '#1a7a9e',
        sand1: '#e8c872',
        sand2: '#d4b45e',
        sand3: '#f0d888',
        grass1: '#2d8c3e',
        grass2: '#258034',
        grass3: '#3a9c4e',
        darkGrass: '#1e6830',
        jungle1: '#1a6028',
        jungle2: '#22702e',
        rock1: '#6e6e78',
        rock2: '#5a5a64',
        wall1: '#4a3a2a',
        wall2: '#3e3020',
        wood1: '#7a5a3a',
        wood2: '#6a4a2e',
        path1: '#c8a868',
        path2: '#b89858',
        lava1: '#ff4400',
        lava2: '#cc3300',
        ghostGround: '#2a2a3e',
        bone: '#d8d0c0',

        // Character colors
        playerSkin: '#e8b878',
        playerShirt: '#cc3333',
        playerBandana: '#cc3333',
        playerPants: '#3a3028',
        playerBoot: '#2a2018',
        playerHair: '#3a2818',

        // Enemy colors
        crabBody: '#cc4422',
        crabClaw: '#dd5533',
        pirateSkin: '#d0a060',
        pirateShirt: '#444488',
        pirateHat: '#222222',
        bossCoat: '#660022',
        bossGold: '#ffcc00',

        // Items
        gold: '#ffd700',
        heart: '#ff3355',
        ammo: '#aaaaaa',
        chest: '#8a6a3a',
        chestGold: '#ffc800',

        // UI
        hpFull: '#ff3344',
        hpEmpty: '#3a1a1a',
        rum: '#aa6622',
        rumBottle: '#2a6a2a',
    },

    // Draw a player sprite
    drawPlayer(ctx, x, y, facing, frame, isDodging, attackFrame) {
        const T = this.TILE;
        ctx.save();
        ctx.translate(x, y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-5, T - 4, 10, 3);

        // Dodge roll effect
        if (isDodging) {
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(-T / 2 + 2, -2, T - 4, T);
        }

        const flip = facing < 0 ? -1 : 1;
        ctx.scale(flip, 1);

        // Boots
        ctx.fillStyle = this.PAL.playerBoot;
        ctx.fillRect(-4, T - 6, 3, 4);
        ctx.fillRect(1, T - 6, 3, 4);

        // Pants
        ctx.fillStyle = this.PAL.playerPants;
        ctx.fillRect(-4, T - 10, 8, 5);

        // Shirt
        ctx.fillStyle = this.PAL.playerShirt;
        ctx.fillRect(-5, T - 16, 10, 7);

        // Skin (arms)
        ctx.fillStyle = this.PAL.playerSkin;
        ctx.fillRect(-6, T - 14, 2, 4);
        ctx.fillRect(5, T - 14, 2, 4);

        // Head
        ctx.fillStyle = this.PAL.playerSkin;
        ctx.fillRect(-3, T - 22, 7, 6);

        // Hair
        ctx.fillStyle = this.PAL.playerHair;
        ctx.fillRect(-3, T - 22, 7, 2);

        // Bandana
        ctx.fillStyle = this.PAL.playerBandana;
        ctx.fillRect(-4, T - 22, 9, 3);

        // Eye
        ctx.fillStyle = '#000';
        ctx.fillRect(1, T - 19, 2, 1);

        // Weapon in hand (cutlass)
        if (attackFrame > 0) {
            ctx.save();
            ctx.translate(6, T - 14);
            ctx.rotate(-0.5 + attackFrame * 1.5);
            ctx.fillStyle = '#aaaaaa';
            ctx.fillRect(0, -1, 10, 2);
            ctx.fillStyle = this.PAL.wood2;
            ctx.fillRect(-2, -2, 3, 4);
            ctx.restore();
        } else {
            ctx.fillStyle = '#aaaaaa';
            ctx.fillRect(6, T - 14, 2, 7);
            ctx.fillStyle = this.PAL.wood2;
            ctx.fillRect(5, T - 8, 4, 3);
        }

        ctx.restore();
    },

    // Draw enemy - crab
    drawCrab(ctx, x, y, frame, hp, maxHp) {
        const T = this.TILE;
        ctx.save();
        ctx.translate(x, y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-6, T - 4, 12, 3);

        // Body
        ctx.fillStyle = this.PAL.crabBody;
        ctx.fillRect(-5, T - 10, 10, 7);

        // Claws
        const cOff = Math.sin(frame * 0.1) * 2;
        ctx.fillStyle = this.PAL.crabClaw;
        ctx.fillRect(-9, T - 10 + cOff, 5, 4);
        ctx.fillRect(5, T - 10 - cOff, 5, 4);

        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(-3, T - 12, 2, 2);
        ctx.fillRect(2, T - 12, 2, 2);

        // Legs
        ctx.fillStyle = this.PAL.crabBody;
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(-7, T - 6 + i * 2, 2, 1);
            ctx.fillRect(6, T - 6 + i * 2, 2, 1);
        }

        // HP bar
        if (hp < maxHp) {
            this.drawHPBar(ctx, -6, T - 16, 12, hp, maxHp);
        }

        ctx.restore();
    },

    // Draw enemy - pirate melee
    drawPirateMelee(ctx, x, y, facing, frame, hp, maxHp, attackFrame) {
        const T = this.TILE;
        ctx.save();
        ctx.translate(x, y);
        const flip = facing < 0 ? -1 : 1;
        ctx.scale(flip, 1);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-5, T - 4, 10, 3);

        // Boots
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-4, T - 6, 3, 4);
        ctx.fillRect(1, T - 6, 3, 4);

        // Pants
        ctx.fillStyle = '#3a3a44';
        ctx.fillRect(-4, T - 10, 8, 5);

        // Shirt
        ctx.fillStyle = this.PAL.pirateShirt;
        ctx.fillRect(-5, T - 16, 10, 7);

        // Belt
        ctx.fillStyle = '#8a6a2a';
        ctx.fillRect(-5, T - 10, 10, 1);

        // Skin
        ctx.fillStyle = this.PAL.pirateSkin;
        ctx.fillRect(-6, T - 14, 2, 4);
        ctx.fillRect(5, T - 14, 2, 4);

        // Head
        ctx.fillStyle = this.PAL.pirateSkin;
        ctx.fillRect(-3, T - 22, 7, 6);

        // Hat
        ctx.fillStyle = this.PAL.pirateHat;
        ctx.fillRect(-5, T - 24, 11, 3);
        ctx.fillRect(-3, T - 26, 7, 2);

        // Eye
        ctx.fillStyle = '#000';
        ctx.fillRect(1, T - 19, 2, 1);

        // Weapon
        if (attackFrame > 0) {
            ctx.save();
            ctx.translate(6, T - 14);
            ctx.rotate(-0.3 + attackFrame * 1.2);
            ctx.fillStyle = '#888888';
            ctx.fillRect(0, -1, 9, 2);
            ctx.restore();
        } else {
            ctx.fillStyle = '#888888';
            ctx.fillRect(6, T - 12, 2, 6);
        }

        ctx.restore();

        // HP bar
        ctx.save();
        ctx.translate(x, y);
        if (hp < maxHp) {
            this.drawHPBar(ctx, -6, T - 28, 12, hp, maxHp);
        }
        ctx.restore();
    },

    // Draw enemy - pirate ranged
    drawPirateRanged(ctx, x, y, facing, frame, hp, maxHp) {
        const T = this.TILE;
        ctx.save();
        ctx.translate(x, y);
        const flip = facing < 0 ? -1 : 1;
        ctx.scale(flip, 1);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-5, T - 4, 10, 3);

        // Boots
        ctx.fillStyle = '#2a2018';
        ctx.fillRect(-4, T - 6, 3, 4);
        ctx.fillRect(1, T - 6, 3, 4);

        // Pants
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(-4, T - 10, 8, 5);

        // Vest
        ctx.fillStyle = '#884422';
        ctx.fillRect(-5, T - 16, 10, 7);

        // Skin
        ctx.fillStyle = this.PAL.pirateSkin;
        ctx.fillRect(-6, T - 14, 2, 4);
        ctx.fillRect(5, T - 14, 2, 4);

        // Head
        ctx.fillStyle = this.PAL.pirateSkin;
        ctx.fillRect(-3, T - 22, 7, 6);

        // Bandana
        ctx.fillStyle = '#228822';
        ctx.fillRect(-4, T - 22, 9, 3);

        // Eye
        ctx.fillStyle = '#000';
        ctx.fillRect(1, T - 19, 2, 1);

        // Pistol
        ctx.fillStyle = '#555555';
        ctx.fillRect(5, T - 13, 8, 2);
        ctx.fillStyle = this.PAL.wood2;
        ctx.fillRect(5, T - 12, 3, 4);

        ctx.restore();

        // HP bar
        ctx.save();
        ctx.translate(x, y);
        if (hp < maxHp) {
            this.drawHPBar(ctx, -6, T - 26, 12, hp, maxHp);
        }
        ctx.restore();
    },

    // Draw boss
    drawBoss(ctx, x, y, facing, frame, hp, maxHp, phase) {
        const T = this.TILE;
        const scale = 1.5;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        const flip = facing < 0 ? -1 : 1;
        ctx.scale(flip, 1);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(-6, T - 4, 12, 4);

        // Boots
        ctx.fillStyle = '#1a1010';
        ctx.fillRect(-5, T - 7, 4, 5);
        ctx.fillRect(1, T - 7, 4, 5);

        // Pants
        ctx.fillStyle = '#2a1a1a';
        ctx.fillRect(-5, T - 11, 10, 5);

        // Coat
        ctx.fillStyle = this.PAL.bossCoat;
        ctx.fillRect(-6, T - 18, 12, 8);

        // Gold trim
        ctx.fillStyle = this.PAL.bossGold;
        ctx.fillRect(-6, T - 18, 1, 8);
        ctx.fillRect(5, T - 18, 1, 8);
        ctx.fillRect(-6, T - 11, 12, 1);

        // Head
        ctx.fillStyle = this.PAL.pirateSkin;
        ctx.fillRect(-3, T - 24, 7, 6);

        // Beard
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-2, T - 19, 5, 3);

        // Hat
        ctx.fillStyle = '#1a0a0a';
        ctx.fillRect(-6, T - 27, 13, 4);
        ctx.fillRect(-4, T - 30, 9, 3);
        // Skull on hat
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, T - 29, 3, 2);

        // Dual cutlasses
        const swing = Math.sin(frame * 0.15) * 0.3;
        ctx.save();
        ctx.translate(7, T - 15);
        ctx.rotate(swing);
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(0, -1, 12, 2);
        ctx.fillStyle = this.PAL.bossGold;
        ctx.fillRect(-1, -2, 3, 4);
        ctx.restore();

        ctx.save();
        ctx.translate(-7, T - 15);
        ctx.rotate(-swing);
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(-12, -1, 12, 2);
        ctx.fillStyle = this.PAL.bossGold;
        ctx.fillRect(-2, -2, 3, 4);
        ctx.restore();

        // Phase glow
        if (phase >= 2) {
            ctx.globalAlpha = 0.3 + Math.sin(frame * 0.08) * 0.2;
            ctx.fillStyle = phase >= 3 ? '#8800ff' : '#ff4400';
            ctx.fillRect(-8, T - 28, 16, 26);
            ctx.globalAlpha = 1;
        }

        ctx.restore();

        // HP bar (wider for boss)
        ctx.save();
        ctx.translate(x, y);
        this.drawHPBar(ctx, -16, -30, 32, hp, maxHp);
        ctx.restore();
    },

    // Draw loot items
    drawGold(ctx, x, y, frame) {
        ctx.save();
        ctx.translate(x, y);
        const bob = Math.sin(frame * 0.08) * 2;
        ctx.fillStyle = this.PAL.gold;
        ctx.fillRect(-3, -3 + bob, 6, 6);
        ctx.fillStyle = '#ffee88';
        ctx.fillRect(-1, -1 + bob, 2, 2);
        ctx.restore();
    },

    drawHeart(ctx, x, y, frame) {
        ctx.save();
        ctx.translate(x, y);
        const bob = Math.sin(frame * 0.1) * 2;
        ctx.fillStyle = this.PAL.heart;
        ctx.fillRect(-3, -2 + bob, 2, 3);
        ctx.fillRect(1, -2 + bob, 2, 3);
        ctx.fillRect(-4, -3 + bob, 3, 2);
        ctx.fillRect(1, -3 + bob, 3, 2);
        ctx.fillRect(-2, 1 + bob, 4, 2);
        ctx.fillRect(-1, 3 + bob, 2, 1);
        ctx.restore();
    },

    drawChest(ctx, x, y, frame, opened) {
        ctx.save();
        ctx.translate(x, y);
        // Base
        ctx.fillStyle = this.PAL.chest;
        ctx.fillRect(-6, -2, 12, 8);
        // Lid
        ctx.fillStyle = opened ? this.PAL.chest : '#9a7a4a';
        ctx.fillRect(-6, -6, 12, 4);
        // Lock
        ctx.fillStyle = this.PAL.chestGold;
        ctx.fillRect(-1, -3, 2, 3);
        if (!opened) {
            // Sparkle
            if (Math.sin(frame * 0.06) > 0.5) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(3, -5, 1, 1);
            }
        }
        ctx.restore();
    },

    drawAmmo(ctx, x, y, frame) {
        ctx.save();
        ctx.translate(x, y);
        const bob = Math.sin(frame * 0.12 + 1) * 2;
        ctx.fillStyle = this.PAL.ammo;
        ctx.fillRect(-2, -3 + bob, 4, 6);
        ctx.fillStyle = '#666666';
        ctx.fillRect(-1, -3 + bob, 2, 2);
        ctx.restore();
    },

    drawWeapon(ctx, x, y, frame, type) {
        ctx.save();
        ctx.translate(x, y);
        const bob = Math.sin(frame * 0.07) * 2;
        // Glow
        ctx.fillStyle = 'rgba(255,255,200,0.15)';
        ctx.beginPath(); ctx.arc(0, bob, 10, 0, Math.PI * 2); ctx.fill();
        // Blade
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(-1, -8 + bob, 2, 10);
        // Guard
        ctx.fillStyle = this.PAL.bossGold;
        ctx.fillRect(-3, 1 + bob, 6, 2);
        // Handle
        ctx.fillStyle = this.PAL.wood1;
        ctx.fillRect(-1, 3 + bob, 2, 4);
        ctx.restore();
    },

    // Projectile
    drawBullet(ctx, x, y) {
        ctx.fillStyle = '#ffee88';
        ctx.fillRect(x - 2, y - 2, 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 1, y - 1, 2, 2);
    },

    drawEnemyBullet(ctx, x, y) {
        ctx.fillStyle = '#ff6644';
        ctx.fillRect(x - 2, y - 1, 4, 2);
    },

    // HP bar helper
    drawHPBar(ctx, x, y, w, hp, maxHp) {
        const pct = hp / maxHp;
        ctx.fillStyle = this.PAL.hpEmpty;
        ctx.fillRect(x, y, w, 3);
        ctx.fillStyle = pct > 0.5 ? '#44cc44' : pct > 0.25 ? '#ccaa22' : '#cc2222';
        ctx.fillRect(x, y, w * pct, 3);
    },

    // Tile drawing
    drawWaterTile(ctx, x, y, frame, gx, gy) {
        const T = this.TILE;
        const shimmer = Math.sin(frame * 0.03 + gx * 0.5 + gy * 0.7) * 0.15;
        ctx.fillStyle = (gx + gy) % 2 === 0 ? this.PAL.water1 : this.PAL.water2;
        ctx.fillRect(x, y, T, T);
        // Wave highlight
        if (Math.sin(frame * 0.02 + gx * 0.8 + gy * 0.3) > 0.6) {
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(x + 2, y + T / 2, T - 4, 1);
        }
    },

    drawSandTile(ctx, x, y, gx, gy) {
        const T = this.TILE;
        ctx.fillStyle = (gx + gy) % 2 === 0 ? this.PAL.sand1 : this.PAL.sand2;
        ctx.fillRect(x, y, T, T);
        // Sand dots
        if ((gx * 7 + gy * 13) % 5 === 0) {
            ctx.fillStyle = this.PAL.sand3;
            ctx.fillRect(x + 4, y + 6, 1, 1);
        }
    },

    drawGrassTile(ctx, x, y, gx, gy) {
        const T = this.TILE;
        ctx.fillStyle = (gx + gy) % 2 === 0 ? this.PAL.grass1 : this.PAL.grass2;
        ctx.fillRect(x, y, T, T);
        // Grass tufts
        if ((gx * 3 + gy * 7) % 4 === 0) {
            ctx.fillStyle = this.PAL.grass3;
            ctx.fillRect(x + 3, y + 2, 1, 2);
            ctx.fillRect(x + 8, y + 10, 1, 2);
        }
    },

    drawRockTile(ctx, x, y, gx, gy) {
        const T = this.TILE;
        ctx.fillStyle = (gx + gy) % 2 === 0 ? this.PAL.rock1 : this.PAL.rock2;
        ctx.fillRect(x, y, T, T);
    },

    drawWallTile(ctx, x, y, gx, gy) {
        const T = this.TILE;
        ctx.fillStyle = this.PAL.wall1;
        ctx.fillRect(x, y, T, T);
        // Brick pattern
        const row = gy % 2;
        ctx.fillStyle = this.PAL.wall2;
        ctx.fillRect(x, y + T - 1, T, 1);
        ctx.fillRect(x + (row ? 0 : T / 2), y, 1, T);
    },

    drawPathTile(ctx, x, y, gx, gy) {
        const T = this.TILE;
        ctx.fillStyle = (gx + gy) % 2 === 0 ? this.PAL.path1 : this.PAL.path2;
        ctx.fillRect(x, y, T, T);
    },

    drawWoodTile(ctx, x, y) {
        const T = this.TILE;
        ctx.fillStyle = this.PAL.wood1;
        ctx.fillRect(x, y, T, T);
        ctx.fillStyle = this.PAL.wood2;
        ctx.fillRect(x, y + 3, T, 1);
        ctx.fillRect(x, y + 9, T, 1);
    },

    // Explosion particle
    drawExplosion(ctx, x, y, radius, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, '#ffcc44');
        grad.addColorStop(0.5, '#ff6600');
        grad.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
};
