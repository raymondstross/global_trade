// Item System for managing trade items.
class Item {
    constructor(public name: string, public value: number) {}
}

class ItemSystem {
    private items: Item[] = [];

    addItem(item: Item) {
        this.items.push(item);
    }

    getItems() {
        return this.items;
    }
}