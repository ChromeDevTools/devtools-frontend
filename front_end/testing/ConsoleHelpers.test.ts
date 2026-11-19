// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import {
  createConsoleLogTracker,
  expectConsoleLogs,
  type ExpectedConsoleLogs,
} from './ConsoleHelpers.js';
import {expectConsoleLogs as reExportedExpectConsoleLogs} from './EnvironmentHelpers.js';

function createFakeConsole() {
  const log = sinon.spy();
  const warn = sinon.spy();
  const error = sinon.spy();
  const fakeConsole = {log, warn, error};
  return {fakeConsole, originals: {log, warn, error}};
}

describe('ConsoleHelpers', () => {
  describe('createConsoleLogTracker', () => {
    it('records unexpected console.error and console.warn, forwards them, and throws on check', () => {
      const {fakeConsole, originals} = createFakeConsole();
      const tracker = createConsoleLogTracker(fakeConsole);

      tracker.startTracking();
      fakeConsole.error('boom', 123);
      fakeConsole.warn('careful');

      sinon.assert.calledOnceWithExactly(originals.error, 'boom', 123);
      sinon.assert.calledOnceWithExactly(originals.warn, 'careful');
      assert.throws(() => tracker.checkForUnexpectedLogs('my test'),
                    /my test[\s\S]*2 unexpected[\s\S]*console\.error: boom 123[\s\S]*console\.warn: careful/);
      tracker.stopTracking();
    });

    it('includes a call-site stack trace in the unexpected log error', () => {
      const {fakeConsole} = createFakeConsole();
      const tracker = createConsoleLogTracker(fakeConsole);
      function triggerUnexpectedError(): void {
        fakeConsole.error('traced boom');
      }

      tracker.startTracking();
      triggerUnexpectedError();

      assert.throws(() => tracker.checkForUnexpectedLogs('stack test'), /triggerUnexpectedError/);
      tracker.stopTracking();
    });

    it('forwards console.log to original and does not fail checkForUnexpectedLogs', () => {
      const {fakeConsole, originals} = createFakeConsole();
      const tracker = createConsoleLogTracker(fakeConsole);

      tracker.startTracking();
      fakeConsole.log('hello', 'world');

      sinon.assert.calledOnceWithExactly(originals.log, 'hello', 'world');
      assert.doesNotThrow(() => tracker.checkForUnexpectedLogs('clean test'));
      tracker.stopTracking();
    });

    it('formats Error objects, Symbols, null, undefined, and null-prototype objects safely', () => {
      const {fakeConsole, originals} = createFakeConsole();
      const tracker = createConsoleLogTracker(fakeConsole);
      const nullProto = Object.assign(Object.create(null), {a: 1});
      const err = new Error('bad');
      const sym = Symbol('sym');

      tracker.startTracking();
      fakeConsole.error(err, sym, null, undefined, nullProto);

      sinon.assert.calledOnceWithExactly(originals.error, err, sym, null, undefined, nullProto);
      assert.throws(() => tracker.checkForUnexpectedLogs('format test'),
                    /console\.error: Error: bad Symbol\(sym\) {3}\[object Object\]/);
      tracker.stopTracking();
    });

    it('allows sinon.stub to intercept calls without failing, and resumes catching after restore', () => {
      const {fakeConsole, originals} = createFakeConsole();
      const tracker = createConsoleLogTracker(fakeConsole);

      tracker.startTracking();
      const stub = sinon.stub(fakeConsole, 'error');
      fakeConsole.error('stubbed error');

      sinon.assert.calledOnceWithExactly(stub, 'stubbed error');
      sinon.assert.notCalled(originals.error);
      assert.doesNotThrow(() => tracker.checkForUnexpectedLogs('stubbed test'));

      stub.restore();
      fakeConsole.error('un-stubbed error');

      sinon.assert.calledOnceWithExactly(originals.error, 'un-stubbed error');
      assert.throws(() => tracker.checkForUnexpectedLogs('after restore'), /un-stubbed error/);
      tracker.stopTracking();
    });

    it('allows sinon.spy to observe calls while still catching unexpected ones', () => {
      const {fakeConsole, originals} = createFakeConsole();
      const tracker = createConsoleLogTracker(fakeConsole);

      tracker.startTracking();
      const spy = sinon.spy(fakeConsole, 'error');
      fakeConsole.error('spied error');

      sinon.assert.calledOnceWithExactly(spy, 'spied error');
      sinon.assert.calledOnceWithExactly(originals.error, 'spied error');
      assert.throws(() => tracker.checkForUnexpectedLogs('spied test'), /spied error/);
      tracker.stopTracking();
    });

    it('stopTracking clears recorded logs and unconditionally restores originals', () => {
      const {fakeConsole, originals} = createFakeConsole();
      const tracker = createConsoleLogTracker(fakeConsole);

      tracker.startTracking();
      fakeConsole.error('before stop');
      fakeConsole.warn = sinon.spy();
      tracker.stopTracking();

      assert.strictEqual(fakeConsole.error, originals.error);
      assert.strictEqual(fakeConsole.warn, originals.warn);
      assert.strictEqual(fakeConsole.log, originals.log);
      assert.doesNotThrow(() => tracker.checkForUnexpectedLogs('after stop'));
    });
  });

  describe('expectConsoleLogs', () => {
    const outerExpected: ExpectedConsoleLogs = {
      error: ['outer error'],
      log: ['outer log'],
    };
    expectConsoleLogs(outerExpected);

    it('re-exports expectConsoleLogs from EnvironmentHelpers', () => {
      assert.strictEqual(reExportedExpectConsoleLogs, expectConsoleLogs);
    });

    it('suppresses outer expected logs while catching non-matching ones', () => {
      const {fakeConsole, originals} = createFakeConsole();
      const tracker = createConsoleLogTracker(fakeConsole);

      tracker.startTracking();
      const spy = sinon.spy(fakeConsole, 'error');
      fakeConsole.error('outer error');
      fakeConsole.log('outer log');

      sinon.assert.calledOnceWithExactly(spy, 'outer error');
      sinon.assert.notCalled(originals.error);
      sinon.assert.notCalled(originals.log);
      assert.doesNotThrow(() => tracker.checkForUnexpectedLogs('outer'));

      fakeConsole.error('unexpected error');
      sinon.assert.calledOnceWithExactly(originals.error, 'unexpected error');
      assert.throws(() => tracker.checkForUnexpectedLogs('outer'), /unexpected error/);
      tracker.stopTracking();
    });

    describe('nested suite', () => {
      expectConsoleLogs({
        error: ['inner error'],
        warn: ['inner warn'],
      });

      it('merges outer and inner expected logs', () => {
        const {fakeConsole, originals} = createFakeConsole();
        const tracker = createConsoleLogTracker(fakeConsole);

        tracker.startTracking();
        fakeConsole.error('outer error');
        fakeConsole.error('inner error');
        fakeConsole.warn('inner warn');

        sinon.assert.notCalled(originals.error);
        sinon.assert.notCalled(originals.warn);
        assert.doesNotThrow(() => tracker.checkForUnexpectedLogs('inner'));
        tracker.stopTracking();
      });
    });

    describe('after nested suite', () => {
      it('retains outer expectations after inner suite finishes', () => {
        const {fakeConsole, originals} = createFakeConsole();
        const tracker = createConsoleLogTracker(fakeConsole);

        tracker.startTracking();
        fakeConsole.error('outer error');
        sinon.assert.notCalled(originals.error);
        assert.doesNotThrow(() => tracker.checkForUnexpectedLogs('after inner'));

        fakeConsole.error('inner error');
        fakeConsole.warn('inner warn');
        sinon.assert.calledOnceWithExactly(originals.error, 'inner error');
        sinon.assert.calledOnceWithExactly(originals.warn, 'inner warn');
        assert.throws(() => tracker.checkForUnexpectedLogs('after inner'),
                      /2 unexpected[\s\S]*inner error[\s\S]*inner warn/);
        tracker.stopTracking();
      });
    });
  });
});
