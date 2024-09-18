// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../models/trace/trace.js';

import * as Timeline from './timeline.js';

const {
  getAnnotationEntries,
  getAnnotationWindow,
} = Timeline.AnnotationHelpers;

describe('AnnotationHelpers', () => {
  describe('getAnnotationEntries', () => {
    const FAKE_ENTRY_1 = {} as unknown as TraceEngine.Types.TraceEvents.TraceEventData;
    const FAKE_ENTRY_2 = {} as unknown as TraceEngine.Types.TraceEvents.TraceEventData;
    it('returns the entry for an ENTRY_LABEL', async () => {
      const annotation: TraceEngine.Types.File.EntryLabelAnnotation = {
        entry: FAKE_ENTRY_1,
        label: 'Hello world',
        type: 'ENTRY_LABEL',
      };
      assert.deepEqual(getAnnotationEntries(annotation), [FAKE_ENTRY_1]);
    });

    it('returns an empty array for a range', async () => {
      const annotation: TraceEngine.Types.File.TimeRangeAnnotation = {
        bounds: TraceEngine.Helpers.Timing.traceWindowFromMicroSeconds(
            TraceEngine.Types.Timing.MicroSeconds(0),
            TraceEngine.Types.Timing.MicroSeconds(10),
            ),
        type: 'TIME_RANGE',
        label: 'Hello world',
      };
      assert.lengthOf(getAnnotationEntries(annotation), 0);
    });

    it('returns both entries for a link', async () => {
      const annotation: TraceEngine.Types.File.EntriesLinkAnnotation = {
        entryFrom: FAKE_ENTRY_1,
        entryTo: FAKE_ENTRY_2,
        type: 'ENTRIES_LINK',
      };
      assert.deepEqual(getAnnotationEntries(annotation), [FAKE_ENTRY_1, FAKE_ENTRY_2]);
    });
  });

  describe('getAnnotationWindow', () => {
    const FAKE_ENTRY_1 = {
      ts: 1,
      dur: 10,
    } as unknown as TraceEngine.Types.TraceEvents.TraceEventData;
    const FAKE_ENTRY_2 = {
      ts: 20,
      dur: 5,
    } as unknown as TraceEngine.Types.TraceEvents.TraceEventData;

    it('returns the entry window for an ENTRY_LABEL', async () => {
      const annotation: TraceEngine.Types.File.EntryLabelAnnotation = {
        entry: FAKE_ENTRY_1,
        label: 'Hello world',
        type: 'ENTRY_LABEL',
      };
      assert.deepEqual(getAnnotationWindow(annotation), {
        min: 1,
        max: 11,
        range: 10,
      });
    });

    it('returns the bounds for a TIME_RANGE', async () => {
      const annotation: TraceEngine.Types.File.TimeRangeAnnotation = {
        bounds: TraceEngine.Helpers.Timing.traceWindowFromMicroSeconds(
            TraceEngine.Types.Timing.MicroSeconds(0),
            TraceEngine.Types.Timing.MicroSeconds(10),
            ),
        type: 'TIME_RANGE',
        label: 'Hello world',
      };
      assert.deepEqual(getAnnotationWindow(annotation), {
        min: 0,
        max: 10,
        range: 10,
      });
    });

    it('returns the bounds based on the start and end entry for an ENTRIES_LINK', async () => {
      const annotation: TraceEngine.Types.File.EntriesLinkAnnotation = {
        entryFrom: FAKE_ENTRY_1,
        entryTo: FAKE_ENTRY_2,
        type: 'ENTRIES_LINK',
      };
      assert.deepEqual(getAnnotationWindow(annotation), {
        min: 1,
        max: 25,
        range: 24,
      });
    });
  });
});
