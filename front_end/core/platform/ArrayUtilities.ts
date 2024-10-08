// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const removeElement = <T>(array: T[], element: T, firstOnly?: boolean): boolean => {
  let index = array.indexOf(element);
  if (index === -1) {
    return false;
  }
  if (firstOnly) {
    array.splice(index, 1);
    return true;
  }
  for (let i = index + 1, n = array.length; i < n; ++i) {
    if (array[i] !== element) {
      array[index++] = array[i];
    }
  }
  array.length = index;
  return true;
};

type NumberComparator = (a: number, b: number) => number;

function swap(array: number[], i1: number, i2: number): void {
  const temp = array[i1];
  array[i1] = array[i2];
  array[i2] = temp;
}

function partition(
    array: number[], comparator: NumberComparator, left: number, right: number, pivotIndex: number): number {
  const pivotValue = array[pivotIndex];
  swap(array, right, pivotIndex);
  let storeIndex = left;
  for (let i = left; i < right; ++i) {
    if (comparator(array[i], pivotValue) < 0) {
      swap(array, storeIndex, i);
      ++storeIndex;
    }
  }
  swap(array, right, storeIndex);
  return storeIndex;
}

function quickSortRange(
    array: number[], comparator: NumberComparator, left: number, right: number, sortWindowLeft: number,
    sortWindowRight: number): void {
  if (right <= left) {
    return;
  }
  const pivotIndex = Math.floor(Math.random() * (right - left)) + left;
  const pivotNewIndex = partition(array, comparator, left, right, pivotIndex);
  if (sortWindowLeft < pivotNewIndex) {
    quickSortRange(array, comparator, left, pivotNewIndex - 1, sortWindowLeft, sortWindowRight);
  }
  if (pivotNewIndex < sortWindowRight) {
    quickSortRange(array, comparator, pivotNewIndex + 1, right, sortWindowLeft, sortWindowRight);
  }
}

export function sortRange(
    array: number[], comparator: NumberComparator, leftBound: number, rightBound: number, sortWindowLeft: number,
    sortWindowRight: number): number[] {
  if (leftBound === 0 && rightBound === (array.length - 1) && sortWindowLeft === 0 && sortWindowRight >= rightBound) {
    array.sort(comparator);
  } else {
    quickSortRange(array, comparator, leftBound, rightBound, sortWindowLeft, sortWindowRight);
  }
  return array;
}
export const binaryIndexOf = <T, S>(array: T[], value: S, comparator: (a: S, b: T) => number): number => {
  const index = lowerBound(array, value, comparator);
  return index < array.length && comparator(value, array[index]) === 0 ? index : -1;
};

function mergeOrIntersect<T>(
    array1: T[], array2: T[], comparator: (a: T, b: T) => number, mergeNotIntersect: boolean): T[] {
  const result = [];
  let i = 0;
  let j = 0;
  while (i < array1.length && j < array2.length) {
    const compareValue = comparator(array1[i], array2[j]);
    if (mergeNotIntersect || !compareValue) {
      result.push(compareValue <= 0 ? array1[i] : array2[j]);
    }
    if (compareValue <= 0) {
      i++;
    }
    if (compareValue >= 0) {
      j++;
    }
  }
  if (mergeNotIntersect) {
    while (i < array1.length) {
      result.push(array1[i++]);
    }
    while (j < array2.length) {
      result.push(array2[j++]);
    }
  }
  return result;
}

export const intersectOrdered = <T>(array1: T[], array2: T[], comparator: (a: T, b: T) => number): T[] => {
  return mergeOrIntersect(array1, array2, comparator, false);
};

export const mergeOrdered = <T>(array1: T[], array2: T[], comparator: (a: T, b: T) => number): T[] => {
  return mergeOrIntersect(array1, array2, comparator, true);
};

export const DEFAULT_COMPARATOR = (a: string|number, b: string|number): -1|0|1 => {
  return a < b ? -1 : (a > b ? 1 : 0);
};

/**
 * Returns the index of the element closest to the needle that is equal to or
 * greater than it. Assumes that the provided array is sorted.
 *
 * If no element is found, the right bound is returned.
 *
 * Uses the provided comparator function to determine if two items are equal or
 * if one is greater than the other. If you are working with strings or
 * numbers, you can use ArrayUtilities.DEFAULT_COMPARATOR. Otherwise, you
 * should define one that takes the needle element and an element from the
 * array and returns a positive or negative number to indicate which is greater
 * than the other.
 *
 * When specified, |left| (inclusive) and |right| (exclusive) indices
 * define the search window.
 */
export function lowerBound<T>(
    array: Uint32Array|Int32Array, needle: T, comparator: (needle: T, b: number) => number, left?: number,
    right?: number): number;
export function lowerBound<S, T>(
    array: S[], needle: T, comparator: (needle: T, b: S) => number, left?: number, right?: number): number;
export function lowerBound<S, T>(
    array: readonly S[], needle: T, comparator: (needle: T, b: S) => number, left?: number, right?: number): number;
