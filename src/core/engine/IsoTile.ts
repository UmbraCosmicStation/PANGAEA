import { Container, Graphics, Color } from 'pixi.js';
import { IsoProjection } from '../math/projection';
import type { IProjection } from '../math/projection';
import type { IFileNode } from '../../features/data-provider/types';

export class IsoTile extends Container {
    public gridX: number;
    public gridY: number;
    public gridWidth: number = 1;
    public gridDepth: number = 1;
    public zHeight: number = 0;

    // Core Graphics
    private gfx: Graphics;
    private color: number;

    // Interaction
    private originalColor: number;
    public node: IFileNode;
    private onHover?: (node: IFileNode | null) => void;
    private currentProjection: IProjection;

    constructor(x: number, y: number, node: IFileNode, onHover?: (node: IFileNode | null) => void) {
        super();
        this.gridX = x;
        this.gridY = y;
        this.node = node;
        this.onHover = onHover;

        // Base Color Scheme
        // Tree (Folder) -> Blue
        // Blob (File) -> Green (or vary by extension in future)
        // Base Color Scheme
        // Tree (Folder) -> Green (Nature/Land)
        // Sea is Blue, so we avoid Blue for Land.
        this.originalColor = 0x4CAF50; // Green 500
        this.color = this.originalColor;
        this.currentProjection = IsoProjection;

        // Default Initial Height (before metrics)
        this.zHeight = 1;

        this.eventMode = 'static';
        this.cursor = 'pointer';

        this.on('pointerover', this.onPointerOver, this);
        this.on('pointerout', this.onPointerOut, this);

        this.gfx = new Graphics();
        this.addChild(this.gfx);
    }

    private lerpColor(from: number, to: number, t: number): number {
        const clampedT = Math.max(0, Math.min(1, t));

        const fr = (from >> 16) & 0xFF;
        const fg = (from >> 8) & 0xFF;
        const fb = from & 0xFF;

        const tr = (to >> 16) & 0xFF;
        const tg = (to >> 8) & 0xFF;
        const tb = to & 0xFF;

        const r = Math.round(fr + (tr - fr) * clampedT);
        const g = Math.round(fg + (tg - fg) * clampedT);
        const b = Math.round(fb + (tb - fb) * clampedT);

        return (r << 16) | (g << 8) | b;
    }

    private getHeightColor(height01: number): number {
        const t = Math.max(0, Math.min(1, height01));

        const lowGreen = 0x4CAF50;
        const midYellow = 0xFACC15;
        const highRed = 0xEF4444;

        if (t <= 0.5) return this.lerpColor(lowGreen, midYellow, t * 2);
        return this.lerpColor(midYellow, highRed, (t - 0.5) * 2);
    }

    /**
     * Called by IsoEngine after creating the tile to pass global stats.
     */
    public setMetrics(minChange: number, maxChange: number) {
        // 1. Calculate Normalized Activity (0.0 - 1.0)
        let activity = 0;
        if (maxChange > minChange) {
            const nodeChange = this.node.dailyChange ?? minChange;
            activity = (nodeChange - minChange) / (maxChange - minChange);
        }

        // 2. Map Activity to Height Formula: ((val - min) / (max - min)) * 5 + 1
        // Max height 6
        this.zHeight = (activity * 5) + 1;

        // 3. Height-based color gradient (low = green, high = red)
        const minHeight = 1;
        const maxHeight = 6;
        const height01 = (this.zHeight - minHeight) / (maxHeight - minHeight);
        this.originalColor = this.getHeightColor(height01);
        this.color = this.originalColor;

        // Draw with new metrics
        this.refresh(this.currentProjection);
    }

    private onPointerOver() {
        this.color = 0xFFFFFF;
        this.refresh(this.currentProjection);
        if (this.onHover) this.onHover(this.node);
    }

    private onPointerOut() {
        this.color = this.originalColor;
        this.refresh(this.currentProjection);
        if (this.onHover) this.onHover(null);
    }

    public refresh(projection: IProjection) {
        this.currentProjection = projection;
        this.draw(projection);
        this.updatePosition(projection);
    }

    private darken(hex: number, factor: number): number {
        const r = (hex >> 16) & 0xFF;
        const g = (hex >> 8) & 0xFF;
        const b = hex & 0xFF;

        const newR = Math.max(0, Math.floor(r * factor));
        const newG = Math.max(0, Math.floor(g * factor));
        const newB = Math.max(0, Math.floor(b * factor));

        return (newR << 16) | (newG << 8) | newB;
    }

