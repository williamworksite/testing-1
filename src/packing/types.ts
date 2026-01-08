export interface Box {
    id: string;
    code: string;
    name: string;
    innerL: number;
    innerW: number;
    innerH: number;
    maxWeight: number;
    tareWeight?: number;
    cost?: number; // Optional cost for optimization
    enabled: boolean;
}

export interface Item {
    id: string; // sku
    name: string;
    qty: number;
    weight: number;
    l: number;
    w: number;
    h: number;
    canRotate?: boolean;
    shipAlone?: boolean;
    maxPerBox?: number;
    packingGroup?: string;
}

export interface PackedItem extends Omit<Item, 'qty'> {
    qty: number; // usually 1 for specific placement, but can be aggregated
    x?: number;  // coordinate in box
    y?: number;
    z?: number;
    rotation?: number; // 0-5 enum for orientation
}

export interface PackedPackage {
    boxId: string;
    boxCode: string;
    boxName: string;
    weightActual: number;
    weightBillable: number;
    dimWeight: number;
    dims: { l: number; w: number; h: number };
    items: PackedItem[];
    volumeUtilization?: number;
    debugTrace?: string[];
}

export interface PackingResult {
    packages: PackedPackage[];
    unpackedItems: Item[]; // Items that couldn't fit anywhere
    metrics: {
        boxCount: number;
        totalActualWeight: number;
        totalBillableWeight: number;
        totalUnusedVolume: number;
        oversizeCount: number;
        runtimeMs: number;
    };
    debug?: any;
}

export interface CarrierProfile {
    name: string;
    dimDivisor: number;
    roundUpTo: number; // e.g. 1 for full lb, 0 for exact
}
