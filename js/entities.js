// ===== ENTITIES.JS - Thief AI & Pathfinding =====

const Entities = (() => {
  // BFS pathfinding
  function findPath(grid, doors, sx, sy, tx, ty) {
    if (sx === tx && sy === ty) return [];
    const rows = grid.length;
    const cols = grid[0].length;
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const parent = Array.from({ length: rows }, () => Array(cols).fill(null));
    const queue = [{ x: sx, y: sy }];
    visited[sy][sx] = true;

    const dirs = [
      { dx: 0, dy: -1 }, { dx: 1, dy: 0 },
      { dx: 0, dy: 1 }, { dx: -1, dy: 0 },
    ];

    while (queue.length > 0) {
      const cur = queue.shift();
      for (const d of dirs) {
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        if (visited[ny][nx]) continue;

        const tile = grid[ny][nx];
        // Thieves can walk through anything except walls
        // Locked doors slow them but don't fully block (they pick locks)
        if (tile === MapGen.TILE.WALL) continue;

        visited[ny][nx] = true;
        parent[ny][nx] = { x: cur.x, y: cur.y };

        if (nx === tx && ny === ty) {
          // Reconstruct path
          const path = [];
          let p = { x: tx, y: ty };
          while (p && !(p.x === sx && p.y === sy)) {
            path.unshift(p);
            p = parent[p.y][p.x];
          }
          return path;
        }
        queue.push({ x: nx, y: ny });
      }
    }
    return []; // No path found
  }

  // Find the vault position
  function findVault(grid) {
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        if (grid[y][x] === MapGen.TILE.VAULT) return { x, y };
      }
    }
    return null;
  }

  // Create a thief
  function createThief(entry, shiftNum, thiefType) {
    const types = {
      basic: {
        name: 'Intruder',
        speed: 1,         // tiles per turn
        pickSkill: 1,     // lock pick speed
        stealth: 0,       // chance to avoid detection
        hp: 1,
        symbol: 'T',
        color: '#ff4444',
      },
      fast: {
        name: 'Runner',
        speed: 2,
        pickSkill: 1,
        stealth: 0,
        hp: 1,
        symbol: 'R',
        color: '#ff8800',
      },
      lockpick: {
        name: 'Locksmith',
        speed: 1,
        pickSkill: 3,
        stealth: 0,
        hp: 1,
        symbol: 'L',
        color: '#ffaa44',
      },
      ghost: {
        name: 'Ghost',
        speed: 1,
        pickSkill: 1,
        stealth: 0.5,
        hp: 1,
        symbol: 'G',
        color: '#8844ff',
      },
      heavy: {
        name: 'Brute',
        speed: 1,
        pickSkill: 2,
        stealth: 0,
        hp: 2,
        symbol: 'B',
        color: '#ff2222',
      },
    };

    const stats = types[thiefType] || types.basic;

    return {
      x: entry.x,
      y: entry.y,
      ...stats,
      type: thiefType,
      path: [],
      stunned: 0,         // turns remaining stunned (from alarm)
      pickingDoor: null,   // door currently being picked
      caught: false,
      reachedVault: false,
      spawnTurn: 0,
      visible: false,      // whether currently on a camera
    };
  }

  // Determine thief wave composition based on shift
  function getWaveComposition(shiftNum, waveNum) {
    const compositions = {
      1: [
        ['basic', 'basic'],
        ['basic', 'fast'],
      ],
      2: [
        ['basic', 'basic', 'lockpick'],
        ['fast', 'fast', 'basic'],
      ],
      3: [
        ['basic', 'lockpick', 'fast'],
        ['ghost', 'basic', 'basic'],
        ['fast', 'fast', 'lockpick'],
      ],
      4: [
        ['lockpick', 'ghost', 'fast'],
        ['heavy', 'basic', 'basic', 'fast'],
        ['ghost', 'ghost', 'lockpick'],
      ],
      5: [
        ['heavy', 'lockpick', 'ghost', 'fast'],
        ['fast', 'fast', 'ghost', 'lockpick'],
        ['heavy', 'heavy', 'lockpick', 'ghost'],
      ],
    };

    const shift = compositions[Math.min(shiftNum, 5)] || compositions[5];
    const wave = waveNum % shift.length;
    return shift[wave];
  }

  // Update a single thief for one turn
  function updateThief(thief, gameMap, upgrades) {
    if (thief.caught || thief.reachedVault) return;

    // Handle stun
    if (thief.stunned > 0) {
      thief.stunned--;
      return;
    }

    // Handle door picking
    if (thief.pickingDoor) {
      const door = thief.pickingDoor;
      if (door.locked) {
        door.pickProgress += thief.pickSkill;
        if (door.pickProgress >= 3) {
          door.locked = false;
          door.pickProgress = 0;
          thief.pickingDoor = null;
        }
        return; // Picking takes the turn
      } else {
        thief.pickingDoor = null;
      }
    }

    // Find path to vault
    const vault = findVault(gameMap.grid);
    if (!vault) return;

    if (thief.path.length === 0 || Math.random() < 0.1) {
      thief.path = findPath(gameMap.grid, gameMap.doors, thief.x, thief.y, vault.x, vault.y);
    }

    // Move along path
    let moves = thief.speed;
    while (moves > 0 && thief.path.length > 0) {
      const next = thief.path[0];

      // Check for locked door
      const tile = gameMap.grid[next.y][next.x];
      if (tile === MapGen.TILE.DOOR) {
        const door = gameMap.doors.find(d => d.x === next.x && d.y === next.y);
        if (door && door.locked && door.pickProgress < 3) {
          thief.pickingDoor = door;
          return; // Start picking next turn
        }
      }

      thief.x = next.x;
      thief.y = next.y;
      thief.path.shift();
      moves--;

      // Check if reached vault
      if (gameMap.grid[thief.y][thief.x] === MapGen.TILE.VAULT) {
        thief.reachedVault = true;
        return;
      }
    }
  }

  // Check thief visibility (is thief in a camera-covered room?)
  function updateVisibility(thieves, cameraRooms, gameMap, upgrades) {
    for (const thief of thieves) {
      if (thief.caught) { thief.visible = false; continue; }

      const thiefRoom = MapGen.getRoomAt(gameMap.rooms, thief.x, thief.y);
      if (!thiefRoom) {
        // In a corridor - visible if adjacent to camera room
        thief.visible = false;
        continue;
      }

      const inCameraRoom = cameraRooms.some(r => r && r.id === thiefRoom.id);
      if (inCameraRoom) {
        // Ghost stealth check
        if (thief.stealth > 0 && Math.random() < thief.stealth) {
          thief.visible = false;
          // Motion detection upgrade counters stealth
          if (upgrades.has('motion_detection')) {
            thief.visible = true;
          }
        } else {
          thief.visible = true;
        }
      } else {
        // Predictive pathing upgrade shows thieves near camera rooms
        if (upgrades.has('predictive_pathing')) {
          const nearCamera = cameraRooms.some(r => {
            if (!r) return false;
            const rc = MapGen.roomCenter(r);
            return Math.abs(thief.x - rc.x) <= 4 && Math.abs(thief.y - rc.y) <= 4;
          });
          thief.visible = nearCamera;
        } else {
          thief.visible = false;
        }
      }
    }
  }

  return {
    findPath,
    findVault,
    createThief,
    getWaveComposition,
    updateThief,
    updateVisibility,
  };
})();
