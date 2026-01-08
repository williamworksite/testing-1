import { Box, Item, CarrierProfile } from './types';
import { DimWeightCalculator } from './dimWeight';

export interface ScoreWeights {
    newBoxPenalty: number;     // Cost of opening a new box
    unusedVolumeFactor: number; // Cost per cubic inch unused
    billableWeightFactor: number; // Cost per lb billable
}

export const defaultWeights: ScoreWeights = {
    newBoxPenalty: 1000,
    unusedVolumeFactor: 0.5,
    billableWeightFactor: 10
};

export class Scorer {
    static scorePlacement(
        box: Box,
        itemsInBox: Item[],
        carrier: CarrierProfile,
        weights: ScoreWeights = defaultWeights,
        isNewBox: boolean
    ): number {
        let score = 0;

        // 1. New Box Penalty
        if (isNewBox) score += weights.newBoxPenalty;

        // 2. Volume Calc
        const boxVol = box.innerL * box.innerW * box.innerH;
        const itemsVol = itemsInBox.reduce((sum, item) => sum + (item.l * item.w * item.h), 0);
        const unusedVol = Math.max(0, boxVol - itemsVol);

        score += (unusedVol * weights.unusedVolumeFactor);

        // 3. Billable Weight Calc
        const actualWeight = (box.tareWeight || 0) + itemsInBox.reduce((sum, i) => sum + i.weight, 0);
        const dimWeight = DimWeightCalculator.calculate(box.innerL, box.innerW, box.innerH, carrier);
        const billable = Math.max(actualWeight, dimWeight);

        score += (billable * weights.billableWeightFactor);

        // 4. Box Cost (if available)
        if (box.cost) {
            score += box.cost * 100; // Multiplier to normalize with other scores
        }

        return score;
    }
}
