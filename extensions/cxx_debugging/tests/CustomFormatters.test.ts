// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {MemorySlice, PageStore} from '../src/CustomFormatters.js';

function asArray(slice: MemorySlice): number[] {
  return Array.from(new Uint8Array(slice.buffer));
}

describe('PageStore', () => {
  it('merges slices correctly', () => {
    const bufferA = new Uint8Array([1, 2, 3, 4]).buffer;
    const bufferB = new Uint8Array([5, 6, 7, 8]).buffer;

    assert.throws(
        () => new MemorySlice(bufferA, 16).merge(new MemorySlice(bufferB, 32)),
        'Slices are not contiguous',
    );
    assert.throws(
        () => new MemorySlice(bufferA, 32).merge(new MemorySlice(bufferB, 16)),
        'Slices are not contiguous',
    );
    assert.deepEqual(
        asArray(new MemorySlice(bufferA, 16).merge(new MemorySlice(bufferB, 20))),
        [1, 2, 3, 4, 5, 6, 7, 8],
    );
    assert.deepEqual(
        asArray(new MemorySlice(bufferB, 20).merge(new MemorySlice(bufferA, 16))),
        [1, 2, 3, 4, 5, 6, 7, 8],
    );
    assert.deepEqual(
        asArray(new MemorySlice(bufferA, 20).merge(new MemorySlice(bufferB, 16))),
        [5, 6, 7, 8, 1, 2, 3, 4],
    );
    assert.deepEqual(
        asArray(new MemorySlice(bufferB, 16).merge(new MemorySlice(bufferA, 20))),
        [5, 6, 7, 8, 1, 2, 3, 4],
    );
    assert.deepEqual(
        asArray(new MemorySlice(bufferA, 18).merge(new MemorySlice(bufferB, 20))),
        [1, 2, 3, 4, 7, 8],
    );
    assert.deepEqual(
        asArray(new MemorySlice(bufferB, 20).merge(new MemorySlice(bufferA, 18))),
        [1, 2, 3, 4, 7, 8],
    );
    assert.deepEqual(
        asArray(new MemorySlice(bufferA, 20).merge(new MemorySlice(bufferB, 18))),
        [5, 6, 7, 8, 3, 4],
    );
    assert.deepEqual(
        asArray(new MemorySlice(bufferB, 18).merge(new MemorySlice(bufferA, 20))),
        [5, 6, 7, 8, 3, 4],
    );
  });

  it('sorts disjoint slices correctly', () => {
    const two = new Uint8Array([1, 2]).buffer;

    {
      const view = new PageStore();
      view.addSlice(two, 2);
      view.addSlice(two, 5);
      view.addSlice(two, 8);
      view.addSlice(two, 11);
      view.addSlice(two, 14);
      assert.deepEqual(
          view.slices.map(s => s.begin),
          [2, 5, 8, 11, 14],
      );
    }
    {
      const view = new PageStore();
      view.addSlice(two, 14);
      view.addSlice(two, 11);
      view.addSlice(two, 8);
      view.addSlice(two, 5);
      view.addSlice(two, 2);
      assert.deepEqual(
          view.slices.map(s => s.begin),
          [2, 5, 8, 11, 14],
      );
    }
  });

  it('finds slice indices correctly', () => {
    const four = new Uint8Array([3, 4, 5, 6]).buffer;
    const view = new PageStore();
    assert.deepEqual(view.findSliceIndex(100), -1);

    for (const offset of [2, 7, 12, 17, 22]) {
      view.addSlice(four, offset);
      assert.deepEqual(view.findSliceIndex(0), -1);
      assert.deepEqual(view.findSliceIndex(100), view.slices.length - 1);
      for (let s = 0; s < view.slices.length; ++s) {
        const slice = view.slices[s];

        assert.deepEqual(view.findSliceIndex(slice.begin - 1), s - 1);
        assert.deepEqual(view.findSliceIndex(slice.begin), s);
        assert.deepEqual(view.findSliceIndex(slice.begin + 1), s);
        assert.deepEqual(view.findSliceIndex(slice.end - 1), s);
        assert.deepEqual(view.findSliceIndex(slice.end), s);
      }
    }
  });

  it('finds offsets correctly', () => {
    const four = new Uint8Array([3, 4, 5, 6]).buffer;
    const view = new PageStore();
    assert.isNull(view.findSlice(100));

    for (const offset of [2, 7, 12, 17, 22]) {
      view.addSlice(four, offset);
      assert.isNull(view.findSlice(100));
      for (const slice of view.slices) {
        assert.isNull(view.findSlice(slice.begin - 1));
        assert.deepEqual(view.findSlice(slice.begin), slice);
        assert.deepEqual(view.findSlice(slice.begin + 1), slice);
        assert.deepEqual(view.findSlice(slice.end - 1), slice);
        assert.isNull(view.findSlice(slice.end));
      }
    }
  });

  it('merges overlapping slices correctly', () => {
    {
      const view = new PageStore();
      view.addSlice([1, 2], 2);
      view.addSlice([2, 3], 3);
      assert.lengthOf(view.slices, 1);
      assert.deepEqual(asArray(view.slices[0]), [1, 2, 3]);

      view.addSlice([0, 1, 2, 3, 4], 1);
      assert.lengthOf(view.slices, 1);
      assert.deepEqual(asArray(view.slices[0]), [0, 1, 2, 3, 4]);
    }

    const getView = (): PageStore => {
      const view = new PageStore();
      // --XX--XX--XX--XX
      view.addSlice([1, 2], 2);
      view.addSlice([4, 5], 6);
      view.addSlice([7, 8], 10);
      view.addSlice([10, 11], 14);
      return view;
    };

    {
      const view = getView();
      // --XX--XX--XX--XX
      //      ||
      view.addSlice([5, 4], 5);
      assert.lengthOf(view.slices, 4);
      assert.deepEqual(asArray(view.slices[0]), [1, 2]);
      assert.deepEqual(view.slices[0].begin, 2);
      assert.deepEqual(asArray(view.slices[1]), [5, 4, 5]);
      assert.deepEqual(view.slices[1].begin, 5);
      assert.deepEqual(asArray(view.slices[2]), [7, 8]);
      assert.deepEqual(view.slices[2].begin, 10);
      assert.deepEqual(asArray(view.slices[3]), [10, 11]);
      assert.deepEqual(view.slices[3].begin, 14);
    }

    {
      const view = getView();
      // --XX--XX--XX--XX
      //       ||
      view.addSlice([4, 5], 6);
      assert.lengthOf(view.slices, 4);
      assert.deepEqual(asArray(view.slices[0]), [1, 2]);
      assert.deepEqual(view.slices[0].begin, 2);
      assert.deepEqual(asArray(view.slices[1]), [4, 5]);
      assert.deepEqual(view.slices[1].begin, 6);
      assert.deepEqual(asArray(view.slices[2]), [7, 8]);
      assert.deepEqual(view.slices[2].begin, 10);
      assert.deepEqual(asArray(view.slices[3]), [10, 11]);
      assert.deepEqual(view.slices[3].begin, 14);
    }

    {
      const view = getView();
      // --XX--XX--XX--XX
      //        ||
      view.addSlice([5, 6], 7);
      assert.lengthOf(view.slices, 4);
      assert.deepEqual(asArray(view.slices[0]), [1, 2]);
      assert.deepEqual(view.slices[0].begin, 2);
      assert.deepEqual(asArray(view.slices[1]), [4, 5, 6]);
      assert.deepEqual(view.slices[1].begin, 6);
      assert.deepEqual(asArray(view.slices[2]), [7, 8]);
      assert.deepEqual(view.slices[2].begin, 10);
      assert.deepEqual(asArray(view.slices[3]), [10, 11]);
      assert.deepEqual(view.slices[3].begin, 14);
    }

    {
      const view = getView();
      view.addSlice([20, 21], 20);
      // --XX--XX--XX--XX----XX
      //                  ||
      view.addSlice([17, 18], 17);
      assert.lengthOf(view.slices, 6);
      assert.deepEqual(asArray(view.slices[0]), [1, 2]);
      assert.deepEqual(view.slices[0].begin, 2);
      assert.deepEqual(asArray(view.slices[1]), [4, 5]);
      assert.deepEqual(view.slices[1].begin, 6);
      assert.deepEqual(asArray(view.slices[2]), [7, 8]);
      assert.deepEqual(view.slices[2].begin, 10);
      assert.deepEqual(asArray(view.slices[3]), [10, 11]);
      assert.deepEqual(view.slices[3].begin, 14);

      assert.deepEqual(asArray(view.slices[4]), [17, 18]);
      assert.deepEqual(view.slices[4].begin, 17);
      assert.deepEqual(asArray(view.slices[5]), [20, 21]);
      assert.deepEqual(view.slices[5].begin, 20);
    }

    {
      const view = getView();

      // --XX--XX--XX--XX
      //     |______|
      view.addSlice([0, 0, 4, 5, 0, 0, 7, 8], 4);
      assert.lengthOf(view.slices, 2);
      assert.deepEqual(asArray(view.slices[0]), [1, 2, 0, 0, 4, 5, 0, 0, 7, 8]);
      assert.deepEqual(view.slices[0].begin, 2);
      assert.deepEqual(asArray(view.slices[1]), [10, 11]);
      assert.deepEqual(view.slices[1].begin, 14);
    }

    {
      const view = getView();

      // --XX--XX--XX--XX
      //      |_____|
      view.addSlice([0, 4, 5, 0, 0, 7, 8], 5);
      assert.lengthOf(view.slices, 3);
      assert.deepEqual(asArray(view.slices[0]), [1, 2]);
      assert.deepEqual(view.slices[0].begin, 2);
      assert.deepEqual(asArray(view.slices[1]), [0, 4, 5, 0, 0, 7, 8]);
      assert.deepEqual(view.slices[1].begin, 5);
      assert.deepEqual(asArray(view.slices[2]), [10, 11]);
      assert.deepEqual(view.slices[2].begin, 14);
    }

    {
      const view = getView();

      // --XX--XX--XX--XX
      //        |___|
      view.addSlice([5, 0, 0, 7, 8], 7);
      assert.lengthOf(view.slices, 3);
      assert.deepEqual(asArray(view.slices[0]), [1, 2]);
      assert.deepEqual(view.slices[0].begin, 2);
      assert.deepEqual(asArray(view.slices[1]), [4, 5, 0, 0, 7, 8]);
      assert.deepEqual(view.slices[1].begin, 6);
      assert.deepEqual(asArray(view.slices[2]), [10, 11]);
      assert.deepEqual(view.slices[2].begin, 14);
    }

    {
      const view = getView();

      // --XX--XX--XX--XX
      //       |____|
      view.addSlice([4, 5, 0, 0, 7, 8], 6);
      assert.lengthOf(view.slices, 3);
      assert.deepEqual(asArray(view.slices[0]), [1, 2]);
      assert.deepEqual(view.slices[0].begin, 2);
      assert.deepEqual(asArray(view.slices[1]), [4, 5, 0, 0, 7, 8]);
      assert.deepEqual(view.slices[1].begin, 6);
      assert.deepEqual(asArray(view.slices[2]), [10, 11]);
      assert.deepEqual(view.slices[2].begin, 14);
    }

    {
      const view = getView();

      // --XX--XX--XX--XX
      //       |_____|
      view.addSlice([4, 5, 0, 0, 7, 8, 0], 6);
      assert.lengthOf(view.slices, 3);
      assert.deepEqual(asArray(view.slices[0]), [1, 2]);
      assert.deepEqual(view.slices[0].begin, 2);
      assert.deepEqual(asArray(view.slices[1]), [4, 5, 0, 0, 7, 8, 0]);
      assert.deepEqual(view.slices[1].begin, 6);
      assert.deepEqual(asArray(view.slices[2]), [10, 11]);
      assert.deepEqual(view.slices[2].begin, 14);
    }

    {
      const view = getView();

      // --XX--XX--XX--XX
      //       |______|
      view.addSlice([4, 5, 0, 0, 7, 8, 0, 0], 6);
      assert.lengthOf(view.slices, 2);
      assert.deepEqual(asArray(view.slices[0]), [1, 2]);
      assert.deepEqual(view.slices[0].begin, 2);
      assert.deepEqual(
          asArray(view.slices[1]),
          [4, 5, 0, 0, 7, 8, 0, 0, 10, 11],
      );
      assert.deepEqual(view.slices[1].begin, 6);
    }
  });
});
