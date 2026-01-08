import express from 'express';
import { boxesRepo } from '../storage/boxesRepo';
import { scenariosRepo } from '../storage/scenariosRepo';
import { Packer } from '../packing/packer';
import { ShipStationClient } from '../shipstation/client';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const ssClient = new ShipStationClient();

// --- BOXES ---
router.get('/boxes', (req, res) => {
    res.json(boxesRepo.getAll());
});

router.post('/boxes', (req, res) => {
    const newBox = boxesRepo.add(req.body);
    res.json(newBox);
});

router.put('/boxes/:id', (req, res) => {
    const updated = boxesRepo.update(req.params.id, req.body);
    res.json(updated);
});

router.delete('/boxes/:id', (req, res) => {
    boxesRepo.delete(req.params.id);
    res.status(204).send();
});

// --- SCENARIOS ---
router.get('/scenarios', (req, res) => {
    res.json(scenariosRepo.getAll());
});

router.post('/scenarios', (req, res) => {
    const { name, items } = req.body;
    const s = scenariosRepo.add(name, items);
    res.json(s);
});

router.delete('/scenarios/:id', (req, res) => {
    scenariosRepo.delete(req.params.id);
    res.status(204).send();
});

// --- PACKING ---
router.post('/pack', (req, res) => {
    try {
        const { items, boxes, mode, carrierProfile, boxesSource } = req.body;

        // Allow using stored boxes if not provided or requested
        let workingBoxes = boxes;
        if (!boxes || boxes.length === 0 || boxesSource === 'repo') {
            workingBoxes = boxesRepo.getEnabled();
        }

        const result = Packer.pack({
            items,
            boxes: workingBoxes,
            mode,
            carrierProfile
        });
        res.json(result);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// --- SHIPSTATION ---
router.get('/shipstation/carriers', async (req, res) => {
    try {
        const carriers = await ssClient.listCarriers();
        res.json(carriers);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/shipstation/stores', async (req, res) => {
    try {
        const stores = await ssClient.listStores();
        res.json(stores);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/shipstation/upsert-order', async (req, res) => {
    try {
        const { order, packedPackages } = req.body;

        // Map packages to internal notes or such
        const pkgDetails = packedPackages.map((p: any, i: number) =>
            `Pkg ${i + 1}: ${p.boxName} (${p.dims.l}x${p.dims.w}x${p.dims.h}) Act:${p.weightActual} Bill:${p.weightBillable}`
        ).join('\n');

        // Simple mapping for MVP
        const ssPayload = {
            orderNumber: order.orderNumber || `TEST-${Date.now()}`,
            orderDate: new Date().toISOString(),
            orderStatus: 'waiting_shipment',
            billTo: {
                name: "Test Customer",
                street1: "123 Main St",
                city: "Austin",
                state: "TX",
                postalCode: "78701",
                country: "US"
            },
            shipTo: {
                name: "Test Customer",
                street1: "123 Main St",
                city: "Austin",
                state: "TX",
                postalCode: "78701",
                country: "US"
            },
            items: order.items || [], // Pass through items or map from packing?
            internalNotes: `Auto-Packed:\n${pkgDetails}`,
            // Set dimensions of the first package as the "order dimensions" if relevant
            weight: {
                value: packedPackages.reduce((s: number, p: any) => s + p.weightActual, 0),
                units: "pounds"
            }
        };

        const result = await ssClient.upsertOrder(ssPayload);
        res.json(result);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/shipstation/rates', async (req, res) => {
    try {
        const { fromZip, toZip, package: pkg } = req.body;

        // 1. Get All Carriers
        const allCarriers = await ssClient.listCarriers();

        // Fix matching logic
        const targetCodes = ['stamps_com', 'usps', 'fedex', 'ups', 'dhl'];
        const validCarriers = allCarriers.filter((c: any) => {
            const code = (c.carrier_code || c.code || '').toLowerCase();
            return targetCodes.some(t => code.includes(t));
        });

        if (validCarriers.length === 0) {
            // Fallback if no specific ones found, just use whatever is there
            if (allCarriers.length > 0) validCarriers.push(allCarriers[0]);
            else throw new Error("No carriers found");
        }

        // Parallelize Requests
        const promises = validCarriers.map(async (carrier: any) => {
            const payload = {
                carrier_id: carrier.carrier_id,
                from_country_code: "US",
                from_postal_code: fromZip || '78756',
                from_city_locality: "Austin",
                from_state_province: "TX",
                to_country_code: "US",
                to_postal_code: toZip || '90210',
                to_city_locality: "Beverly Hills",
                to_state_province: "CA",
                weight: {
                    value: pkg?.weightActual || 5,
                    unit: "pound"
                },
                dimensions: {
                    length: pkg?.dims?.l || 10,
                    width: pkg?.dims?.w || 10,
                    height: pkg?.dims?.h || 10,
                    unit: "inch"
                },
                ship_date: new Date().toISOString()
            };

            try {
                const rates = await ssClient.getRates(payload);
                if (Array.isArray(rates)) {
                    // Sort by cost
                    const sorted = rates.sort((a: any, b: any) => {
                        const costA = a.shipmentCost || a.shipping_amount?.amount || 0;
                        const costB = b.shipmentCost || b.shipping_amount?.amount || 0;
                        return costA - costB;
                    });

                    // Take Top 1 Only (Cheapest)
                    if (sorted.length > 0) {
                        const best = sorted[0];
                        return {
                            ...best,
                            carrierCode: carrier.carrier_code || carrier.code
                        };
                    }
                }
            } catch (err) {
                console.warn(`Failed to get rates for ${carrier.code}`, err);
            }
            return null;
        });

        const results = await Promise.all(promises);
        const results_per_carrier = results.filter(r => r !== null);

        res.json(results_per_carrier);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/shipstation/estimate-batch', async (req, res) => {
    try {
        const { packages, fromZip, toZip } = req.body;
        if (!packages || !Array.isArray(packages)) throw new Error('Invalid packages');

        // 1. Group by Box ID
        const groups: Record<string, {
            boxCode: string,
            boxName: string,
            count: number,
            totalWeight: number,
            dims: any,
            pkg: any
        }> = {};

        for (const p of packages) {
            const k = p.boxId;
            if (!groups[k]) {
                groups[k] = {
                    boxCode: p.boxCode,
                    boxName: p.boxName,
                    count: 0,
                    totalWeight: 0,
                    dims: p.dims,
                    pkg: p // Keep one for reference
                };
            }
            groups[k].count++;
            groups[k].totalWeight += p.weightActual;
        }

        // 2. Parallel Processing
        // Cache carriers to avoid 1 extra API roundtrip
        let carriers = (global as any)._carrierCache;
        if (!carriers || (Date.now() - (global as any)._carrierCacheTime > 300000)) {
            console.log("Refreshing carrier cache...");
            carriers = await ssClient.listCarriers();
            (global as any)._carrierCache = carriers;
            (global as any)._carrierCacheTime = Date.now();
        }

        // OPTIMIZATION: Only check FedEx and UPS
        const targetCodes = ['fedex', 'ups'];
        const validCarriers = carriers.filter((c: any) => {
            const code = (c.carrier_code || c.code || '').toLowerCase();
            return targetCodes.some(t => code.includes(t));
        });

        // If no FedEx/UPS found, fallback to first available (safety)
        if (validCarriers.length === 0 && carriers.length > 0) validCarriers.push(carriers[0]);

        // Flatten requests: [Group, Carrier] pairs
        const requests: any[] = [];
        const groupKeys = Object.keys(groups);

        console.log(`[BatchEstimate] Groups found: ${groupKeys.length}`);
        if (groupKeys.length > 20) {
            console.warn('[BatchEstimate] High group count detected - check boxId grouping');
        }

        for (const k of groupKeys) {
            const g = groups[k];
            const avgWeight = g.totalWeight / g.count;

            for (const carrier of validCarriers) {
                const code = carrier.carrier_code || carrier.code || 'unknown';
                requests.push({
                    groupKey: k,
                    carrierCode: code, // Fix: use checked code
                    carrierId: carrier.carrier_id,
                    boxName: g.boxName,
                    count: g.count,
                    payload: {
                        carrier_id: carrier.carrier_id,
                        from_country_code: "US",
                        from_postal_code: fromZip || '78756',
                        from_city_locality: "Austin",
                        from_state_province: "TX",
                        to_country_code: "US",
                        to_postal_code: toZip || '90210',
                        to_city_locality: "Beverly Hills",
                        to_state_province: "CA",
                        weight: { value: avgWeight, unit: "pound" },
                        dimensions: {
                            length: g.dims.l,
                            width: g.dims.w,
                            height: g.dims.h,
                            unit: "inch"
                        },
                        ship_date: new Date().toISOString()
                    }
                });
            }
        }

        console.log(`[BatchEstimate] Total Rate Requests to fire: ${requests.length}`);

        // Execute all in parallel with Timeout
        const responses = await Promise.all(requests.map(async (req) => {
            try {
                // race between fetch and timeout
                const timeoutMs = 4500;
                const fetchPromise = ssClient.getRates(req.payload);

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
                );

                const rates: any = await Promise.race([fetchPromise, timeoutPromise]);

                // TARGET SPECIFIC SERVICES
                const allowedServices = [
                    'ups_ground',
                    'ups_next_day_air',
                    'fedex_ground',
                    'fedex_standard_overnight',
                    'fedex_home_delivery' // Include Home Delivery as it often replaces Ground for residential
                ];

                if (Array.isArray(rates) && rates.length > 0) {
                    // Filter for allowed services
                    const filteredRates = rates.filter((r: any) => allowedServices.includes(r.service_code || r.serviceCode));

                    if (filteredRates.length === 0) return { ...req, success: false };

                    // Return ALL matching services, not just cheapest
                    // We need to return multiple results per request if multiple allowed services match
                    // But our current structure expects 1 result per request. 
                    // Let's modify the map to return an array of results? 
                    // Simpler: Just map the rates to our result format

                    return {
                        ...req,
                        success: true,
                        // Return list of matches instead of single cheapest
                        matches: filteredRates.map((r: any) => ({
                            serviceName: r.serviceName || r.service_type,
                            serviceCode: r.service_code || r.serviceCode,
                            unitCost: r.shipmentCost || r.shipping_amount?.amount || 0
                        }))
                    };
                }
            } catch (e) {
                // console.warn(`Rate fetch failed/timed out for ${req.carrierCode}`);
            }
            return { ...req, success: false };
        }));

        // Aggregation
        // Structure: 
        // serviceTotals: { 'fedex - FedEx Ground': 500, 'ups - UPS Ground': 450 }

        const serviceTotals: Record<string, number> = {};
        const breakdown: any[] = [];

        for (const res of responses) {
            if (!res.success || !res.matches) continue;

            for (const match of res.matches) {
                // Key by Service
                const serviceKey = `[${res.carrierCode.toUpperCase()}] ${match.serviceName}`;

                if (!serviceTotals[serviceKey]) serviceTotals[serviceKey] = 0;
                serviceTotals[serviceKey] += (match.unitCost * res.count);

                breakdown.push({
                    boxName: res.boxName,
                    carrier: res.carrierCode,
                    service: match.serviceName,
                    count: res.count,
                    unitCost: match.unitCost,
                    subtotal: match.unitCost * res.count
                });
            }
        }

        res.json({ serviceTotals, breakdown });

    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
