import { Box } from '../packing/types';
import { v4 as uuidv4 } from 'uuid';

const initialBoxes: Box[] = [
    {
        id: 'box-1',
        code: 'S',
        name: 'Small Box',
        innerL: 5,
        innerW: 5,
        innerH: 5,
        maxWeight: 10,
        tareWeight: 0.1,
        enabled: true
    },
    {
        id: 'box-2',
        code: 'M',
        name: 'Medium Box',
        innerL: 10,
        innerW: 10,
        innerH: 10,
        maxWeight: 20,
        tareWeight: 0.2,
        enabled: true
    },
    {
        id: 'box-3',
        code: 'L',
        name: 'Large Box',
        innerL: 15,
        innerW: 15,
        innerH: 15,
        maxWeight: 50,
        tareWeight: 0.5,
        enabled: true
    },
    {
        id: 'box-4',
        code: 'FLAT',
        name: 'Flat Rate Envelope',
        innerL: 12,
        innerW: 9,
        innerH: 1,
        maxWeight: 4,
        tareWeight: 0.1,
        enabled: true
    }
];

class BoxesRepo {
    private boxes: Box[] = [...initialBoxes];

    getAll(): Box[] {
        return this.boxes;
    }

    getEnabled(): Box[] {
        return this.boxes.filter(b => b.enabled);
    }

    add(box: Omit<Box, 'id'>): Box {
        const newBox = { ...box, id: uuidv4() };
        this.boxes.push(newBox);
        return newBox;
    }

    update(id: string, updates: Partial<Box>): Box | null {
        const idx = this.boxes.findIndex(b => b.id === id);
        if (idx === -1) return null;
        this.boxes[idx] = { ...this.boxes[idx], ...updates };
        return this.boxes[idx];
    }

    delete(id: string): boolean {
        const initialLen = this.boxes.length;
        this.boxes = this.boxes.filter(b => b.id !== id);
        return this.boxes.length !== initialLen;
    }

    reset() {
        this.boxes = [...initialBoxes];
    }
}

export const boxesRepo = new BoxesRepo();
