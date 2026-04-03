// Item & Rarity Tier System implementation here
// Rarity tiers determine value, scarcity, and demand
enum RarityTier {
  COMMON = 0,
  UNCOMMON = 1,
  RARE = 2,
  EPIC = 3,
  LEGENDARY = 4
}

interface ItemDefinition {
  id: string;
  name: string;
  rarity: RarityTier;
  basePrice: number;
  weight?: number; // for weight-based carrying capacity
  capacityBonus?: number; // if it's a special item
  description: string;
  tradeable: boolean;
}

class ItemRegistry {
  private items: Map<string, ItemDefinition> = new Map();

  register(item: ItemDefinition): void {
    this.items.set(item.id, item);
  }

  getItem(itemId: string): ItemDefinition | undefined {
    return this.items.get(itemId);
  }

  getPriceMultiplier(rarity: RarityTier): number {
    const multipliers: Record<RarityTier, number> = {
      [RarityTier.COMMON]: 1.0,
      [RarityTier.UNCOMMON]: 1.5,
      [RarityTier.RARE]: 2.5,
      [RarityTier.EPIC]: 4.0,
      [RarityTier.LEGENDARY]: 8.0
    };
    return multipliers[rarity];
  }
}
