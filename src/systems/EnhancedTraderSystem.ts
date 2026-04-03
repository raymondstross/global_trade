// Enhanced Trader System with Experience & Attributes implementation here\
interface TraderAttributes {
  strength: number; // affects carrying capacity
  intelligence: number; // affects trade negotiation & better prices
  charisma: number; // affects NPC attitudes
  endurance: number; // affects travel speed
}

class Trader {
  id: string;
  name: string;
  level: number;
  experience: number;
  currentRegionId: string;
  attributes: TraderAttributes;
  
  inventory: Map<string, number>; // itemId -> quantity
  capacityModifierItems: string[]; // items that boost capacity
  
  // Trading stats
  totalTradeVolume: number = 0;
  tradeReputation: Map<string, number> = new Map(); // regionId -> reputation

  constructor(id: string, name: string, level: number = 1) {
    this.id = id;
    this.name = name;
    this.level = level;
    this.experience = 0;
    this.inventory = new Map();
    this.capacityModifierItems = [];
    
    // Base attributes scale with level
    this.attributes = {
      strength: 10 + (level - 1) * 2,
      intelligence: 10 + (level - 1) * 1.5,
      charisma: 10 + (level - 1) * 1.5,
      endurance: 10 + (level - 1) * 2
    };
  }

  getBaseCapacity(): number {
    // Strength affects carrying capacity
    return 10 + (this.level - 1) * 5 + this.attributes.strength * 0.5;
  }

  getCapacityModifiers(): number {
    return this.capacityModifierItems.reduce((total, itemId) => {
      const item = ItemRegistry.getItem(itemId);
      return total + (item?.capacityBonus || 0);
    }, 0);
  }

  getTotalCapacity(): number {
    return this.getBaseCapacity() + this.getCapacityModifiers();
  }

  getCurrentLoad(): number {
    let load = 0;
    this.inventory.forEach((quantity, itemId) => {
      const item = ItemRegistry.getItem(itemId);
      const weight = item?.weight || 1;
      load += quantity * weight;
    });
    return load;
  }

  getAvailableCapacity(): number {
    return this.getTotalCapacity() - this.getCurrentLoad();
  }

  canCarry(itemId: string, quantity: number): boolean {
    const item = ItemRegistry.getItem(itemId);
    const weight = item?.weight || 1;
    return this.getAvailableCapacity() >= quantity * weight;
  }

  // Intelligence affects pricing in trades
  getPriceModifier(): number {
    return 1 + (this.attributes.intelligence - 10) * 0.01; // 1% per point above 10
  }

  addExperience(amount: number): void {
    this.experience += amount;
    const experiencePerLevel = 100;
    while (this.experience >= experiencePerLevel * this.level) {
      this.levelUp();
    }
  }

  private levelUp(): void {
    this.level++;
    // Increase attributes on levelup
    this.attributes.strength += 2;
    this.attributes.intelligence += 1.5;
    this.attributes.charisma += 1.5;
    this.attributes.endurance += 2;
  }

  getReputation(regionId: string): number {
    return this.tradeReputation.get(regionId) || 0;
  }

  addReputation(regionId: string, amount: number): void {
    const current = this.getReputation(regionId);
    this.tradeReputation.set(regionId, Math.max(-100, Math.min(100, current + amount)));
  }
}
