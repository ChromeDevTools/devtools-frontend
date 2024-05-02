/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

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
