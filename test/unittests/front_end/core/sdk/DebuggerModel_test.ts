// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDKModule from '../../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';

import {createTarget, describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection, dispatchEvent, setMockConnectionResponseHandler} from '../../helpers/MockConnection.js';

const {assert} = chai;

const SCRIPT_ID_ONE = '1' as Protocol.Runtime.ScriptId;
const SCRIPT_ID_TWO = '2' as Protocol.Runtime.ScriptId;

describeWithMockConnection('DebuggerModel', () => {
  let SDK: typeof SDKModule;
  before(async () => {
    SDK = await import('../../../../../front_end/core/sdk/sdk.js');
  });

  describe('createRawLocationFromURL', () => {
    it('yields correct location in the presence of multiple scripts with the same URL', async () => {
      const target = createTarget();
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      const url = 'http://localhost/index.html';
      dispatchEvent(target, 'Debugger.scriptParsed', {
        scriptId: SCRIPT_ID_ONE,
        url,
        startLine: 0,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
        executionContextId: 1,
        hash: '',
        isLiveEdit: false,
        sourceMapURL: undefined,
        hasSourceURL: false,
        length: 10,
      });
      dispatchEvent(target, 'Debugger.scriptParsed', {
        scriptId: SCRIPT_ID_TWO,
        url,
        startLine: 20,
        startColumn: 0,
        endLine: 21,
        endColumn: 10,
        executionContextId: 1,
        hash: '',
        isLiveEdit: false,
        sourceMapURL: undefined,
        hasSourceURL: false,
        length: 10,
      });
      assert.strictEqual(debuggerModel?.createRawLocationByURL(url, 0)?.scriptId, SCRIPT_ID_ONE);
      assert.strictEqual(debuggerModel?.createRawLocationByURL(url, 20, 1)?.scriptId, SCRIPT_ID_TWO);
      assert.strictEqual(debuggerModel?.createRawLocationByURL(url, 5, 5), null);
    });
  });

  const breakpointId1 = 'fs.js:1' as Protocol.Debugger.BreakpointId;
  const breakpointId2 = 'unsupported' as Protocol.Debugger.BreakpointId;

  describe('setBreakpointByURL', () => {
    it('correctly sets only a single breakpoint in Node.js internal scripts', async () => {
      setMockConnectionResponseHandler(
          'Debugger.setBreakpointByUrl', ({url}): Protocol.Debugger.SetBreakpointByUrlResponse => {
            if (url === 'fs.js') {
              return {
                breakpointId: breakpointId1,
                locations: [],
                getError() {
                  return undefined;
                },
              };
            }
            return {
              breakpointId: breakpointId2,
              locations: [],
              getError() {
                return undefined;
              },
            };
          });

      const target = createTarget();
      target.markAsNodeJSForTest();
      const model = new SDK.DebuggerModel.DebuggerModel(target);
      const {breakpointId} = await model.setBreakpointByURL('fs.js', 1);
      assert.strictEqual(breakpointId, breakpointId1);
    });
  });

  describe('scriptsForSourceURL', () => {
    it('returns the latest script at the front of the result for scripts with the same URL', () => {
      const target = createTarget();
      const url = 'http://localhost/index.html';
      dispatchEvent(target, 'Debugger.scriptParsed', {
        scriptId: SCRIPT_ID_ONE,
        url,
        startLine: 0,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
        executionContextId: 1,
        hash: '',
        isLiveEdit: false,
        sourceMapURL: undefined,
        hasSourceURL: false,
        length: 10,
      });
      dispatchEvent(target, 'Debugger.scriptParsed', {
        scriptId: SCRIPT_ID_TWO,
        url,
        startLine: 20,
        startColumn: 0,
        endLine: 21,
        endColumn: 10,
        executionContextId: 1,
        hash: '',
        isLiveEdit: false,
        sourceMapURL: undefined,
        hasSourceURL: false,
        length: 10,
      });

      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      const scripts = debuggerModel?.scriptsForSourceURL(url) || [];

      assert.strictEqual(scripts[0].scriptId, SCRIPT_ID_TWO);
      assert.strictEqual(scripts[1].scriptId, SCRIPT_ID_ONE);
    });
  });
});

