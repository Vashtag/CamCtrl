# CamCtrl - Security Guard Roguelike Plan

## Core Concept
Single-page browser game (GitHub Pages). You're a security guard watching camera feeds on a CRT monitor. Protect the jewel from increasingly sophisticated heist crews across night shifts. Between shifts, upgrade your security app via card picks and experience story beats that branch toward multiple endings.

## Tech Stack
- Vanilla HTML/CSS/JS (no build step, GitHub Pages friendly)
- Canvas for camera feeds + CRT post-processing shader (scanlines, phosphor glow, slight curvature)
- CSS for UI panels (upgrade cards, narrative text, HUD)

## Game Loop

### During a Shift (Core Gameplay - Option 1)
- Top-down grid map of a building (procedurally generated floor plan)
- 4-6 camera feeds shown as small viewports into different rooms
- Thieves spawn at entry points and pathfind toward the jewel vault
- Player actions (cost action points per turn):
  - **Switch camera** - pan a feed to a different room
  - **Lock door** - temporarily block a path (thieves can pick locks over turns)
  - **Trigger alarm** - slows thieves in a zone, but has cooldown
  - **Activate trap** - if unlocked via upgrades
- Fog of war: you only see rooms covered by active cameras
- Shift ends when: thieves reach the jewel (fail) or timer runs out / all thieves caught (success)
- Turns are semi-real-time: a tick every ~2 seconds, but player can pause to issue commands

### Between Shifts (Meta Layer - Option 3)
- Pick 1 of 3 upgrade cards for your security app:
  - **Hardware**: more cameras, better zoom (larger view per feed), night vision
  - **Software**: motion detection (auto-highlight thieves), facial recognition (see thief stats), predictive pathing
  - **Countermeasures**: EMP traps, reinforced doors, security drones, lockdown protocol
- Thieves also escalate: lockpicks, disguises (harder to spot), smoke bombs (block camera), tunneling

### Narrative Layer (Option 6)
- Story beats between shifts delivered as text messages / emails on your security terminal
- Key story threads:
  - **The Client**: who owns the jewel? Instructions get stranger over time
  - **The Inside Job**: a coworker may be helping the thieves
  - **The Conspiracy**: management knows more than they let on
- Player choices in dialogue affect which ending you get:
  - **Loyal Guard**: protect the jewel, company rewards you
  - **Turncoat**: help the thieves, split the score
  - **Whistleblower**: expose the conspiracy, jewel was stolen property all along
  - **Paranoid**: trust no one, fortify everything, survive alone

## File Structure
```
index.html          - Entry point, loads everything
css/
  style.css         - Layout, CRT effects, UI panels
js/
  main.js           - Game init, state machine (menu/shift/upgrade/narrative)
  renderer.js       - Canvas rendering, CRT shader, camera feeds
  map.js            - Procedural floor plan generation
  entities.js       - Thief AI, pathfinding, guard actions
  upgrades.js       - Card definitions, upgrade application
  narrative.js      - Story beats, dialogue trees, ending tracking
  audio.js          - Minimal sound effects (buzzes, static, alarms)
assets/
  (minimal - mostly procedural/CSS-driven visuals)
```

## MVP Scope (What gets built now)
1. CRT-styled game screen with camera feed grid
2. Procedurally generated floor plan (rooms, corridors, vault)
3. Thief AI that pathfinds toward the jewel
4. Core player actions: switch camera, lock door, trigger alarm
5. Turn/tick system with pause
6. 3-shift mini-run with upgrade card picks between shifts
7. One narrative thread with 2 endings (loyal guard vs. whistleblower)
8. Win/lose conditions, shift summary screen
