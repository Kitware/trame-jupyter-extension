class Registry<T> {
  private _items: Record<string, T | null>;

  constructor() {
    this._items = {};
  }

  getItem(id: string): T | null {
    const item = this._items[id];

    if (item) {
      return item;
    }

    return null;
  }

  setItem(id: string, item: T | null) {
    if (item === null) {
      delete this._items[id];
    } else {
      this._items[id] = item;
    }
  }
}

export { Registry };
