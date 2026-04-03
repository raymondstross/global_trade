// Advanced Resource & Depletion System implementation here
interface RegionalResource {
  goodId: string;
  maxQuantity: number; // Maximum sustainable amount
  currentQuantity: number;
  depletionRate: number; // How much depletes per extraction
  replenishmentRate: number; // How much regenerates per time period
  rarity: RarityTier;
  lastReplenished: number; // timestamp
  priceInfluence: PriceInfluenceData; // affects pricing based on scarcity
}

interface PriceInfluenceData {
  basePrice: number;
  scarcityMultiplier: number; // current multiplier based on depletion
  demandLevel: number; // 0-100 scale of region demand
}

class ResourceDepletionManager {
  private resources: Map<string, RegionalResource> = new Map();
  private replenishmentInterval: number = 3600000; // 1 hour in ms

  registerResource(regionId: string, resource: RegionalResource): void {
    const key = `${regionId}_${resource.goodId}`;
    this.resources.set(key, resource);
  }

  extractResource(
    regionId: string,
    goodId: string,
    quantity: number
  ): { extracted: number; priceMultiplier: number } {
    const key = `${regionId}_${goodId}`;
    const resource = this.resources.get(key);

    if (!resource) {
      return { extracted: 0, priceMultiplier: 1 };
    }

    // Can't extract more than available
    const canExtract = Math.min(quantity, resource.currentQuantity);
    
    // Apply depletion
    resource.currentQuantity -= canExtract;

    // Calculate price multiplier based on scarcity
    const depletionRatio = 1 - resource.currentQuantity / resource.maxQuantity;
    const priceMultiplier = 1 + depletionRatio * 2; // Up to 3x price at 100% depletion

    resource.priceInfluence.scarcityMultiplier = priceMultiplier;

    return {
      extracted: canExtract,
      priceMultiplier: priceMultiplier
    };
  }

  replenishResources(regionId: string): void {
    const now = Date.now();
    
    this.resources.forEach((resource, key) => {
      if (!key.startsWith(`${regionId}_`)) return;

      const timeSinceReplenish = now - resource.lastReplenished;
      const replenishCycles = Math.floor(timeSinceReplenish / this.replenishmentInterval);

      if (replenishCycles > 0) {
        const replenishAmount = resource.replenishmentRate * replenishCycles;
        resource.currentQuantity = Math.min(
          resource.maxQuantity,
          resource.currentQuantity + replenishAmount
        );
        resource.lastReplenished = now;
      }
    });
  }

  getResourceStatus(regionId: string, goodId: string): {
    quantity: number;
    maxQuantity: number;
    depletionPercentage: number;
    priceMultiplier: number;
    replenishingIn: number; // ms until next replenishment
  } {
    const key = `${regionId}_${goodId}`;
    const resource = this.resources.get(key);

    if (!resource) {
      return {
        quantity: 0,
        maxQuantity: 0,
        depletionPercentage: 100,
        priceMultiplier: 1,
        replenishingIn: 0
      };
    }

    const now = Date.now();
    const timeSinceReplenish = now - resource.lastReplenished;
    const replenishingIn = Math.max(0, this.replenishmentInterval - timeSinceReplenish);

    return {
      quantity: resource.currentQuantity,
      maxQuantity: resource.maxQuantity,
      depletionPercentage: (1 - resource.currentQuantity / resource.maxQuantity) * 100,
      priceMultiplier: resource.priceInfluence.scarcityMultiplier,
      replenishingIn: replenishingIn
    };
  }

  // Alert system for over-extraction
  checkRegionalHealth(regionId: string): RegionalHealthReport {
    let totalDepletion = 0;
    let criticalResources: string[] = [];
    let warnings: string[] = [];

    this.resources.forEach((resource, key) => {
      if (!key.startsWith(`${regionId}_`)) return;

      const depletionRatio = 1 - resource.currentQuantity / resource.maxQuantity;
      totalDepletion += depletionRatio;

      if (depletionRatio > 0.9) {
        criticalResources.push(resource.goodId);
      } else if (depletionRatio > 0.7) {
        warnings.push(`${resource.goodId} is severely depleted`);
      }
    });

    return {
      regionId,
      healthPercentage: Math.max(0, 100 - totalDepletion * 20),
      criticalResources,
      warnings,
      needsIntervention: criticalResources.length > 0
    };
  }
}

interface RegionalHealthReport {
  regionId: string;
  healthPercentage: number;
  criticalResources: string[];
  warnings: string[];
  needsIntervention: boolean;
}
