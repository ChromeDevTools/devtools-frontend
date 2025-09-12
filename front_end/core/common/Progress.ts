// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class Progress {
  setTotalWork(_totalWork: number): void {
  }
  setTitle(_title: string): void {
  }
  setWorked(_worked: number, _title?: string): void {
  }
  incrementWorked(_worked?: number): void {
  }
  done(): void {
  }
  isCanceled(): boolean {
    return false;
  }
}

export class CompositeProgress {
  readonly parent: Progress;
  readonly #children: SubProgress[];
  #childrenDone: number;

  constructor(parent: Progress) {
    this.parent = parent;
    this.#children = [];
    this.#childrenDone = 0;
    this.parent.setTotalWork(1);
    this.parent.setWorked(0);
  }

  childDone(): void {
    if (++this.#childrenDone !== this.#children.length) {
      return;
    }
    this.parent.done();
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
      if (child.getTotalWork()) {
        done += child.getWeight() * child.getWorked() / child.getTotalWork();
      }
      totalWeights += child.getWeight();
    }
    this.parent.setWorked(done / totalWeights);
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

  isCanceled(): boolean {
    return this.#composite.parent.isCanceled();
  }

  setTitle(title: string): void {
    this.#composite.parent.setTitle(title);
  }

  done(): void {
    this.setWorked(this.#totalWork);
    this.#composite.childDone();
  }

  setTotalWork(totalWork: number): void {
    this.#totalWork = totalWork;
    this.#composite.update();
  }

  setWorked(worked: number, title?: string): void {
    this.#worked = worked;
    if (typeof title !== 'undefined') {
      this.setTitle(title);
    }
    this.#composite.update();
  }

  incrementWorked(worked?: number): void {
    this.setWorked(this.#worked + (worked || 1));
  }

  getWeight(): number {
    return this.#weight;
  }

  getWorked(): number {
    return this.#worked;
  }

  getTotalWork(): number {
    return this.#totalWork;
  }
}

export class ProgressProxy implements Progress {
  readonly #delegate: Progress|null|undefined;
  readonly #doneCallback: (() => void)|undefined;
  constructor(delegate?: Progress|null, doneCallback?: (() => void)) {
    this.#delegate = delegate;
    this.#doneCallback = doneCallback;
  }

  isCanceled(): boolean {
    return this.#delegate ? this.#delegate.isCanceled() : false;
  }

  setTitle(title: string): void {
    if (this.#delegate) {
      this.#delegate.setTitle(title);
    }
  }

  done(): void {
    if (this.#delegate) {
      this.#delegate.done();
    }
    if (this.#doneCallback) {
      this.#doneCallback();
    }
  }

  setTotalWork(totalWork: number): void {
    if (this.#delegate) {
      this.#delegate.setTotalWork(totalWork);
    }
  }

  setWorked(worked: number, title?: string): void {
    if (this.#delegate) {
      this.#delegate.setWorked(worked, title);
    }
  }

  incrementWorked(worked?: number): void {
    if (this.#delegate) {
      this.#delegate.incrementWorked(worked);
    }
  }
}
