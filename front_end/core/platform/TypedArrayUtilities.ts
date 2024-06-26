// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * An object which provides functionality similar to Uint32Array. It may be
 * implemented as:
 * 1. A Uint32Array,
 * 2. An array of Uint32Arrays, to support more data than Uint32Array, or
 * 3. A plain array, in which case the length may change by setting values.
 */
export interface BigUint32Array {
  get length(): number;
  getValue(index: number): number;
  setValue(index: number, value: number): void;
  asUint32ArrayOrFail(): Uint32Array;
  asArrayOrFail(): number[];
}

/**
 * @returns A BigUint32Array implementation which is based on Array.
 * This means that its length automatically expands to include the highest index
 * used, and asArrayOrFail will succeed.
 */
export function createExpandableBigUint32Array(): BigUint32Array {
  return new ExpandableBigUint32ArrayImpl();
}

/**
 * @returns A BigUint32Array implementation which is based on Uint32Array.
 * If the length is small enough to fit in a single Uint32Array, then
 * asUint32ArrayOrFail will succeed. Otherwise, it will throw an exception.
 */
export function createFixedBigUint32Array(length: number, maxLengthForTesting?: number): BigUint32Array {
  try {
    if (maxLengthForTesting !== undefined && length > maxLengthForTesting) {
      // Simulate allocation failure.
      throw new RangeError();
    }
    return new BasicBigUint32ArrayImpl(length);
  } catch {
    // We couldn't allocate a big enough ArrayBuffer.
    return new SplitBigUint32ArrayImpl(length, maxLengthForTesting);
  }
}

class BasicBigUint32ArrayImpl extends Uint32Array implements BigUint32Array {
  getValue(index: number): number {
    return this[index];
  }
  setValue(index: number, value: number): void {
    this[index] = value;
  }
  asUint32ArrayOrFail(): Uint32Array {
    return this;
  }
  asArrayOrFail(): number[] {
    throw new Error('Not an array');
  }
}

class SplitBigUint32ArrayImpl implements BigUint32Array {
  #data: Uint32Array[];
  #partLength: number;
  length: number;

  constructor(length: number, maxLengthForTesting?: number) {
    this.#data = [];
    this.length = length;
    let partCount = 1;
    while (true) {
      partCount *= 2;
      this.#partLength = Math.ceil(length / partCount);
      try {
        if (maxLengthForTesting !== undefined && this.#partLength > maxLengthForTesting) {
          // Simulate allocation failure.
          throw new RangeError();
        }
        for (let i = 0; i < partCount; ++i) {
          this.#data[i] = new Uint32Array(this.#partLength);
        }
        return;
      } catch (e) {
        if (this.#partLength < 1e6) {
          // The length per part is already small, so continuing to subdivide it
          // will probably not help.
          throw e;
        }
      }
    }
  }

  getValue(index: number): number {
    if (index >= 0 && index < this.length) {
      const partLength = this.#partLength;
      return this.#data[Math.floor(index / partLength)][index % partLength];
    }
    // On out-of-bounds accesses, match the behavior of Uint32Array: return an
    // undefined value that's incorrectly typed as number.
    return this.#data[0][-1];
  }

  setValue(index: number, value: number): void {
    if (index >= 0 && index < this.length) {
      const partLength = this.#partLength;
      this.#data[Math.floor(index / partLength)][index % partLength] = value;
    }
    // Attempting to set a value out of bounds does nothing, like Uint32Array.
  }

  asUint32ArrayOrFail(): Uint32Array {
    throw new Error('Not a Uint32Array');
  }
  asArrayOrFail(): number[] {
    throw new Error('Not an array');
  }
}

class ExpandableBigUint32ArrayImpl extends Array<number> implements BigUint32Array {
  getValue(index: number): number {
    return this[index];
  }
  setValue(index: number, value: number): void {
    this[index] = value;
  }
  asUint32ArrayOrFail(): Uint32Array {
    throw new Error('Not a Uint32Array');
  }
  asArrayOrFail(): number[] {
    return this;
  }
}

export interface BitVector {
  getBit(index: number): boolean;
  setBit(index: number): void;
  clearBit(index: number): void;
  // Returns the last bit before `index` which is set, or -1 if there are none.
  previous(index: number): number;
}

export function createBitVector(length: number): BitVector {
  return new BitVectorImpl(length);
}

class BitVectorImpl extends Uint8Array {
  constructor(length: number) {
    super(Math.ceil(length / 8));
  }
  getBit(index: number): boolean {
    const value = this[index >> 3] & (1 << (index & 7));
    return value !== 0;
  }
  setBit(index: number): void {
    this[index >> 3] |= (1 << (index & 7));
  }
  clearBit(index: number): void {
    this[index >> 3] &= ~(1 << (index & 7));
  }
  previous(index: number): number {
    // First, check for more bits in the current byte.
    while (index !== ((index >> 3) << 3)) {
      --index;
      if (this.getBit(index)) {
        return index;
      }
    }
    // Next, iterate by bytes to skip over ranges of zeros.
    let byteIndex: number;
    for (byteIndex = (index >> 3) - 1; byteIndex >= 0 && this[byteIndex] === 0; --byteIndex) {
    }
    if (byteIndex < 0) {
      return -1;
    }
    // Finally, iterate the nonzero byte to find the highest bit.
    for (index = (byteIndex << 3) + 7; index >= (byteIndex << 3); --index) {
      if (this.getBit(index)) {
        return index;
      }
    }
    throw new Error('Unreachable');
  }
}
