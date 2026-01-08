import { ShipStationClient } from './src/shipstation/client';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new ShipStationClient();

async function main() {
    console.log("Fetching carriers...");
    try {
        const carriers = await client.listCarriers();
        console.log("JSON Output:");
        console.log(JSON.stringify(carriers, null, 2));
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
