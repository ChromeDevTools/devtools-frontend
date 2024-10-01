// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {microsecondsTraceWindow} from '../../testing/TraceHelpers.js';

import type * as Overlays from './overlays/overlays.js';
import * as Timeline from './timeline.js';

const {
  getAnnotationEntries,
  getAnnotationWindow,
} = Timeline.AnnotationHelpers;

describe('AnnotationHelpers', () => {
  describe('getAnnotationEntries', () => {
    const FAKE_ENTRY_1 = {} as unknown as Trace.Types.Events.Event;
    const FAKE_ENTRY_2 = {} as unknown as Trace.Types.Events.Event;
    it('returns the entry for an ENTRY_LABEL', async () => {
      const annotation: Trace.Types.File.EntryLabelAnnotation = {
        entry: FAKE_ENTRY_1,
        label: 'Hello world',
        type: 'ENTRY_LABEL',
      };
      assert.deepEqual(getAnnotationEntries(annotation), [FAKE_ENTRY_1]);
    });

    it('returns an empty array for a range', async () => {
      const annotation: Trace.Types.File.TimeRangeAnnotation = {
        bounds: Trace.Helpers.Timing.traceWindowFromMicroSeconds(
            Trace.Types.Timing.MicroSeconds(0),
            Trace.Types.Timing.MicroSeconds(10),
            ),
        type: 'TIME_RANGE',
        label: 'Hello world',
      };
      assert.lengthOf(getAnnotationEntries(annotation), 0);
    });

    it('returns both entries for a link', async () => {
      const annotation: Trace.Types.File.EntriesLinkAnnotation = {
        type: 'ENTRIES_LINK',
        state: Trace.Types.File.EntriesLinkState.CONNECTED,
        entryFrom: FAKE_ENTRY_1,
        entryTo: FAKE_ENTRY_2,
      };
      assert.deepEqual(getAnnotationEntries(annotation), [FAKE_ENTRY_1, FAKE_ENTRY_2]);
    });
  });

  describe('getAnnotationWindow', () => {
    const FAKE_ENTRY_1 = {
      ts: 1,
      dur: 10,
    } as unknown as Trace.Types.Events.Event;
    const FAKE_ENTRY_2 = {
      ts: 20,
      dur: 5,
    } as unknown as Trace.Types.Events.Event;

    it('returns the entry window for an ENTRY_LABEL', async () => {
      const annotation: Trace.Types.File.EntryLabelAnnotation = {
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
      const annotation: Trace.Types.File.TimeRangeAnnotation = {
        bounds: Trace.Helpers.Timing.traceWindowFromMicroSeconds(
            Trace.Types.Timing.MicroSeconds(0),
            Trace.Types.Timing.MicroSeconds(10),
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
      const annotation: Trace.Types.File.EntriesLinkAnnotation = {
        type: 'ENTRIES_LINK',
        state: Trace.Types.File.EntriesLinkState.CONNECTED,
        entryFrom: FAKE_ENTRY_1,
        entryTo: FAKE_ENTRY_2,
      };
      assert.deepEqual(getAnnotationWindow(annotation), {
        min: 1,
        max: 25,
        range: 24,
      });
    });
  });

  describeWithEnvironment('Aria Announcement', () => {
    const {ariaAnnouncementForModifiedEvent} = Timeline.AnnotationHelpers;
    const FAKE_ENTRY_1 = {
      name: 'fake-one',
      ts: 1,
      dur: 10,
    } as unknown as Trace.Types.Events.Event;
    const FAKE_ENTRY_2 = {
      name: 'fake-two',
      ts: 10,
      dur: 10,
    } as unknown as Trace.Types.Events.Event;

    it('returns text for an annotation being removed', () => {
      const overlay: Overlays.Overlays.EntryLabel = {type: 'ENTRY_LABEL', entry: FAKE_ENTRY_1, label: 'Hello world'};
      const event = new Timeline.ModificationsManager.AnnotationModifiedEvent(overlay, 'Remove');
      const text = ariaAnnouncementForModifiedEvent(event);
      assert.strictEqual(text, 'The entry label annotation has been removed');
    });

    it('returns text for entering the edit state on a label', () => {
      const overlay: Overlays.Overlays.EntryLabel = {type: 'ENTRY_LABEL', entry: FAKE_ENTRY_1, label: 'Hello world'};
      const event = new Timeline.ModificationsManager.AnnotationModifiedEvent(overlay, 'EnterLabelEditState');
      const text = ariaAnnouncementForModifiedEvent(event);
      assert.strictEqual(text, 'Editing the annotation label text');
    });

    it('returns text for an annotation being added', async () => {
      const overlay: Overlays.Overlays.EntryLabel = {type: 'ENTRY_LABEL', entry: FAKE_ENTRY_1, label: 'Hello world'};
      const event = new Timeline.ModificationsManager.AnnotationModifiedEvent(overlay, 'Add');
      const text = ariaAnnouncementForModifiedEvent(event);
      assert.strictEqual(text, 'The entry label annotation has been added');
    });

    it('returns text for an annotation having its label updated', async () => {
      const overlay: Overlays.Overlays.EntryLabel = {type: 'ENTRY_LABEL', entry: FAKE_ENTRY_1, label: 'Hello world'};
      const event = new Timeline.ModificationsManager.AnnotationModifiedEvent(overlay, 'UpdateLabel');
      const text = ariaAnnouncementForModifiedEvent(event);
      assert.strictEqual(text, 'Label updated to Hello world');
    });

    it('returns text for a time range having its bounds updated', async () => {
      TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true})
          .resetWithNewBounds(
              microsecondsTraceWindow(0, 10_000),
          );
      const timeRange: Overlays.Overlays.TimeRangeLabel = {
        type: 'TIME_RANGE',
        bounds: microsecondsTraceWindow(0, 5_000),
        label: 'hello',
        showDuration: true,
      };
      const event = new Timeline.ModificationsManager.AnnotationModifiedEvent(timeRange, 'UpdateTimeRange');
      const text = ariaAnnouncementForModifiedEvent(event);
      assert.strictEqual(text, 'Time range updated, starting at 0 ms and ending at 5 ms');
    });

    it('returns text when an entries link has its entries connected', async () => {
      const link: Overlays.Overlays.EntriesLink = {
        type: 'ENTRIES_LINK',
        state: Trace.Types.File.EntriesLinkState.CONNECTED,
        entryFrom: FAKE_ENTRY_1,
        entryTo: FAKE_ENTRY_2,
      };
      const event = new Timeline.ModificationsManager.AnnotationModifiedEvent(link, 'UpdateLinkToEntry');
      const text = ariaAnnouncementForModifiedEvent(event);
      assert.strictEqual(text, 'The connected entries annotation now links from fake-one to fake-two');
    });
  });
});
