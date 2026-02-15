// ============================================================
//  ISLAND GENERATION — Procedural top-down islands
// ============================================================
const Island = {
    TILE: 16,
    width: 0,
    height: 0,
    tiles: [],    // 2D array: 0=water, 1=sand, 2=grass, 3=jungle, 4=rock/wall, 5=path, 6=wood(floor)
    rooms: [],
    spawnX: 0,
    spawnY: 0,
    exitX: 0,
    exitY: 0,
    chestPositions: [],
    enemySpawns: [],

    generate(difficulty) {
        const w = 50 + Math.floor(Math.random() * 10);
        const h = 40 + Math.floor(Math.random() * 8);
        this.width = w;
        this.height = h;
        this.tiles = Array.from({ length: h }, () => Array(w).fill(0));
        this.rooms = [];
        this.chestPositions = [];
        this.enemySpawns = [];

        // Step 1: Create island shape (elliptical with noise)
        const cx = w / 2, cy = h / 2;
        const rx = w / 2 - 4, ry = h / 2 - 4;
        const noiseSeed = Math.random() * 1000;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dx = (x - cx) / rx;
                const dy = (y - cy) / ry;
                const dist = dx * dx + dy * dy;
                const noise = Math.sin(x * 0.3 + noiseSeed) * 0.15 +
                              Math.sin(y * 0.4 + noiseSeed * 2) * 0.12 +
                              Math.sin((x + y) * 0.2 + noiseSeed * 3) * 0.1;

                if (dist + noise < 0.3) {
                    this.tiles[y][x] = 3; // jungle interior
                } else if (dist + noise < 0.6) {
                    this.tiles[y][x] = 2; // grass
                } else if (dist + noise < 0.85) {
                    this.tiles[y][x] = 1; // sand/beach
                }
                // else water (0)
            }
        }

        // Step 2: Place rooms (structures on the island)
        const numRooms = 3 + Math.floor(difficulty * 0.5);
        for (let i = 0; i < numRooms * 3 && this.rooms.length < numRooms; i++) {
            const rw = 5 + Math.floor(Math.random() * 4);
            const rh = 4 + Math.floor(Math.random() * 4);
            const rx2 = Math.floor(cx - 12 + Math.random() * 24);
            const ry2 = Math.floor(cy - 10 + Math.random() * 16);

            if (rx2 < 3 || ry2 < 3 || rx2 + rw >= w - 3 || ry2 + rh >= h - 3) continue;

            // Check for overlap
            let overlap = false;
            for (const room of this.rooms) {
                if (rx2 < room.x + room.w + 2 && rx2 + rw + 2 > room.x &&
                    ry2 < room.y + room.h + 2 && ry2 + rh + 2 > room.y) {
                    overlap = true; break;
                }
            }
            if (overlap) continue;

            // Check that room center is on land
            if (this.tiles[ry2 + Math.floor(rh / 2)][rx2 + Math.floor(rw / 2)] === 0) continue;

            const room = { x: rx2, y: ry2, w: rw, h: rh, id: this.rooms.length };
            this.rooms.push(room);

            // Carve room walls and floor
            for (let dy = 0; dy < rh; dy++) {
                for (let dx = 0; dx < rw; dx++) {
                    const tx = rx2 + dx, ty = ry2 + dy;
                    if (dx === 0 || dx === rw - 1 || dy === 0 || dy === rh - 1) {
                        this.tiles[ty][tx] = 4; // wall
                    } else {
                        this.tiles[ty][tx] = 6; // wood floor
                    }
                }
            }

            // Door openings (1-2 per room)
            const doorSide = Math.floor(Math.random() * 4);
            this._placeDoor(room, doorSide);
            if (Math.random() > 0.4) {
                this._placeDoor(room, (doorSide + 2) % 4);
            }
        }

        // Step 3: Paths between rooms
        for (let i = 0; i < this.rooms.length - 1; i++) {
            this._carvePath(this.rooms[i], this.rooms[i + 1]);
        }

        // Step 4: Spawn point at bottom of island (beach)
        this.spawnX = Math.floor(cx) * this.TILE;
        this.spawnY = (h - 6) * this.TILE;
        // Ensure spawn is on land
        for (let y = h - 1; y > h / 2; y--) {
            if (this.tiles[y][Math.floor(cx)] !== 0) {
                this.spawnY = y * this.TILE;
                break;
            }
        }
        this.spawnX = Math.floor(cx) * this.TILE;

        // Step 5: Treasure room / exit at the far room
        if (this.rooms.length > 0) {
            const lastRoom = this.rooms[this.rooms.length - 1];
            this.exitX = (lastRoom.x + Math.floor(lastRoom.w / 2)) * this.TILE;
            this.exitY = (lastRoom.y + Math.floor(lastRoom.h / 2)) * this.TILE;
            this.chestPositions.push({ x: this.exitX, y: this.exitY });
        } else {
            this.exitX = cx * this.TILE;
            this.exitY = 8 * this.TILE;
        }

        // Step 6: Additional chests
        for (const room of this.rooms) {
            if (room === this.rooms[this.rooms.length - 1]) continue;
            if (Math.random() > 0.5) {
                this.chestPositions.push({
                    x: (room.x + 1 + Math.floor(Math.random() * (room.w - 2))) * this.TILE,
                    y: (room.y + 1 + Math.floor(Math.random() * (room.h - 2))) * this.TILE,
                });
            }
        }

        // Step 7: Enemy spawn points
        for (const room of this.rooms) {
            const count = 1 + Math.floor(Math.random() * 2) + Math.floor(difficulty * 0.3);
            for (let i = 0; i < count; i++) {
                this.enemySpawns.push({
                    x: (room.x + 1 + Math.floor(Math.random() * (room.w - 2))) * this.TILE + this.TILE / 2,
                    y: (room.y + 1 + Math.floor(Math.random() * (room.h - 2))) * this.TILE + this.TILE / 2,
                    roomId: room.id
                });
            }
        }
        // Outdoor enemies
        const outdoorCount = 2 + Math.floor(difficulty * 0.5);
        for (let i = 0; i < outdoorCount; i++) {
            const ex = Math.floor(cx - 10 + Math.random() * 20);
            const ey = Math.floor(cy - 8 + Math.random() * 12);
            if (ex > 0 && ey > 0 && ex < w && ey < h && this.tiles[ey][ex] >= 1 && this.tiles[ey][ex] <= 3) {
                this.enemySpawns.push({
                    x: ex * this.TILE + this.TILE / 2,
                    y: ey * this.TILE + this.TILE / 2,
                    roomId: -1
                });
            }
        }
    },

    _placeDoor(room, side) {
        let dx, dy;
        switch (side) {
            case 0: // top
                dx = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
                dy = room.y;
                break;
            case 1: // right
                dx = room.x + room.w - 1;
                dy = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
                break;
            case 2: // bottom
                dx = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
                dy = room.y + room.h - 1;
                break;
            case 3: // left
                dx = room.x;
                dy = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
                break;
        }
        if (dy >= 0 && dy < this.height && dx >= 0 && dx < this.width) {
            this.tiles[dy][dx] = 5; // path (door opening)
        }
    },

    _carvePath(rA, rB) {
        let ax = Math.floor(rA.x + rA.w / 2);
        let ay = Math.floor(rA.y + rA.h / 2);
        let bx = Math.floor(rB.x + rB.w / 2);
        let by = Math.floor(rB.y + rB.h / 2);

        // L-shaped path
        let cx = ax;
        while (cx !== bx) {
            if (this.tiles[ay] && this.tiles[ay][cx] !== undefined) {
                if (this.tiles[ay][cx] === 2 || this.tiles[ay][cx] === 3 || this.tiles[ay][cx] === 1) {
                    this.tiles[ay][cx] = 5;
                }
            }
            cx += cx < bx ? 1 : -1;
        }
        let cy = ay;
        while (cy !== by) {
            if (this.tiles[cy] && this.tiles[cy][bx] !== undefined) {
                if (this.tiles[cy][bx] === 2 || this.tiles[cy][bx] === 3 || this.tiles[cy][bx] === 1) {
                    this.tiles[cy][bx] = 5;
                }
            }
            cy += cy < by ? 1 : -1;
        }
    },

    // Check if a position is walkable
    isWalkable(px, py) {
        const gx = Math.floor(px / this.TILE);
        const gy = Math.floor(py / this.TILE);
        if (gx < 0 || gy < 0 || gx >= this.width || gy >= this.height) return false;
        const tile = this.tiles[gy][gx];
        return tile !== 0 && tile !== 4; // not water, not wall
    },

    // Check tile type at pixel pos
    getTileAt(px, py) {
        const gx = Math.floor(px / this.TILE);
        const gy = Math.floor(py / this.TILE);
        if (gx < 0 || gy < 0 || gx >= this.width || gy >= this.height) return 0;
        return this.tiles[gy][gx];
    },

    // Render visible portion
    draw(ctx, camX, camY, screenW, screenH, frame) {
        const T = this.TILE;
        const startGX = Math.max(0, Math.floor(camX / T) - 1);
        const startGY = Math.max(0, Math.floor(camY / T) - 1);
        const endGX = Math.min(this.width, Math.ceil((camX + screenW) / T) + 1);
        const endGY = Math.min(this.height, Math.ceil((camY + screenH) / T) + 1);

        for (let gy = startGY; gy < endGY; gy++) {
            for (let gx = startGX; gx < endGX; gx++) {
                const tile = this.tiles[gy][gx];
                const sx = gx * T;
                const sy = gy * T;

                switch (tile) {
                    case 0: Sprites.drawWaterTile(ctx, sx, sy, frame, gx, gy); break;
                    case 1: Sprites.drawSandTile(ctx, sx, sy, gx, gy); break;
                    case 2: Sprites.drawGrassTile(ctx, sx, sy, gx, gy); break;
                    case 3:
                        Sprites.drawGrassTile(ctx, sx, sy, gx, gy);
                        // Jungle overlay — darker + occasional tree
                        ctx.fillStyle = 'rgba(0,30,10,0.25)';
                        ctx.fillRect(sx, sy, T, T);
                        break;
                    case 4: Sprites.drawWallTile(ctx, sx, sy, gx, gy); break;
                    case 5: Sprites.drawPathTile(ctx, sx, sy, gx, gy); break;
                    case 6: Sprites.drawWoodTile(ctx, sx, sy); break;
                }
            }
        }
    },

    // Get pixel dimensions
    pixelWidth() { return this.width * this.TILE; },
    pixelHeight() { return this.height * this.TILE; },
};
