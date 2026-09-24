// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class Semaphore {
  readonly #max: number;
  #count = 0;
  readonly #queue: Array<() => void> = [];

  constructor(max: number) {
    this.#max = max;
  }

  async acquire(): Promise<void> {
    if (this.#count < this.#max) {
      this.#count++;
      return await Promise.resolve();
    }
    return await new Promise(resolve => {
      this.#queue.push(resolve);
    });
  }

  release(): void {
    if (this.#queue.length > 0) {
      const next = this.#queue.shift();
      next?.();
    } else {
      this.#count--;
    }
  }
}

export async function withConcurrencyLimit<T>(
    tasks: Array<() => Promise<T>>,
    limit: number,
    ): Promise<T[]> {
  const semaphore = new Semaphore(limit);
  return await Promise.all(
      tasks.map(async task => {
        await semaphore.acquire();
        try {
          return await task();
        } finally {
          semaphore.release();
        }
      }),
  );
}
