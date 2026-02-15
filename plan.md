# Tide of Fortune — Top-Down Pirate Roguelite

## Core Concept
Single-page browser game (GitHub Pages). You're a pirate captain sailing procedurally generated seas, raiding islands, fighting naval battles, and hunting legendary treasure. Each run is a voyage across a branching ocean map. Go ashore for top-down real-time action combat in procedural islands and dungeons. Die and start fresh — but your pirate cove persists between runs with permanent unlocks.

## Tech Stack
- Vanilla HTML/CSS/JS (no build step, GitHub Pages friendly)
- Canvas for all gameplay rendering (tile maps, sprites, particles, water effects)
- Pixel art style with warm tropical palette (teals, golds, deep blues, sunset oranges)
- CSS for UI panels (inventory, map, crew, menus)
- Sprite-based animation with simple particle systems (water shimmer, cannon smoke, explosions)

## Visual Style
- 16-bit pixel art aesthetic, top-down perspective
- Warm tropical palette: turquoise waters, golden sands, lush green jungles, sunset orange/pink skies
- Animated water tiles with shimmer/wave effect
- Screen shake on hits and explosions
- Minimal UI — health as a rum bottle filling/draining, gold counter, minimap
- Tile size: 16x16 base tiles, characters 16x24 or 16x16

## Game Structure

### The Run
Each run = one voyage. The captain sets sail from the pirate cove and navigates a procedural ocean map toward the Final Treasure. A full run has 3 acts (zones), each ending with a boss. Dying at any point ends the run.

### Act Structure
- **Act 1 — The Shallow Seas**: Tropical islands, weak enemies (crabs, snakes, rival thugs), small navy patrols. Boss: Rival Pirate Captain.
- **Act 2 — The Deep Waters**: Volcanic islands, jungle ruins, tougher enemies (cannibals, cursed skeletons, sirens), navy frigates. Boss: Sea Serpent.
- **Act 3 — The Cursed Reach**: Ghost islands, undead pirates, eldritch horrors, navy armada. Boss: Davy Jones / Kraken.

---

## Overworld — Ocean Map

### Structure
- Branching node map (like Slay the Spire / FTL)
- Each act has 6-8 nodes with 2-3 path choices at each branch
- Player picks a route — can't backtrack
- Final node of each act is the boss

### Node Types
| Node | Description |
|---|---|
| **Island (Combat)** | Go ashore. Top-down action level on a procedural island. Clear enemies, find loot, discover secrets. |
| **Shipwreck** | Floating debris field. Quick loot event — choose to dive (risk + reward) or salvage surface (safe, small loot). |
| **Tavern Port** | Safe harbor. Recruit crew, buy/sell gear, heal, hear rumors (hints about upcoming nodes). |
| **Sea Battle** | Ship-to-ship naval combat against pirates or navy. Broadside cannon phase then optional boarding. |
| **Sea Monster** | Elite enemy encounter on water. Tentacles, sea serpents, etc. |
| **Storm** | Hazard event. Navigate a storm — take hull damage, crew can be swept overboard, but sometimes blown to a hidden node. |
| **Merchant Ship** | Encounter a trader. Buy supplies, or raid them (loot but increases bounty). |
| **Mysterious Isle** | Rare. Strange one-off events — cursed altars, ghost encounters, buried treasure with a riddle. |
| **Hidden Grotto** | Secret node revealed by treasure maps. Guaranteed rare loot, heavy guarding. |

### Bounty System
- Raiding merchants, sinking navy ships, and general piracy increases your Bounty level (0-5 skulls)
- Higher bounty = more navy hunter ships spawn on the map, but pirate vendors respect you more (better prices)
- Bounty resets each run

---

## Island Exploration — Top-Down Action

### Level Generation
- Procedural island layouts using room/corridor generation adapted for outdoor/indoor mix
- Biomes per act: sandy beaches + palm groves (Act 1), volcanic rock + jungle temples (Act 2), haunted shores + bone caves (Act 3)
- Each island has: an entry point (beach landing), 2-3 combat zones, 1 treasure room, optional secret area
- Islands are compact — meant to be cleared in 2-5 minutes

