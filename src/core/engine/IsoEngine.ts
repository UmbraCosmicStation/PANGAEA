import { Application, Container, FederatedPointerEvent } from 'pixi.js'; // Added FederatedPointerEvent
import { IsoTile } from './IsoTile';
import { WaterSurface } from './WaterSurface';
import { MockRepositoryService } from '../../features/data-provider/mock/MockRepositoryService';
import type { IFileNode } from '../../features/data-provider/types';
import { IsoProjection, MapProjection } from '../math/projection';

export class IsoEngine {
    private app: Application;
    private worldContainer: Container;
    private mockService: MockRepositoryService;
    private onNodeHover?: (node: IFileNode | null) => void;

    // Camera State
    private isDragging: boolean = false;
    private lastPos: { x: number, y: number } = { x: 0, y: 0 };

    // Water
    private water: WaterSurface | null = null;

    constructor(onNodeHover?: (node: IFileNode | null) => void) {
        this.app = new Application();
        this.worldContainer = new Container();
        this.worldContainer.sortableChildren = true; // Tiles on top
        this.mockService = new MockRepositoryService();
        this.onNodeHover = onNodeHover;
    }

    public async init(container: HTMLElement) {
        await this.app.init({
            resizeTo: container,
            backgroundAlpha: 0,
            antialias: true,
            autoDensity: true,
            resolution: window.devicePixelRatio || 1,
            preference: 'webgl',
        });

        container.appendChild(this.app.canvas);

        // 0. Water Background (Optimized)
        this.water = new WaterSurface(this.app.screen.width, this.app.screen.height);
        this.app.stage.addChild(this.water); // Add first (bottom layer)

        this.app.renderer.on('resize', (screenWidth: number, screenHeight: number) => {
            this.water?.resize(screenWidth, screenHeight);
        });

        // 1. World Container
        this.worldContainer.x = this.app.screen.width / 2;
        this.worldContainer.y = this.app.screen.height / 2;
        this.app.stage.addChild(this.worldContainer);
        this.water?.setViewTransform(this.worldContainer.x, this.worldContainer.y, this.worldContainer.scale.x);

        // ... Interactions ...
        this.setupInteractions(container);

        // ... Load Data ...
        console.log("IsoEngine: Fetching Mock Data...");
        const rootNodes = await this.mockService.getRoot();
        this.layoutNodes(rootNodes);
        this.fitToScreen();
    }


