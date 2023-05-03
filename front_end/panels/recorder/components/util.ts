// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const mod = (a: number, n: number): number => {
  return ((a % n) + n) % n;
};

export function assert<T>(
    predicate: T,
    message = 'Assertion failed!',
    ): asserts predicate {
  if (!predicate) {
    throw new Error(message);
  }
}

export type Keys<T> = T extends T ? keyof T : never;

export type RequiredKeys<T> = {
  [K in keyof T] -?: {} extends Pick<T, K>? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T] -?: {} extends Pick<T, K>? K : never;
}[keyof T];

export type DeepImmutable<T> = {
  readonly[K in keyof T]: DeepImmutable<T[K]>;
};

export type DeepMutable<T> = {
  -readonly[K in keyof T]: DeepMutable<T[K]>;
};

export type DeepPartial<T> = {
  [K in keyof T]?: DeepPartial<Exclude<T[K], undefined>>;
};

export type Mutable<T> = {
  -readonly[K in keyof T]: T[K];
};

export const deepFreeze = <T extends object>(object: T): DeepImmutable<T> => {
  for (const name of Reflect.ownKeys(object)) {
    const value = object[name as keyof T];
    if ((value && typeof value === 'object') || typeof value === 'function') {
      deepFreeze(value);
    }
  }
  return Object.freeze(object);
};

export class InsertAssignment<T> {
  value: T;
  constructor(value: T) {
    this.value = value;
  }
}

export class ArrayAssignments<T> {
  value: {[n: number]: T};
  constructor(value: {[n: number]: T}) {
    this.value = value;
  }
}

export type Assignments<T> = T extends Readonly<Array<infer R>>?
    R[]|ArrayAssignments<Assignments<R>|InsertAssignment<R>>:
    {[K in keyof T]: Assignments<T[K]>};

export const immutableDeepAssign = <T>(
    object: DeepImmutable<T>,
    assignments: DeepImmutable<DeepPartial<Assignments<T>>>,
    ): DeepImmutable<T> => {
  if (assignments instanceof ArrayAssignments) {
    assert(Array.isArray(object), `Expected an array. Got ${typeof object}.`);
    const updatedObject = [...object] as Mutable<typeof object>;
    const keys = Object.keys(assignments.value)
                     .sort(
                         (a, b) => Number(b) - Number(a),
                         ) as (keyof typeof updatedObject)[];
    for (const key of keys) {
      const update = assignments.value[Number(key)];
      if (update === undefined) {
        updatedObject.splice(Number(key), 1);
      } else if (update instanceof InsertAssignment) {
        updatedObject.splice(Number(key), 0, update.value);
      } else {
        updatedObject[Number(key)] = immutableDeepAssign(
            updatedObject[key],
            update,
        );
      }
    }
    return Object.freeze(updatedObject);
  }
  if (typeof assignments === 'object' && !Array.isArray(assignments)) {
    assert(!Array.isArray(object), 'Expected an object. Got an array.');
    const updatedObject = {...object} as Mutable<typeof object>;
    const keys = Object.keys(assignments) as (keyof typeof assignments&keyof typeof updatedObject)[];
    for (const key of keys) {
      const update = assignments[key];
      if (update === undefined) {
        delete updatedObject[key];
      } else {
        updatedObject[key] = immutableDeepAssign(
            updatedObject[key],
            update as typeof updatedObject[typeof key],
        );
      }
    }
    return Object.freeze(updatedObject);
  }
  return assignments as DeepImmutable<T>;
};
