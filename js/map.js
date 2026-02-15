// ============================================================
//  OVERWORLD MAP — Node-based sailing map
// ============================================================
const GameMap = {
    nodes: [],
    currentNode: 0,
    playerMapX: 0,
    playerMapY: 0,
    targetMapX: 0,
    targetMapY: 0,
    sailing: false,
    sailTimer: 0,
    sailDuration: 1.5,
    hoveredNode: -1,

    // Wave animation
    waveFrame: 0,

    generate(act) {
        this.nodes = [];
        this.currentNode = 0;
        this.sailing = false;

        // Generate branching node map
        const cols = 6;
        const rowSpacing = 65;
        const colSpacing = 90;
        const startX = 100;
        const startY = 100;

        // Node layout per column: 1-3 nodes
        const layout = [];
        layout.push([{ type: 'start' }]); // column 0: start
        layout.push([{ type: 'island' }, { type: 'island' }]); // column 1
        layout.push([{ type: 'tavern' }, { type: 'island' }]); // column 2
        layout.push([{ type: 'island' }, { type: 'island' }, { type: 'sea_battle' }]); // column 3
        layout.push([{ type: 'island' }, { type: 'tavern' }]); // column 4
        layout.push([{ type: 'boss' }]); // column 5: boss

        let nodeId = 0;
        const nodesByCol = [];

        for (let col = 0; col < layout.length; col++) {
            const colNodes = layout[col];
            const colGroup = [];
            const totalHeight = (colNodes.length - 1) * rowSpacing;
            const baseY = startY + 150 - totalHeight / 2;

            for (let row = 0; row < colNodes.length; row++) {
                const def = colNodes[row];
                const x = startX + col * colSpacing;
                const y = baseY + row * rowSpacing + (Math.random() - 0.5) * 15;

                const node = {
                    id: nodeId++,
                    x, y,
                    type: def.type,
                    visited: false,
                    accessible: false,
                    connections: [], // ids of connected nodes
                    col,
                    difficulty: col + act * 2,
                };
                this.nodes.push(node);
                colGroup.push(node);
            }
            nodesByCol.push(colGroup);
        }

        // Create connections between adjacent columns
        for (let col = 0; col < nodesByCol.length - 1; col++) {
            const curr = nodesByCol[col];
            const next = nodesByCol[col + 1];

            for (const node of curr) {
                // Connect to 1-2 nodes in next column
                const sorted = [...next].sort((a, b) =>
                    Math.abs(a.y - node.y) - Math.abs(b.y - node.y)
                );
                // Always connect to nearest
                node.connections.push(sorted[0].id);
                // Maybe connect to second nearest
                if (sorted.length > 1 && Math.random() > 0.4) {
                    node.connections.push(sorted[1].id);
                }
            }
        }

        // Mark start as visited, and next nodes as accessible
        this.nodes[0].visited = true;
        for (const connId of this.nodes[0].connections) {
            this.nodes[connId].accessible = true;
        }

        this.playerMapX = this.nodes[0].x;
        this.playerMapY = this.nodes[0].y;
    },

    // Select a node to travel to
    selectNode(nodeId) {
        const node = this.nodes[nodeId];
        if (!node || !node.accessible || node.visited) return null;

        // Start sailing
        this.sailing = true;
        this.sailTimer = this.sailDuration;
        this.targetMapX = node.x;
        this.targetMapY = node.y;
        this.currentNode = nodeId;
        return node;
    },

    // Arrive at node
    arriveAtNode() {
        const node = this.nodes[this.currentNode];
        node.visited = true;
        node.accessible = false;
        this.sailing = false;

        // Make connected nodes accessible
        for (const connId of node.connections) {
            if (!this.nodes[connId].visited) {
                this.nodes[connId].accessible = true;
            }
        }

        return node;
    },

    update(dt) {
        this.waveFrame += dt;

        if (this.sailing) {
            this.sailTimer -= dt;
            const t = 1 - (this.sailTimer / this.sailDuration);
            this.playerMapX += (this.targetMapX - this.playerMapX) * t * 0.1;
            this.playerMapY += (this.targetMapY - this.playerMapY) * t * 0.1;

            if (this.sailTimer <= 0) {
                this.playerMapX = this.targetMapX;
                this.playerMapY = this.targetMapY;
                return this.arriveAtNode();
            }
        }

        // Check hover
        this.hoveredNode = -1;
        for (const node of this.nodes) {
            if (!node.accessible || node.visited) continue;
            const dx = Input.mouse.x - node.x;
            const dy = Input.mouse.y - node.y;
            if (Math.sqrt(dx * dx + dy * dy) < 20) {
                this.hoveredNode = node.id;
                break;
            }
        }

        // Check click
        if (Input.mouse.leftClick && this.hoveredNode >= 0 && !this.sailing) {
            return { selectedNode: this.hoveredNode };
        }

        return null;
    },

    draw(ctx, frame) {
        const W = Renderer.W;
        const H = Renderer.H;

        // Ocean background
        for (let y = 0; y < H; y += 16) {
            for (let x = 0; x < W; x += 16) {
                Sprites.drawWaterTile(ctx, x, y, frame, x / 16, y / 16);
            }
        }

        // Title
        ctx.fillStyle = '#e8c872';
        ctx.font = 'bold 18px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('THE SHALLOW SEAS', W / 2, 30);
        ctx.font = '11px "Courier New"';
        ctx.fillStyle = '#aaa';
        ctx.fillText('Choose your route — click a node to sail', W / 2, 50);

        // Draw connections
        for (const node of this.nodes) {
            for (const connId of node.connections) {
                const target = this.nodes[connId];
                ctx.strokeStyle = 'rgba(200,180,120,0.3)';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(target.x, target.y);
                ctx.stroke();
            }
        }
        ctx.setLineDash([]);

        // Draw nodes
        for (const node of this.nodes) {
            this._drawNode(ctx, node, frame);
        }

        // Draw player ship
        this._drawShip(ctx, this.playerMapX, this.playerMapY, frame);

        // Node info on hover
        if (this.hoveredNode >= 0) {
            const node = this.nodes[this.hoveredNode];
            const label = this._nodeLabel(node.type);
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(node.x - 60, node.y + 22, 120, 24);
            ctx.strokeStyle = '#e8c872';
            ctx.lineWidth = 1;
            ctx.strokeRect(node.x - 60, node.y + 22, 120, 24);
            ctx.fillStyle = '#e8c872';
            ctx.font = '10px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText(label, node.x, node.y + 38);
        }

        // Ship stats
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(W - 170, H - 80, 160, 70);
        ctx.strokeStyle = '#e8c872';
        ctx.strokeRect(W - 170, H - 80, 160, 70);
        ctx.fillStyle = '#e8c872';
        ctx.font = 'bold 10px "Courier New"';
        ctx.textAlign = 'left';
        ctx.fillText('SHIP: Sloop', W - 160, H - 62);
        ctx.font = '10px "Courier New"';
        ctx.fillStyle = '#aaa';
        ctx.fillText('Gold: ' + Player.gold, W - 160, H - 48);
        ctx.fillText('HP: ' + Math.ceil(Player.hp) + '/' + Player.maxHp, W - 160, H - 34);
        ctx.fillText('Ammo: ' + Player.ammo, W - 160, H - 20);
    },

    _drawNode(ctx, node, frame) {
        const r = 14;
        const isHovered = node.id === this.hoveredNode;
        const col = this._nodeColor(node.type);

        // Glow for accessible
        if (node.accessible && !node.visited) {
            ctx.save();
            ctx.globalAlpha = 0.3 + Math.sin(frame * 0.05) * 0.15;
            ctx.fillStyle = col;
            ctx.beginPath(); ctx.arc(node.x, node.y, r + 6, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        // Node circle
        ctx.fillStyle = node.visited ? '#3a3a3a' : (isHovered ? '#ffffff' : col);
        ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = node.accessible ? '#ffffff' : '#555555';
        ctx.lineWidth = isHovered ? 3 : 1;
        ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2); ctx.stroke();

        // Icon
        ctx.fillStyle = node.visited ? '#666' : '#000';
        ctx.font = 'bold 12px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText(this._nodeIcon(node.type), node.x, node.y + 4);
    },

    _drawShip(ctx, x, y, frame) {
        const bob = Math.sin(frame * 0.08) * 2;
        ctx.save();
        ctx.translate(x, y + bob);
        // Hull
        ctx.fillStyle = '#7a5a3a';
        ctx.fillRect(-8, -2, 16, 6);
        ctx.fillRect(-6, 4, 12, 2);
        // Mast
        ctx.fillStyle = '#5a4030';
        ctx.fillRect(-1, -12, 2, 12);
        // Sail
        ctx.fillStyle = '#eeeecc';
        ctx.beginPath();
        ctx.moveTo(1, -11);
        ctx.lineTo(8, -6);
        ctx.lineTo(1, -3);
        ctx.closePath();
        ctx.fill();
        // Flag
        ctx.fillStyle = '#cc3333';
        ctx.fillRect(0, -14, 5, 3);
        ctx.restore();
    },

    _nodeColor(type) {
        switch (type) {
            case 'start': return '#44aa44';
            case 'island': return '#e8c872';
            case 'tavern': return '#44bbaa';
            case 'sea_battle': return '#cc4444';
            case 'boss': return '#ff4444';
            default: return '#888888';
        }
    },

    _nodeIcon(type) {
        switch (type) {
            case 'start': return 'S';
            case 'island': return 'I';
            case 'tavern': return 'T';
            case 'sea_battle': return 'B';
            case 'boss': return 'X';
            default: return '?';
        }
    },

    _nodeLabel(type) {
        switch (type) {
            case 'island': return 'Island - Combat';
            case 'tavern': return 'Tavern - Rest & Shop';
            case 'sea_battle': return 'Sea Battle';
            case 'boss': return 'BOSS: Cpt. Blacktide';
            default: return type;
        }
    }
};
