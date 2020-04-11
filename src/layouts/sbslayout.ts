class SBSLayout implements ILayout {
    public static readonly MIN_MASTER_RATIO = 0.2;
    public static readonly MAX_MASTER_RATIO = 0.8;
    public static readonly id = "SBSLayout";

    public readonly classID = SBSLayout.id;
    public readonly description = "SBS";

    private masterRatio: number;
    private masterSize: number;

    constructor() {
        this.masterRatio = 0.6;
        this.masterSize = 1;
    }

    public adjust(area: Rect, tiles: Window[], basis: Window, delta: RectDelta) {
        const basisIndex = tiles.indexOf(basis);
        if (basisIndex < 0)
            return;
        if (tiles.length === 0)
            /* no tiles */
            return;
        else if (tiles.length <= this.masterSize) {
            /* one column */
            LayoutUtils.adjustAreaWeights(
                area,
                tiles.map((tile) => tile.weight),
                CONFIG.tileLayoutGap,
                tiles.indexOf(basis),
                delta,
            ).forEach((newWeight, i) =>
                tiles[i].weight = newWeight * tiles.length);
        } else {
            this.masterRatio = LayoutUtils.adjustAreaHalfWeights(
                area,
                this.masterRatio,
                CONFIG.tileLayoutGap,
                (basisIndex < this.masterSize) ? 0 : 1,
                delta,
                true);
            
            if (basisIndex < this.masterSize) {
                const rightTiles = this.rightSideTiles<Window>(tiles);
                LayoutUtils.adjustAreaWeights(
                    area,
                    rightTiles.map((tile) => tile.weight),
                    CONFIG.tileLayoutGap,
                    basisIndex,
                    delta,
                ).forEach((newWeight, i) =>
                    rightTiles[i].weight = newWeight * rightTiles.length);
            }
        }
    }

    public apply(ctx: EngineContext, tileables: Window[], area: Rect): void {
        /* Tile all tileables */
        tileables.forEach((tileable) => tileable.state = WindowState.Tile);
        const tiles = tileables;

        if (tiles.length <= this.masterSize) {
            /* only master */
            LayoutUtils.splitAreaWeighted(
                    area,
                    tiles.map((tile) => tile.weight),
                    CONFIG.tileLayoutGap)
                .forEach((tileArea, i) =>
                    tiles[i].geometry = tileArea);
        }
        else {
            const stackRatio = 1 - this.masterRatio;
            const groupAreas = LayoutUtils.splitAreaWeighted(
                area,
                [stackRatio, this.masterRatio],
                CONFIG.tileLayoutGap,
                true);
            const [leftTiles, rightTiles] = this.splitArray<Window>(tiles);
            [leftTiles, rightTiles].forEach((groupTiles, group) => {
                LayoutUtils.splitAreaWeighted(
                    groupAreas[group],
                    groupTiles.map((tile) => tile.weight),
                    CONFIG.tileLayoutGap)
                .forEach((tileArea, i) =>
                    groupTiles[i].geometry = tileArea);
            });
        }
    }

    public clone(): ILayout {
        const other = new SBSLayout();
        other.masterRatio = this.masterRatio;
        other.masterSize = this.masterSize;
        return other;
    }

    public handleShortcut(ctx: EngineContext, input: Shortcut, data?: any): boolean {
        switch (input) {
            case Shortcut.Left:
                this.masterRatio = clip(
                    slide(this.masterRatio, -0.05),
                    SBSLayout.MIN_MASTER_RATIO,
                    SBSLayout.MAX_MASTER_RATIO);
                return true;
            case Shortcut.Right:
                this.masterRatio = clip(
                    slide(this.masterRatio, +0.05),
                    SBSLayout.MIN_MASTER_RATIO,
                    SBSLayout.MAX_MASTER_RATIO);
                return true;
            default:
                return false;
        }
    }

    public toString(): string {
        return "SBSLayout()";
    }

    private splitArray<T>(array: T[]): T[][] {
        let leftSide = new Array<T>();
        let rightSide = new Array<T>();

        for(var i=0; i<array.length; i++) {
            (i % 2 === 0 ? rightSide : leftSide).push(array[i]);
        }
        return [leftSide, rightSide];
    }
    private rightSideTiles<T>(array: T[]): T[] {
        return this.splitArray(array)[1];
    }
}