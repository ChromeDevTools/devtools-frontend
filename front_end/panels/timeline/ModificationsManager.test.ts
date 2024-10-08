// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../models/trace/trace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as Timeline from './timeline.js';

describeWithEnvironment('ModificationsManager', () => {
  it('applies modifications when present in a trace file', async function() {
    await TraceLoader.traceEngine(null, 'web-dev-modifications.json.gz');
    const modificationsManager = Timeline.ModificationsManager.ModificationsManager.activeManager();
    if (!modificationsManager) {
      throw new Error('Modifications manager does not exist.');
    }
    const entriesFilter = modificationsManager.getEntriesFilter();
    assert.strictEqual(entriesFilter.expandableEntries().length, 1);
    assert.strictEqual(entriesFilter.invisibleEntries().length, 108);
    assert.deepEqual(modificationsManager.getTimelineBreadcrumbs().initialBreadcrumb, {
      window: {min: 1020034823047, max: 1020036087961, range: 1264914},
      child: {window: {min: 1020034823047, max: 1020035228006.5569, range: 404959.5568847656}, child: null},
    } as Trace.Types.File.Breadcrumb);
    // Make sure the saved Label Annotation is applied
    const labelAnnotation = modificationsManager.getAnnotations()[0];
    const label = (labelAnnotation.type === 'ENTRY_LABEL') ? labelAnnotation.label : '';
    assert.deepEqual(labelAnnotation.type, 'ENTRY_LABEL');
    assert.deepEqual(label, 'Initialize App');
    // Make sure the saved Range Annotation is applied
    const timeRangeAnnotation = modificationsManager.getAnnotations()[1];
    const rangeLabel = (timeRangeAnnotation.type === 'TIME_RANGE') ? timeRangeAnnotation.label : '';
    assert.deepEqual(modificationsManager.getAnnotations()[1].type, 'TIME_RANGE');
    assert.deepEqual(rangeLabel, 'Visibility change 1');
  });

  it('generates a serializable modifications json ', async function() {
    await TraceLoader.traceEngine(null, 'web-dev-modifications.json.gz');
    const modificationsManager = Timeline.ModificationsManager.ModificationsManager.activeManager();
    if (!modificationsManager) {
      throw new Error('Modifications manager does not exist.');
    }
    const entriesFilter = modificationsManager.getEntriesFilter();
    const modifications = modificationsManager.toJSON();
    assert.strictEqual(entriesFilter.expandableEntries().length, 1);
    assert.strictEqual(modifications.entriesModifications.expandableEntries.length, 1);
    assert.strictEqual(modifications.entriesModifications.hiddenEntries.length, 108);
    assert.deepEqual(modifications.initialBreadcrumb, {
      window: {min: 1020034823047, max: 1020036087961, range: 1264914},
      child: {window: {min: 1020034823047, max: 1020035228006.5569, range: 404959.5568847656}, child: null},
    } as Trace.Types.File.Breadcrumb);
    assert.deepEqual(modifications.annotations.entryLabels, [
      {entry: 'p-73704-775-2151-457', label: 'Initialize App'},
    ]);
    assert.deepEqual(modifications.annotations.labelledTimeRanges, [
      {
        bounds: {min: 1020034870460.4769, max: 1020034880507.9258, range: 10047.448852539062},
        label: 'Visibility change 1',
      },
    ]);
  });

  it('creates annotations and generates correct json for annotations', async function() {
    const parsedTrace = (await TraceLoader.traceEngine(null, 'web-dev-with-commit.json.gz')).parsedTrace;
    // Get any entres to create a label and a link with.
    const entry = parsedTrace.Renderer.allTraceEntries[0];
    const entry2 = parsedTrace.Renderer.allTraceEntries[1];

    const modificationsManager = Timeline.ModificationsManager.ModificationsManager.activeManager();
    assert.isOk(modificationsManager);

    modificationsManager.createAnnotation({
      type: 'ENTRY_LABEL',
      entry,
      label: 'entry label',
    });

    modificationsManager.createAnnotation({
      type: 'ENTRIES_LINK',
      state: Trace.Types.File.EntriesLinkState.CONNECTED,
      entryFrom: entry,
      entryTo: entry2,
    });

    modificationsManager.createAnnotation({
      type: 'TIME_RANGE',
      bounds: {
        min: Trace.Types.Timing.MicroSeconds(0),
        max: Trace.Types.Timing.MicroSeconds(10),
        range: Trace.Types.Timing.MicroSeconds(10),
      },
      label: 'range label',
    });

    const modifications = modificationsManager.toJSON().annotations;
    assert.deepEqual(modifications, {
      entryLabels: [{
        entry: 'r-38',
        label: 'entry label',
      }],
      labelledTimeRanges: [{
        bounds: {
          min: Trace.Types.Timing.MicroSeconds(0),
          max: Trace.Types.Timing.MicroSeconds(10),
          range: Trace.Types.Timing.MicroSeconds(10),
        },
        label: 'range label',
      }],
      linksBetweenEntries: [{
        entryFrom: 'r-38',
        entryTo: 'r-39',
      }],
    });
  });

  it('does not add the annotation link between entries into the json saved into metadata if `entryTo` does not exist',
     async function() {
       const parsedTrace = (await TraceLoader.traceEngine(null, 'web-dev-with-commit.json.gz')).parsedTrace;
       // Get any entry to create links with.
       const entry = parsedTrace.Renderer.allTraceEntries[0];
       const entry2 = parsedTrace.Renderer.allTraceEntries[1];

       const modificationsManager = Timeline.ModificationsManager.ModificationsManager.activeManager();
       assert.isOk(modificationsManager);

       modificationsManager.createAnnotation({
         type: 'ENTRIES_LINK',
         state: Trace.Types.File.EntriesLinkState.CONNECTED,
         entryFrom: entry,
         entryTo: entry2,
       });

       modificationsManager.createAnnotation({
         type: 'ENTRIES_LINK',
         state: Trace.Types.File.EntriesLinkState.PENDING_TO_EVENT,
         entryFrom: entry2,
       });

       // Make sure only the link with both 'to' and 'from' entries in in the generated JSON
       const modifications = modificationsManager.toJSON().annotations;
       assert.deepEqual(modifications, {
         entryLabels: [],
         labelledTimeRanges: [],
         linksBetweenEntries: [{
           entryFrom: 'r-38',
           entryTo: 'r-39',
         }],
       });
     });

  it('correctly identifies if a connection between entries already exists', async function() {
    const parsedTrace = (await TraceLoader.traceEngine(null, 'web-dev-with-commit.json.gz')).parsedTrace;
    // Get any entry to create links with.
    const entry1 = parsedTrace.Renderer.allTraceEntries[0];
    const entry2 = parsedTrace.Renderer.allTraceEntries[1];
    const entry3 = parsedTrace.Renderer.allTraceEntries[2];

    const modificationsManager = Timeline.ModificationsManager.ModificationsManager.activeManager();
    assert.isOk(modificationsManager);

    // Create a connection between entry 1 and entry 2
    modificationsManager.createAnnotation({
      type: 'ENTRIES_LINK',
      state: Trace.Types.File.EntriesLinkState.CONNECTED,
      entryFrom: entry1,
      entryTo: entry2,
    });

    // Chech if a connection between entries 1 and 3 exists
    const existsBetween1And3 = modificationsManager.linkAnnotationBetweenEntriesExists(entry1, entry3);
    // Make sure the link does not exists
    assert.isFalse(existsBetween1And3);

    // Chech if a connection between entries 1 and 2 exists
    const existsBetween1And2 = modificationsManager.linkAnnotationBetweenEntriesExists(entry1, entry2);
    // Make sure the link exists
    assert.isTrue(existsBetween1And2);

    // Chech if a connection between entries 2 and 1 exists. It should since the order of entries does not matter.
    const existsBetween2And1 = modificationsManager.linkAnnotationBetweenEntriesExists(entry1, entry2);
    // Make sure the link exists
    assert.isTrue(existsBetween2And1);
  });

  it('deletes time ranges with an empty label from the annotations list', async function() {
    await TraceLoader.traceEngine(null, 'web-dev-with-commit.json.gz');
    const modificationsManager = Timeline.ModificationsManager.ModificationsManager.activeManager();
    assert.isOk(modificationsManager);

    modificationsManager.createAnnotation({
      type: 'TIME_RANGE',
      bounds: {
        min: Trace.Types.Timing.MicroSeconds(0),
        max: Trace.Types.Timing.MicroSeconds(10),
        range: Trace.Types.Timing.MicroSeconds(10),
      },
      label: 'label',
    });

    // Create time range with empty label that shoud be removed
    modificationsManager.createAnnotation({
      type: 'TIME_RANGE',
      bounds: {
        min: Trace.Types.Timing.MicroSeconds(3),
        max: Trace.Types.Timing.MicroSeconds(10),
        range: Trace.Types.Timing.MicroSeconds(7),
      },
      label: '',
    });

    // Create time range with empty label that shoud be removed
    modificationsManager.createAnnotation({
      type: 'TIME_RANGE',
      bounds: {
        min: Trace.Types.Timing.MicroSeconds(5),
        max: Trace.Types.Timing.MicroSeconds(10),
        range: Trace.Types.Timing.MicroSeconds(5),
      },
      label: '',
    });

    modificationsManager.deleteEmptyRangeAnnotations();
    const modifications = modificationsManager.toJSON().annotations;

    // Make sure that the annotations with an empty label were deleted
    assert.deepEqual(modifications.labelledTimeRanges, [{
                       bounds: {
                         min: Trace.Types.Timing.MicroSeconds(0),
                         max: Trace.Types.Timing.MicroSeconds(10),
                         range: Trace.Types.Timing.MicroSeconds(10),
                       },
                       label: 'label',
                     }]);
  });
});