export function lowerBound<S, T, A extends S[]>(
    array: A, needle: T, comparator: (needle: T, b: S) => number, left?: number, right?: number): number {
  let l = left || 0;
  let r = right !== undefined ? right : array.length;
  while (l < r) {
    const m = (l + r) >> 1;
    if (comparator(needle, array[m]) > 0) {
      l = m + 1;
    } else {
      r = m;
    }
  }
  return r;
}

/**
 * Returns the index of the element closest to the needle that is greater than
 * it. Assumes that the provided array is sorted.
 *
 * If no element is found, the right bound is returned.
 *
 * Uses the provided comparator function to determine if two items are equal or
 * if one is greater than the other. If you are working with strings or
 * numbers, you can use ArrayUtilities.DEFAULT_COMPARATOR. Otherwise, you
 * should define one that takes the needle element and an element from the
 * array and returns a positive or negative number to indicate which is greater
 * than the other.
 *
 * When specified, |left| (inclusive) and |right| (exclusive) indices
 * define the search window.
 */
export function upperBound<T>(
    array: Uint32Array, needle: T, comparator: (needle: T, b: number) => number, left?: number, right?: number): number;
export function upperBound<S, T>(
    array: S[], needle: T, comparator: (needle: T, b: S) => number, left?: number, right?: number): number;
export function upperBound<S, T, A extends S[]>(
    array: A, needle: T, comparator: (needle: T, b: S) => number, left?: number, right?: number): number {
  let l = left || 0;
  let r = right !== undefined ? right : array.length;
  while (l < r) {
    const m = (l + r) >> 1;
    if (comparator(needle, array[m]) >= 0) {
      l = m + 1;
    } else {
      r = m;
    }
  }
  return r;
}

const enum NearestSearchStart {
  BEGINNING = 'BEGINNING',
  END = 'END',
}
/**
 * Obtains the first or last item in the array that satisfies the predicate function.
 * So, for example, if the array were arr = [2, 4, 6, 8, 10], and you are looking for
 * the last item arr[i] such that arr[i] < 5  you would be returned 1, because
 * array[1] is 4, the last item in the array that satisfies the
 * predicate function.
 *
 * If instead you were looking for the first item in the same array that satisfies
 * arr[i] > 5 you would be returned 2 because array[2] = 6.
 *
 * Please note: this presupposes that the array is already ordered.
 * This function uses a variation of Binary Search.
 */
function nearestIndex<T>(
    arr: readonly T[], predicate: (arrayItem: T) => boolean, searchStart: NearestSearchStart): number|null {
  const searchFromEnd = searchStart === NearestSearchStart.END;
  if (arr.length === 0) {
    return null;
  }

  let left = 0;
  let right = arr.length - 1;
  let pivot = 0;
  let matchesPredicate = false;
  let moveToTheRight = false;
  let middle = 0;
  do {
    middle = left + (right - left) / 2;
    pivot = searchFromEnd ? Math.ceil(middle) : Math.floor(middle);
    matchesPredicate = predicate(arr[pivot]);
    moveToTheRight = matchesPredicate === searchFromEnd;
    if (moveToTheRight) {
      left = Math.min(right, pivot + (left === pivot ? 1 : 0));
    } else {
      right = Math.max(left, pivot + (right === pivot ? -1 : 0));
    }
  } while (right !== left);

  // Special-case: the indexed item doesn't pass the predicate. This
  // occurs when none of the items in the array are a match for the
  // predicate.
  if (!predicate(arr[left])) {
    return null;
  }
  return left;
}

/**
 * Obtains the first item in the array that satisfies the predicate function.
 * So, for example, if the array was arr = [2, 4, 6, 8, 10], and you are looking for
 * the first item arr[i] such that arr[i] > 5 you would be returned 2, because
 * array[2] is 6, the first item in the array that satisfies the
 * predicate function.
 *
 * Please note: this presupposes that the array is already ordered.
 */
export function nearestIndexFromBeginning<T>(arr: T[], predicate: (arrayItem: T) => boolean): number|null {
  return nearestIndex(arr, predicate, NearestSearchStart.BEGINNING);
}

/**
 * Obtains the last item in the array that satisfies the predicate function.
 * So, for example, if the array was arr = [2, 4, 6, 8, 10], and you are looking for
 * the last item arr[i] such that arr[i] < 5 you would be returned 1, because
 * arr[1] is 4, the last item in the array that satisfies the
 * predicate function.
 *
 * Please note: this presupposes that the array is already ordered.
 */

export function nearestIndexFromEnd<T>(arr: readonly T[], predicate: (arrayItem: T) => boolean): number|null {
  return nearestIndex(arr, predicate, NearestSearchStart.END);
}

// Type guard for ensuring that `arr` does not contain null or undefined
export function arrayDoesNotContainNullOrUndefined<T>(arr: (T|null|undefined)[]): arr is T[] {
  return !arr.includes(null) && !arr.includes(undefined);
}
