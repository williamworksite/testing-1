import { Box, Item, PackedPackage, PackedItem, CarrierProfile } from './types';
import { FitChecker } from './fit';
import { v4 as uuidv4 } from 'uuid';
import { DimWeightCalculator } from './dimWeight';

export class FFDStrategy {
    static pack(
        items: Item[],
        availableBoxes: Box[],
        carrier: CarrierProfile
    ): PackedPackage[] {
        const packages: PackedPackage[] = [];

        // 1. Sort items by volume (descending)
        const sortedItems = [...items].sort((a, b) => {
            const volA = a.l * a.w * a.h;
            const volB = b.l * b.w * b.h;
            return volB - volA; // Descending
        });

        // 2. Sort boxes by volume (ascending) - easier to find "smallest fit"
        // Though FFD usually just picks *first fit*, usually you want smallest avail box for new boxes.
        const sortedBoxes = [...availableBoxes].sort((a, b) => {
            return (a.innerL * a.innerW * a.innerH) - (b.innerL * b.innerW * b.innerH);
        });

        // Pre-cache box definitions
        const boxMap = new Map<string, Box>();
        for (const b of availableBoxes) { boxMap.set(b.id, b); }

        for (const item of sortedItems) {
            let placed = false;

            // Try existing packages first
            for (const pkg of packages) {
                // Find the box definition for this package
                const boxDef = boxMap.get(pkg.boxId);
                if (!boxDef) continue;

                // Optimization: Incremental Check

                // 1. Weight Check
                if (pkg.weightActual + item.weight > (boxDef.maxWeight || 150)) continue;

                // 2. Volume Check (Heuristic)
                const p = 0.25; // padding
                const itemVol = (item.l + p) * (item.w + p) * (item.h + p);
                const boxVol = boxDef.innerL * boxDef.innerW * boxDef.innerH;

                let usedVol = (pkg as any)._usedVol || 0;
                if (!usedVol) {
                    // Initial calc for existing
                    usedVol = pkg.items.reduce((s, pi) => s + ((pi.l + p) * (pi.w + p) * (pi.h + p)), 0);
                }

                if (usedVol + itemVol > boxVol) continue;

                // 3. Single Item Fit Check (Fast)
                if (!FitChecker.canFitItemInBox(item, boxDef, 0).fits) continue;

                // If passed all (we skip the expensive canFitBatch recursion):
                pkg.items.push(this.toPackedItem(item));
                pkg.weightActual += item.weight;
                pkg.weightBillable = DimWeightCalculator.getBillableWeight(pkg.weightActual + (boxDef.tareWeight || 0), pkg.dimWeight);
                (pkg as any)._usedVol = usedVol + itemVol; // Update cached vol
                placed = true;
                break;
            }

            if (!placed) {
                // Open new box
                // Find smallest box that fits this item
                let bestBox: Box | null = null;
                for (const box of sortedBoxes) {
                    if (FitChecker.canFitItemInBox(item, box, (box.tareWeight || 0)).fits) {
                        bestBox = box;
                        break;
                    }
                }

                if (bestBox) {
                    // Create new package
                    const dimWeight = DimWeightCalculator.calculate(bestBox.innerL, bestBox.innerW, bestBox.innerH, carrier);
                    const actual = item.weight + (bestBox.tareWeight || 0);

                    packages.push({
                        boxId: bestBox.id,
                        boxCode: bestBox.code,
                        boxName: bestBox.name,
                        dims: { l: bestBox.innerL, w: bestBox.innerW, h: bestBox.innerH },
                        weightActual: actual,
                        weightBillable: DimWeightCalculator.getBillableWeight(actual, dimWeight),
                        dimWeight: dimWeight,
                        items: [this.toPackedItem(item)]
                    });
                } else {
                    // Item too big for ANY box
                    // For MVP, we treat it as a "Manual" package or separate huge entity.
                    // We'll create a "Standard" custom box wrapper? 
                    // Specs say "mark as manual pack required" but return a package entry.
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
        }

        return packages;
    }

    private static toPackedItem(item: Item): PackedItem {
        return {
            ...item,
            qty: 1
        };
    }
}
