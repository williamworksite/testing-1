import { Packer } from '../src/packing/packer';
import { defaultProfile } from '../src/packing/dimWeight';
import { boxesRepo } from '../src/storage/boxesRepo';

describe('Packer', () => {
    const boxes = boxesRepo.getAll(); // Use defaults

    test('should pack small item in small box', () => {
        const result = Packer.pack({
            items: [{ id: '1', name: 'Small', qty: 1, weight: 1, l: 4, w: 4, h: 4, canRotate: true }],
            boxes
        });
        expect(result.metrics.boxCount).toBe(1);
        expect(result.packages[0].boxCode).toBe('S'); // 5x5x5 box
    });

    test('should pack larger item in medium box', () => {
        const result = Packer.pack({
            items: [{ id: '1', name: 'Med', qty: 1, weight: 1, l: 8, w: 8, h: 8, canRotate: true }],
            boxes
        });
        expect(result.metrics.boxCount).toBe(1);
        expect(result.packages[0].boxCode).toBe('M'); // 10x10x10
    });

    test('should split multiple items if needed (volume check)', () => {
        // Largest box L is 15x15x15 = 3375 volume.
        // Use items that exceed this combined.
        // Item 13x13x13 = 2197.
        // 2 items = 4394 > 3375.
        const result = Packer.pack({
            items: [{ id: '1', name: 'BigBlock', qty: 2, weight: 5, l: 13, w: 13, h: 13 }],
            boxes
        });
        expect(result.metrics.boxCount).toBe(2);
    });

    test('BestFit vs FFD', () => {
        // Items: A (3x3x3)=27, B (3x3x3)=27. Total 54.
        // Box S (5x5x5)=125.
        // Should fit in 1 box.
        const items = [
            { id: '1', name: 'A', qty: 1, weight: 1, l: 3, w: 3, h: 3 },
            { id: '2', name: 'B', qty: 1, weight: 1, l: 3, w: 3, h: 3 }
        ];

        const resFFD = Packer.pack({ items, boxes, mode: 'ffd' });
        const resBF = Packer.pack({ items, boxes, mode: 'bestfit' });

        expect(resFFD.metrics.boxCount).toBe(1);
        expect(resBF.metrics.boxCount).toBe(1);
    });
});