    private setupInteractions(container: HTMLElement) {
        // 1. Pan (Drag)
        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = this.app.screen; // Entire screen

        this.app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
            this.isDragging = true;
            this.lastPos = { x: e.global.x, y: e.global.y };
        });

        this.app.stage.on('pointermove', (e: FederatedPointerEvent) => {
            if (this.isDragging) {
                const dx = e.global.x - this.lastPos.x;
                const dy = e.global.y - this.lastPos.y;
                this.worldContainer.x += dx;
                this.worldContainer.y += dy;
                this.lastPos = { x: e.global.x, y: e.global.y };
                this.water?.setViewTransform(this.worldContainer.x, this.worldContainer.y, this.worldContainer.scale.x);
            }
        });

        this.app.stage.on('pointerup', () => { this.isDragging = false; });
        this.app.stage.on('pointerupoutside', () => { this.isDragging = false; });

        // 2. Zoom (Wheel) - Native DOM Event for better control
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const scaleFactor = 1.1;
            const direction = e.deltaY > 0 ? (1 / scaleFactor) : scaleFactor;

            // Simple Zoom to center (Refinement: Zoom to mouse cursor in future)
            this.worldContainer.scale.x *= direction;
            this.worldContainer.scale.y *= direction;

            // Clamp Zoom
            this.worldContainer.scale.x = Math.max(0.1, Math.min(this.worldContainer.scale.x, 5));
            this.worldContainer.scale.y = Math.max(0.1, Math.min(this.worldContainer.scale.y, 5));

            this.water?.setViewTransform(this.worldContainer.x, this.worldContainer.y, this.worldContainer.scale.x);
        }, { passive: false });
    }

    private fitToScreen() {
        // Calculate Bounds
        const bounds = this.worldContainer.getBounds();
        if (bounds.width === 0 || bounds.height === 0) return;

        const screenW = this.app.screen.width;
        const screenH = this.app.screen.height;
        const padding = 50;

        const scaleX = (screenW - padding * 2) / bounds.width;
        const scaleY = (screenH - padding * 2) / bounds.height;
        const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in if smaller

        this.worldContainer.scale.set(scale);

        // Center again after scaling
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;

        // Offset to center
        this.worldContainer.x = (screenW / 2) - (cx - this.worldContainer.x) * scale;
        this.worldContainer.y = (screenH / 2) - (cy - this.worldContainer.y) * scale;

        this.water?.setViewTransform(this.worldContainer.x, this.worldContainer.y, this.worldContainer.scale.x);
    }

    private layoutNodes(nodes: IFileNode[]) {
        // 1. Flatten but KEEP STRUCTURE to aggregate
        // We actually want a list of "Visible Nodes" (Top-level Folders or Sub-folders)
        // If we just flatten everything, we lose context.
        // But for this "City" view, we treat every Folder as a Building.

        const folderList: IFileNode[] = [];

        const processNode = (node: IFileNode) => {
            if (node.type === 'tree') {
                // Initialize Aggregated Stats if not present
                // (We temporarily attach them to the node object or a wrapper)
                // For simplified logic, we'll calc on the fly.

                let totalSize = 0;
                let maxChange = 0;
                let trendingFile = "";

                // Aggregate Children Stats
                if (node.children) {
                    node.children.forEach(child => {
                        if (child.type === 'blob') {
                            totalSize += child.size || 0;
                            if ((child.dailyChange || 0) > maxChange) {
                                maxChange = child.dailyChange || 0;
                                trendingFile = child.name;
                            }
                        } else {
                            processNode(child); // Recurse
                        }
                    });
                }

                // Override Node Stats with Aggregated Values for Visualization
                // (This modifies the node in place, perfectly fine for this app)
                node.size = totalSize;
                node.dailyChange = maxChange;
                (node as any).trendingFile = trendingFile; // Attach custom prop

                folderList.push(node);
            }
        };

        nodes.forEach(processNode);

        console.log(`Layout: ${folderList.length} Folders (Files hidden)`);

        // Stats for Normalization (Folders Only)
        let minChange = 1, maxChange = 0;
        folderList.forEach(n => {
            if (n.dailyChange < minChange) minChange = n.dailyChange;
            if (n.dailyChange > maxChange) maxChange = n.dailyChange;
        });

        // --- Tag-Based Layout Algorithm (Clusters & Bridges) ---

        // 1. Identify Clusters (Unique Tags)
        const outputTags = new Set<string>();
        folderList.forEach(n => n.tags?.forEach(t => outputTags.add(t)));
        const uniqueTags = Array.from(outputTags).sort();

        // 2. Cluster Centers
        const clusterCenters = new Map<string, { x: number, y: number }>();
        const LAYOUT_RADIUS = 35;
        uniqueTags.forEach((tag, i) => {
            const angle = (i / uniqueTags.length) * Math.PI * 2;
            clusterCenters.set(tag, {
                x: Math.round(Math.cos(angle) * LAYOUT_RADIUS),
                y: Math.round(Math.sin(angle) * LAYOUT_RADIUS)
            });
        });

        // 3. Occupancy
        const occupied = new Set<string>();
        const checkCollision = (tx: number, ty: number, size: number) => {
            for (let x = 0; x < size; x++) {
                for (let y = 0; y < size; y++) {
                    if (occupied.has(`${tx + x},${ty + y}`)) return true;
                }
            }
            return false;
        };
        const markOccupied = (tx: number, ty: number, size: number) => {
            for (let x = 0; x < size; x++) {
                for (let y = 0; y < size; y++) {
                    occupied.add(`${tx + x},${ty + y}`);
                }
            }
        };

        const findSpot = (centerX: number, centerY: number, size: number) => {
            let r = 0; let a = 0; const maxR = 80;
            while (r < maxR) {
                const tx = Math.round(centerX + Math.cos(a) * r);
                const ty = Math.round(centerY + Math.sin(a) * r);
                if (!checkCollision(tx, ty, size)) return { x: tx, y: ty };
                a += 0.5;
                if (a > Math.PI * 2 * r) r += 1;
            }
            return { x: centerX, y: centerY };
        };

        // 5. Place Nodes
        folderList.forEach((node) => {
            // Determine Size (Folders are generally larger)
            let size = 2; // Min size for folders
            if (node.size > 20 * 1024 * 1024) size = 6;
            else if (node.size > 5 * 1024 * 1024) size = 4;

            // Determine Target Center
            let targetX = 0, targetY = 0;
            const nTags = node.tags || [];

            if (nTags.length === 1) {
                const c = clusterCenters.get(nTags[0]);
                if (c) { targetX = c.x; targetY = c.y; }
            } else if (nTags.length > 1) {
                let sumX = 0, sumY = 0;
                nTags.forEach(t => {
                    const c = clusterCenters.get(t);
                    if (c) { sumX += c.x; sumY += c.y; }
                });
                targetX = Math.round(sumX / nTags.length);
                targetY = Math.round(sumY / nTags.length);
            }

            const pos = findSpot(targetX, targetY, size);
            markOccupied(pos.x, pos.y, size);

            const tile = new IsoTile(pos.x, pos.y, node, this.onNodeHover);
            tile.gridWidth = size;
            tile.gridDepth = size;

            // Override Color: Green for Folders
            // (Blue is Sea)
            // We set it via a hack or update IsoTile to accept color? 
            // Better to update IsoTile logic. But for now I can set it here if exposed?
            // Actually `IsoTile` determines color in Constructor based on type.
            // I will update IsoTile.ts NEXT to handle Green preference.

            tile.setMetrics(minChange, maxChange);
            this.worldContainer.addChild(tile);
        });
    }

    public setProjection(mode: 'iso' | 'map') {
        const projection = mode === 'iso' ? IsoProjection : MapProjection;
        console.log(`IsoEngine: Switching to ${mode} mode`);

        this.water?.setMode(mode);
        if (this.water && this.water.parent === this.app.stage) {
            const targetIndex = mode === 'map' ? this.app.stage.children.length - 1 : 0;
            if (this.app.stage.getChildIndex(this.water) !== targetIndex) {
                this.app.stage.setChildIndex(this.water, targetIndex);
            }
        }

        this.worldContainer.children.forEach((child) => {
            if (child instanceof IsoTile) {
                child.refresh(projection);
            }
        });

        // Re-fit on view change
        setTimeout(() => this.fitToScreen(), 100);
    }

    public destroy() {
        this.app.destroy(true, { children: true });
    }
}
