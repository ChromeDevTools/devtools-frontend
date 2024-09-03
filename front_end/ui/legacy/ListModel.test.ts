// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from './legacy.js';

describe('ListModel', () => {
  it('can be instantiated correctly without a list of items', () => {
    const model = new UI.ListModel.ListModel();
    assert.deepEqual([...model], []);
  });

  it('can be instantiated correctly with a list of items', () => {
    const model = new UI.ListModel.ListModel([4, 5, 6]);
    assert.deepEqual([...model], [4, 5, 6]);
  });

  it('supports replacing all list elements', () => {
    const model = new UI.ListModel.ListModel();
    model.replaceAll([0, 1, 2]);
    assert.deepEqual([...model], [0, 1, 2]);
  });

  it('supports replacing a range of list elements', () => {
    const model = new UI.ListModel.ListModel([0, 1, 2]);
    model.replaceRange(0, 1, [5, 6, 7]);
    assert.deepEqual([...model], [5, 6, 7, 1, 2]);
  });

  it('supports inserting new list elements', () => {
    const model = new UI.ListModel.ListModel([5, 6, 7, 1, 2]);
    model.insert(model.length, 10);
    assert.deepEqual([...model], [5, 6, 7, 1, 2, 10]);
  });

  it('supports removing list elements', () => {
    const model = new UI.ListModel.ListModel([5, 6, 7, 1, 2, 10]);
    model.remove(model.length - 1);
    assert.deepEqual([...model], [5, 6, 7, 1, 2]);
  });

  it('supports removing list elements', () => {
    const model = new UI.ListModel.ListModel([5, 6, 7, 1, 2]);
    model.remove(4);
    assert.deepEqual([...model], [5, 6, 7, 1]);
  });

  it('supports replacing list elements in place', () => {
    const model = new UI.ListModel.ListModel([5, 6, 7, 1]);
    model.insert(1, 8);
    assert.deepEqual([...model], [5, 8, 6, 7, 1]);
  });

  it('supports replacing list elements in place', () => {
    const model = new UI.ListModel.ListModel([
      0, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 4, 5, 6, 27, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 28, 29,
    ]);
    model.replaceRange(0, 29, []);
    assert.deepEqual([...model], [29]);
  });

  it('fires an event when elements are replaced', () => {
    const model = new UI.ListModel.ListModel([0, 1, 2]);
    let eventData!: {index: number, removed: number[], inserted: number, keepSelectedIndex?: boolean|undefined};
    model.addEventListener(
        UI.ListModel.Events.ITEMS_REPLACED, (event: {data: UI.ListModel.ItemsReplacedEvent<number>}) => {
          eventData = event.data;
        });
    model.replaceRange(0, 1, [5, 6, 7]);
    assert.deepEqual([...model], [5, 6, 7, 1, 2]);
    assert.deepEqual(eventData, {
      index: 0,
      removed: [0],
      inserted: 3,
      keepSelectedIndex: undefined,
    });
  });
});
