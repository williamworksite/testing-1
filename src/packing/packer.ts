import { Item, Box, CarrierProfile, PackingResult } from './types';
import { FFDStrategy } from './ffd';
import { BestFitStrategy } from './bestfit';

export type PackingMode = 'ffd' | 'bestfit' | 'beam';

export interface PackRequest {
    items: Item[];
    boxes: Box[];
    mode?: PackingMode;
    carrierProfile?: CarrierProfile;
}

export class Packer {
    static pack(req: PackRequest): PackingResult {
        const start = Date.now();
        const mode = req.mode || 'bestfit';

        // Expand Items (qty handling)
        const expandedItems: Item[] = [];
        req.items.forEach(itm => {
            // Safety cap
            const qty = Math.min(itm.qty, 1000);
            for (let i = 0; i < qty; i++) {
                expandedItems.push({ ...itm, qty: 1 });
            }
        });

        let packages;
        const profile = req.carrierProfile || { name: 'Default', dimDivisor: 139, roundUpTo: 1 };

        switch (mode) {
            case 'ffd':
                packages = FFDStrategy.pack(expandedItems, req.boxes, profile);
                break;
            case 'beam':
                // Fallback to bestfit for MVP if beam not ready
                packages = BestFitStrategy.pack(expandedItems, req.boxes, profile);
                break;
            case 'bestfit':
            default:
                packages = BestFitStrategy.pack(expandedItems, req.boxes, profile);
                break;
        }

        const end = Date.now();

        // Metrics
        const totalActual = packages.reduce((sum, p) => sum + p.weightActual, 0);
        const totalBillable = packages.reduce((sum, p) => sum + p.weightBillable, 0);
        const boxCount = packages.length;

        // Unused Vol logic (approx)
        let totalUnusedVol = 0;
        packages.forEach(p => {
            const boxVol = p.dims.l * p.dims.w * p.dims.h;
            const itemVol = p.items.reduce((s, i) => s + (i.l * i.w * i.h), 0);
            totalUnusedVol += Math.max(0, boxVol - itemVol);
        });

        return {
            packages,
            unpackedItems: [], // Logic would go here if we skipped some
            metrics: {
                boxCount,
                totalActualWeight: totalActual,
                totalBillableWeight: totalBillable,
                totalUnusedVolume: totalUnusedVol,
                oversizeCount: packages.filter(p => p.boxCode === 'MANUAL').length,
                runtimeMs: end - start
            }
        };
    }
}