### Player Combat
- **Movement**: 8-directional, smooth pixel movement
- **Dodge roll**: Quick dash with i-frames, short cooldown
- **Melee attack**: Cutlass slash combo (3-hit chain), directional aim toward mouse/nearest enemy
- **Ranged attack**: Flintlock pistol — high damage, slow reload (must reload manually or wait), limited ammo per island
- **Ability slot**: One equipped special ability with cooldown:
  - Powder Keg Toss (area explosion, delayed fuse)
  - Grappling Hook (pull to enemy or pull enemy to you)
  - Cannon Barrage (call ship cannons on a target zone — only works near shore)
  - Spectral Anchor (throw anchor, teleport back to it after delay)
  - Rum Chug (heal + temporary damage boost, slows you)
  - Parrot Scout (reveal nearby enemies and secrets for a duration)

### Enemy Design
**Act 1 Enemies:**
- Giant Crab — charges sideways, armored front, soft belly
- Snake — fast, lunges, poisonous (damage over time)
- Rival Pirate (melee) — cutlass swings, blocks occasionally
- Rival Pirate (ranged) — flintlock shots, runs when you close distance
- Pirate Brute — slow, heavy anchor swing, lots of HP

**Act 2 Enemies:**
- Jungle Cannibal — spear thrower, sets traps
- Cursed Skeleton — reassembles after death unless killed with fire/explosives
- Siren — ranged scream attack, charms (reverses your controls briefly)
- Temple Guardian — stone golem, slow, devastating slam, drops rubble
- Poison Dart Frog — tiny, fast, poisons on contact

**Act 3 Enemies:**
- Ghost Pirate — phases through walls, can only be hit mid-attack
- Undead Sailor — shambles slowly, explodes on death
- Eldritch Tentacle — emerges from ground, grabs and pulls
- Cursed Mirror Pirate — copies your weapon and ability
- Banshee — screams in a cone, fear effect (pushes you back)

### Boss Fights
1. **Captain Blacktide** (Act 1) — rival pirate captain. Dual-wields cutlasses. Phase 1: melee combos. Phase 2: calls crew reinforcements. Phase 3: uses a cursed relic, gains shadow dash.
2. **The Leviathan** (Act 2) — sea serpent in a flooded temple arena. Dives underwater, surfaces to slam. Acid spit pools. Must bait it into hitting pillars to stun it.
3. **Davy Jones** (Act 3) — fights on a sinking ghost ship. Summons undead crew. Tentacles grab sections of the arena, shrinking it. Final phase: the kraken emerges as the ship breaks apart.

---

## Ship & Naval Combat

### Ship Stats
- **Hull HP** — total health, repaired at taverns or with wood
- **Cannons** — determines broadside damage and number of shots
- **Sails** — determines speed on overworld (more choices visible? skip storm damage?)
- **Cargo Hold** — inventory capacity for loot, supplies, ammo

### Ship Types (Unlockable)
| Ship | Hull | Cannons | Speed | Cargo | Special |
|---|---|---|---|---|---|
| **Sloop** (starter) | Low | 2 | Fast | Small | Nimble — tighter turns |
| **Brigantine** | Medium | 4 | Medium | Medium | Balanced — no weaknesses |
| **Galleon** | High | 6 | Slow | Large | Fortress — extra armor plating |
| **Frigate** | Medium | 6 | Fast | Small | Warship — double fire rate |
| **Junk** | Medium | 3 | Medium | Large | Trade — bonus gold from all sources |
| **Ghost Ship** | Low | 4 | Fast | Medium | Phasing — dodge one attack per battle |

### Naval Combat (Simplified)
- Side-view or top-down phase when engaging enemy ships
- Player ship and enemy ship circle each other
- **Broadside**: fire cannons when lined up — timing minigame (hit a moving bar for damage bonus)
- **Maneuver**: use sails stat to gain positional advantage or flee
- **Board**: if enemy hull is low, option to board — transitions to a small top-down melee fight on their deck
- **Ram**: high-speed ships can ram for hull damage to both ships
- **Special ammo**: chain shot (slows enemy), grapeshot (kills crew, makes boarding easier), fire shot (damage over time)

