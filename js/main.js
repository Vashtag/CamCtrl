// ===== MAIN.JS - Game State Machine =====

const Game = (() => {
  // Game states
  const STATE = {
    TITLE: 'title',
    HOWTO: 'howto',
    NARRATIVE: 'narrative',
    SHIFT: 'shift',
    UPGRADE: 'upgrade',
    GAMEOVER: 'gameover',
  };

  let state = STATE.TITLE;

  // Persistent run state
  let shiftNum = 1;
  const MAX_SHIFTS = 5;
  let ownedUpgrades = new Set();
  let narrativeFlags = new Set();
  let totalThievesCaught = 0;
  let totalDoorsLocked = 0;
  let totalAlarmsTriggered = 0;

  // Per-shift game state
  let gameMap = null;
  let cameras = [];
  let thieves = [];
  let selectedCam = 0;
  let actionMode = null; // null | 'lock' | 'alarm' | 'camera'
  let turn = 0;
  let ap = 3;
  let maxAP = 3;
  let alarmCooldown = 0;
  let alarmCooldownMax = 5;
  let alarmStunDuration = 2;
  let doorStrength = 3;
  let maxCameras = 4;
  let paused = false;
  let tickTimer = null;
  let waveIndex = 0;
  let waveTurns = [0, 15, 30]; // turns at which waves spawn
  let shiftMaxTurns = 50;
  let shiftResult = null; // 'win' | 'lose'

  // DOM elements
  const screens = {};
  const els = {};

  function init() {
    // Cache DOM
    screens.title = document.getElementById('title-screen');
    screens.howto = document.getElementById('howto-screen');
    screens.game = document.getElementById('game-screen');
    screens.upgrade = document.getElementById('upgrade-screen');
    screens.narrative = document.getElementById('narrative-screen');
    screens.gameover = document.getElementById('gameover-screen');

    els.hudShift = document.getElementById('hud-shift');
    els.hudTurn = document.getElementById('hud-turn');
    els.hudAP = document.getElementById('hud-ap');
    els.hudAlarm = document.getElementById('hud-alarm');
    els.hudThieves = document.getElementById('hud-thieves');
    els.hudStatus = document.getElementById('hud-status');
    els.logEntries = document.getElementById('log-entries');
    els.mapCanvas = document.getElementById('map-canvas');
    els.upgradeCards = document.getElementById('upgrade-cards');

    // Button listeners
    document.getElementById('btn-new-game').addEventListener('click', startNewGame);
    document.getElementById('btn-how-to').addEventListener('click', () => switchScreen(STATE.HOWTO));
    document.getElementById('btn-back-title').addEventListener('click', () => switchScreen(STATE.TITLE));
    document.getElementById('btn-restart').addEventListener('click', startNewGame);
    document.getElementById('btn-lock').addEventListener('click', toggleLockMode);
    document.getElementById('btn-alarm').addEventListener('click', toggleAlarmMode);
    document.getElementById('btn-pause').addEventListener('click', togglePause);

    // Camera feed clicks
    for (let i = 0; i < 4; i++) {
      document.getElementById(`cam-${i}`).addEventListener('click', () => selectCamera(i));
    }

    // Map canvas click
    els.mapCanvas.addEventListener('click', onMapClick);

    // Keyboard
    document.addEventListener('keydown', onKeyDown);
  }

  function switchScreen(newState) {
    state = newState;
    document.querySelectorAll('.screen-layer').forEach(s => s.classList.remove('active'));
    switch (newState) {
      case STATE.TITLE: screens.title.classList.add('active'); break;
      case STATE.HOWTO: screens.howto.classList.add('active'); break;
      case STATE.SHIFT: screens.game.classList.add('active'); break;
      case STATE.UPGRADE: screens.upgrade.classList.add('active'); break;
      case STATE.NARRATIVE: screens.narrative.classList.add('active'); break;
      case STATE.GAMEOVER: screens.gameover.classList.add('active'); break;
    }
  }

  // ===== NEW GAME =====
  function startNewGame() {
    shiftNum = 1;
    ownedUpgrades = new Set();
    narrativeFlags = new Set();
    totalThievesCaught = 0;
    totalDoorsLocked = 0;
    totalAlarmsTriggered = 0;
    maxAP = 3;
    alarmCooldownMax = 5;
    alarmStunDuration = 2;
    doorStrength = 3;
    maxCameras = 4;

    // Show first narrative beat
    startNarrative();
  }

  function startNarrative() {
    Narrative.showBeat(shiftNum, narrativeFlags, () => {
      startShift();
    });
  }

  // ===== START SHIFT =====
  function startShift() {
    // Generate map
    gameMap = MapGen.create(shiftNum);

    // Reconfigure door strength based on upgrades
    for (const door of gameMap.doors) {
      door.pickProgress = 0;
      door.locked = false;
    }

    // Setup cameras
    cameras = [];
    const camRooms = gameMap.rooms.filter(r => r.type !== 'vault').slice(0, maxCameras);
    for (let i = 0; i < maxCameras; i++) {
      cameras.push({
        room: camRooms[i] || null,
        id: i,
      });
    }

    // Reset shift state
    thieves = [];
    selectedCam = 0;
    actionMode = null;
    turn = 0;
    ap = maxAP;
    alarmCooldown = 0;
    paused = false;
    waveIndex = 0;
    shiftResult = null;

    // Wave timing scales with shift
    waveTurns = [0];
    const numWaves = 1 + Math.min(shiftNum, 4);
    for (let i = 1; i < numWaves; i++) {
      waveTurns.push(10 + i * (8 - shiftNum));
    }
    shiftMaxTurns = waveTurns[waveTurns.length - 1] + 20;

    // Clear log
    els.logEntries.innerHTML = '';
    log(`Shift ${shiftNum} starting. ${gameMap.entries.length} entry points detected.`, 'alert');
    log(`${waveTurns.length} wave(s) expected. Survive ${shiftMaxTurns} turns.`);

    // Update camera panel for extra cameras
    updateCameraPanelDOM();

    // Switch to game screen
    switchScreen(STATE.SHIFT);
    updateHUD();
    render();

    // Mark first camera selected
    updateCameraSelection();

    // Start tick
    startTicker();
  }

  function updateCameraPanelDOM() {
    const panel = document.getElementById('camera-panel');
    // Remove extras
    while (panel.children.length > maxCameras) {
      panel.removeChild(panel.lastChild);
    }
    // Add if needed
    while (panel.children.length < maxCameras) {
      const idx = panel.children.length;
      const feed = document.createElement('div');
      feed.className = 'camera-feed';
      feed.id = `cam-${idx}`;
      feed.innerHTML = `
        <div class="cam-label">CAM ${String(idx + 1).padStart(2, '0')}</div>
        <canvas class="cam-canvas" width="240" height="180"></canvas>
        <div class="cam-static"></div>
      `;
      feed.addEventListener('click', () => selectCamera(idx));
      panel.appendChild(feed);
    }
  }

  // ===== GAME TICK =====
  function startTicker() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(() => {
      if (!paused && state === STATE.SHIFT) {
        gameTick();
      }
    }, 2000);
  }

  function gameTick() {
    turn++;

    // Spawn waves
    if (waveIndex < waveTurns.length && turn >= waveTurns[waveIndex]) {
      spawnWave(waveIndex);
      waveIndex++;
    }

    // Regenerate AP
    ap = Math.min(ap + 1, maxAP);

    // Reduce alarm cooldown
    if (alarmCooldown > 0) alarmCooldown--;

    // Auto-lock upgrade
    if (ownedUpgrades.has('auto_lock')) {
      autoLockDoors();
    }

    // Update thieves
    for (const thief of thieves) {
      Entities.updateThief(thief, gameMap, ownedUpgrades);
    }

    // Update visibility
    const cameraRooms = cameras.map(c => c.room);
    Entities.updateVisibility(thieves, cameraRooms, gameMap, ownedUpgrades);

    // Check for newly visible thieves
    for (const thief of thieves) {
      if (thief.visible && !thief._wasVisible && !thief.caught) {
        log(`${thief.name} detected in view!`, 'danger');
      }
      thief._wasVisible = thief.visible;
    }

    // Check win/lose
    const vaultBreached = thieves.some(t => t.reachedVault);
    if (vaultBreached) {
      endShift(false);
      return;
    }

    if (turn >= shiftMaxTurns) {
      endShift(true);
      return;
    }

    updateHUD();
    render();
  }

  function spawnWave(waveIdx) {
    const composition = Entities.getWaveComposition(shiftNum, waveIdx);
    const availableEntries = [...gameMap.entries];

    for (const thiefType of composition) {
      const entry = availableEntries[Math.floor(Math.random() * availableEntries.length)];
      const thief = Entities.createThief(entry, shiftNum, thiefType);
      thief.spawnTurn = turn;
      thieves.push(thief);
    }

    log(`Wave ${waveIdx + 1}: ${composition.length} intruder(s) detected!`, 'danger');
  }

  // ===== PLAYER ACTIONS =====
  function selectCamera(idx) {
    if (idx >= cameras.length) return;
    if (actionMode === 'camera') {
      // This is clicking a camera feed in camera-move mode - do nothing special
    }
    selectedCam = idx;
    actionMode = 'camera'; // Enter camera repositioning mode
    updateCameraSelection();
    render();
  }

  function updateCameraSelection() {
    document.querySelectorAll('.camera-feed').forEach((el, i) => {
      el.classList.toggle('selected', i === selectedCam);
    });
  }

  function toggleLockMode() {
    if (state !== STATE.SHIFT) return;
    actionMode = actionMode === 'lock' ? null : 'lock';
    document.getElementById('btn-lock').classList.toggle('active', actionMode === 'lock');
    document.getElementById('btn-alarm').classList.remove('active');
    render();
  }

  function toggleAlarmMode() {
    if (state !== STATE.SHIFT) return;
    if (alarmCooldown > 0) return;
    actionMode = actionMode === 'alarm' ? null : 'alarm';
    document.getElementById('btn-alarm').classList.toggle('active', actionMode === 'alarm');
    document.getElementById('btn-lock').classList.remove('active');
    render();
  }

  function togglePause() {
    if (state !== STATE.SHIFT) return;
    paused = !paused;
    const btn = document.getElementById('btn-pause');
    btn.textContent = paused ? 'RESUME' : 'PAUSE';
    btn.classList.toggle('paused', paused);
    if (paused) {
      log('System paused.', 'alert');
    }
  }

  function onMapClick(e) {
    if (state !== STATE.SHIFT) return;

    const rect = els.mapCanvas.getBoundingClientRect();
    const scaleX = els.mapCanvas.width / rect.width;
    const scaleY = els.mapCanvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const tileX = Math.floor(mx / Renderer.TILE_SIZE);
    const tileY = Math.floor(my / Renderer.TILE_SIZE);

    if (tileX < 0 || tileX >= gameMap.cols || tileY < 0 || tileY >= gameMap.rows) return;

    if (actionMode === 'lock') {
      tryLockDoor(tileX, tileY);
    } else if (actionMode === 'alarm') {
      tryAlarm(tileX, tileY);
    } else if (actionMode === 'camera') {
      tryMoveCamera(tileX, tileY);
    }
  }

  function tryLockDoor(x, y) {
    if (ap < 1) { log('Not enough AP to lock door.', 'alert'); return; }

    const door = gameMap.doors.find(d => d.x === x && d.y === y);
    if (!door) { log('No door at that location.', 'alert'); return; }
    if (door.locked) { log('Door already locked.', 'alert'); return; }

    door.locked = true;
    door.pickProgress = 0;
    ap--;
    totalDoorsLocked++;
    actionMode = null;
    document.getElementById('btn-lock').classList.remove('active');
    log(`Door locked at (${x}, ${y}).`, 'success');
    updateHUD();
    render();
  }

  function tryAlarm(x, y) {
    if (ap < 2) { log('Not enough AP for alarm (need 2).', 'alert'); return; }
    if (alarmCooldown > 0) { log(`Alarm on cooldown (${alarmCooldown} turns).`, 'alert'); return; }

    // Find the room clicked
    const room = MapGen.getRoomAt(gameMap.rooms, x, y);
    if (!room) { log('No room at that location.', 'alert'); return; }

    // Check if room is visible (has a camera)
    const hasCamera = cameras.some(c => c.room && c.room.id === room.id);
    if (!hasCamera) { log('No camera in that room. Cannot trigger alarm.', 'alert'); return; }

    ap -= 2;
    alarmCooldown = alarmCooldownMax;
    totalAlarmsTriggered++;

    // Stun all thieves in the room
    let stunCount = 0;
    for (const thief of thieves) {
      if (thief.caught || thief.reachedVault) continue;
      const thiefRoom = MapGen.getRoomAt(gameMap.rooms, thief.x, thief.y);
      if (thiefRoom && thiefRoom.id === room.id) {
        thief.stunned = alarmStunDuration;
        thief.path = []; // Reset pathfinding
        stunCount++;
      }
    }

    actionMode = null;
    document.getElementById('btn-alarm').classList.remove('active');
    log(`Alarm triggered in ${room.name}! ${stunCount} thief(s) stunned.`, stunCount > 0 ? 'success' : 'alert');
    updateHUD();
    render();
  }

  function tryMoveCamera(x, y) {
    const room = MapGen.getRoomAt(gameMap.rooms, x, y);
    if (!room) return;

    cameras[selectedCam].room = room;
    actionMode = null;
    log(`Camera ${selectedCam + 1} moved to ${room.name}.`);
    render();
  }

  function autoLockDoors() {
    for (const door of gameMap.doors) {
      if (door.locked) continue;
      // Check if any thief is in an adjacent room
      for (const thief of thieves) {
        if (thief.caught) continue;
        const dist = Math.abs(thief.x - door.x) + Math.abs(thief.y - door.y);
        if (dist <= 3) {
          const thiefVisible = thief.visible;
          if (thiefVisible) {
            door.locked = true;
            door.pickProgress = 0;
            log(`Auto-lock: door at (${door.x}, ${door.y}) secured.`);
            break;
          }
        }
      }
    }
  }

  function onKeyDown(e) {
    if (state !== STATE.SHIFT) return;
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePause();
        break;
      case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4':
      case 'Digit5': case 'Digit6':
        const idx = parseInt(e.code.replace('Digit', '')) - 1;
        if (idx < cameras.length) selectCamera(idx);
        break;
      case 'KeyL':
        toggleLockMode();
        break;
      case 'KeyA':
        toggleAlarmMode();
        break;
    }
  }

  // ===== RENDERING =====
  function render() {
    if (state !== STATE.SHIFT) return;

    // Draw map
    const mapCtx = els.mapCanvas.getContext('2d');
    Renderer.drawMap(mapCtx, gameMap, cameras, thieves, selectedCam, actionMode, ownedUpgrades, turn);

    // Draw camera feeds
    for (let i = 0; i < maxCameras; i++) {
      const feedEl = document.getElementById(`cam-${i}`);
      if (!feedEl) continue;
      const canvas = feedEl.querySelector('.cam-canvas');
      if (!canvas) continue;
      const ctx = canvas.getContext('2d');

      if (cameras[i] && cameras[i].room) {
        feedEl.classList.remove('no-signal');
        Renderer.drawCameraFeed(ctx, gameMap, cameras[i], thieves, turn, ownedUpgrades);
      } else {
        feedEl.classList.add('no-signal');
        Renderer.drawStatic(ctx, canvas.width, canvas.height);
      }
    }
  }

  function updateHUD() {
    els.hudShift.textContent = `${shiftNum} / ${MAX_SHIFTS}`;
    els.hudTurn.textContent = `${turn} / ${shiftMaxTurns}`;
    els.hudAP.textContent = `${ap} / ${maxAP}`;

    if (alarmCooldown > 0) {
      els.hudAlarm.textContent = `${alarmCooldown} TURNS`;
      els.hudAlarm.className = 'hud-value warning';
    } else {
      els.hudAlarm.textContent = 'READY';
      els.hudAlarm.className = 'hud-value';
    }

    const activeThieves = thieves.filter(t => !t.caught && !t.reachedVault).length;
    els.hudThieves.textContent = activeThieves;
    if (activeThieves > 0) {
      els.hudThieves.className = 'hud-value danger';
    } else {
      els.hudThieves.className = 'hud-value';
    }

    // Status
    const vaultRoom = gameMap.rooms.find(r => r.type === 'vault');
    const thiefNearVault = thieves.some(t => {
      if (t.caught || t.reachedVault) return false;
      if (!vaultRoom) return false;
      return Math.abs(t.x - (vaultRoom.x + vaultRoom.w / 2)) < 4 &&
             Math.abs(t.y - (vaultRoom.y + vaultRoom.h / 2)) < 4;
    });

    if (thiefNearVault) {
      els.hudStatus.textContent = 'CRITICAL';
      els.hudStatus.className = 'hud-value danger';
    } else if (activeThieves > 0) {
      els.hudStatus.textContent = 'ALERT';
      els.hudStatus.className = 'hud-value warning';
    } else {
      els.hudStatus.textContent = 'SECURE';
      els.hudStatus.className = 'hud-value';
    }

    // Disable buttons as needed
    document.getElementById('btn-lock').disabled = ap < 1;
    document.getElementById('btn-alarm').disabled = ap < 2 || alarmCooldown > 0;
  }

  function log(msg, type) {
    const entry = document.createElement('div');
    entry.className = 'log-entry' + (type ? ` ${type}` : '');
    entry.textContent = `[T${String(turn).padStart(3, '0')}] ${msg}`;
    els.logEntries.appendChild(entry);
    els.logEntries.scrollTop = els.logEntries.scrollHeight;
  }

  // ===== END SHIFT =====
  function endShift(survived) {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = null;
    shiftResult = survived ? 'win' : 'lose';

    if (!survived) {
      // Game over
      showGameOver(false);
      return;
    }

    // Shift survived
    if (shiftNum >= MAX_SHIFTS) {
      // All shifts complete - show ending
      showGameOver(true);
      return;
    }

    // Show upgrade screen
    showUpgradeScreen();
  }

  function showUpgradeScreen() {
    const choices = Upgrades.getChoices(ownedUpgrades, shiftNum);
    Upgrades.renderCards(els.upgradeCards, choices, (upgrade) => {
      ownedUpgrades.add(upgrade.id);
      if (upgrade.onApply) {
        const applyState = { maxAP, alarmCooldownMax, alarmStunDuration, doorStrength, maxCameras };
        upgrade.onApply(applyState);
        maxAP = applyState.maxAP;
        alarmCooldownMax = applyState.alarmCooldownMax;
        alarmStunDuration = applyState.alarmStunDuration;
        doorStrength = applyState.doorStrength;
        maxCameras = applyState.maxCameras;
      }
      log(`Upgrade installed: ${upgrade.name}`, 'success');

      // Next shift
      shiftNum++;
      startNarrative();
    });
    switchScreen(STATE.UPGRADE);
  }

  function showGameOver(survived) {
    const ending = Narrative.getEnding(narrativeFlags, survived);
    const titleEl = document.getElementById('gameover-title');
    const textEl = document.getElementById('gameover-text');
    const statsEl = document.getElementById('gameover-stats');

    titleEl.textContent = `// ${ending.title}`;
    titleEl.className = survived ? '' : 'fail';
    textEl.textContent = ending.text;

    statsEl.innerHTML = `
      Shifts survived: <span>${survived ? MAX_SHIFTS : shiftNum}</span><br>
      Doors locked: <span>${totalDoorsLocked}</span><br>
      Alarms triggered: <span>${totalAlarmsTriggered}</span><br>
      Upgrades installed: <span>${ownedUpgrades.size}</span><br>
      Ending: <span>${ending.title}</span>
    `;

    switchScreen(STATE.GAMEOVER);
  }

  // Boot
  document.addEventListener('DOMContentLoaded', init);

  return { init };
})();
