import { Item } from '../packing/types';
import { v4 as uuidv4 } from 'uuid';

export interface Scenario {
    id: string;
    name: string;
    items: Item[];
    createdAt: Date;
}

class ScenariosRepo {
    private scenarios: Scenario[] = [];

    getAll(): Scenario[] {
        return this.scenarios;
    }

    getById(id: string): Scenario | undefined {
        return this.scenarios.find(s => s.id === id);
    }

    add(name: string, items: Item[]): Scenario {
        const scenario: Scenario = {
            id: uuidv4(),
            name,
            items,
            createdAt: new Date()
        };
        this.scenarios.push(scenario);
        return scenario;
    }

    delete(id: string): boolean {
        const initialLen = this.scenarios.length;
        this.scenarios = this.scenarios.filter(s => s.id !== id);
        return this.scenarios.length !== initialLen;
    }
}

export const scenariosRepo = new ScenariosRepo();
