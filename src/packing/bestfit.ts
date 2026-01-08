import { Box, Item, PackedPackage, PackedItem, CarrierProfile } from './types';
import { FitChecker } from './fit';
import { Scorer, defaultWeights } from './scoring';
import { DimWeightCalculator } from './dimWeight';
import { v4 as uuidv4 } from 'uuid';

export class BestFitStrategy {
    static pack(
        items: Item[],
        availableBoxes: Box[],
        carrier: CarrierProfile
    ): PackedPackage[] {
        const packages: PackedPackage[] = [];

        // Sort items? BFD usually sorts too.
        const sortedItems = [...items].sort((a, b) => {
            const volA = a.l * a.w * a.h;
            const volB = b.l * b.w * b.h;
            return volB - volA;
        });

        // Pre-cache box definitions
        const boxMap = new Map<string, Box>();
        for (const b of availableBoxes) { boxMap.set(b.id, b); }

        for (const item of sortedItems) {
            let bestScore = Infinity;
            let bestMove: { type: 'existing' | 'new', target: number | string } | null = null;
            // target: index in packages array OR id of box type

            // 1. Try Existing
            for (let idx = 0; idx < packages.length; idx++) {
                const pkg = packages[idx];
                const boxDef = boxMap.get(pkg.boxId);
                if (!boxDef) continue;

                // Incremental Checks
                // 1. Weight
                if (pkg.weightActual + item.weight > (boxDef.maxWeight || 150)) continue;

                // 2. Volume
                const p = 0.25;
                const itemVol = (item.l + p) * (item.w + p) * (item.h + p);
                const boxVol = boxDef.innerL * boxDef.innerW * boxDef.innerH;

                let usedVol = (pkg as any)._usedVol || 0;
                if (!usedVol) {
                    usedVol = pkg.items.reduce((s, pi) => s + ((pi.l + p) * (pi.w + p) * (pi.h + p)), 0);
                    (pkg as any)._usedVol = usedVol;
                }

                if (usedVol + itemVol > boxVol) continue;

                // 3. Single Item Fit
                if (!FitChecker.canFitItemInBox(item, boxDef, 0).fits) continue;

                // 4. Score (Manual Calc to avoid Scorer iteration)
                const newUsedVol = usedVol + itemVol;
                const newActualWeight = pkg.weightActual + item.weight;
                const newUnusedVol = Math.max(0, boxVol - newUsedVol);

                // Dim Weight
                const dimWeight = pkg.dimWeight; // Dim weight of box doesn't change with contents usually (based on box size), unless divisor depends on weight? No.
                const billable = Math.max(newActualWeight, dimWeight);

                let score = 0;
                // isNewBox = false
                score += (newUnusedVol * defaultWeights.unusedVolumeFactor);
                score += (billable * defaultWeights.billableWeightFactor);
                if (boxDef.cost) score += boxDef.cost * 100;

                if (score < bestScore) {
                    bestScore = score;
                    bestMove = { type: 'existing', target: idx };
                }
            }

            // 2. Try New Boxes
            for (const box of availableBoxes) {
                // Quick checks first?
                if (item.weight > (box.maxWeight || 150)) continue;

                // Volume check?
                const p = 0.25;
                const itemVol = (item.l + p) * (item.w + p) * (item.h + p);
                const boxVol = box.innerL * box.innerW * box.innerH;
                if (itemVol > boxVol) continue;

                if (FitChecker.canFitItemInBox(item, box, (box.tareWeight || 0)).fits) {
                    // Score New Box
                    const dimWeight = DimWeightCalculator.calculate(box.innerL, box.innerW, box.innerH, carrier);
                    const actualWeight = (box.tareWeight || 0) + item.weight;
                    const billable = Math.max(actualWeight, dimWeight);
                    const unusedVol = Math.max(0, boxVol - itemVol);

                    let score = 0;
                    score += defaultWeights.newBoxPenalty;
                    score += (unusedVol * defaultWeights.unusedVolumeFactor);
                    score += (billable * defaultWeights.billableWeightFactor);
                    if (box.cost) score += box.cost * 100;

                    if (score < bestScore) {
                        bestScore = score;
                        bestMove = { type: 'new', target: box.id };
                    }
                }
            }

            // Execute Move
            if (bestMove) {
                if (bestMove.type === 'existing') {
                    const pkgIdx = bestMove.target as number;
                    const pkg = packages[pkgIdx];
                    const boxDef = availableBoxes.find(b => b.id === pkg.boxId)!;

                    // Calc usedVol if missing (for the cache update)
                    let usedVol = (pkg as any)._usedVol || 0;
                    if (!usedVol) {
                        const p = 0.25;
                        usedVol = pkg.items.reduce((s, pi) => s + ((pi.l + p) * (pi.w + p) * (pi.h + p)), 0);
                    }
                    const p = 0.25;
                    const itemVol = (item.l + p) * (item.w + p) * (item.h + p);

                    pkg.items.push(this.toPackedItem(item));
                    pkg.weightActual += item.weight;
                    pkg.weightBillable = DimWeightCalculator.getBillableWeight(
                        pkg.weightActual + (boxDef.tareWeight || 0),
                        pkg.dimWeight
                    );
                    (pkg as any)._usedVol = usedVol + itemVol;

                } else {
                    // New Box
                    const boxId = bestMove.target as string;
                    const boxDef = availableBoxes.find(b => b.id === boxId)!;

                    const dimWeight = DimWeightCalculator.calculate(boxDef.innerL, boxDef.innerW, boxDef.innerH, carrier);
                    const actual = item.weight + (boxDef.tareWeight || 0);

                    packages.push({
                        boxId: boxDef.id,
                        boxCode: boxDef.code,
                        boxName: boxDef.name,
                        dims: { l: boxDef.innerL, w: boxDef.innerW, h: boxDef.innerH },
                        weightActual: actual,
                        weightBillable: DimWeightCalculator.getBillableWeight(actual, dimWeight),
                        dimWeight: dimWeight,
                        items: [this.toPackedItem(item)]
                    });
                }
            } else {
                // Fallback: Manual
                packages.push({
                    boxId: 'MANUAL',
                    boxCode: 'MANUAL',
                    boxName: 'Manual/Oversize',
                    dims: { l: item.l, w: item.w, h: item.h },
                    weightActual: item.weight,
                    weightBillable: item.weight,
                    dimWeight: 0,
                    items: [this.toPackedItem(item)],
                    debugTrace: ['Item did not fit in any standard box']
                });
            }
        }

        return packages;
    }

    private static toPackedItem(item: Item): PackedItem {
        return { ...item, qty: 1 };
    }
}
