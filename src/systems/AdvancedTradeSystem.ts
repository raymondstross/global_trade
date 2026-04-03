// Advanced Trade System with Negotiation implementation here
interface TradeOffer {
  offeringGoods: Map<string, number>; // itemId -> quantity
  requestedGoods: Map<string, number>;
  totalValue: number; // calculated value in currency
  fromTrader: Trader;
  toTrader: Trader;
  createdAt: number;
  expiresAt: number; // offer expires after time
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

interface TradeHistory {
  id: string;
  fromTrader: Trader;
  toTrader: Trader;
  goods: Map<string, number>;
  totalValue: number;
  timestamp: number;
  region: Region;
  pricesAtTime: Map<string, number>;
}

class TradeSystem {
  private activeOffers: Map<string, TradeOffer> = new Map();
  private tradeHistory: TradeHistory[] = [];
  private world: World;
  private pricingSystem: DynamicPricing;

  constructor(world: World, pricingSystem: DynamicPricing) {
    this.world = world;
    this.pricingSystem = pricingSystem;
  }

  createTradeOffer(
    fromTrader: Trader,
    toTrader: Trader,
    offeringGoods: Map<string, number>,
    requestedGoods: Map<string, number>,
    expiryMs: number = 300000 // 5 minutes default
  ): TradeOffer | null {
    // Validate both traders are in same region
    if (fromTrader.currentRegionId !== toTrader.currentRegionId) {
      return null;
    }

    // Validate fromTrader has goods to offer
    for (const [itemId, quantity] of offeringGoods) {
      const available = fromTrader.inventory.get(itemId) || 0;
      if (available < quantity) return null;
    }

    // Calculate values
    const region = this.world.getRegion(fromTrader.currentRegionId);
    if (!region) return null;

    const offeringValue = this.calculateGoodsValue(region, offeringGoods, fromTrader);
    const requestedValue = this.calculateGoodsValue(region, requestedGoods, toTrader);

    const offer: TradeOffer = {
      offeringGoods,
      requestedGoods,
      totalValue: offeringValue, // Could use average or negotiated value
      fromTrader,
      toTrader,
      createdAt: Date.now(),
      expiresAt: Date.now() + expiryMs,
      status: 'pending'
    };

    const offerId = `${fromTrader.id}_${toTrader.id}_${Date.now()}`;
    this.activeOffers.set(offerId, offer);

    return offer;
  }

  acceptTrade(offerId: string): boolean {
    const offer = this.activeOffers.get(offerId);
    if (!offer || offer.status !== 'pending') return false;

    if (Date.now() > offer.expiresAt) {
      offer.status = 'expired';
      return false;
    }

    // Validate toTrader can accept requested goods
    for (const [itemId, quantity] of offer.requestedGoods) {
      const available = offer.toTrader.inventory.get(itemId) || 0;
      if (available < quantity) return false;
      if (!offer.fromTrader.canCarry(itemId, quantity)) return false;
    }

    // Execute trade
    for (const [itemId, quantity] of offer.offeringGoods) {
      const fromQty = offer.fromTrader.inventory.get(itemId) || 0;
      const toQty = offer.toTrader.inventory.get(itemId) || 0;
      offer.fromTrader.inventory.set(itemId, fromQty - quantity);
      offer.toTrader.inventory.set(itemId, toQty + quantity);
    }

    for (const [itemId, quantity] of offer.requestedGoods) {
      const fromQty = offer.fromTrader.inventory.get(itemId) || 0;
      const toQty = offer.toTrader.inventory.get(itemId) || 0;
      offer.fromTrader.inventory.set(itemId, fromQty + quantity);
      offer.toTrader.inventory.set(itemId, toQty - quantity);
    }

    // Record trade
    const region = this.world.getRegion(offer.fromTrader.currentRegionId);
    if (region) {
      const pricesAtTime: Map<string, number> = new Map();
      const allGoods = new Map([...offer.offeringGoods, ...offer.requestedGoods]);
      for (const goodId of allGoods.keys()) {
        const price = this.pricingSystem.calculatePrice(
          region.id,
          goodId,
          offer.fromTrader,
          offer.toTrader,
          this.world.depletionManager
        );
        pricesAtTime.set(goodId, price);
      }

      this.tradeHistory.push({
        id: offerId,
        fromTrader: offer.fromTrader,
        toTrader: offer.toTrader,
        goods: offer.offeringGoods,
        totalValue: offer.totalValue,
        timestamp: Date.now(),
        region,
        pricesAtTime
      });
    }

    // Update stats
    offer.fromTrader.totalTradeVolume += offer.totalValue;
    offer.toTrader.totalTradeVolume += offer.totalValue;

    // Add experience for trading
    offer.fromTrader.addExperience(10);
    offer.toTrader.addExperience(10);

    // Update reputation slightly for fair trades
    const fairnessRatio = offer.totalValue / (this.calculateGoodsValue(region!, offer.requestedGoods, offer.toTrader) || 1);
    if (fairnessRatio > 0.8 && fairnessRatio < 1.2) {
      offer.fromTrader.addReputation(region!.id, 5);
      offer.toTrader.addReputation(region!.id, 5);
    }

    offer.status = 'accepted';
    return true;
  }

  rejectTrade(offerId: string): void {
    const offer = this.activeOffers.get(offerId);
    if (offer) {
      offer.status = 'rejected';
    }
  }

  private calculateGoodsValue(
    region: Region,
    goods: Map<string, number>,
    trader: Trader
  ): number {
    let totalValue = 0;
    goods.forEach((quantity, itemId) => {
      const price = this.pricingSystem.calculatePrice(
        region.id,
        itemId,
        trader,
        trader, // dummy for now
        this.world.depletionManager
      );
      totalValue += price * quantity;
    });
    return totalValue;
  }

  getTradeHistory(traderId?: string): TradeHistory[] {
    if (!traderId) return this.tradeHistory;
    return this.tradeHistory.filter(
      trade => trade.fromTrader.id === traderId || trade.toTrader.id === traderId
    );
  }

  cleanupExpiredOffers(): void {
    const now = Date.now();
    this.activeOffers.forEach((offer, offerId) => {
      if (offer.status === 'pending' && now > offer.expiresAt) {
        offer.status = 'expired';
      }
    });
  }
}
