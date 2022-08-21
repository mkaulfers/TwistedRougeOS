declare global {
    interface RoomVisual {
        structure(x: number, y: number, type: string, opts?: { opacity?: number }): void;
    }
}

const colors = {
    gray: "#555555",
    light: "#AAAAAA",
    road: "#666",
    dark: "#181818",
    outline: "#8FBB93"
};

RoomVisual.prototype.structure = function (x, y, type, opts = {}) {
    opts = Object.assign(
        {
            opacity: 1
        },
        opts
    );
    switch (type) {
        case STRUCTURE_EXTENSION:
            this.circle(x, y, {
                radius: 0.5,
                fill: colors.dark,
                stroke: colors.outline,
                strokeWidth: 0.05,
                opacity: opts.opacity
            });
            this.circle(x, y, {
                radius: 0.35,
                fill: colors.gray,
                opacity: opts.opacity
            });
            break;
        case STRUCTURE_SPAWN:
            this.circle(x, y, {
                radius: 0.7,
                fill: colors.dark,
                stroke: "#CCCCCC",
                strokeWidth: 0.1,
                opacity: opts.opacity
            });
            break;
        case STRUCTURE_LINK: {
            let osize = 0.3;
            let isize = 0.2;
            let outer: [number, number][] = [[0.0, -0.5], [0.4, 0.0], [0.0, 0.5], [-0.4, 0.0]];
            let inner: [number, number][] = [[0.0, -0.3], [0.25, 0.0], [0.0, 0.3], [-0.25, 0.0]];
            outer = relPoly(x, y, outer);
            inner = relPoly(x, y, inner);
            outer.push(outer[0]);
            inner.push(inner[0]);
            this.poly(outer, {
                fill: colors.dark,
                stroke: colors.outline,
                strokeWidth: 0.05,
                opacity: opts.opacity
            });
            this.poly(inner, {
                fill: colors.gray,
                stroke: undefined,
                opacity: opts.opacity
            });
            break;
        }
        case STRUCTURE_TERMINAL: {
            let outer: [number, number][] = [
                [0.0, -0.8],
                [0.55, -0.55],
                [0.8, 0.0],
                [0.55, 0.55],
                [0.0, 0.8],
                [-0.55, 0.55],
                [-0.8, 0.0],
                [-0.55, -0.55]
            ];
            let inner: [number, number][] = [
                [0.0, -0.65],
                [0.45, -0.45],
                [0.65, 0.0],
                [0.45, 0.45],
                [0.0, 0.65],
                [-0.45, 0.45],
                [-0.65, 0.0],
                [-0.45, -0.45]
            ];
            outer = relPoly(x, y, outer);
            inner = relPoly(x, y, inner);
            outer.push(outer[0]);
            inner.push(inner[0]);
            this.poly(outer, {
                fill: colors.dark,
                stroke: colors.outline,
                strokeWidth: 0.05,
                opacity: opts.opacity
            });
            this.poly(inner, {
                fill: colors.light,
                stroke: undefined,
                opacity: opts.opacity
            });
            this.rect(x - 0.45, y - 0.45, 0.9, 0.9, {
                fill: colors.gray,
                stroke: colors.dark,
                strokeWidth: 0.1,
                opacity: opts.opacity
            });
            break;
        }
        case STRUCTURE_LAB:
            this.circle(x, y - 0.025, {
                radius: 0.55,
                fill: colors.dark,
                stroke: colors.outline,
                strokeWidth: 0.05,
                opacity: opts.opacity
            });
            this.circle(x, y - 0.025, {
                radius: 0.4,
                fill: colors.gray,
                opacity: opts.opacity
            });
            this.rect(x - 0.45, y + 0.3, 0.9, 0.25, {
                fill: colors.dark,
                stroke: undefined,
                opacity: opts.opacity
            });
            {
                let box: [number, number][] = [[-0.45, 0.3], [-0.45, 0.55], [0.45, 0.55], [0.45, 0.3]];
                box = relPoly(x, y, box);
                this.poly(box, {
                    stroke: colors.outline,
                    strokeWidth: 0.05,
                    opacity: opts.opacity
                });
            }
            break;
        case STRUCTURE_TOWER:
            this.circle(x, y, {
                radius: 0.6,
                // fill: colors.dark,
                fill: "transparent",
                stroke: colors.outline,
                strokeWidth: 0.05,
                opacity: opts.opacity
            });
            this.rect(x - 0.4, y - 0.3, 0.8, 0.6, {
                fill: colors.gray,
                opacity: opts.opacity
            });
            this.rect(x - 0.2, y - 0.9, 0.4, 0.5, {
                fill: colors.light,
                stroke: colors.dark,
                strokeWidth: 0.07,
                opacity: opts.opacity
            });
            break;
        case STRUCTURE_ROAD:
            this.circle(x, y, {
                radius: 0.175,
                fill: colors.gray,
                stroke: undefined,
                opacity: opts.opacity
            })
            break;
    }
};

function relPoly(x: number, y: number, poly: [number, number][]) {
    return poly.map(p => {
        p[0] += x;
        p[1] += y;
        return p;
    });
}

export { }
