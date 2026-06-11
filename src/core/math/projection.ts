export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

export interface Point3D {
    x: number;
    y: number;
    z: number;
}

export interface Point2D {
    x: number;
    y: number;
}

export interface IProjection {
    project(grid: Point3D): Point2D;
}

export const IsoProjection: IProjection = {
    project(grid: Point3D): Point2D {
        // Standard Isometric: x' = (x - y), y' = (x + y)/2
        const screenX = (grid.x - grid.y) * (TILE_WIDTH / 2);
        const screenY = (grid.x + grid.y) * (TILE_HEIGHT / 2) - (grid.z * TILE_HEIGHT);
        return { x: screenX, y: screenY };
    }
};

export const MapProjection: IProjection = {
    project(grid: Point3D): Point2D {
        // Top-Down (Aligned with Iso axes)
        // Keeps cardinal feel consistent between iso/map by using the same X/Y basis
        // (z is ignored in map mode so columns become flat).
        const CELL_SIZE = 40;
        const GAP = 2;
        const STEP = (CELL_SIZE + GAP) / 2;
        return {
            x: (grid.x - grid.y) * STEP,
            y: (grid.x + grid.y) * STEP
        };
    }
};
