// Enhanced Region System with Dynamic Goods implementation here
interface RegionTraits {
  population: number; // affects demand
  prosperity: number; // affects prices and demand
  infrastructure: number; // affects trade efficiency
  specialization: string; // e.g., "agricultural", "mining", "crafting"
}

class Region {
  id: string;
  name: string;
  position: { x: number; y: number };
  traits: RegionTraits;
  
  private resources: Map<string, RegionalResource> = new Map();
  private tradersPresent: Set<string> = new Set();
  private connectionCosts: Map<string, number> = new Map(); // regionId -> travel cost

  constructor(id: string, name: string, position: { x: number; y: number }) {
    this.id = id;
    this.name = name;
    this.position = position;
    this.traits = {
      population: 1000,
      prosperity: 50,
      infrastructure: 50,
      specialization: "general"
    };
  }

  addResource(goodId: string, maxQuantity: number, replenishmentRate: number, rarity: RarityTier): void {
    const item = ItemRegistry.getItem(goodId);
    if (!item) return;

    const resource: RegionalResource = {
      goodId,
      maxQuantity,
      currentQuantity: maxQuantity,
      depletionRate: maxQuantity * 0.1,
      replenishmentRate,
      rarity,
      lastReplenished: Date.now(),
      priceInfluence: {
        basePrice: item.basePrice,
        scarcityMultiplier: 1,
        demandLevel: 50
      }
    };

    this.resources.set(goodId, resource);
  }

  getAvailableGoods(): RegionalResource[] {
    return Array.from(this.resources.values());
  }

  addTrader(traderId: string): void {
    this.tradersPresent.add(traderId);
  }

  removeTrader(traderId: string): void {
    this.tradersPresent.delete(traderId);
  }

  getTradersCount(): number {
    return this.tradersPresent.size;
  }

  // Regions connected via roads have lower travel costs
  setConnectionCost(targetRegionId: string, cost: number): void {
    this.connectionCosts.set(targetRegionId, cost);
  }

  getConnectionCost(targetRegionId: string): number {
    return this.connectionCosts.get(targetRegionId) || 999; // High cost for non-connected regions
  }

  // Demand influenced by population and prosperity
  getBaseRegionalDemand(): number {
    return (this.traits.population / 1000) * (this.traits.prosperity / 100) * 50;
  }
}

class World {
  regions: Map<string, Region> = new Map();
  traders: Map<string, Trader> = new Map();
  depletionManager: ResourceDepletionManager = new ResourceDepletionManager();
  pricingSystem: DynamicPricing = new DynamicPricing();

  addRegion(region: Region): void {
    this.regions.set(region.id, region);
  }

  addTrader(trader: Trader): void {
    this.traders.set(trader.id, trader);
    const region = this.regions.get(trader.currentRegionId);
    region?.addTrader(trader.id);
  }

  moveTrader(traderId: string, newRegionId: string, cost: number = 0): boolean {
    const trader = this.traders.get(traderId);
    const newRegion = this.regions.get(newRegionId);

    if (!trader || !newRegion) return false;

    // Could deduct cost from trader's currency here
    const oldRegion = this.regions.get(trader.currentRegionId);
    oldRegion?.removeTrader(traderId);

    trader.currentRegionId = newRegionId;
    newRegion.addTrader(traderId);

    return true;
  }

  getRegion(regionId: string): Region | undefined {
    return this.regions.get(regionId);
  }

  getTrader(traderId: string): Trader | undefined {
    return this.traders.get(traderId);
  }

  getTradersInRegion(regionId: string): Trader[] {
    return Array.from(this.traders.values())
      .filter(trader => trader.currentRegionId === regionId);
  }
}
