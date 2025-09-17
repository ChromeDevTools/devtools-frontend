// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export interface Progress {
  totalWork: number;
  worked: number;
  title: string|undefined;
  canceled: boolean;
  done: boolean;
}

export class Progress implements Progress {
  totalWork = 0;
  worked = 0;
  title: string|undefined = undefined;
  canceled = false;
  done = false;
}

export class CompositeProgress {
  readonly parent: Progress;
  readonly #children: SubProgress[];
  #childrenDone: number;

  constructor(parent: Progress) {
    this.parent = parent;
    this.#children = [];
    this.#childrenDone = 0;
    this.parent.totalWork = 1;
    this.parent.worked = 0;
  }

  childDone(): void {
    if (++this.#childrenDone !== this.#children.length) {
      return;
    }
    this.parent.done = true;
  }

  createSubProgress(weight?: number): SubProgress {
    const child = new SubProgress(this, weight);
    this.#children.push(child);
    return child;
  }

  update(): void {
    let totalWeights = 0;
    let done = 0;

    for (let i = 0; i < this.#children.length; ++i) {
      const child = this.#children[i];
      if (child.totalWork) {
        done += child.weight * child.worked / child.totalWork;
      }
      totalWeights += child.weight;
    }
    this.parent.worked = done / totalWeights;
  }
}

export class SubProgress implements Progress {
  readonly #composite: CompositeProgress;
  #weight: number;
  #worked: number;
  #totalWork: number;
  constructor(composite: CompositeProgress, weight?: number) {
    this.#composite = composite;
    this.#weight = weight || 1;
    this.#worked = 0;

    this.#totalWork = 0;
  }

  get canceled(): boolean {
    return this.#composite.parent.canceled;
  }

  set title(title: string) {
    this.#composite.parent.title = title;
  }

  set done(done: boolean) {
    if (!done) {
      return;
    }
    this.worked = this.#totalWork;
    this.#composite.childDone();
  }

  set totalWork(totalWork: number) {
    this.#totalWork = totalWork;
    this.#composite.update();
  }

  set worked(worked: number) {
    this.#worked = worked;
    this.#composite.update();
  }

  get weight(): number {
    return this.#weight;
  }

  get worked(): number {
    return this.#worked;
  }

  get totalWork(): number {
    return this.#totalWork;
  }
}

export class ProgressProxy implements Progress {
  readonly #delegate: Progress|null|undefined;
  readonly #doneCallback: (() => void)|undefined;
  readonly #updateCallback: (() => void)|undefined;

  constructor(delegate?: Progress|null, doneCallback?: (() => void), updateCallback?: (() => void)) {
    this.#delegate = delegate;
    this.#doneCallback = doneCallback;
    this.#updateCallback = updateCallback;
  }

  get canceled(): boolean {
    return this.#delegate ? this.#delegate.canceled : false;
  }

  set title(title: string) {
    if (this.#delegate) {
      this.#delegate.title = title;
    }
    if (this.#updateCallback) {
      this.#updateCallback();
    }
  }

  get title(): string {
    return this.#delegate?.title ?? '';
  }

  set done(done: boolean) {
    if (this.#delegate) {
      this.#delegate.done = done;
    }
    if (done && this.#doneCallback) {
      this.#doneCallback();
    }
  }

  get done(): boolean {
    return this.#delegate ? this.#delegate.done : false;
  }

  set totalWork(totalWork: number) {
    if (this.#delegate) {
      this.#delegate.totalWork = totalWork;
    }
    if (this.#updateCallback) {
      this.#updateCallback();
    }
  }

  get totalWork(): number {
    return this.#delegate ? this.#delegate.totalWork : 0;
  }

  set worked(worked: number) {
    if (this.#delegate) {
      this.#delegate.worked = worked;
    }
    if (this.#updateCallback) {
      this.#updateCallback?.();
    }
  }

  get worked(): number {
    return this.#delegate ? this.#delegate.worked : 0;
  }
}
