import { Box, Item } from './types';

export interface FitResult {
    fits: boolean;
    rotatedDims?: { l: number; w: number; h: number };
}

export class FitChecker {
    private static PADDING = 0.25; // inches

    /**
     * Checks if an item fits inside a box, trying all 6 rotations.
     * Considers padding and max weight.
     */
    static canFitItemInBox(
        item: Item,
        box: Box,
        currentBoxWeight: number
    ): FitResult {
        // 1. Weight Check
        if (currentBoxWeight + item.weight > box.maxWeight) {
            return { fits: false };
        }

        // 2. Dimensions Check (with padding)
        const iL = item.l + this.PADDING;
        const iW = item.w + this.PADDING;
        const iH = item.h + this.PADDING;

        const bL = box.innerL;
        const bW = box.innerW;
        const bH = box.innerH;

        // Check all 6 permutations if rotation allowed
        const permutations = item.canRotate !== false
            ? [
                [iL, iW, iH], [iL, iH, iW],
                [iW, iL, iH], [iW, iH, iL],
                [iH, iL, iW], [iH, iW, iL]
            ]
            : [[iL, iW, iH]];

        for (const [dim1, dim2, dim3] of permutations) {
            if (dim1 <= bL && dim2 <= bW && dim3 <= bH) {
                return {
                    fits: true,
                    rotatedDims: { l: dim1, w: dim2, h: dim3 }
                };
            }
        }

        return { fits: false };
    }

    /**
     * Simplified fit check for multiple items in a box.
     * This is a heuristic: it checks total volume + per-item max dimension fit.
     * It does NOT solve the full 3D Bin Packing Problem (NP-Hard).
     */
    static canFitBatch(
        items: Item[],
        box: Box,
        currentWeight: number
    ): boolean {
        // Total Weight
        const totalItemWeight = items.reduce((sum, it) => sum + it.weight, 0);
        if (currentWeight + totalItemWeight > box.maxWeight) return false;

        // specific check: single huge item
        for (const item of items) {
            const singleFit = this.canFitItemInBox(item, box, 0); // Check pure sizing
            if (!singleFit.fits) return false;
        }

        // Total Volume check
        const totalItemVol = items.reduce((sum, it) => {
            const p = this.PADDING;
            return sum + ((it.l + p) * (it.w + p) * (it.h + p));
        }, 0);
        const boxVol = box.innerL * box.innerW * box.innerH;

        if (totalItemVol > boxVol) return false;

        return true;
    }
}
