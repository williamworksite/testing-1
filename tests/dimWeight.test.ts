import { DimWeightCalculator, defaultProfile } from '../src/packing/dimWeight';

describe('DimWeightCalculator', () => {
    test('calculate standard dim weight', () => {
        // 10x10x10 = 1000. 1000 / 139 = 7.19. Round up to 8?
        // default profile rounds up to 1.
        const input = { l: 10, w: 10, h: 10 };
        const dw = DimWeightCalculator.calculate(10, 10, 10, defaultProfile);
        expect(dw).toBe(8);
    });

    test('calculate dim weight with different divisor', () => {
        // USPS / 166
        const profile = { ...defaultProfile, dimDivisor: 166 };
        // 1000 / 166 = 6.02 => 7
        const dw = DimWeightCalculator.calculate(10, 10, 10, profile);
        expect(dw).toBe(7);
    });

    test('billable weight', () => {
        const act = 5;
        const dim = 8;
        expect(DimWeightCalculator.getBillableWeight(act, dim)).toBe(8);
        expect(DimWeightCalculator.getBillableWeight(10, 8)).toBe(10);
    });
});
