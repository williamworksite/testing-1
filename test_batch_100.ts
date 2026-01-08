import fetch from 'node-fetch';

async function test() {
    console.log("Creating 100 identical packages (1x1x1, 1lb)...");

    const packages = [];
    for (let i = 0; i < 100; i++) {
        packages.push({
            boxId: 'test-box-id',
            boxCode: 'TEST-1',
            boxName: 'Test Box 1x1x1',
            weightActual: 1,
            weightBillable: 1,
            dims: { l: 1, w: 1, h: 1 }
        });
    }

    console.log("Sending request to /api/shipstation/estimate-batch...");
    const start = Date.now();
    try {
        const res = await fetch('http://localhost:3000/api/shipstation/estimate-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                packages,
                fromZip: '78756',
                toZip: '90210'
            })
        });

        const data = await res.json() as any;
        const end = Date.now();

        console.log(`Response Time: ${end - start}ms`);
        if (data.error) {
            console.error("API Error:", data.error);
        } else {
            console.log("Service Totals:", JSON.stringify(data.serviceTotals, null, 2));

            // Check if only allowed services are present
            const allowedKeys = ['ground', 'overnight', 'home delivery', 'next day'];
            const keys = Object.keys(data.serviceTotals).map(k => k.toLowerCase());
            const hasDisallowed = keys.some(k => !allowedKeys.some(allowed => k.includes(allowed)));

            if (hasDisallowed) {
                console.warn("WARNING: Found unexpected services in response!");
            } else {
                console.log("PASS: Response contains only requested Ground/Overnight services.");
            }
        }

        // Validation
        if (data.breakdown.length <= 5) { // Should be small number (carriers * 1 group)
            console.log("\nPASS: Correctly grouped 100 boxes into small number of rate requests.");
        } else {
            console.log("\nFAIL: Breakdown length seems high: " + data.breakdown.length);
        }

    } catch (err) {
        console.error("Test Failed:", err);
    }
}

test();
