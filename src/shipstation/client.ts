import dotenv from 'dotenv';
dotenv.config();

export class ShipStationClient {
    private apiKey: string;
    private apiSecret: string;
    private baseUrl = 'https://ssapi.shipstation.com';

    constructor() {
        this.apiKey = process.env.SHIPSTATION_API_KEY || '';
        this.apiSecret = process.env.SHIPSTATION_API_SECRET || '';
        // Default to ShipStation API, but allow override (e.g. for specific sandbox URLs if needed)
        this.baseUrl = process.env.SHIPSTATION_API_URL || 'https://ssapi.shipstation.com';
    }

    private getHeaders(): Record<string, string> {
        // V2 / Mock Support (Header based)
        if (this.baseUrl.includes('v2')) {
            return {
                'api-key': this.apiKey,
                'Content-Type': 'application/json'
            };
        }

        // Legacy / Standard SSAPI (Basic Auth)
        const auth = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
        return {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
        };
    }

    async listStores() {
        console.log('Fetching stores...');
        // Demo mock if no keys
        if (!this.apiKey || this.apiKey.includes('your_api_key')) {
            return [{ storeId: 12345, storeName: "Demo Store (Mock)" }];
        }

        const res = await fetch(`${this.baseUrl}/stores`, {
            headers: this.getHeaders()
        });
        if (!res.ok) throw new Error(`ShipStation Error: ${res.status} ${res.statusText}`);
        return await res.json();
    }

    async upsertOrder(payload: any) {
        if (!this.apiKey || this.apiKey.includes('your_api_key')) {
            console.log("Mocking Upsert Order", payload);
            return { orderId: 99999, orderNumber: payload.orderNumber, status: 'mock_success' };
        }

        const res = await fetch(`${this.baseUrl}/orders/createorder`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(payload)
        });

        // ShipStation returns the created order object
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`ShipStation Error: ${res.status} ${txt}`);
        }
        return await res.json();
    }

    async createLabel(payload: any) {
        if (!this.apiKey || this.apiKey.includes('your_api_key')) {
            console.log("Mocking Create Label", payload);
            return { shipmentId: 88888, labelData: "base64_mock_label_data", trackingNumber: "1ZTEST000000" };
        }

        const res = await fetch(`${this.baseUrl}/shipments/createlabel`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`ShipStation Error: ${res.status} ${txt}`);
        }
        return await res.json();
    }

    async getRates(payload: any) {
        if (!this.apiKey || this.apiKey.includes('your_api_key')) {
            console.log("Mocking Get Rates", payload);
            return [
                { serviceName: "UPS Ground", serviceCode: "ups_ground", shipmentCost: 12.50, otherCost: 0.00 },
                { serviceName: "USPS Priority", serviceCode: "usps_priority_mail", shipmentCost: 8.95, otherCost: 0.00 }
            ];
        }

        // V2 Path vs Legacy Path
        let endpoint = '/shipments/getrates';
        if (this.baseUrl.includes('v2')) {
            endpoint = '/rates/estimate';
        }

        console.log(`Fetching rates from ${this.baseUrl}${endpoint}`);

        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`ShipStation Error: ${res.status} ${txt}`);
        }
        return await res.json();
    }

    async listCarriers() {
        // V2 endpoint: /carriers
        // Legacy: /carriers
        const endpoint = '/carriers';
        console.log(`Fetching carriers from ${this.baseUrl}${endpoint}`);

        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET', // Typically GET
            headers: this.getHeaders()
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`ShipStation Error: ${res.status} ${txt}`);
        }
        const data = await res.json();
        // Support { carriers: [...] } or [...]
        if (data.carriers) return data.carriers;
        return data;
    }
}
