// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';

export class ListModel<T> extends Common.ObjectWrapper.ObjectWrapper<EventTypes<T>> implements Iterable<T> {
  private items: T[];
  constructor(items?: T[]) {
    super();
    this.items = items || [];
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]();
  }

  get length(): number {
    return this.items.length;
  }

  at(index: number): T {
    return this.items[index];
  }

  every(callback: (arg0: T) => boolean): boolean {
    return this.items.every(callback);
  }

  filter(callback: (arg0: T) => boolean): T[] {
    return this.items.filter(callback);
  }

  find(callback: (arg0: T) => boolean): T|undefined {
    return this.items.find(callback);
  }

  findIndex(callback: (arg0: T) => boolean): number {
    return this.items.findIndex(callback);
  }

  indexOf(value: T, fromIndex?: number): number {
    return this.items.indexOf(value, fromIndex);
  }

  insert(index: number, value: T): void {
    this.items.splice(index, 0, value);
    this.replaced(index, [], 1);
  }

  insertWithComparator(value: T, comparator: (arg0: T, arg1: T) => number): void {
    this.insert(Platform.ArrayUtilities.lowerBound(this.items, value, comparator), value);
  }

  join(separator?: string): string {
    return this.items.join(separator);
  }

  remove(index: number): T {
    const result = this.items[index];
    this.items.splice(index, 1);
    this.replaced(index, [result], 0);
    return result;
  }

  replace(index: number, value: T, keepSelectedIndex?: boolean): T {
    const oldValue = this.items[index];
    this.items[index] = value;
    this.replaced(index, [oldValue], 1, keepSelectedIndex);
    return oldValue;
  }

  replaceRange(from: number, to: number, items: T[]): T[] {
    let removed;
    if (items.length < 10000) {
      removed = this.items.splice(from, to - from, ...items);
    } else {
      removed = this.items.slice(from, to);
      // Splice may fail with too many arguments.
      const before = this.items.slice(0, from);
      const after = this.items.slice(to);
      this.items = [...before, ...items, ...after];
    }
    this.replaced(from, removed, items.length);
    return removed;
  }

  replaceAll(items: T[]): T[] {
    const oldItems = this.items.slice();
    this.items = items;
    this.replaced(0, oldItems, items.length);
    return oldItems;
  }

  slice(from?: number, to?: number): T[] {
    return this.items.slice(from, to);
  }

  some(callback: (arg0: T) => boolean): boolean {
    return this.items.some(callback);
  }

  private replaced(index: number, removed: T[], inserted: number, keepSelectedIndex?: boolean): void {
    this.dispatchEventToListeners(Events.ITEMS_REPLACED, {index, removed, inserted, keepSelectedIndex});
  }
}

export const enum Events {
  ITEMS_REPLACED = 'ItemsReplaced',
}

export interface ItemsReplacedEvent<T> {
  index: number;
  removed: T[];
  inserted: number;
  keepSelectedIndex?: boolean;
}

export type EventTypes<T> = {
  [Events.ITEMS_REPLACED]: ItemsReplacedEvent<T>,
};
