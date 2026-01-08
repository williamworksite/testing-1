import { ShipStationClient } from './src/shipstation/client';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new ShipStationClient();

async function main() {
    console.log("Fetching carrier details including services...");
    try {
        const carriers = await client.listCarriers();

        const targetCodes = ['fedex', 'ups'];
        for (const c of carriers) {
            const code = (c.carrier_code || c.code || '').toLowerCase();
            if (targetCodes.some(t => code.includes(t))) {
                console.log(`\n--- CARRIER: ${c.name} (${code}) [ID: ${c.carrier_id}] ---`);
                if (c.services) {
                    c.services.forEach((s: any) => {
                        console.log(`Service: "${s.name}" | Code: "${s.service_code}"`);
                    });
                } else {
                    console.log("(No services listed in carrier object)");
                }
            }
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
