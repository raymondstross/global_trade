// Item and rarity tier system

class Item {
    constructor(public name: string, public rarity: string) {}
}

class RarityTier {
    constructor(public tier: string, public multiplier: number) {}
}

const items = [
    new Item('Sword', 'Rare'),
    new Item('Shield', 'Common'),
];

const rarityTiers = [
    new RarityTier('Common', 1),
    new RarityTier('Rare', 1.5),
];