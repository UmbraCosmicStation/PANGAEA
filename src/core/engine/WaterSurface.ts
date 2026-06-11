import { Container, Filter, GlProgram, Graphics, Point, Sprite, Texture, Ticker, UniformGroup, type DestroyOptions } from 'pixi.js';
import { waterFilterFragment, waterFilterVertex } from './WaterShader';

export class WaterSurface extends Container {
    private readonly water: Sprite;
    private readonly mapGrid: Graphics;
    private readonly uniforms: UniformGroup;
    private mode: 'iso' | 'map' = 'iso';

    constructor(appWidth: number, appHeight: number) {
        super();
        this.eventMode = 'none';

        this.uniforms = new UniformGroup({
            uTime: { value: 0, type: 'f32' },
            uResolution: { value: new Point(appWidth, appHeight), type: 'vec2<f32>' },
            uViewOffset: { value: new Point(appWidth / 2, appHeight / 2), type: 'vec2<f32>' },
            uViewScale: { value: 1, type: 'f32' },
        });

        const glProgram = GlProgram.from({
            vertex: waterFilterVertex,
            fragment: waterFilterFragment,
            name: 'pangaea-water-filter',
        });

        const waterFilter = new Filter({
            glProgram,
            resources: {
                waterUniforms: this.uniforms,
            },
        });

        this.water = new Sprite(Texture.WHITE);
        this.water.tint = 0x061a2b;
        this.water.width = appWidth;
        this.water.height = appHeight;
        this.water.filters = [waterFilter];
        this.addChild(this.water);

        this.mapGrid = new Graphics();
        this.mapGrid.visible = false;
        this.addChild(this.mapGrid);
        this.drawMapGrid(appWidth, appHeight);

        Ticker.shared.add(this.update, this);
    }

    public setMode(mode: 'iso' | 'map') {
        this.mode = mode;
        this.water.visible = (mode === 'iso');
        this.mapGrid.visible = (mode === 'map');
    }

    public resize(width: number, height: number) {
        this.water.width = width;
        this.water.height = height;

        const uniforms = this.uniforms.uniforms as { uResolution: Point };
        uniforms.uResolution.x = width;
        uniforms.uResolution.y = height;

        this.drawMapGrid(width, height);
    }

    public setViewTransform(offsetX: number, offsetY: number, scale: number) {
        const uniforms = this.uniforms.uniforms as { uViewOffset: Point; uViewScale: number };
        uniforms.uViewOffset.x = offsetX;
        uniforms.uViewOffset.y = offsetY;
        uniforms.uViewScale = scale;
    }

    private drawMapGrid(w: number, h: number) {
        this.mapGrid.clear();
        const minorStep = 120;
        const majorEvery = 5;
        const majorStep = minorStep * majorEvery;

        const gridColor = 0x7dd3fc;

        // Minor grid
        this.mapGrid.strokeStyle = { width: 1, color: gridColor, alpha: 0.06 };
        this.mapGrid.beginPath();
        for (let x = 0; x <= w; x += minorStep) {
            this.mapGrid.moveTo(x, 0);
            this.mapGrid.lineTo(x, h);
        }
        for (let y = 0; y <= h; y += minorStep) {
            this.mapGrid.moveTo(0, y);
            this.mapGrid.lineTo(w, y);
        }
        this.mapGrid.stroke();

        // Major grid
        this.mapGrid.strokeStyle = { width: 1.5, color: gridColor, alpha: 0.12 };
        this.mapGrid.beginPath();
        for (let x = 0; x <= w; x += majorStep) {
            this.mapGrid.moveTo(x, 0);
            this.mapGrid.lineTo(x, h);
        }
        for (let y = 0; y <= h; y += majorStep) {
            this.mapGrid.moveTo(0, y);
            this.mapGrid.lineTo(w, y);
        }
        this.mapGrid.stroke();
    }

    private update(ticker: Ticker) {
        if (this.mode !== 'iso') return;
        const uniforms = this.uniforms.uniforms as { uTime: number };
        uniforms.uTime += ticker.deltaMS * 0.001;
    }

    public override destroy(options?: DestroyOptions) {
        Ticker.shared.remove(this.update, this);
        super.destroy(options);
    }
}