---

## Crew System

### Recruitment
- Hire crew at tavern nodes — each crew member costs gold
- Max crew size depends on ship type (3-6 active crew)
- Each crew member has a role, a passive buff, and a morale stat

### Roles & Buffs
| Role | Passive Buff |
|---|---|
| **Navigator** | Reveals one extra node ahead on the map |
| **Gunner** | +1 cannon damage in naval combat |
| **Bosun** | Ship repairs slowly over time between nodes |
| **Cook** | Heal +1 HP after each island completed |
| **Surgeon** | Once per run, survive a killing blow with 1 HP |
| **Shanty Singer** | Crew morale decays slower |
| **Lookout** | Chance to spot hidden nodes and ambushes |
| **Quartermaster** | Shop prices reduced 15% |
| **Powder Monkey** | Ability cooldowns reduced 20% on islands |
| **Diver** | Double loot from shipwreck nodes |

### Morale
- Morale is a shared crew stat (0-100)
- Morale rises from: victories, tavern visits, finding treasure, having a cook/singer
- Morale drops from: defeats, crew deaths, storms, low supplies, long voyages without port
- Low morale (below 25): random crew desert at next port
- Critical morale (below 10): mutiny event — fight your own crew or bribe them with gold

---

## Loot & Equipment

### Player Equipment Slots
- **Weapon**: Cutlass variants (fast/slow/balanced), axes, rapiers, hooks
- **Sidearm**: Flintlock pistol variants, blunderbuss, throwing knives
- **Ability**: One active ability (see combat section)
- **Trinket 1 & 2**: Passive relics with unique effects

### Weapon Examples
| Weapon | Type | Speed | Damage | Special |
|---|---|---|---|---|
| Rusty Cutlass | Melee | Medium | Low | Starter weapon |
| Captain's Saber | Melee | Fast | Medium | 3rd hit in combo crits |
| Boarding Axe | Melee | Slow | High | Breaks enemy block |
| Shark-Tooth Blade | Melee | Medium | Medium | Bleed damage over time |
| Spectral Rapier | Melee | Fast | Low | Hits phase through enemies (piercing) |
| Coral Mace | Melee | Slow | High | Knockback on hit |

### Trinket/Relic Examples
- **Compass of Greed**: +25% gold drops, but shop prices also +25%
- **Davy Jones' Coin**: Flip a coin on death — heads: revive with 50% HP, tails: lose all gold
- **Cursed Pearl**: +2 damage to all attacks, but max HP reduced by 30%
- **Sea Witch's Eye**: See enemy HP bars and damage numbers
- **Kraken Tooth**: Dodge roll leaves a damaging ink trail
- **Siren's Conch**: Enemies are slowed for 2s when you enter a room
- **Captain's Logbook**: Gain XP 20% faster (for meta progression)
- **Lucky Doubloon**: +10% chance for double loot from any source
- **Barnacle Shield**: Take 1 less damage from all sources (min 1)
- **Monkey's Paw**: Shops offer one extra item, but one item is always cursed

### Currency & Resources
- **Gold** — primary currency, used in shops, crew hiring, ship repair
- **Cannonballs** — ammo for naval combat (replenished at ports)
- **Pistol Ammo** — limited per island, found in crates/drops
- **Wood** — repair ship hull between nodes
- **Rum** — consumable heal item, also keeps morale up

---

## Roguelite Persistence — The Pirate Cove

### Overview
Between runs, you return to your Pirate Cove — a persistent home base that grows as you invest gold and resources earned from runs. Even failed runs contribute some progress.

### Cove Buildings (Unlock/Upgrade)
| Building | Effect |
|---|---|
| **Shipyard** | Unlock new ship types to start runs with |
| **Armory** | Unlock new weapons/sidearms that can appear in loot pools |
| **Tavern** | Unlock new crew roles; start with 1 free crew member |
| **Cartographer** | Start with partial map revealed; unlock new node types |
| **Treasure Vault** | Bank a percentage of gold between runs |
| **Training Grounds** | Unlock new abilities for the ability slot |
| **Shrine of the Deep** | Unlock cursed relics (high risk/reward trinkets) |
| **Dock** | Start with bonus supplies (cannonballs, wood, rum) |

