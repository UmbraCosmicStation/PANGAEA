import { Container, FederatedPointerEvent, FederatedWheelEvent } from 'pixi.js';

export class IsoCamera {
    private container: Container;
    private isDragging: boolean = false;
    private lastPos: { x: number; y: number } = { x: 0, y: 0 };

    constructor(container: Container) {
        this.container = container;
        this.setupEvents(container.parent || container); // Attach to stage or wrapper
    }

    private setupEvents(wrapper: Container) {
        // PixiJS v8 Event System
        wrapper.eventMode = 'static';
        wrapper.hitArea = { contains: () => true }; // Catch all events

        wrapper.on('pointerdown', this.onPointerDown.bind(this));
        wrapper.on('pointerup', this.onPointerUp.bind(this));
        wrapper.on('pointerupoutside', this.onPointerUp.bind(this));
        wrapper.on('pointermove', this.onPointerMove.bind(this));
        wrapper.on('wheel', this.onWheel.bind(this));
    }

    private onPointerDown(e: FederatedPointerEvent) {
        this.isDragging = true;
        this.lastPos = { x: e.global.x, y: e.global.y };
    }

    private onPointerUp() {
        this.isDragging = false;
    }

    private onPointerMove(e: FederatedPointerEvent) {
        if (!this.isDragging) return;

        const dx = e.global.x - this.lastPos.x;
        const dy = e.global.y - this.lastPos.y;

        this.container.x += dx;
        this.container.y += dy;

        this.lastPos = { x: e.global.x, y: e.global.y };
    }

    private onWheel(e: FederatedWheelEvent) {
        const scaleFactor = 1.1;
        const delta = e.deltaY > 0 ? 1 / scaleFactor : scaleFactor;

        this.container.scale.x *= delta;
        this.container.scale.y *= delta;
    }
}
