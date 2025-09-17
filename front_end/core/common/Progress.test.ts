// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from './common.js';

const Progress = Common.Progress.Progress;
const CompositeProgress = Common.Progress.CompositeProgress;
const ProgressProxy = Common.Progress.ProgressProxy;

describe('Composite Progress Bar', () => {
  it('works correctly with a single subprogress', () => {
    const indicator = new Progress();
    const composite = new CompositeProgress(indicator);
    const subProgress = composite.createSubProgress();

    assert.isUndefined(indicator.title);
    assert.strictEqual(indicator.worked, 0);
    assert.strictEqual(indicator.totalWork, 1);

    subProgress.title = 'cuckooing';
    subProgress.worked = 10;
    assert.strictEqual(indicator.title, 'cuckooing');
    assert.strictEqual(indicator.worked, 0);
    assert.strictEqual(indicator.totalWork, 1);

    subProgress.totalWork = 100;
    assert.strictEqual(indicator.title, 'cuckooing');
    assert.strictEqual(indicator.worked, 0.1);
    assert.strictEqual(indicator.totalWork, 1);

    subProgress.worked = 20;
    subProgress.title = 'meowing';
    assert.strictEqual(indicator.title, 'meowing');
    assert.strictEqual(indicator.worked, 0.2);
    assert.strictEqual(indicator.totalWork, 1);

    subProgress.done = true;
    assert.strictEqual(indicator.title, 'meowing');
    assert.strictEqual(indicator.worked, 1);
    assert.strictEqual(indicator.totalWork, 1);
  });

  it('works correctly with multiple subprogresses', () => {
    const indicator = new Progress();
    const composite = new CompositeProgress(indicator);
    // Creates a sub progress with the default weight of 1
    const subProgress1 = composite.createSubProgress();
    // Creates a sub progress with the weight of 3
    const subProgress2 = composite.createSubProgress(3);

    assert.isUndefined(indicator.title);
    assert.strictEqual(indicator.worked, 0);
    assert.strictEqual(indicator.totalWork, 1);

    subProgress1.title = 'cuckooing';
    subProgress1.totalWork = 100;
    subProgress1.worked = 20;
    assert.strictEqual(indicator.title, 'cuckooing');
    assert.strictEqual(indicator.worked, 0.05);
    assert.strictEqual(indicator.totalWork, 1);

    subProgress2.worked = 10;
    assert.strictEqual(indicator.title, 'cuckooing');
    assert.strictEqual(indicator.worked, 0.05);
    assert.strictEqual(indicator.totalWork, 1);

    subProgress2.totalWork = 10;
    subProgress2.worked = 3;
    subProgress2.title = 'barking';
    assert.strictEqual(indicator.title, 'barking');
    assert.strictEqual(indicator.worked, 0.275);
    assert.strictEqual(indicator.totalWork, 1);

    subProgress1.worked = 50;
    subProgress1.title = 'meowing';
    subProgress2.worked = 5;
    assert.strictEqual(indicator.title, 'meowing');
    assert.strictEqual(indicator.worked, 0.5);
    assert.strictEqual(indicator.totalWork, 1);

    subProgress2.done = true;
    assert.strictEqual(indicator.title, 'meowing');
    assert.strictEqual(indicator.worked, 0.875);
    assert.strictEqual(indicator.totalWork, 1);

    subProgress1.done = true;
    assert.strictEqual(indicator.title, 'meowing');
    assert.strictEqual(indicator.worked, 1);
    assert.strictEqual(indicator.totalWork, 1);
  });

  it('returns the correct cancellation status', () => {
    const indicator = new Progress();
    const composite = new CompositeProgress(indicator);
    const subProgress = composite.createSubProgress();

    assert.isFalse(subProgress.canceled, 'progress should not be canceled');
    indicator.canceled = true;
    assert.isTrue(subProgress.canceled, 'progress should be canceled');
  });

  it('works correctly with nested subprogresses', () => {
    const indicator = new Progress();
    const composite0 = new CompositeProgress(indicator);
    const subProgress01 = composite0.createSubProgress();
    const composite1 = new CompositeProgress(subProgress01);
    const subProgress11 = composite1.createSubProgress(10);  // Weight should have no effect

    assert.isUndefined(indicator.title);
    assert.strictEqual(indicator.worked, 0);
    assert.strictEqual(indicator.totalWork, 1);

    subProgress11.worked = 10;
    assert.isUndefined(indicator.title);
    assert.strictEqual(indicator.worked, 0);
    assert.strictEqual(indicator.totalWork, 1);

    subProgress11.totalWork = 100;
    assert.isUndefined(indicator.title);
    assert.strictEqual(indicator.worked, 0.1);
    assert.strictEqual(indicator.totalWork, 1);

    subProgress11.worked = 50;
    subProgress11.title = 'meowing';
    assert.strictEqual(indicator.title, 'meowing');
    assert.strictEqual(indicator.worked, 0.5);
    assert.strictEqual(indicator.totalWork, 1);

    assert.isFalse(subProgress11.canceled, 'progress should not be canceled');
    indicator.canceled = true;
    assert.isTrue(subProgress11.canceled, 'progress should be canceled');

    subProgress11.done = true;
    assert.strictEqual(indicator.title, 'meowing');
    assert.strictEqual(indicator.worked, 1);
    assert.strictEqual(indicator.totalWork, 1);
  });

  it('can set sub progress to be worked', () => {
    const indicator = new Progress();
    const composite = new CompositeProgress(indicator);
    const subProgress = composite.createSubProgress();

    assert.isUndefined(indicator.title);
    assert.strictEqual(indicator.worked, 0);
    assert.strictEqual(indicator.totalWork, 1);
    assert.strictEqual(subProgress.worked, 0);

    ++subProgress.worked;

    assert.isUndefined(indicator.title);
    assert.strictEqual(indicator.worked, 0);
    assert.strictEqual(indicator.totalWork, 1);
    assert.strictEqual(subProgress.worked, 1);
  });

  it('returns the correct cancellation status for a progress proxy with no delegate', () => {
    const progressProxy = new ProgressProxy();
    assert.isFalse(progressProxy.canceled);
  });

  it('returns the correct cancellation status for a progress proxy with delegate', () => {
    const indicator = new Progress();
    const composite = new CompositeProgress(indicator);
    const subProgress = composite.createSubProgress();
    const progressProxy = new ProgressProxy(subProgress);

    assert.isFalse(progressProxy.canceled, 'progress should not be canceled');
    indicator.canceled = true;
    assert.isTrue(progressProxy.canceled, 'progress should be canceled');
  });

  it('returns the correct title for a progress proxy with no delegate', () => {
    const indicator = new Progress();
    const progressProxy = new ProgressProxy();

    progressProxy.title = 'test proxy';
    assert.isUndefined(indicator.title);
  });

  it('returns the correct title for a progress proxy with delegate', () => {
    const indicator = new Progress();
    const composite = new CompositeProgress(indicator);
    const subProgress = composite.createSubProgress();
    const progressProxy = new ProgressProxy(subProgress);

    progressProxy.title = 'test proxy';
    assert.strictEqual(indicator.title, 'test proxy');
  });

  it('marks a progress proxy as done', () => {
    const indicator = new Progress();
    const composite = new CompositeProgress(indicator);
    const subProgress = composite.createSubProgress();
    const progressProxy = new ProgressProxy(subProgress);

    progressProxy.totalWork = 1;
    progressProxy.done = true;
    assert.strictEqual(subProgress.worked, 1);
  });

  it('able to set worked with title for a progress proxy', () => {
    const indicator = new Progress();
    const composite = new CompositeProgress(indicator);
    const subProgress = composite.createSubProgress();
    const progressProxy = new ProgressProxy(subProgress);

    progressProxy.worked = 1;
    progressProxy.title = 'test proxy';
    assert.strictEqual(subProgress.worked, 1);
    assert.strictEqual(indicator.title, 'test proxy');
  });

  it('able to set worked without title for a progress proxy', () => {
    const indicator = new Progress();
    const composite = new CompositeProgress(indicator);
    const subProgress = composite.createSubProgress();
    const progressProxy = new ProgressProxy(subProgress);

    ++progressProxy.worked;
    assert.strictEqual(subProgress.worked, 1);
  });
});
