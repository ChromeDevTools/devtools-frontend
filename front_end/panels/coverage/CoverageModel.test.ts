// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as TextUtils from '../../core/text_utils/text_utils.js';
import type * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as Coverage from './coverage.js';

const {urlString} = Platform.DevToolsPath;

describe('CoverageModel', () => {
  describe('CoverageInfo', () => {
    describe('#rangesForExport', () => {
      it('omits ranges with count of zero', () => {
        const segments =
            [{end: 10, count: 0, stamp: 100}, {end: 20, count: 2, stamp: 100}, {end: 30, count: 0, stamp: 100}];
        const info = new Coverage.CoverageModel.CoverageInfo(
            null as unknown as TextUtils.ContentProvider.ContentProvider, 100, 10, 20,
            Coverage.CoverageModel.CoverageType.JAVA_SCRIPT, {} as unknown as Coverage.CoverageModel.URLCoverageInfo);
        info.mergeCoverage(segments);
        const ranges = info.rangesForExport();
        assert.deepEqual(ranges, [{start: 10, end: 20}]);
      });

      it('merges consecutive ranges with different non-zero counts', () => {
        const segments =
            [{end: 10, count: 0, stamp: 100}, {end: 20, count: 2, stamp: 100}, {end: 30, count: 1, stamp: 100}];
        const info = new Coverage.CoverageModel.CoverageInfo(
            null as unknown as TextUtils.ContentProvider.ContentProvider, 100, 10, 20,
            Coverage.CoverageModel.CoverageType.JAVA_SCRIPT, {} as unknown as Coverage.CoverageModel.URLCoverageInfo);
        info.mergeCoverage(segments);
        const ranges = info.rangesForExport();
        assert.deepEqual(ranges, [{start: 10, end: 30}]);
      });

      it('does not merge a range with a consecutive range with count zero', () => {
        const segments = [{end: 10, count: 1, stamp: 100}, {end: 30, count: 0, stamp: 100}];
        const info = new Coverage.CoverageModel.CoverageInfo(
            null as unknown as TextUtils.ContentProvider.ContentProvider, 100, 10, 20,
            Coverage.CoverageModel.CoverageType.JAVA_SCRIPT, {} as unknown as Coverage.CoverageModel.URLCoverageInfo);
        info.mergeCoverage(segments);
        const ranges = info.rangesForExport();
        assert.deepEqual(ranges, [{start: 0, end: 10}]);
      });
    });
  });

  describe('CoverageModel', () => {
    describe('mergeSegments', () => {
      const checkMerge =
          (a: Coverage.CoverageModel.CoverageSegment[], b: Coverage.CoverageModel.CoverageSegment[],
           expectedResult: Coverage.CoverageModel.CoverageSegment[]) => {
            const mergedAB = Coverage.CoverageModel.mergeSegments(a, b);
            assert.deepEqual(mergedAB, expectedResult);
            const mergedBA = Coverage.CoverageModel.mergeSegments(b, a);
            assert.deepEqual(mergedBA, expectedResult);
          };

      it('merges coverage segments with the same timestamp correctly', () => {
        checkMerge([], [], []);
        checkMerge([{end: 10, count: 1, stamp: 100}], [], [{end: 10, count: 1, stamp: 100}]);
        checkMerge(
            [{end: 10, count: 1, stamp: 100}], [{end: 10, count: 1, stamp: 100}], [{end: 10, count: 2, stamp: 100}]);
        checkMerge(
            [{end: 10, count: 1, stamp: 100}], [{end: 20, count: 1, stamp: 100}],
            [{end: 10, count: 2, stamp: 100}, {end: 20, count: 1, stamp: 100}]);
        checkMerge(
            [{end: 10, count: 1, stamp: 100}, {end: 20, count: 1, stamp: 100}], [],
            [{end: 10, count: 1, stamp: 100}, {end: 20, count: 1, stamp: 100}]);
        checkMerge(
            [{end: 30, count: 1, stamp: 100}], [{end: 10, count: 0, stamp: 100}, {end: 20, count: 2, stamp: 100}],
            [{end: 10, count: 1, stamp: 100}, {end: 20, count: 3, stamp: 100}, {end: 30, count: 1, stamp: 100}]);
        checkMerge(
            [{end: 30, count: 0, stamp: 100}], [{end: 10, count: 0, stamp: 100}, {end: 20, count: 2, stamp: 100}],
            [{end: 10, count: 0, stamp: 100}, {end: 20, count: 2, stamp: 100}, {end: 30, count: 0, stamp: 100}]);
      });

      it('merges coverage segments with the different timestamp correctly', () => {
        checkMerge(
            [{end: 10, count: 1, stamp: 100}], [{end: 10, count: 1, stamp: 200}], [{end: 10, count: 2, stamp: 100}]);
        checkMerge(
            [{end: 10, count: 1, stamp: 100}], [{end: 20, count: 1, stamp: 200}],
            [{end: 10, count: 2, stamp: 100}, {end: 20, count: 1, stamp: 200}]);
        checkMerge(
            [{end: 10, count: 1, stamp: 100}, {end: 20, count: 1, stamp: 200}], [],
            [{end: 10, count: 1, stamp: 100}, {end: 20, count: 1, stamp: 200}]);
        checkMerge(
            [{end: 30, count: 1, stamp: 100}], [{end: 10, count: 0, stamp: 100}, {end: 20, count: 2, stamp: 200}],
            [{end: 10, count: 1, stamp: 100}, {end: 20, count: 3, stamp: 100}, {end: 30, count: 1, stamp: 100}]);
        checkMerge([{end: 10, count: 1, stamp: 100}, {end: 20, count: 0, stamp: 100}],
                   [{end: 10, count: 0, stamp: 200}, {end: 20, count: 1, stamp: 200}],
                   [{end: 20, count: 1, stamp: 100}]);
      });
    });

    describe('events', () => {
      setupLocaleHooks();
      setupRuntimeHooks();
      setupSettingsHooks();

      const SCRIPT_ID = '9' as Protocol.Runtime.ScriptId;
      const ANONYMOUS_SCRIPT_ID = '8' as Protocol.Runtime.ScriptId;
      const EVAL_SCRIPT_ID = '10' as Protocol.Runtime.ScriptId;
      const COVERAGE_SCRIPT_URL = urlString`http://127.0.0.1:8000/devtools/coverage/resources/coverage.js`;
      const EVAL_SCRIPT_URL = urlString`test://evaluations/0/coverage-events.js`;
      const EXECUTION_CONTEXT_ID = 1 as Protocol.Runtime.ExecutionContextId;

      let universe: TestUniverse;
      let coverageModel: Coverage.CoverageModel.CoverageModel|null;

      beforeEach(() => {
        universe = new TestUniverse();
        coverageModel = null;
      });

      afterEach(async () => {
        await coverageModel?.stop();
        universe.dispose();
      });

      it('tracks URLCoverageInfo, emits SizesChanged on polling updates, and emits CoverageReset on reset',
         async () => {
           const clock = sinon.useFakeTimers();
           const connection = new MockCDPConnection();
           let startPreciseCoverageParams: Protocol.Profiler.StartPreciseCoverageRequest|undefined;
           let takePreciseCoverageCalls = 0;
           let stopPreciseCoverageCalled = false;
           let stopRuleUsageTrackingCalled = false;
           let cssTimestamp = 1;

           connection.setSuccessHandler('Debugger.enable', () => ({
                                                             debuggerId: '1' as Protocol.Runtime.UniqueDebuggerId,
                                                           }));
           connection.setSuccessHandler('CSS.startRuleUsageTracking', () => ({}));
           connection.setSuccessHandler('CSS.takeCoverageDelta', () => ({
                                                                   coverage: [],
                                                                   timestamp: cssTimestamp++,
                                                                 }));
           connection.setSuccessHandler('CSS.stopRuleUsageTracking', () => {
             stopRuleUsageTrackingCalled = true;
             return {ruleUsage: []};
           });
           connection.setSuccessHandler('Profiler.startPreciseCoverage', params => {
             startPreciseCoverageParams = params;
             return {timestamp: 1};
           });
           connection.setSuccessHandler('Profiler.stopPreciseCoverage', () => {
             stopPreciseCoverageCalled = true;
             return {};
           });
           connection.setSuccessHandler('Profiler.takePreciseCoverage', () => {
             takePreciseCoverageCalls++;
             if (takePreciseCoverageCalls === 1) {
               return {result: [], timestamp: 1};
             }
             if (takePreciseCoverageCalls === 2) {
               return {
                 result: [
                   {
                     scriptId: ANONYMOUS_SCRIPT_ID,
                     url: '',
                     functions: [{
                       functionName: '',
                       ranges: [{startOffset: 0, endOffset: 213, count: 1}],
                       isBlockCoverage: true,
                     }],
                   },
                   {
                     scriptId: SCRIPT_ID,
                     url: COVERAGE_SCRIPT_URL,
                     functions: [
                       {
                         functionName: '',
                         ranges: [{startOffset: 0, endOffset: 568, count: 0}],
                         isBlockCoverage: true,
                       },
                       {
                         functionName: 'outer',
                         ranges: [{startOffset: 0, endOffset: 456, count: 0}],
                         isBlockCoverage: false,
                       },
                       {
                         functionName: 'performActions',
                         ranges: [{startOffset: 458, endOffset: 523, count: 0}],
                         isBlockCoverage: false,
                       },
                       {
                         functionName: 'outer2',
                         ranges: [{startOffset: 524, endOffset: 567, count: 0}],
                         isBlockCoverage: false,
                       },
                     ],
                   },
                 ],
                 timestamp: 2,
               };
             }
             if (takePreciseCoverageCalls === 3) {
               return {
                 result: [
                   {
                     scriptId: SCRIPT_ID,
                     url: COVERAGE_SCRIPT_URL,
                     functions: [
                       {
                         functionName: 'outer',
                         ranges: [
                           {startOffset: 0, endOffset: 456, count: 1},
                           {startOffset: 250, endOffset: 301, count: 0},
                         ],
                         isBlockCoverage: true,
                       },
                       {
                         functionName: 'inner1',
                         ranges: [{startOffset: 27, endOffset: 69, count: 0}],
                         isBlockCoverage: false,
                       },
                       {
                         functionName: 'inner2',
                         ranges: [{startOffset: 73, endOffset: 115, count: 1}],
                         isBlockCoverage: true,
                       },
                       {
                         functionName: 'inner3',
                         ranges: [{startOffset: 119, endOffset: 155, count: 0}],
                         isBlockCoverage: false,
                       },
                       {
                         functionName: 'inner4',
                         ranges: [{startOffset: 156, endOffset: 192, count: 1}],
                         isBlockCoverage: true,
                       },
                       {
                         functionName: 'inner5',
                         ranges: [{startOffset: 193, endOffset: 229, count: 0}],
                         isBlockCoverage: false,
                       },
                       {
                         functionName: 'performActions',
                         ranges: [{startOffset: 458, endOffset: 523, count: 1}],
                         isBlockCoverage: true,
                       },
                     ],
                   },
                   {
                     scriptId: EVAL_SCRIPT_ID,
                     url: EVAL_SCRIPT_URL,
                     functions: [{
                       functionName: '',
                       ranges: [{startOffset: 0, endOffset: 95, count: 1}],
                       isBlockCoverage: true,
                     }],
                   },
                 ],
                 timestamp: 3,
               };
             }
             return {result: [], timestamp: takePreciseCoverageCalls};
           });

           const target = universe.createTarget({connection});
           coverageModel = target.model(Coverage.CoverageModel.CoverageModel);
           assert.exists(coverageModel);

           assert.isTrue(await coverageModel.start(true));
           assert.deepEqual(startPreciseCoverageParams, {
             callCount: false,
             detailed: true,
             allowTriggeredUpdates: true,
           });

           await coverageModel.startPolling();

           connection.dispatchEvent('Debugger.scriptParsed', {
             scriptId: ANONYMOUS_SCRIPT_ID,
             url: '',
             startLine: 0,
             startColumn: 0,
             endLine: 7,
             endColumn: 2,
             executionContextId: EXECUTION_CONTEXT_ID,
             hash: '',
             buildId: '',
             sourceMapURL: undefined,
             hasSourceURL: false,
             isModule: false,
             length: 213,
           },
                                    target.sessionId);
           connection.dispatchEvent('Debugger.scriptParsed', {
             scriptId: SCRIPT_ID,
             url: COVERAGE_SCRIPT_URL,
             startLine: 0,
             startColumn: 0,
             endLine: 27,
             endColumn: 0,
             executionContextId: EXECUTION_CONTEXT_ID,
             hash: '',
             buildId: '',
             sourceMapURL: undefined,
             hasSourceURL: false,
             isModule: false,
             length: 568,
           },
                                    target.sessionId);

           const initialPoll = coverageModel.once(Coverage.CoverageModel.Events.CoverageUpdated);
           await Promise.all([initialPoll, clock.tickAsync(200)]);

           const coverageInfo = coverageModel.getCoverageForUrl(COVERAGE_SCRIPT_URL);
           assert.exists(coverageInfo);
           assert.strictEqual(coverageInfo.url(), COVERAGE_SCRIPT_URL);
           assert.strictEqual(coverageInfo.type(), Coverage.CoverageModel.CoverageType.JAVA_SCRIPT);
           assert.isFalse(coverageInfo.isContentScript());
           assert.strictEqual(coverageInfo.size(), 568);
           assert.strictEqual(coverageInfo.usedSize(), 0);
           assert.strictEqual(coverageInfo.unusedSize(), 568);
           assert.strictEqual(coverageInfo.usedPercentage(), 0);
           assert.strictEqual(coverageInfo.unusedPercentage(), 1);
           assert.strictEqual(coverageInfo.numberOfEntries(), 1);
           assert.deepEqual(coverageModel.entries(), [coverageInfo]);
           const coverageEntries = [...coverageInfo.entries()];
           assert.lengthOf(coverageEntries, 1);
           assert.strictEqual(coverageEntries[0].getContentProvider(),
                              target.model(SDK.DebuggerModel.DebuggerModel)?.scriptForId(SCRIPT_ID));

           connection.dispatchEvent('Debugger.scriptParsed', {
             scriptId: EVAL_SCRIPT_ID,
             url: EVAL_SCRIPT_URL,
             startLine: 0,
             startColumn: 0,
             endLine: 0,
             endColumn: 95,
             executionContextId: EXECUTION_CONTEXT_ID,
             hash: '',
             buildId: '',
             sourceMapURL: undefined,
             hasSourceURL: false,
             isModule: false,
             length: 95,
           },
                                    target.sessionId);

           const sizesChanged = coverageInfo.once(Coverage.CoverageModel.URLCoverageInfo.Events.SizesChanged);
           const coverageUpdated = coverageModel.once(Coverage.CoverageModel.Events.CoverageUpdated);
           const [, updatedEntries] = await Promise.all([sizesChanged, coverageUpdated, clock.tickAsync(200)]);

           assert.strictEqual(coverageInfo.size(), 568);
           assert.strictEqual(coverageInfo.usedSize(), 356);
           assert.strictEqual(coverageInfo.unusedSize(), 212);
           assert.closeTo(coverageInfo.usedPercentage(), 0.62676, 1e-4);
           assert.closeTo(coverageInfo.unusedPercentage(), 0.37324, 1e-4);

           const evalCoverageInfo = coverageModel.getCoverageForUrl(EVAL_SCRIPT_URL);
           assert.exists(evalCoverageInfo);
           assert.strictEqual(evalCoverageInfo.size(), 95);
           assert.strictEqual(evalCoverageInfo.usedSize(), 95);
           assert.strictEqual(evalCoverageInfo.unusedSize(), 0);
           // URLCoverageInfo.usedPercentage() checks !this.unusedSize() instead of !this.usedSize(),
           // so 100%-covered scripts currently report 0; CoverageModel.ts is kept unchanged here.
           assert.strictEqual(evalCoverageInfo.usedPercentage(), 0);
           assert.strictEqual(evalCoverageInfo.unusedPercentage(), 0);
           assert.sameMembers(coverageModel.entries(), [coverageInfo, evalCoverageInfo]);
           assert.sameMembers(updatedEntries, [...coverageEntries, ...evalCoverageInfo.entries()]);

           await coverageModel.stop();
           assert.isTrue(stopPreciseCoverageCalled);
           assert.isTrue(stopRuleUsageTrackingCalled);

           const coverageReset = coverageModel.once(Coverage.CoverageModel.Events.CoverageReset);
           coverageModel.reset();
           await coverageReset;

           assert.isNull(coverageModel.getCoverageForUrl(COVERAGE_SCRIPT_URL));
           assert.isNull(coverageModel.getCoverageForUrl(EVAL_SCRIPT_URL));
           assert.isEmpty(coverageModel.entries());
         });
    });
  });
});
