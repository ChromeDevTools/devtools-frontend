// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {MemorySlice, PageStore} from '../src/CustomFormatters.js';

function asArray(slice: MemorySlice): number[] {
  return Array.from(new Uint8Array(slice.buffer));
}

describe('PageStore', () => {
  it('merges slices correctly', () => {
    const bufferA = new Uint8Array([1, 2, 3, 4]).buffer;
    const bufferB = new Uint8Array([5, 6, 7, 8]).buffer;

    expect(() => new MemorySlice(bufferA, 16).merge(new MemorySlice(bufferB, 32)))
        .to.throw('Slices are not contiguous');
    expect(() => new MemorySlice(bufferA, 32).merge(new MemorySlice(bufferB, 16)))
        .to.throw('Slices are not contiguous');
    expect(asArray(new MemorySlice(bufferA, 16).merge(new MemorySlice(bufferB, 20)))).to.deep.equal([
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
    ]);
    expect(asArray(new MemorySlice(bufferB, 20).merge(new MemorySlice(bufferA, 16)))).to.deep.equal([
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
    ]);
    expect(asArray(new MemorySlice(bufferA, 20).merge(new MemorySlice(bufferB, 16)))).to.deep.equal([
      5,
      6,
      7,
      8,
      1,
      2,
      3,
      4,
    ]);
    expect(asArray(new MemorySlice(bufferB, 16).merge(new MemorySlice(bufferA, 20)))).to.deep.equal([
      5,
      6,
      7,
      8,
      1,
      2,
      3,
      4,
    ]);
    expect(asArray(new MemorySlice(bufferA, 18).merge(new MemorySlice(bufferB, 20)))).to.deep.equal([1, 2, 3, 4, 7, 8]);
    expect(asArray(new MemorySlice(bufferB, 20).merge(new MemorySlice(bufferA, 18)))).to.deep.equal([1, 2, 3, 4, 7, 8]);
    expect(asArray(new MemorySlice(bufferA, 20).merge(new MemorySlice(bufferB, 18)))).to.deep.equal([5, 6, 7, 8, 3, 4]);
    expect(asArray(new MemorySlice(bufferB, 18).merge(new MemorySlice(bufferA, 20)))).to.deep.equal([5, 6, 7, 8, 3, 4]);
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
      expect(view.slices.map(s => s.begin)).to.deep.equal([2, 5, 8, 11, 14]);
    }
    {
      const view = new PageStore();
      view.addSlice(two, 14);
      view.addSlice(two, 11);
      view.addSlice(two, 8);
      view.addSlice(two, 5);
      view.addSlice(two, 2);
      expect(view.slices.map(s => s.begin)).to.deep.equal([2, 5, 8, 11, 14]);
    }
  });

  it('finds slice indices correctly', () => {
    const four = new Uint8Array([3, 4, 5, 6]).buffer;
    const view = new PageStore();
    expect(view.findSliceIndex(100)).to.eql(-1);

    for (const offset of [2, 7, 12, 17, 22]) {
      view.addSlice(four, offset);
      expect(view.findSliceIndex(0)).to.eql(-1);
      expect(view.findSliceIndex(100)).to.eql(view.slices.length - 1);
      for (let s = 0; s < view.slices.length; ++s) {
        const slice = view.slices[s];

        expect(view.findSliceIndex(slice.begin - 1)).to.eql(s - 1);
        expect(view.findSliceIndex(slice.begin)).to.eql(s);
        expect(view.findSliceIndex(slice.begin + 1)).to.eql(s);
        expect(view.findSliceIndex(slice.end - 1)).to.eql(s);
        expect(view.findSliceIndex(slice.end)).to.eql(s);
      }
    }
  });

  it('finds offsets correctly', () => {
    const four = new Uint8Array([3, 4, 5, 6]).buffer;
    const view = new PageStore();
    expect(view.findSlice(100)).to.eql(null);

    for (const offset of [2, 7, 12, 17, 22]) {
      view.addSlice(four, offset);
      expect(view.findSlice(100)).to.eql(null);
      for (const slice of view.slices) {
        expect(view.findSlice(slice.begin - 1)).to.eql(null);
        expect(view.findSlice(slice.begin)).to.eql(slice);
        expect(view.findSlice(slice.begin + 1)).to.eql(slice);
        expect(view.findSlice(slice.end - 1)).to.eql(slice);
        expect(view.findSlice(slice.end)).to.eql(null);
      }
    }
  });

  it('merges overlapping slices correctly', () => {
    {
      const view = new PageStore();
      view.addSlice([1, 2], 2);
      view.addSlice([2, 3], 3);
      expect(view.slices.length).to.eql(1);
      expect(asArray(view.slices[0])).to.deep.equal([1, 2, 3]);

      view.addSlice([0, 1, 2, 3, 4], 1);
      expect(view.slices.length).to.eql(1);
      expect(asArray(view.slices[0])).to.deep.equal([0, 1, 2, 3, 4]);
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
      expect(view.slices.length).to.eql(4);
      expect(asArray(view.slices[0])).to.deep.equal([1, 2]);
      expect(view.slices[0].begin).to.eql(2);
      expect(asArray(view.slices[1])).to.deep.equal([5, 4, 5]);
      expect(view.slices[1].begin).to.eql(5);
      expect(asArray(view.slices[2])).to.deep.equal([7, 8]);
      expect(view.slices[2].begin).to.eql(10);
      expect(asArray(view.slices[3])).to.deep.equal([10, 11]);
      expect(view.slices[3].begin).to.eql(14);
    }

    {
      const view = getView();
      // --XX--XX--XX--XX
      //       ||
      view.addSlice([4, 5], 6);
      expect(view.slices.length).to.eql(4);
      expect(asArray(view.slices[0])).to.deep.equal([1, 2]);
      expect(view.slices[0].begin).to.eql(2);
      expect(asArray(view.slices[1])).to.deep.equal([4, 5]);
      expect(view.slices[1].begin).to.eql(6);
      expect(asArray(view.slices[2])).to.deep.equal([7, 8]);
      expect(view.slices[2].begin).to.eql(10);
      expect(asArray(view.slices[3])).to.deep.equal([10, 11]);
      expect(view.slices[3].begin).to.eql(14);
    }

    {
      const view = getView();
      // --XX--XX--XX--XX
      //        ||
      view.addSlice([5, 6], 7);
      expect(view.slices.length).to.eql(4);
      expect(asArray(view.slices[0])).to.deep.equal([1, 2]);
      expect(view.slices[0].begin).to.eql(2);
      expect(asArray(view.slices[1])).to.deep.equal([4, 5, 6]);
      expect(view.slices[1].begin).to.eql(6);
      expect(asArray(view.slices[2])).to.deep.equal([7, 8]);
      expect(view.slices[2].begin).to.eql(10);
      expect(asArray(view.slices[3])).to.deep.equal([10, 11]);
      expect(view.slices[3].begin).to.eql(14);
    }

    {
      const view = getView();
      view.addSlice([20, 21], 20);
      // --XX--XX--XX--XX----XX
      //                  ||
      view.addSlice([17, 18], 17);
      expect(view.slices.length).to.eql(6);
      expect(asArray(view.slices[0])).to.deep.equal([1, 2]);
      expect(view.slices[0].begin).to.eql(2);
      expect(asArray(view.slices[1])).to.deep.equal([4, 5]);
      expect(view.slices[1].begin).to.eql(6);
      expect(asArray(view.slices[2])).to.deep.equal([7, 8]);
      expect(view.slices[2].begin).to.eql(10);
      expect(asArray(view.slices[3])).to.deep.equal([10, 11]);
      expect(view.slices[3].begin).to.eql(14);

      expect(asArray(view.slices[4])).to.deep.equal([17, 18]);
      expect(view.slices[4].begin).to.eql(17);
      expect(asArray(view.slices[5])).to.deep.equal([20, 21]);
      expect(view.slices[5].begin).to.eql(20);
    }

    {
      const view = getView();

      // --XX--XX--XX--XX
      //     |______|
      view.addSlice([0, 0, 4, 5, 0, 0, 7, 8], 4);
      expect(view.slices.length).to.eql(2);
      expect(asArray(view.slices[0])).to.deep.equal([1, 2, 0, 0, 4, 5, 0, 0, 7, 8]);
      expect(view.slices[0].begin).to.eql(2);
      expect(asArray(view.slices[1])).to.deep.equal([10, 11]);
      expect(view.slices[1].begin).to.eql(14);
    }

    {
      const view = getView();

      // --XX--XX--XX--XX
      //      |_____|
      view.addSlice([0, 4, 5, 0, 0, 7, 8], 5);
      expect(view.slices.length).to.eql(3);
      expect(asArray(view.slices[0])).to.deep.equal([1, 2]);
      expect(view.slices[0].begin).to.eql(2);
      expect(asArray(view.slices[1])).to.deep.equal([0, 4, 5, 0, 0, 7, 8]);
      expect(view.slices[1].begin).to.eql(5);
      expect(asArray(view.slices[2])).to.deep.equal([10, 11]);
      expect(view.slices[2].begin).to.eql(14);
    }

    {
      const view = getView();

      // --XX--XX--XX--XX
      //        |___|
      view.addSlice([5, 0, 0, 7, 8], 7);
      expect(view.slices.length).to.eql(3);
      expect(asArray(view.slices[0])).to.deep.equal([1, 2]);
      expect(view.slices[0].begin).to.eql(2);
      expect(asArray(view.slices[1])).to.deep.equal([4, 5, 0, 0, 7, 8]);
      expect(view.slices[1].begin).to.eql(6);
      expect(asArray(view.slices[2])).to.deep.equal([10, 11]);
      expect(view.slices[2].begin).to.eql(14);
    }

    {
      const view = getView();

      // --XX--XX--XX--XX
      //       |____|
      view.addSlice([4, 5, 0, 0, 7, 8], 6);
      expect(view.slices.length).to.eql(3);
      expect(asArray(view.slices[0])).to.deep.equal([1, 2]);
      expect(view.slices[0].begin).to.eql(2);
      expect(asArray(view.slices[1])).to.deep.equal([4, 5, 0, 0, 7, 8]);
      expect(view.slices[1].begin).to.eql(6);
      expect(asArray(view.slices[2])).to.deep.equal([10, 11]);
      expect(view.slices[2].begin).to.eql(14);
    }

    {
      const view = getView();

      // --XX--XX--XX--XX
      //       |_____|
      view.addSlice([4, 5, 0, 0, 7, 8, 0], 6);
      expect(view.slices.length).to.eql(3);
      expect(asArray(view.slices[0])).to.deep.equal([1, 2]);
      expect(view.slices[0].begin).to.eql(2);
      expect(asArray(view.slices[1])).to.deep.equal([4, 5, 0, 0, 7, 8, 0]);
      expect(view.slices[1].begin).to.eql(6);
      expect(asArray(view.slices[2])).to.deep.equal([10, 11]);
      expect(view.slices[2].begin).to.eql(14);
    }

    {
      const view = getView();

      // --XX--XX--XX--XX
      //       |______|
      view.addSlice([4, 5, 0, 0, 7, 8, 0, 0], 6);
      expect(view.slices.length).to.eql(2);
      expect(asArray(view.slices[0])).to.deep.equal([1, 2]);
      expect(view.slices[0].begin).to.eql(2);
      expect(asArray(view.slices[1])).to.deep.equal([4, 5, 0, 0, 7, 8, 0, 0, 10, 11]);
      expect(view.slices[1].begin).to.eql(6);
    }
  });
});
