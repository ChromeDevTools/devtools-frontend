// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../front_end/common/common.js';

const CompositeProgress = Common.Progress.CompositeProgress;
const ProgressProxy = Common.Progress.ProgressProxy;

class MockProgressIndicator implements Common.Progress.Progress {
  private isCanceledInternal = false;
  private totalWork = 0;
  private workCompleted = 0;
  private title!: string|undefined;

  get getTitle(): string|undefined {
    return this.title;
  }

  get getWorkCompleted(): number {
    return this.workCompleted;
  }

  get getTotalWork(): number {
    return this.totalWork;
  }

  isCanceled() {
    return this.isCanceledInternal;
  }

  done() {
    return 'progress indicator: done';
  }

  setTotalWork(totalWork: number) {
    this.totalWork = totalWork;
  }

  setWorked(worked: number, title: string) {
    this.workCompleted = worked;
    if (typeof title !== 'undefined') {
      this.title = title;
    }
  }

  setTitle(title: string) {
    this.title = title;
  }

  worked(worked: number) {
    this.totalWork += worked;
  }

  // Test methods.
  cancel() {
    this.isCanceledInternal = true;
  }
}

describe('Composite Progress Bar', () => {
  it('works correctly with a single subprogress', () => {
    const indicator = new MockProgressIndicator();
    const composite = new CompositeProgress(indicator);
    const subProgress = composite.createSubProgress();

    assert.strictEqual(indicator.getTitle, undefined);
    assert.strictEqual(indicator.getWorkCompleted, 0);
    assert.strictEqual(indicator.getTotalWork, 1);

    subProgress.setTitle('cuckooing');
    subProgress.setWorked(10);
    assert.strictEqual(indicator.getTitle, 'cuckooing');
    assert.strictEqual(indicator.getWorkCompleted, 0);
    assert.strictEqual(indicator.getTotalWork, 1);

    subProgress.setTotalWork(100);
    assert.strictEqual(indicator.getTitle, 'cuckooing');
    assert.strictEqual(indicator.getWorkCompleted, 0.1);
    assert.strictEqual(indicator.getTotalWork, 1);

    subProgress.setWorked(20, 'meowing');
    assert.strictEqual(indicator.getTitle, 'meowing');
    assert.strictEqual(indicator.getWorkCompleted, 0.2);
    assert.strictEqual(indicator.getTotalWork, 1);

    subProgress.done();
    assert.strictEqual(indicator.getTitle, 'meowing');
    assert.strictEqual(indicator.getWorkCompleted, 1);
    assert.strictEqual(indicator.getTotalWork, 1);
  });

  it('works correctly with multiple subprogresses', () => {
    const indicator = new MockProgressIndicator();
    const composite = new CompositeProgress(indicator);
    // Creates a sub progress with the default weight of 1
    const subProgress1 = composite.createSubProgress();
    // Creates a sub progress with the weight of 3
    const subProgress2 = composite.createSubProgress(3);

    assert.strictEqual(indicator.getTitle, undefined);
    assert.strictEqual(indicator.getWorkCompleted, 0);
    assert.strictEqual(indicator.getTotalWork, 1);

    subProgress1.setTitle('cuckooing');
    subProgress1.setTotalWork(100);
    subProgress1.setWorked(20);
    assert.strictEqual(indicator.getTitle, 'cuckooing');
    assert.strictEqual(indicator.getWorkCompleted, 0.05);
    assert.strictEqual(indicator.getTotalWork, 1);

    subProgress2.setWorked(10);
    assert.strictEqual(indicator.getTitle, 'cuckooing');
    assert.strictEqual(indicator.getWorkCompleted, 0.05);
    assert.strictEqual(indicator.getTotalWork, 1);

    subProgress2.setTotalWork(10);
    subProgress2.setWorked(3, 'barking');
    assert.strictEqual(indicator.getTitle, 'barking');
    assert.strictEqual(indicator.getWorkCompleted, 0.275);
    assert.strictEqual(indicator.getTotalWork, 1);

    subProgress1.setWorked(50, 'meowing');
    subProgress2.setWorked(5);
    assert.strictEqual(indicator.getTitle, 'meowing');
    assert.strictEqual(indicator.getWorkCompleted, 0.5);
    assert.strictEqual(indicator.getTotalWork, 1);

    subProgress2.done();
    assert.strictEqual(indicator.getTitle, 'meowing');
    assert.strictEqual(indicator.getWorkCompleted, 0.875);
    assert.strictEqual(indicator.getTotalWork, 1);

    subProgress1.done();
    assert.strictEqual(indicator.getTitle, 'meowing');
    assert.strictEqual(indicator.getWorkCompleted, 1);
    assert.strictEqual(indicator.getTotalWork, 1);
  });

  it('returns the correct cancellation status', () => {
    const indicator = new MockProgressIndicator();
    const composite = new CompositeProgress(indicator);
    const subProgress = composite.createSubProgress();

    assert.isFalse(subProgress.isCanceled(), 'progress should not be canceled');
    indicator.cancel();
    assert.isTrue(subProgress.isCanceled(), 'progress should be canceled');
  });

  it('works correctly with nested subprogresses', () => {
    const indicator = new MockProgressIndicator();
    const composite0 = new CompositeProgress(indicator);
    const subProgress01 = composite0.createSubProgress();
    const composite1 = new CompositeProgress(subProgress01);
    const subProgress11 = composite1.createSubProgress(10);  // Weight should have no effect

    assert.strictEqual(indicator.getTitle, undefined);
    assert.strictEqual(indicator.getWorkCompleted, 0);
    assert.strictEqual(indicator.getTotalWork, 1);

    subProgress11.setWorked(10);
    assert.strictEqual(indicator.getTitle, undefined);
    assert.strictEqual(indicator.getWorkCompleted, 0);
    assert.strictEqual(indicator.getTotalWork, 1);

    subProgress11.setTotalWork(100);
    assert.strictEqual(indicator.getTitle, undefined);
    assert.strictEqual(indicator.getWorkCompleted, 0.1);
    assert.strictEqual(indicator.getTotalWork, 1);

    subProgress11.setWorked(50, 'meowing');
    assert.strictEqual(indicator.getTitle, 'meowing');
    assert.strictEqual(indicator.getWorkCompleted, 0.5);
    assert.strictEqual(indicator.getTotalWork, 1);

    assert.isFalse(subProgress11.isCanceled(), 'progress should not be canceled');
    indicator.cancel();
    assert.isTrue(subProgress11.isCanceled(), 'progress should be canceled');

    subProgress11.done();
    assert.strictEqual(indicator.getTitle, 'meowing');
    assert.strictEqual(indicator.getWorkCompleted, 1);
    assert.strictEqual(indicator.getTotalWork, 1);
  });

  it('can set sub progress to be worked', () => {
    const indicator = new MockProgressIndicator();
    const composite = new CompositeProgress(indicator);
    const subProgress = composite.createSubProgress();

    assert.strictEqual(indicator.getTitle, undefined);
    assert.strictEqual(indicator.getWorkCompleted, 0);
    assert.strictEqual(indicator.getTotalWork, 1);
    assert.strictEqual(subProgress._worked, 0);

    subProgress.worked();

    assert.strictEqual(indicator.getTitle, undefined);
    assert.strictEqual(indicator.getWorkCompleted, 0);
    assert.strictEqual(indicator.getTotalWork, 1);
    assert.strictEqual(subProgress._worked, 1);
  });

  it('returns the correct cancellation status for a progress proxy with no delegate', () => {
    const progressProxy = new ProgressProxy();
    assert.isFalse(progressProxy.isCanceled());
  });

  it('returns the correct cancellation status for a progress proxy with delegate', () => {
    const indicator = new MockProgressIndicator();
    const composite = new CompositeProgress(indicator);
    const subProgress = composite.createSubProgress();
    const progressProxy = new ProgressProxy(subProgress);

    assert.isFalse(progressProxy.isCanceled(), 'progress should not be canceled');
    indicator.cancel();
    assert.isTrue(progressProxy.isCanceled(), 'progress should be canceled');
  });

  it('returns the correct title for a progress proxy with no delegate', () => {
    const indicator = new MockProgressIndicator();
    const progressProxy = new ProgressProxy();

    progressProxy.setTitle('test proxy');
    assert.isUndefined(indicator.getTitle);
  });

  it('returns the correct title for a progress proxy with delegate', () => {
    const indicator = new MockProgressIndicator();
    const composite = new CompositeProgress(indicator);
    const subProgress = composite.createSubProgress();
    const progressProxy = new ProgressProxy(subProgress);

    progressProxy.setTitle('test proxy');
    assert.strictEqual(indicator.getTitle, 'test proxy');
  });

  it('marks a progress proxy as done', () => {
    const indicator = new MockProgressIndicator();
    const composite = new CompositeProgress(indicator);
    const subProgress = composite.createSubProgress();
    const progressProxy = new ProgressProxy(subProgress);

    progressProxy.setTotalWork(1);
    progressProxy.done();
    assert.strictEqual(subProgress._worked, 1);
  });

  it('able to set worked with title for a progress proxy', () => {
    const indicator = new MockProgressIndicator();
    const composite = new CompositeProgress(indicator);
    const subProgress = composite.createSubProgress();
    const progressProxy = new ProgressProxy(subProgress);

    progressProxy.setWorked(1, 'test proxy');
    assert.strictEqual(subProgress._worked, 1);
    assert.strictEqual(indicator.getTitle, 'test proxy');
  });

  it('able to set worked without title for a progress proxy', () => {
    const indicator = new MockProgressIndicator();
    const composite = new CompositeProgress(indicator);
    const subProgress = composite.createSubProgress();
    const progressProxy = new ProgressProxy(subProgress);

    progressProxy.worked(1);
    assert.strictEqual(subProgress._worked, 1);
  });
});
