// Dynamic Pricing System implementation here
interface PricingFactors {
  basePrice: number;
  rarityMultiplier: number;
  scarcityMultiplier: number;
  demandMultiplier: number;
  traderIntelligenceAdjustment: number;
  regionReputation: number; // affects seller pricing for traders
}

class DynamicPricing {
  private demandLevels: Map<string, Map<string, number>> = new Map(); // regionId -> goodId -> demand (0-100)
  private priceHistory: Map<string, number[]> = new Map(); // goodId -> historical prices

  calculatePrice(
    regionId: string,
    goodId: string,
    seller: Trader,
    buyer: Trader,
    depletionManager: ResourceDepletionManager
  ): number {
    const item = ItemRegistry.getItem(goodId);
    if (!item) return 0;

    const resourceStatus = depletionManager.getResourceStatus(regionId, goodId);
    const demand = this.getDemandLevel(regionId, goodId);
    const sellerReputation = seller.getReputation(regionId);

    const factors: PricingFactors = {
      basePrice: item.basePrice,
      rarityMultiplier: ItemRegistry.getPriceMultiplier(item.rarity),
      scarcityMultiplier: resourceStatus.priceMultiplier,
      demandMultiplier: 1 + (demand / 100) * 0.5, // Up to 50% increase
      traderIntelligenceAdjustment: seller.getPriceModifier(),
      regionReputation: 1 + (sellerReputation / 100) * 0.2 // Good reputation = better prices
    };

    // Calculate final price
    const finalPrice = Math.floor(
      factors.basePrice *
      factors.rarityMultiplier *
      factors.scarcityMultiplier *
      factors.demandMultiplier *
      factors.traderIntelligenceAdjustment *
      factors.regionReputation
    );

    // Track price history
    this.recordPrice(goodId, finalPrice);

    return finalPrice;
  }

  private getDemandLevel(regionId: string, goodId: string): number {
    if (!this.demandLevels.has(regionId)) {
      this.demandLevels.set(regionId, new Map());
    }
    return this.demandLevels.get(regionId)?.get(goodId) || 50; // Default 50%
  }

  setDemandLevel(regionId: string, goodId: string, level: number): void {
    if (!this.demandLevels.has(regionId)) {
      this.demandLevels.set(regionId, new Map());
    }
    this.demandLevels.get(regionId)?.set(goodId, Math.max(0, Math.min(100, level)));
  }

  updateDemandBasedOnTrades(regionId: string, goodId: string, transactionQuantity: number): void {
    const currentDemand = this.getDemandLevel(regionId, goodId);
    const demandIncrease = Math.min(20, transactionQuantity * 0.5);
    this.setDemandLevel(regionId, goodId, currentDemand + demandIncrease);
  }

  private recordPrice(goodId: string, price: number): void {
    if (!this.priceHistory.has(goodId)) {
      this.priceHistory.set(goodId, []);
    }
    this.priceHistory.get(goodId)?.push(price);
  }

  getPriceHistory(goodId: string): number[] {
    return this.priceHistory.get(goodId) || [];
  }

  getPriceAverage(goodId: string): number {
    const history = this.priceHistory.get(goodId) || [];
    if (history.length === 0) return 0;
    return Math.floor(history.reduce((a, b) => a + b, 0) / history.length);
  }

  getPriceTrend(goodId: string): 'rising' | 'falling' | 'stable' {
    const history = this.priceHistory.get(goodId) || [];
    if (history.length < 2) return 'stable';

    const recent = history.slice(-5);
    const older = history.slice(-10, -5);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const difference = recentAvg - olderAvg;
    if (Math.abs(difference) < olderAvg * 0.05) return 'stable';
    return difference > 0 ? 'rising' : 'falling';
  }
}
