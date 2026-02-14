// ===== MAP.JS - Procedural Floor Plan Generation =====
// Generates a grid-based building with rooms, corridors, doors, and a vault.

const MapGen = (() => {
  // Tile types
  const TILE = {
    WALL: 0,
    FLOOR: 1,
    DOOR: 2,
    VAULT: 3,
    ENTRY: 4,
    CORRIDOR: 5,
  };

  const COLS = 30;
  const ROWS = 25;

  function create(shiftNum) {
    const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(TILE.WALL));
    const rooms = [];
    const doors = [];

    // Place rooms using BSP-like approach
    const rects = splitSpace(1, 1, COLS - 2, ROWS - 2, 4 + Math.min(shiftNum, 3));
    for (const rect of rects) {
      // Shrink rect to create walls between rooms
      const room = {
        x: rect.x + 1,
        y: rect.y + 1,
        w: rect.w - 2,
        h: rect.h - 2,
        id: rooms.length,
        name: `Room ${String.fromCharCode(65 + rooms.length)}`,
        type: 'normal',
      };
      if (room.w < 3 || room.h < 3) continue;
      rooms.push(room);
      carveRoom(grid, room);
    }

    if (rooms.length < 4) {
      // Fallback: place rooms manually
      return createFallback(shiftNum);
    }

    // Designate vault (center-ish room)
    const centerRoom = rooms.reduce((best, r) => {
      const dist = Math.abs(r.x + r.w / 2 - COLS / 2) + Math.abs(r.y + r.h / 2 - ROWS / 2);
      const bestDist = Math.abs(best.x + best.w / 2 - COLS / 2) + Math.abs(best.y + best.h / 2 - ROWS / 2);
      return dist < bestDist ? r : best;
    });
    centerRoom.type = 'vault';
    centerRoom.name = 'VAULT';
    // Place vault marker at center of vault room
    const vx = Math.floor(centerRoom.x + centerRoom.w / 2);
    const vy = Math.floor(centerRoom.y + centerRoom.h / 2);
    grid[vy][vx] = TILE.VAULT;

    // Connect rooms with corridors and doors
    const connected = new Set([0]);
    const edges = [];
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const dist = roomDist(rooms[i], rooms[j]);
        edges.push({ i, j, dist });
      }
    }
    edges.sort((a, b) => a.dist - b.dist);

    for (const edge of edges) {
      if (connected.has(edge.i) && connected.has(edge.j)) {
        // Occasionally add extra connections for loops
        if (Math.random() > 0.3) continue;
      }
      const door = carveCorridor(grid, rooms[edge.i], rooms[edge.j]);
      if (door) doors.push(door);
      connected.add(edge.i);
      connected.add(edge.j);
    }

    // Ensure all rooms connected
    for (let i = 0; i < rooms.length; i++) {
      if (!connected.has(i)) {
        const nearest = rooms.reduce((best, r, idx) => {
          if (idx === i || !connected.has(idx)) return best;
          return roomDist(rooms[i], r) < roomDist(rooms[i], best) ? r : best;
        }, rooms[0]);
        const door = carveCorridor(grid, rooms[i], nearest);
        if (door) doors.push(door);
        connected.add(i);
      }
    }

    // Place entry points on edges of outermost rooms
    const entries = [];
    const edgeRooms = rooms
      .filter(r => r.type !== 'vault')
      .sort((a, b) => {
        const aEdge = Math.min(a.x, a.y, COLS - a.x - a.w, ROWS - a.y - a.h);
        const bEdge = Math.min(b.x, b.y, COLS - b.x - b.w, ROWS - b.y - b.h);
        return aEdge - bEdge;
      });

    const numEntries = 2 + Math.min(shiftNum - 1, 2);
    for (let i = 0; i < Math.min(numEntries, edgeRooms.length); i++) {
      const r = edgeRooms[i];
      const ex = r.x + Math.floor(r.w / 2);
      const ey = r.y + Math.floor(r.h / 2);
      grid[ey][ex] = TILE.ENTRY;
      entries.push({ x: ex, y: ey, roomId: r.id });
    }

    return { grid, rooms, doors, entries, cols: COLS, rows: ROWS, TILE };
  }

  function createFallback(shiftNum) {
    const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(TILE.WALL));
    const rooms = [];
    const doors = [];

    // Fixed layout with some randomization
    const templates = [
      { x: 2, y: 2, w: 7, h: 5, name: 'Lobby' },
      { x: 12, y: 2, w: 6, h: 5, name: 'Office A' },
      { x: 21, y: 2, w: 6, h: 5, name: 'Office B' },
      { x: 2, y: 10, w: 6, h: 6, name: 'Storage' },
      { x: 11, y: 9, w: 8, h: 7, name: 'VAULT', type: 'vault' },
      { x: 22, y: 10, w: 6, h: 6, name: 'Server Room' },
      { x: 2, y: 19, w: 7, h: 4, name: 'Break Room' },
      { x: 12, y: 19, w: 6, h: 4, name: 'Utility' },
      { x: 21, y: 19, w: 6, h: 4, name: 'Loading Dock' },
    ];

    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      const room = { ...t, id: i, type: t.type || 'normal' };
      rooms.push(room);
      carveRoom(grid, room);
    }

    // Vault marker
    const vault = rooms.find(r => r.type === 'vault');
    grid[Math.floor(vault.y + vault.h / 2)][Math.floor(vault.x + vault.w / 2)] = TILE.VAULT;

    // Connect adjacent rooms
    const connections = [
      [0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [2, 5],
      [3, 6], [4, 7], [5, 8], [6, 7], [7, 8], [1, 4],
    ];
    for (const [a, b] of connections) {
      const door = carveCorridor(grid, rooms[a], rooms[b]);
      if (door) doors.push(door);
    }

    // Entries
    const entries = [];
    const entryRooms = [0, 2, 8];
    const numEntries = 2 + Math.min(shiftNum - 1, 1);
    for (let i = 0; i < numEntries; i++) {
      const r = rooms[entryRooms[i]];
      const ex = r.x + Math.floor(r.w / 2);
      const ey = r.y + Math.floor(r.h / 2);
      grid[ey][ex] = TILE.ENTRY;
      entries.push({ x: ex, y: ey, roomId: r.id });
    }

    return { grid, rooms, doors, entries, cols: COLS, rows: ROWS, TILE };
  }

  function splitSpace(x, y, w, h, depth) {
    if (depth <= 0 || w < 7 || h < 7) {
      return [{ x, y, w, h }];
    }
    const splitH = w > h ? false : w < h ? true : Math.random() < 0.5;
    if (splitH) {
      const split = Math.floor(h * (0.35 + Math.random() * 0.3));
      if (split < 5 || h - split < 5) return [{ x, y, w, h }];
      return [
        ...splitSpace(x, y, w, split, depth - 1),
        ...splitSpace(x, y + split, w, h - split, depth - 1),
      ];
    } else {
      const split = Math.floor(w * (0.35 + Math.random() * 0.3));
      if (split < 5 || w - split < 5) return [{ x, y, w, h }];
      return [
        ...splitSpace(x, y, split, h, depth - 1),
        ...splitSpace(x + split, y, w - split, h, depth - 1),
      ];
    }
  }

  function carveRoom(grid, room) {
    for (let dy = 0; dy < room.h; dy++) {
      for (let dx = 0; dx < room.w; dx++) {
        const gy = room.y + dy;
        const gx = room.x + dx;
        if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
          grid[gy][gx] = TILE.FLOOR;
        }
      }
    }
  }

  function roomCenter(room) {
    return {
      x: Math.floor(room.x + room.w / 2),
      y: Math.floor(room.y + room.h / 2),
    };
  }

  function roomDist(a, b) {
    const ac = roomCenter(a);
    const bc = roomCenter(b);
    return Math.abs(ac.x - bc.x) + Math.abs(ac.y - bc.y);
  }

  function carveCorridor(grid, roomA, roomB) {
    const a = roomCenter(roomA);
    const b = roomCenter(roomB);
    let door = null;

    // L-shaped corridor
    const midX = a.x;
    const midY = b.y;

    // Horizontal segment
    const xStart = Math.min(a.x, b.x);
    const xEnd = Math.max(a.x, b.x);
    for (let x = xStart; x <= xEnd; x++) {
      if (b.y >= 0 && b.y < ROWS && x >= 0 && x < COLS) {
        if (grid[b.y][x] === TILE.WALL) {
          grid[b.y][x] = TILE.CORRIDOR;
        }
      }
    }

    // Vertical segment
    const yStart = Math.min(a.y, b.y);
    const yEnd = Math.max(a.y, b.y);
    for (let y = yStart; y <= yEnd; y++) {
      if (y >= 0 && y < ROWS && a.x >= 0 && a.x < COLS) {
        if (grid[y][a.x] === TILE.WALL) {
          grid[y][a.x] = TILE.CORRIDOR;
        }
      }
    }

    // Place a door at the transition between room and corridor
    // Find a spot where corridor meets room wall
    for (let y = yStart; y <= yEnd; y++) {
      if (y >= 0 && y < ROWS && a.x >= 0 && a.x < COLS) {
        if (isDoorCandidate(grid, a.x, y)) {
          grid[y][a.x] = TILE.DOOR;
          door = { x: a.x, y, locked: false, pickProgress: 0 };
          break;
        }
      }
    }
    if (!door) {
      for (let x = xStart; x <= xEnd; x++) {
        if (b.y >= 0 && b.y < ROWS && x >= 0 && x < COLS) {
          if (isDoorCandidate(grid, x, b.y)) {
            grid[b.y][x] = TILE.DOOR;
            door = { x, y: b.y, locked: false, pickProgress: 0 };
            break;
          }
        }
      }
    }

    return door;
  }

  function isDoorCandidate(grid, x, y) {
    // A door should have walls on two opposite sides (either N/S or E/W)
    if (y <= 0 || y >= ROWS - 1 || x <= 0 || x >= COLS - 1) return false;
    const n = grid[y - 1][x];
    const s = grid[y + 1][x];
    const e = grid[y][x + 1];
    const w = grid[y][x - 1];
    const hasNSWalls = (n === TILE.WALL && s === TILE.WALL);
    const hasEWWalls = (e === TILE.WALL && w === TILE.WALL);
    return hasNSWalls || hasEWWalls;
  }

  // Find which room a coordinate belongs to
  function getRoomAt(rooms, x, y) {
    for (const room of rooms) {
      if (x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h) {
        return room;
      }
    }
    return null;
  }

  // Check if a tile is walkable
  function isWalkable(grid, x, y, doors) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
    const tile = grid[y][x];
    if (tile === TILE.WALL) return false;
    if (tile === TILE.DOOR) {
      const door = doors.find(d => d.x === x && d.y === y);
      if (door && door.locked && door.pickProgress < 3) return false;
    }
    return true;
  }

  return { create, TILE, COLS, ROWS, getRoomAt, isWalkable, roomCenter };
})();
