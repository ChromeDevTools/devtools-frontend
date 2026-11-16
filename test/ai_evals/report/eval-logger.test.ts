// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import {EvalLogger} from './eval-logger.js';

describe('EvalLogger', () => {
  describe('taskLog', () => {
    it('records task logs without printing to the console by default', () => {
      const logStub = sinon.stub(console, 'log');
      try {
        const logger = new EvalLogger();

        logger.taskLog('task-1', '[Step 1/2] getStyles (1.20s)');

        sinon.assert.notCalled(logStub);
        assert.include(logger.getTaskLogContent('task-1'), '[Step 1/2] getStyles (1.20s)');
      } finally {
        logStub.restore();
      }
    });

    it('records and prints task logs when verbose is enabled', () => {
      const logStub = sinon.stub(console, 'log');
      try {
        const logger = new EvalLogger({verbose: true});

        logger.taskLog('task-1', '[Step 1/2] getStyles (1.20s)');

        sinon.assert.calledOnce(logStub);
        assert.include(String(logStub.firstCall.args[0]), 'task-1:');
        assert.include(String(logStub.firstCall.args[0]), '[Step 1/2] getStyles (1.20s)');
        assert.include(logger.getTaskLogContent('task-1'), '[Step 1/2] getStyles (1.20s)');
      } finally {
        logStub.restore();
      }
    });
  });

  describe('head', () => {
    it('always records in the run log and prints to the console', () => {
      const logStub = sinon.stub(console, 'log');
      try {
        const logger = new EvalLogger({verbose: false});

        logger.head('Running examples sequentially...');

        sinon.assert.calledOnceWithExactly(logStub, 'Running examples sequentially...');
        assert.include(logger.getRunLogContent(), 'Running examples sequentially...');
      } finally {
        logStub.restore();
      }
    });
  });

  describe('append', () => {
    it('records in the run log without printing to the console even when verbose is enabled', () => {
      const logStub = sinon.stub(console, 'log');
      try {
        const logger = new EvalLogger({verbose: true});

        logger.append('[Task task-1] Starting task');

        sinon.assert.notCalled(logStub);
        assert.include(logger.getRunLogContent(), '[Task task-1] Starting task');
      } finally {
        logStub.restore();
      }
    });
  });

  describe('taskError', () => {
    it('always records in task log and stderr and prints to console.error even when not verbose', () => {
      const errorStub = sinon.stub(console, 'error');
      try {
        const logger = new EvalLogger({verbose: false});

        logger.taskError('task-1', 'Something failed');

        sinon.assert.calledOnce(errorStub);
        assert.include(String(errorStub.firstCall.args[0]), 'task-1:');
        assert.include(String(errorStub.firstCall.args[0]), 'Something failed');
        assert.include(logger.getTaskLogContent('task-1'), '[ERROR] Something failed');
        assert.strictEqual(logger.getTaskStderrContent('task-1'), 'Something failed\n');
      } finally {
        errorStub.restore();
      }
    });
  });
});
