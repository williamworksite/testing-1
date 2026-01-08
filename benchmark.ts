
import { Packer } from './src/packing/packer';
import { Item, Box } from './src/packing/types';

// Generators
function generateItems(count: number): Item[] {
    const items: Item[] = [];
    for (let i = 0; i < count; i++) {
        items.push({
            id: `item-${i}`,
            name: `Item ${i}`,
            qty: 1,
            weight: 1,
            l: 5 + Math.random() * 10,
            w: 5 + Math.random() * 10,
            h: 1 + Math.random() * 5
        });
    }
    return items;
}

function getStandardBoxes(): Box[] {
    return [
        { id: 'box-s', code: 'S', name: 'Small', innerL: 10, innerW: 10, innerH: 10, maxWeight: 50, enabled: true },
        { id: 'box-m', code: 'M', name: 'Medium', innerL: 15, innerW: 15, innerH: 15, maxWeight: 70, enabled: true },
        { id: 'box-l', code: 'L', name: 'Large', innerL: 20, innerW: 20, innerH: 20, maxWeight: 100, enabled: true },
        { id: 'box-xl', code: 'XL', name: 'Extra Large', innerL: 30, innerW: 30, innerH: 30, maxWeight: 150, enabled: true },
    ];
}

async function runBenchmark() {
    const boxes = getStandardBoxes();
    const counts = [1000, 2000, 5000];
    const modes = ['ffd', 'bestfit'];

    console.log("=== PACKING BENCHMARK ===");

    for (const count of counts) {
        const items = generateItems(count);
        console.log(`\n--- Items: ${count} ---`);

        for (const mode of modes) {
            const start = process.hrtime();
            const result = Packer.pack({ items, boxes, mode: mode as any });
            const [sec, nano] = process.hrtime(start);
            const ms = (sec * 1000 + nano / 1e6).toFixed(2);

            console.log(`[${mode}] Time: ${ms}ms | Packages: ${result.packages.length} | Billable: ${result.metrics.totalBillableWeight.toFixed(2)}`);
        }
    }
}

runBenchmark();
