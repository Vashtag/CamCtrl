// ============================================================
//  COMBAT — Hitboxes, damage, knockback
// ============================================================
const Combat = {
    // Check circle vs circle collision
    circleCollide(ax, ay, ar, bx, by, br) {
        const dx = ax - bx, dy = ay - by;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < ar + br;
    },

    // Check if point is in rectangle
    pointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    },

    // Direction from a to b
    direction(ax, ay, bx, by) {
        const dx = bx - ax, dy = by - ay;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return { x: 0, y: 0 };
        return { x: dx / dist, y: dy / dist };
    },

    distance(ax, ay, bx, by) {
        const dx = bx - ax, dy = by - ay;
        return Math.sqrt(dx * dx + dy * dy);
    },

    // Apply knockback
    applyKnockback(entity, fromX, fromY, force) {
        const dir = this.direction(fromX, fromY, entity.x, entity.y);
        entity.knockbackVX = dir.x * force;
        entity.knockbackVY = dir.y * force;
        entity.knockbackTimer = 0.15;
    },

    // Melee attack hitbox (arc in front of attacker)
    meleeHitCheck(attackerX, attackerY, facing, range, arcDeg, targetX, targetY, targetRadius) {
        const dist = this.distance(attackerX, attackerY, targetX, targetY);
        if (dist > range + targetRadius) return false;

        const angleToTarget = Math.atan2(targetY - attackerY, targetX - attackerX);
        const facingAngle = facing >= 0 ? 0 : Math.PI;
        let diff = angleToTarget - facingAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        return Math.abs(diff) < (arcDeg * Math.PI / 180) / 2;
    },

    // Create a damage number floating text
    damageNumbers: [],

    spawnDamageNumber(x, y, amount, color) {
        this.damageNumbers.push({
            x, y, text: String(amount), color: color || '#ff4444',
            vy: -40, life: 0.8, maxLife: 0.8
        });
    },

    updateDamageNumbers(dt) {
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const d = this.damageNumbers[i];
            d.y += d.vy * dt;
            d.vy *= 0.95;
            d.life -= dt;
            if (d.life <= 0) this.damageNumbers.splice(i, 1);
        }
    },

    drawDamageNumbers(ctx) {
        for (const d of this.damageNumbers) {
            ctx.globalAlpha = Math.max(0, d.life / d.maxLife);
            ctx.fillStyle = d.color;
            ctx.font = 'bold 10px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText(d.text, d.x, d.y);
        }
        ctx.globalAlpha = 1;
    }
};
