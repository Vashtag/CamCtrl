// ============================================================
//  LOOT — Items, drops, pickups
// ============================================================
const Loot = {
    items: [],  // active items on the ground

    weapons: [
        { id: 'rusty_cutlass', name: 'Rusty Cutlass', damage: 8, speed: 1.0, range: 28, desc: 'A worn but serviceable blade.' },
        { id: 'captains_saber', name: "Captain's Saber", damage: 12, speed: 1.3, range: 30, desc: '3rd hit crits for 2x damage.', special: 'combo_crit' },
        { id: 'boarding_axe', name: 'Boarding Axe', damage: 18, speed: 0.6, range: 24, desc: 'Slow but devastating.' },
        { id: 'shark_blade', name: 'Shark-Tooth Blade', damage: 10, speed: 1.0, range: 26, desc: 'Causes bleed (3 dmg/s for 2s).', special: 'bleed' },
        { id: 'coral_mace', name: 'Coral Mace', damage: 15, speed: 0.7, range: 26, desc: 'Knockback on hit.', special: 'knockback' },
    ],

    reset() {
        this.items = [];
    },

    spawnGold(x, y, amount) {
        this.items.push({ type: 'gold', x, y, amount: amount || (5 + Math.floor(Math.random() * 10)), timer: 0 });
    },

    spawnHeart(x, y) {
        this.items.push({ type: 'heart', x, y, healAmount: 15, timer: 0 });
    },

    spawnAmmo(x, y) {
        this.items.push({ type: 'ammo', x, y, amount: 3 + Math.floor(Math.random() * 3), timer: 0 });
    },

    spawnWeapon(x, y, weaponId) {
        const weapon = this.weapons.find(w => w.id === weaponId) || this.weapons[Math.floor(Math.random() * this.weapons.length)];
        this.items.push({ type: 'weapon', x, y, weapon: { ...weapon }, timer: 0 });
    },

    spawnChestLoot(x, y, difficulty) {
        // Gold always
        this.spawnGold(x - 10, y, 15 + Math.floor(Math.random() * 20 * difficulty));
        this.spawnGold(x + 10, y, 10 + Math.floor(Math.random() * 15));

        // Maybe heart
        if (Math.random() > 0.4) {
            this.spawnHeart(x, y - 12);
        }

        // Maybe ammo
        if (Math.random() > 0.5) {
            this.spawnAmmo(x + 15, y + 5);
        }

        // Maybe weapon (rare)
        if (Math.random() > 0.7) {
            const rng = Math.floor(Math.random() * (this.weapons.length - 1)) + 1;
            this.spawnWeapon(x, y + 15, this.weapons[rng].id);
        }
    },

    spawnEnemyDrop(x, y) {
        // Small gold drop
        if (Math.random() > 0.3) {
            this.spawnGold(x, y, 3 + Math.floor(Math.random() * 8));
        }
        // Rare heart
        if (Math.random() > 0.85) {
            this.spawnHeart(x + (Math.random() - 0.5) * 10, y);
        }
        // Rare ammo
        if (Math.random() > 0.8) {
            this.spawnAmmo(x, y + 5);
        }
    },

    update(dt) {
        for (const item of this.items) {
            item.timer += dt;
        }
    },

    draw(ctx, frame) {
        for (const item of this.items) {
            switch (item.type) {
                case 'gold': Sprites.drawGold(ctx, item.x, item.y, frame); break;
                case 'heart': Sprites.drawHeart(ctx, item.x, item.y, frame); break;
                case 'ammo': Sprites.drawAmmo(ctx, item.x, item.y, frame); break;
                case 'weapon': Sprites.drawWeapon(ctx, item.x, item.y, frame, item.weapon.id); break;
            }
        }
    },

    // Check pickup with player
    checkPickup(px, py, radius) {
        const picked = [];
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            if (item.timer < 0.3) continue; // brief delay before pickup
            const dist = Combat.distance(px, py, item.x, item.y);
            if (dist < radius + 10) {
                picked.push(item);
                this.items.splice(i, 1);
            }
        }
        return picked;
    }
};
