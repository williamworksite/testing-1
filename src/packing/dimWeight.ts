import { CarrierProfile } from './types';

export class DimWeightCalculator {
    static calculate(
        l: number,
        w: number,
        h: number,
        profile: CarrierProfile
    ): number {
        const vol = l * w * h;
        const rawDimWeight = vol / profile.dimDivisor;

        // Rounding rules
        // Common: round up to nearest lb (usually)
        if (profile.roundUpTo > 0) {
            return Math.ceil(rawDimWeight / profile.roundUpTo) * profile.roundUpTo;
        }
        return rawDimWeight;
    }

    static getBillableWeight(
        actualWeight: number,
        dimWeight: number
    ): number {
        return Math.max(actualWeight, dimWeight);
    }
}

export const defaultProfile: CarrierProfile = {
    name: 'Default',
    dimDivisor: 139, // Common domestic divisor
    roundUpTo: 1
};

export const carrierProfiles: Record<string, CarrierProfile> = {
    default: defaultProfile,
    ups: { name: 'UPS', dimDivisor: 139, roundUpTo: 1 },
    fedex: { name: 'FedEx', dimDivisor: 139, roundUpTo: 1 },
    usps: { name: 'USPS', dimDivisor: 166, roundUpTo: 1 } // USPS is often 166
};