    private draw(projection: IProjection) {
        this.gfx.clear();

        const h = this.zHeight;

        // GAP Logic: Shrink the drawing box by 10% (0.05 on each side)
        const gap = 0.05;
        const x0 = gap;
        const x1 = this.gridWidth - gap;
        const y0 = gap;
        const y1 = this.gridDepth - gap;

        // Vertices
        // Top Face (at Height h)
        const t1 = projection.project({ x: x0, y: y0, z: h });
        const t2 = projection.project({ x: x1, y: y0, z: h });
        const t3 = projection.project({ x: x1, y: y1, z: h });
        const t4 = projection.project({ x: x0, y: y1, z: h });

        // Bottom Face (at Height 0) - Only needed for sides
        const b1 = projection.project({ x: x0, y: y0, z: 0 });
        const b2 = projection.project({ x: x1, y: y0, z: 0 });
        const b3 = projection.project({ x: x1, y: y1, z: 0 });
        const b4 = projection.project({ x: x0, y: y1, z: 0 });

        const isIso = t1.y !== b1.y;

        if (isIso && h > 0) {
            // Opaque Sides
            const sideColor1 = this.darken(this.color, 0.8); // Right (Darker)
            const sideColor2 = this.darken(this.color, 0.6); // Left (Darkest)

            // Right Side
            this.drawRoundedSide(t2, t3, b3, b2, sideColor1, 1.0);

            // Left Side
            this.drawRoundedSide(t3, t4, b4, b3, sideColor2, 1.0);
        }

        // Draw Top Face (Rounded Diamond)
        this.drawRoundedFace(t1, t2, t3, t4, this.color, 1.0);
    }

    private drawRoundedFace(p1: any, p2: any, p3: any, p4: any, color: number, alpha: number) {
        // We want to round the corners at p1, p2, p3, p4.
        const r = 4; // Pixel radius

        const drawCorner = (curr: any, next: any) => {
            const dx = next.x - curr.x;
            const dy = next.y - curr.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const factor = Math.min(0.2, 10 / len);

            return {
                x: curr.x + dx * factor,
                y: curr.y + dy * factor
            };
        };

        const drawPreCorner = (prev: any, curr: any) => {
            const dx = prev.x - curr.x;
            const dy = prev.y - curr.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const factor = Math.min(0.2, 10 / len);
            return {
                x: curr.x + dx * factor,
                y: curr.y + dy * factor
            };
        }

        const c1_a = drawPreCorner(p4, p1);
        const c1_b = drawCorner(p1, p2);

        const c2_a = drawPreCorner(p1, p2);
        const c2_b = drawCorner(p2, p3);

        const c3_a = drawPreCorner(p2, p3);
        const c3_b = drawCorner(p3, p4);

        const c4_a = drawPreCorner(p3, p4);
        const c4_b = drawCorner(p4, p1);

        this.gfx.beginPath();
        this.gfx.moveTo(c1_b.x, c1_b.y);

        this.gfx.lineTo(c2_a.x, c2_a.y);
        this.gfx.quadraticCurveTo(p2.x, p2.y, c2_b.x, c2_b.y);

        this.gfx.lineTo(c3_a.x, c3_a.y);
        this.gfx.quadraticCurveTo(p3.x, p3.y, c3_b.x, c3_b.y);

        this.gfx.lineTo(c4_a.x, c4_a.y);
        this.gfx.quadraticCurveTo(p4.x, p4.y, c4_b.x, c4_b.y);

        this.gfx.lineTo(c1_a.x, c1_a.y);
        this.gfx.quadraticCurveTo(p1.x, p1.y, c1_b.x, c1_b.y);

        this.gfx.closePath();
        this.gfx.fill({ color, alpha });
        this.gfx.stroke({ width: 1.5, color: 0xffffff, alpha: 0.4 });
    }

    private drawRoundedSide(top1: any, top2: any, bot2: any, bot1: any, color: number, alpha: number) {
        this.gfx.beginPath();
        this.gfx.moveTo(top1.x, top1.y);
        this.gfx.lineTo(top2.x, top2.y);
        this.gfx.lineTo(bot2.x, bot2.y);
        this.gfx.lineTo(bot1.x, bot1.y);
        this.gfx.closePath();
        this.gfx.fill({ color, alpha }); // Opaque side
    }

    private updatePosition(projection: IProjection) {
        const screenPos = projection.project({ x: this.gridX, y: this.gridY, z: 0 });
        this.x = screenPos.x;
        this.y = screenPos.y;
        this.zIndex = this.gridX + this.gridY;
    }
}