describeWithEnvironment('LocationRanges', () => {
  let SDK: typeof SDKModule;
  before(async () => {
    SDK = await import('../../../../../front_end/core/sdk/sdk.js');
  });

  function createRange(
      scriptId: Protocol.Runtime.ScriptId, startLine: number, startColumn: number, endLine: number, endColumn: number) {
    return new SDK.DebuggerModel.LocationRange(
        scriptId, new SDK.DebuggerModel.ScriptPosition(startLine, startColumn),
        new SDK.DebuggerModel.ScriptPosition(endLine, endColumn));
  }

  function sort(locationRange: SDKModule.DebuggerModel.LocationRange[]) {
    return locationRange.concat().sort(SDK.DebuggerModel.LocationRange.comparator);
  }

  function sortAndMerge(locationRange: SDKModule.DebuggerModel.LocationRange[]) {
    return SDK.DebuggerModel.sortAndMergeRanges(locationRange.concat());
  }

  function checkIsMaximallyMerged(locationRange: SDKModule.DebuggerModel.LocationRange[]) {
    for (let i = 1; i < locationRange.length; ++i) {
      assert.isTrue(locationRange[i - 1].compareTo(locationRange[i]) < 0);
    }
  }

  it('can be sorted after scriptId', () => {
    const locationRanges = [
      createRange(SCRIPT_ID_TWO, 0, 0, 0, 0),
      createRange(SCRIPT_ID_ONE, 0, 0, 0, 0),
    ];
    const sorted = sort(locationRanges);
    assert.deepEqual(sorted, locationRanges.reverse());
  });

  it('can be sorted after line number', () => {
    let locationRanges = [
      createRange(SCRIPT_ID_ONE, 3, 0, 0, 0),
      createRange(SCRIPT_ID_ONE, 0, 0, 0, 0),
    ];
    let sorted = sort(locationRanges);
    assert.deepEqual(sorted, locationRanges.reverse());

    locationRanges = [
      createRange(SCRIPT_ID_ONE, 0, 0, 3, 0),
      createRange(SCRIPT_ID_ONE, 0, 0, 0, 0),
    ];
    sorted = sort(locationRanges);
    assert.deepEqual(sorted, locationRanges.reverse());
  });

  it('can be sorted after column number', () => {
    let locationRanges = [
      createRange(SCRIPT_ID_ONE, 0, 3, 0, 0),
      createRange(SCRIPT_ID_ONE, 0, 0, 0, 0),
    ];
    let sorted = sort(locationRanges);
    assert.deepEqual(sorted, locationRanges.reverse());

    locationRanges = [
      createRange(SCRIPT_ID_ONE, 0, 0, 0, 3),
      createRange(SCRIPT_ID_ONE, 0, 0, 0, 0),
    ];
    sorted = sort(locationRanges);
    assert.deepEqual(sorted, locationRanges.reverse());
  });

  it('can be sorted by scriptId, line and column', () => {
    const locationRangesExpected = [
      createRange(SCRIPT_ID_ONE, 0, 3, 0, 0),
      createRange(SCRIPT_ID_ONE, 0, 3, 0, 5),
      createRange(SCRIPT_ID_TWO, 3, 3, 3, 5),
      createRange(SCRIPT_ID_TWO, 5, 4, 5, 8),
    ];

    const locationRangeToSort = [
      locationRangesExpected[3],
      locationRangesExpected[1],
      locationRangesExpected[2],
      locationRangesExpected[0],
    ];

    const sorted = sort(locationRangeToSort);
    assert.deepEqual(sorted, locationRangesExpected);
  });

  it('correctly checks overlap', () => {
    const location1 = createRange(SCRIPT_ID_ONE, 1, 0, 3, 0);
    const location2 = createRange(SCRIPT_ID_ONE, 0, 0, 5, 0);

    assert.isTrue(location1.overlap(location2));
    assert.isTrue(location2.overlap(location1));
    assert.isTrue(location1.overlap(location1));
  });

  it('correctly checks overlap (end and start overlapping)', () => {
    const location1 = createRange(SCRIPT_ID_ONE, 1, 0, 3, 0);
    const location2 = createRange(SCRIPT_ID_ONE, 3, 0, 5, 0);

    assert.isTrue(location1.overlap(location2));
    assert.isTrue(location2.overlap(location1));
    assert.isTrue(location1.overlap(location1));
  });

  it('correctly checks non-overlap', () => {
    const location1 = createRange(SCRIPT_ID_TWO, 1, 0, 3, 0);
    const location2 = createRange(SCRIPT_ID_ONE, 3, 1, 5, 0);

    assert.isFalse(location1.overlap(location2));
    assert.isFalse(location2.overlap(location1));
  });

  it('can be reduced if equal', () => {
    const testRange = createRange(SCRIPT_ID_ONE, 0, 3, 3, 3);
    const locationRangesToBeReduced = [
      testRange,
      testRange,
    ];
    const reduced = sortAndMerge(locationRangesToBeReduced);
    assert.deepEqual(reduced, [testRange]);
    checkIsMaximallyMerged(reduced);
  });

  it('can be reduced if overlapping (multiple ranges)', () => {
    const locationRangesToBeReduced = [
      createRange(SCRIPT_ID_ONE, 0, 5, 5, 3),
      createRange(SCRIPT_ID_ONE, 0, 3, 3, 3),
      createRange(SCRIPT_ID_ONE, 5, 3, 10, 10),
      createRange(SCRIPT_ID_TWO, 5, 4, 10, 10),
    ];
    const locationRangesExpected = [
      createRange(SCRIPT_ID_ONE, 0, 3, 10, 10),
      locationRangesToBeReduced[3],
    ];
    const reduced = sortAndMerge(locationRangesToBeReduced);
    assert.deepEqual(reduced, locationRangesExpected);
    checkIsMaximallyMerged(reduced);
  });

  it('can be reduced if overlapping (same start, different end)', () => {
    const locationRangesToBeReduced = [
      createRange(SCRIPT_ID_ONE, 0, 5, 5, 3),
      createRange(SCRIPT_ID_ONE, 0, 5, 3, 3),
    ];
    const locationRangesExpected = [
      createRange(SCRIPT_ID_ONE, 0, 5, 5, 3),
    ];
    const reduced = sortAndMerge(locationRangesToBeReduced);
    assert.deepEqual(reduced, locationRangesExpected);
    checkIsMaximallyMerged(reduced);
  });

  it('can be reduced if overlapping (different start, same end)', () => {
    const locationRangesToBeReduced = [
      createRange(SCRIPT_ID_ONE, 0, 3, 5, 3),
      createRange(SCRIPT_ID_ONE, 0, 5, 5, 3),
    ];
    const locationRangesExpected = [
      createRange(SCRIPT_ID_ONE, 0, 3, 5, 3),
    ];
    const reduced = sortAndMerge(locationRangesToBeReduced);
    assert.deepEqual(reduced, locationRangesExpected);
    checkIsMaximallyMerged(reduced);
  });

  it('can be reduced if overlapping (start == other.end)', () => {
    const locationRangesToBeReduced = [
      createRange(SCRIPT_ID_ONE, 0, 3, 5, 3),
      createRange(SCRIPT_ID_ONE, 5, 3, 10, 3),
    ];
    const locationRangesExpected = [
      createRange(SCRIPT_ID_ONE, 0, 3, 10, 3),
    ];
    const reduced = sortAndMerge(locationRangesToBeReduced);
    assert.deepEqual(reduced, locationRangesExpected);
    checkIsMaximallyMerged(reduced);
  });
});
