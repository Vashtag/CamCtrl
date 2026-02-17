// ============================================================
//  RENDERER — Camera, screen shake, particles
// ============================================================
const Renderer = {
    canvas: null,
    ctx: null,
    W: 640,
    H: 480,
    scale: 1,

    // Camera
    cam: { x: 0, y: 0, targetX: 0, targetY: 0 },

    // Screen shake
    shake: { timer: 0, intensity: 0 },

    // Particles
    particles: [],

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        const aspect = this.W / this.H;
        let cw = window.innerWidth * 0.98;
        let ch = window.innerHeight * 0.98;
        if (cw / ch > aspect) cw = ch * aspect;
        else ch = cw / aspect;

        this.canvas.style.width = cw + 'px';
        this.canvas.style.height = ch + 'px';
        this.canvas.width = this.W;
        this.canvas.height = this.H;
        this.scale = cw / this.W;
        Input.scale = this.scale;
    },

    clear() {
        this.ctx.fillStyle = '#e8d5a3';
        this.ctx.fillRect(0, 0, this.W, this.H);
    },

    // Update camera to follow target
    updateCamera(targetX, targetY, dt) {
        this.cam.targetX = targetX - this.W / 2;
        this.cam.targetY = targetY - this.H / 2;
        const lerp = 1 - Math.pow(0.01, dt);
        this.cam.x += (this.cam.targetX - this.cam.x) * lerp;
        this.cam.y += (this.cam.targetY - this.cam.y) * lerp;
    },

    // Apply camera transform
    beginCamera() {
        const ctx = this.ctx;
        ctx.save();

        // Screen shake
        let sx = 0, sy = 0;
        if (this.shake.timer > 0) {
            sx = (Math.random() - 0.5) * this.shake.intensity;
            sy = (Math.random() - 0.5) * this.shake.intensity;
        }

        ctx.translate(-Math.floor(this.cam.x) + sx, -Math.floor(this.cam.y) + sy);
    },

    endCamera() {
        this.ctx.restore();
    },

    doShake(intensity, duration) {
        this.shake.intensity = intensity;
        this.shake.timer = duration;
    },

    updateShake(dt) {
        if (this.shake.timer > 0) {
            this.shake.timer -= dt;
            if (this.shake.timer <= 0) {
                this.shake.intensity = 0;
            }
        }
    },

    // World to screen coords
    worldToScreen(wx, wy) {
        return {
            x: wx - this.cam.x,
            y: wy - this.cam.y,
        };
    },

    screenToWorld(sx, sy) {
        return {
            x: sx + this.cam.x,
            y: sy + this.cam.y,
        };
    },

    // Particles
    spawnParticle(x, y, vx, vy, color, size, life) {
        this.particles.push({ x, y, vx, vy, color, size, life, maxLife: life });
    },

    spawnBurst(x, y, count, color, speed, size, life) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const sp = speed * (0.5 + Math.random());
            this.spawnParticle(x, y, Math.cos(angle) * sp, Math.sin(angle) * sp, color, size * (0.5 + Math.random()), life);
        }
    },

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    },

    drawParticles() {
        const ctx = this.ctx;
        for (const p of this.particles) {
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }
};
