// ============================================================
//  INPUT HANDLER
// ============================================================
const Input = {
    keys: {},
    mouse: { x: 0, y: 0, worldX: 0, worldY: 0, left: false, right: false, leftClick: false, rightClick: false },
    scale: 1,
    offsetX: 0,
    offsetY: 0,

    init(canvas) {
        this.canvas = canvas;

        document.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });
        document.addEventListener('keyup', e => {
            this.keys[e.code] = false;
        });

        canvas.addEventListener('mousemove', e => {
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = (e.clientX - rect.left) / this.scale;
            this.mouse.y = (e.clientY - rect.top) / this.scale;
        });
        canvas.addEventListener('mousedown', e => {
            e.preventDefault();
            if (e.button === 0) { this.mouse.left = true; this.mouse.leftClick = true; }
            if (e.button === 2) { this.mouse.right = true; this.mouse.rightClick = true; }
        });
        canvas.addEventListener('mouseup', e => {
            if (e.button === 0) this.mouse.left = false;
            if (e.button === 2) this.mouse.right = false;
        });
        canvas.addEventListener('contextmenu', e => e.preventDefault());
    },

    clearClicks() {
        this.mouse.leftClick = false;
        this.mouse.rightClick = false;
    },

    isDown(code) {
        return !!this.keys[code];
    }
};
