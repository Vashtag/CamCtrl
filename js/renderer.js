// ===== RENDERER.JS - Canvas Rendering & CRT Effects =====

const Renderer = (() => {
  const TILE_SIZE = 16;

  const COLORS = {
    wall: '#0a1a0a',
    wallEdge: '#1a3d1a',
    floor: '#0d200d',
    floorDot: '#152a15',
    corridor: '#0d1a0d',
    door: '#336633',
    doorLocked: '#cc6600',
    vault: '#33ff66',
    vaultGlow: 'rgba(51, 255, 102, 0.15)',
    entry: '#ff4444',
    camera: '#33ff66',
    cameraFov: 'rgba(51, 255, 102, 0.08)',
    fog: '#050805',
    thief: '#ff4444',
    thiefGhost: '#8844ff',
  };

  // Draw the full map onto the map canvas
  function drawMap(ctx, gameMap, cameras, thieves, selectedCam, actionMode, upgrades, turn) {
    const { grid, rooms, doors, entries, cols, rows } = gameMap;
    ctx.canvas.width = cols * TILE_SIZE;
    ctx.canvas.height = rows * TILE_SIZE;

    // Determine visible tiles (covered by cameras)
    const visible = computeVisibility(cameras, rooms, grid, cols, rows, upgrades);

    // Draw tiles
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        const tile = grid[y][x];
        const isVisible = visible[y][x];

        if (!isVisible) {
          ctx.fillStyle = COLORS.fog;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

          // Dim outline for walls to show structure
          if (tile === TILE_SIZE) {
            ctx.fillStyle = '#080f08';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          }
          continue;
        }

        switch (tile) {
          case MapGen.TILE.WALL:
            ctx.fillStyle = COLORS.wall;
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            // Wall edge highlights
            if (y + 1 < rows && grid[y + 1][x] !== MapGen.TILE.WALL) {
              ctx.fillStyle = COLORS.wallEdge;
              ctx.fillRect(px, py + TILE_SIZE - 1, TILE_SIZE, 1);
            }
            if (x + 1 < cols && grid[y][x + 1] !== MapGen.TILE.WALL) {
              ctx.fillStyle = COLORS.wallEdge;
              ctx.fillRect(px + TILE_SIZE - 1, py, 1, TILE_SIZE);
            }
            break;

          case MapGen.TILE.FLOOR:
          case MapGen.TILE.CORRIDOR:
            ctx.fillStyle = tile === MapGen.TILE.FLOOR ? COLORS.floor : COLORS.corridor;
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            // Floor grid dots
            if ((x + y) % 3 === 0) {
              ctx.fillStyle = COLORS.floorDot;
              ctx.fillRect(px + 7, py + 7, 2, 2);
            }
            break;

          case MapGen.TILE.DOOR: {
            ctx.fillStyle = COLORS.floor;
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            const door = doors.find(d => d.x === x && d.y === y);
            ctx.fillStyle = (door && door.locked) ? COLORS.doorLocked : COLORS.door;
            // Draw door as a bar
            if (y > 0 && y < rows - 1 && grid[y - 1][x] === MapGen.TILE.WALL) {
              ctx.fillRect(px + 2, py + 6, TILE_SIZE - 4, 4);
            } else {
              ctx.fillRect(px + 6, py + 2, 4, TILE_SIZE - 4);
            }
            break;
          }

          case MapGen.TILE.VAULT:
            ctx.fillStyle = COLORS.floor;
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            // Pulsing vault gem
            const pulse = 0.5 + 0.5 * Math.sin(turn * 0.3);
            ctx.fillStyle = COLORS.vaultGlow;
            ctx.beginPath();
            ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE * 0.8 * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = COLORS.vault;
            // Diamond shape
            ctx.beginPath();
            ctx.moveTo(px + TILE_SIZE / 2, py + 2);
            ctx.lineTo(px + TILE_SIZE - 3, py + TILE_SIZE / 2);
            ctx.lineTo(px + TILE_SIZE / 2, py + TILE_SIZE - 2);
            ctx.lineTo(px + 3, py + TILE_SIZE / 2);
            ctx.closePath();
            ctx.fill();
            break;

          case MapGen.TILE.ENTRY:
            ctx.fillStyle = COLORS.floor;
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = COLORS.entry;
            ctx.fillRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
            ctx.fillStyle = '#000';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('E', px + TILE_SIZE / 2, py + TILE_SIZE - 4);
            break;
        }
      }
    }

    // Draw camera FOV overlay
    for (let i = 0; i < cameras.length; i++) {
      const cam = cameras[i];
      if (!cam.room) continue;
      const room = cam.room;
      const isSelected = i === selectedCam;
      ctx.fillStyle = isSelected ? 'rgba(51, 255, 102, 0.12)' : COLORS.cameraFov;
      ctx.fillRect(
        room.x * TILE_SIZE, room.y * TILE_SIZE,
        room.w * TILE_SIZE, room.h * TILE_SIZE
      );
      if (isSelected) {
        ctx.strokeStyle = COLORS.camera;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
          room.x * TILE_SIZE, room.y * TILE_SIZE,
          room.w * TILE_SIZE, room.h * TILE_SIZE
        );
        ctx.setLineDash([]);
      }
    }

    // Draw room labels
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    for (const room of rooms) {
      const rx = (room.x + room.w / 2) * TILE_SIZE;
      const ry = room.y * TILE_SIZE + 10;
      if (visible[room.y][room.x]) {
        ctx.fillStyle = room.type === 'vault' ? COLORS.vault : '#1a5533';
        ctx.fillText(room.name, rx, ry);
      }
    }

    // Draw thieves
    for (const thief of thieves) {
      if (!thief.visible || thief.caught) continue;
      const px = thief.x * TILE_SIZE;
      const py = thief.y * TILE_SIZE;

      // Thief glow
      ctx.fillStyle = `${thief.color}33`;
      ctx.beginPath();
      ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Thief body
      ctx.fillStyle = thief.color;
      ctx.fillRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);

      // Thief symbol
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(thief.symbol, px + TILE_SIZE / 2, py + TILE_SIZE - 4);

      // Stunned indicator
      if (thief.stunned > 0) {
        ctx.fillStyle = '#ffff00';
        ctx.font = '8px monospace';
        ctx.fillText('!', px + TILE_SIZE / 2, py - 1);
      }

      // Lock-picking indicator
      if (thief.pickingDoor) {
        ctx.fillStyle = '#ffaa00';
        ctx.font = '8px monospace';
        ctx.fillText('...', px + TILE_SIZE / 2, py - 1);
      }
    }

    // Action mode overlays
    if (actionMode === 'lock') {
      // Highlight clickable doors
      for (const door of doors) {
        if (!door.locked && visible[door.y][door.x]) {
          ctx.strokeStyle = '#ffaa00';
          ctx.lineWidth = 2;
          ctx.strokeRect(
            door.x * TILE_SIZE + 1, door.y * TILE_SIZE + 1,
            TILE_SIZE - 2, TILE_SIZE - 2
          );
        }
      }
    } else if (actionMode === 'alarm') {
      // Highlight rooms that have cameras
      for (const cam of cameras) {
        if (!cam.room) continue;
        ctx.fillStyle = 'rgba(255, 170, 0, 0.08)';
        ctx.fillRect(
          cam.room.x * TILE_SIZE, cam.room.y * TILE_SIZE,
          cam.room.w * TILE_SIZE, cam.room.h * TILE_SIZE
        );
        ctx.strokeStyle = '#ffaa0066';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          cam.room.x * TILE_SIZE, cam.room.y * TILE_SIZE,
          cam.room.w * TILE_SIZE, cam.room.h * TILE_SIZE
        );
      }
    } else if (actionMode === 'camera') {
      // Highlight rooms that can be camera targets
      for (const room of rooms) {
        if (visible[room.y] && visible[room.y][room.x]) {
          ctx.strokeStyle = '#33ff6644';
          ctx.lineWidth = 1;
          ctx.strokeRect(
            room.x * TILE_SIZE, room.y * TILE_SIZE,
            room.w * TILE_SIZE, room.h * TILE_SIZE
          );
        }
      }
    }
  }

  // Compute which tiles are visible based on camera positions
  function computeVisibility(cameras, rooms, grid, cols, rows, upgrades) {
    const visible = Array.from({ length: rows }, () => Array(cols).fill(false));

    for (const cam of cameras) {
      if (!cam.room) continue;
      const room = cam.room;
      // Camera covers the entire room
      for (let dy = 0; dy < room.h; dy++) {
        for (let dx = 0; dx < room.w; dx++) {
          const gy = room.y + dy;
          const gx = room.x + dx;
          if (gy >= 0 && gy < rows && gx >= 0 && gx < cols) {
            visible[gy][gx] = true;
          }
        }
      }

      // Also reveal adjacent corridor tiles and doors
      for (let dy = -1; dy <= room.h; dy++) {
        for (let dx = -1; dx <= room.w; dx++) {
          const gy = room.y + dy;
          const gx = room.x + dx;
          if (gy >= 0 && gy < rows && gx >= 0 && gx < cols) {
            const t = grid[gy][gx];
            if (t === MapGen.TILE.DOOR || t === MapGen.TILE.CORRIDOR) {
              visible[gy][gx] = true;
            }
          }
        }
      }

      // Night vision upgrade: extend visibility 2 tiles into corridors
      if (upgrades && upgrades.has('night_vision')) {
        for (let dy = -3; dy <= room.h + 2; dy++) {
          for (let dx = -3; dx <= room.w + 2; dx++) {
            const gy = room.y + dy;
            const gx = room.x + dx;
            if (gy >= 0 && gy < rows && gx >= 0 && gx < cols) {
              if (grid[gy][gx] !== MapGen.TILE.WALL) {
                visible[gy][gx] = true;
              }
            }
          }
        }
      }
    }

    return visible;
  }

  // Draw a single camera feed (zoomed view of one room)
  function drawCameraFeed(ctx, gameMap, camera, thieves, turn, upgrades) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!camera.room) {
      // No signal
      drawStatic(ctx, w, h);
      return;
    }

    const room = camera.room;
    const zoomFactor = upgrades && upgrades.has('better_zoom') ? 0.7 : 1;

    // Calculate view area
    const viewW = room.w + 2;
    const viewH = room.h + 2;
    const tileW = w / (viewW * zoomFactor);
    const tileH = h / (viewH * zoomFactor);
    const tSize = Math.min(tileW, tileH);
    const offsetX = (w - viewW * tSize * zoomFactor) / 2;
    const offsetY = (h - viewH * tSize * zoomFactor) / 2;

    // Dark background
    ctx.fillStyle = '#050a05';
    ctx.fillRect(0, 0, w, h);

    // Draw room tiles
    for (let dy = -1; dy <= room.h; dy++) {
      for (let dx = -1; dx <= room.w; dx++) {
        const gx = room.x + dx;
        const gy = room.y + dy;
        if (gx < 0 || gx >= gameMap.cols || gy < 0 || gy >= gameMap.rows) continue;

        const px = offsetX + (dx + 1) * tSize * zoomFactor;
        const py = offsetY + (dy + 1) * tSize * zoomFactor;
        const sz = tSize * zoomFactor;
        const tile = gameMap.grid[gy][gx];

        switch (tile) {
          case MapGen.TILE.WALL:
            ctx.fillStyle = '#0d1a0d';
            ctx.fillRect(px, py, sz, sz);
            break;
          case MapGen.TILE.FLOOR:
          case MapGen.TILE.CORRIDOR:
            ctx.fillStyle = '#122212';
            ctx.fillRect(px, py, sz, sz);
            if ((gx + gy) % 4 === 0) {
              ctx.fillStyle = '#1a3318';
              ctx.fillRect(px + sz * 0.4, py + sz * 0.4, sz * 0.15, sz * 0.15);
            }
            break;
          case MapGen.TILE.DOOR: {
            ctx.fillStyle = '#122212';
            ctx.fillRect(px, py, sz, sz);
            const door = gameMap.doors.find(d => d.x === gx && d.y === gy);
            ctx.fillStyle = (door && door.locked) ? '#cc6600' : '#336633';
            ctx.fillRect(px + sz * 0.15, py + sz * 0.35, sz * 0.7, sz * 0.3);
            break;
          }
          case MapGen.TILE.VAULT: {
            ctx.fillStyle = '#122212';
            ctx.fillRect(px, py, sz, sz);
            const pulse = 0.5 + 0.5 * Math.sin(turn * 0.3);
            ctx.fillStyle = `rgba(51, 255, 102, ${0.15 * pulse})`;
            ctx.beginPath();
            ctx.arc(px + sz / 2, py + sz / 2, sz * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#33ff66';
            ctx.beginPath();
            ctx.moveTo(px + sz / 2, py + sz * 0.15);
            ctx.lineTo(px + sz * 0.8, py + sz / 2);
            ctx.lineTo(px + sz / 2, py + sz * 0.85);
            ctx.lineTo(px + sz * 0.2, py + sz / 2);
            ctx.closePath();
            ctx.fill();
            break;
          }
          case MapGen.TILE.ENTRY:
            ctx.fillStyle = '#122212';
            ctx.fillRect(px, py, sz, sz);
            ctx.fillStyle = '#ff444466';
            ctx.fillRect(px + sz * 0.2, py + sz * 0.2, sz * 0.6, sz * 0.6);
            break;
        }
      }
    }

    // Draw thieves in this room
    for (const thief of thieves) {
      if (thief.caught || !thief.visible) continue;
      const dx = thief.x - room.x;
      const dy = thief.y - room.y;
      if (dx < -1 || dx > room.w || dy < -1 || dy > room.h) continue;

      const px = offsetX + (dx + 1) * tSize * zoomFactor;
      const py = offsetY + (dy + 1) * tSize * zoomFactor;
      const sz = tSize * zoomFactor;

      ctx.fillStyle = thief.color;
      ctx.fillRect(px + sz * 0.15, py + sz * 0.15, sz * 0.7, sz * 0.7);
      ctx.fillStyle = '#000';
      ctx.font = `${Math.floor(sz * 0.5)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(thief.symbol, px + sz / 2, py + sz * 0.7);

      // Facial recognition upgrade shows thief type
      if (upgrades && upgrades.has('facial_recognition')) {
        ctx.fillStyle = thief.color;
        ctx.font = `${Math.floor(sz * 0.25)}px monospace`;
        ctx.fillText(thief.name, px + sz / 2, py - 2);
      }
    }

    // CRT scanline effect on camera feed
    for (let sy = 0; sy < h; sy += 3) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.fillRect(0, sy, w, 1);
    }

    // Timestamp overlay
    ctx.fillStyle = '#33ff6688';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    const now = new Date();
    ctx.fillText(
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
      w - 4, h - 4
    );
  }

  // Draw static noise for no-signal cameras
  function drawStatic(ctx, w, h) {
    ctx.fillStyle = '#050a05';
    ctx.fillRect(0, 0, w, h);
    const imgData = ctx.createImageData(w, h);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = Math.random() * 20;
      imgData.data[i] = v * 0.3;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v * 0.3;
      imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    ctx.fillStyle = '#33ff6644';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NO SIGNAL', w / 2, h / 2);
  }

  return { drawMap, drawCameraFeed, drawStatic, TILE_SIZE, computeVisibility };
})();