### Infamy (Meta Progression)
- Each run earns Infamy XP based on: distance traveled, enemies killed, bosses beaten, treasure found
- Infamy levels unlock new content tiers and difficulty modifiers
- At certain thresholds, the world gets harder but drops better loot
- Infamy is permanent and never lost

### Unlockable Captains
| Captain | Starting Weapon | Starting Ability | Perk |
|---|---|---|---|
| **"Red" Maggie** (starter) | Rusty Cutlass | Powder Keg | None — balanced |
| **One-Eye Jack** | Boarding Axe | Grappling Hook | +20% melee damage, -10% speed |
| **Silver Anne** | Rapier | Spectral Anchor | Dodge roll has +50% range |
| **Powder Pete** | Blunderbuss (melee) | Cannon Barrage | All explosions +30% radius |
| **Doc Bones** | Shark-Tooth Blade | Rum Chug | Healing items +50% effective |
| **Ghost Captain** | Spectral Rapier | Phase Dash | Can dash through walls, -25% max HP |

---

## UI / HUD Design

### In-Game HUD (Island Combat)
- **Top-left**: Rum bottle (HP bar), ability icon + cooldown arc
- **Top-right**: Minimap of current island
- **Bottom-left**: Weapon + sidearm icons, ammo count
- **Bottom-center**: Interaction prompts ("E to open", "E to board")
- **Bottom-right**: Gold counter, key items

### Overworld HUD (Sailing)
- **Center**: Node map with paths, current position highlighted
- **Right panel**: Ship stats (hull, crew, cargo)
- **Bottom**: Crew portraits with morale bar
- **Top**: Act title, bounty skull icons

### Menus
- **Pause menu**: Inventory, crew details, run stats, settings
- **Cove menu**: Building upgrade screen, captain select, lore codex
- **Death screen**: Run summary (distance, kills, gold earned, infamy gained), "Set Sail Again" button

---

## Audio Direction (Minimal / Procedural)
- Ocean ambient loop with wave sounds
- Combat: sword clash SFX, pistol crack, explosion boom
- UI: coin clink, menu swoosh, upgrade chime
- Music: simple shanty-inspired loops per act (can be procedural or short composed loops)
- Boss music: more intense percussion

---

## File Structure
```
index.html              - Entry point, loads everything
css/
  style.css             - Layout, UI panels, menus, HUD styling
js/
  main.js               - Game init, state machine (menu/sailing/island/combat/cove)
  renderer.js           - Canvas rendering, sprite drawing, camera, particles
  input.js              - Keyboard + mouse input handling
  map.js                - Overworld ocean map generation, node graph
  island.js             - Island level generation, tile maps, room placement
  player.js             - Player entity, movement, combat, equipment
  enemies.js            - Enemy types, AI behaviors, spawning
  combat.js             - Damage calc, hitboxes, dodge, abilities
  naval.js              - Ship-to-ship combat system
  crew.js               - Crew management, morale, roles, buffs
  loot.js               - Item generation, loot tables, rarity
  shop.js               - Tavern/merchant shop logic
  cove.js               - Persistent base, upgrades, unlocks, save/load
  ui.js                 - HUD rendering, menus, inventory screen
  audio.js              - Sound effects and music management
  save.js               - LocalStorage save/load for persistence
assets/
  sprites/              - Character, enemy, tile, item sprite sheets
  sfx/                  - Sound effect files
  music/                - Background music loops
```

## MVP Scope (Phase 1 — What Gets Built First)
1. Canvas renderer with tile map and sprite system
2. Player movement, dodge roll, melee attack (cutlass)
3. One procedural island layout (beach + jungle rooms)
4. 3 basic enemy types (crab, pirate melee, pirate ranged)
5. Simple overworld map with 5 linear nodes (3 islands, 1 tavern, 1 boss)
6. Boss fight: Captain Blacktide (Act 1 boss)
7. Basic loot drops (gold, health pickups, one weapon swap)
8. Death → restart loop
9. Minimal HUD (HP, weapon, gold)
10. Core game loop: sail → land → fight → loot → sail → boss
