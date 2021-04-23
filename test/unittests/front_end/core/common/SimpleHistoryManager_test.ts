// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';

const {assert} = chai;
const SimpleHistoryManager = Common.SimpleHistoryManager.SimpleHistoryManager;

class Entry implements Common.SimpleHistoryManager.HistoryEntry {
  private callback: () => void;

  constructor(callback: () => void) {
    this.callback = callback;
  }

  valid(): boolean {
    return true;
  }

  reveal(): void {
    this.callback();
  }
}

describe('SimpleHistoryManager', () => {
  function setUpHistory(numberOfEntries: number, revealedElements: number[]) {
    const history = new SimpleHistoryManager(numberOfEntries);
    for (let i = 0; i < numberOfEntries; ++i) {
      history.push(new Entry(() => {
        revealedElements.push(i);
      }));
    }
    assert.isFalse(history.empty());
    return history;
  }

  it('correctly reflects if it can roll back', () => {
    const numberOfEntries = 10;
    const revealedElements: number[] = [];
    const history = setUpHistory(numberOfEntries, revealedElements);

    while (history.canRollback()) {
      history.rollback();
    }

    const expectedHistoryEntries = [8, 7, 6, 5, 4, 3, 2, 1, 0];
    assert.deepEqual(revealedElements, expectedHistoryEntries);
  });

  it('correctly reflects if it can roll over', () => {
    const numberOfEntries = 10;
    const revealedElements: number[] = [];
    const history = setUpHistory(numberOfEntries, revealedElements);

    for (let i = 0; i < numberOfEntries / 2; ++i) {
      history.rollback();
    }

    while (history.canRollover()) {
      history.rollover();
    }

    const expectedHistoryEntries = [8, 7, 6, 5, 4, 5, 6, 7, 8, 9];
    assert.deepEqual(revealedElements, expectedHistoryEntries);
  });
});
