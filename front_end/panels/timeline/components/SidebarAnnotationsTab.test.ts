// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as TimelineComponents from './components.js';

async function renderAnnotationsTab(
    annotations: Trace.Types.File.Annotation[], annotationEntryToColorMap: Map<Trace.Types.Events.Event, string>):
    Promise<TimelineComponents.SidebarAnnotationsTab.SidebarAnnotationsTab> {
  const component = new TimelineComponents.SidebarAnnotationsTab.SidebarAnnotationsTab();

  component.setData({annotations, annotationEntryToColorMap});
  await RenderCoordinator.done();
  await component.updateComplete;
  return component;
}

describeWithEnvironment('SidebarAnnotationsTab', () => {
  it('renders annotations list in the sidebar', async function() {
    const defaultTraceEvents = await TraceLoader.rawEvents(null, 'basic.json.gz');

    // Create Entry Label annotations
    const entryLabelAnnotation: Trace.Types.File.Annotation = {
      type: 'ENTRY_LABEL',
      entry: defaultTraceEvents[0],
      label: 'Entry Label 1',
    };

    const entryLabelAnnotation2: Trace.Types.File.Annotation = {
      type: 'ENTRY_LABEL',
      entry: defaultTraceEvents[1],
      label: 'Entry Label 2',
    };

    const labelledTimeRangeAnnotation: Trace.Types.File.Annotation = {
      type: 'TIME_RANGE',
      bounds: {
        min: Trace.Types.Timing.Micro(0),
        max: Trace.Types.Timing.Micro(10),
        range: Trace.Types.Timing.Micro(10),
      },
      label: 'Labelled Time Range',
    };

    const colorsMap = new Map<Trace.Types.Events.Event, string>([
      [entryLabelAnnotation.entry, 'rgb(82, 252, 3)'],
      [entryLabelAnnotation2.entry, '#fc039d'],
    ]);

    const component = await renderAnnotationsTab(
        [entryLabelAnnotation, entryLabelAnnotation2, labelledTimeRangeAnnotation], colorsMap);

    const annotationsWrapperElement = component.contentElement.querySelector<HTMLElement>('.annotations');
    assert.isNotNull(annotationsWrapperElement);

    const deleteButton = component.contentElement.querySelector<HTMLElement>('.bin-icon');
    assert.isNotNull(deleteButton);

    // Ensure annotations identifiers and labels are rendered for all 3 annotations -
    // 2 entry labels and 1 labelled time range
    const annotationEntryIdentifierElements =
        component.contentElement.querySelectorAll<HTMLElement>('.annotation-identifier');
    assert.lengthOf(annotationEntryIdentifierElements, 3);

    const annotationEntryLabelElements = component.contentElement.querySelectorAll<HTMLElement>('.label');
    assert.lengthOf(annotationEntryIdentifierElements, 3);

    assert.strictEqual(annotationEntryLabelElements[0].innerText, 'Entry Label 1');
    assert.strictEqual(annotationEntryIdentifierElements[0].style['backgroundColor'], 'rgb(82, 252, 3)');
    assert.strictEqual(annotationEntryLabelElements[1].innerText, 'Entry Label 2');
    assert.strictEqual(annotationEntryIdentifierElements[1].style['backgroundColor'], 'rgb(252, 3, 157)');
    assert.strictEqual(annotationEntryLabelElements[2].innerText, 'Labelled Time Range');
  });

  it('gives the delete button accessible labels', async function() {
    const defaultTraceEvents = await TraceLoader.rawEvents(null, 'basic.json.gz');

    const entryLabelAnnotation: Trace.Types.File.Annotation = {
      type: 'ENTRY_LABEL',
      entry: defaultTraceEvents[0],
      label: 'Entry Label 1',
    };
    const component = await renderAnnotationsTab([entryLabelAnnotation], new Map());

    const deleteButton = component.contentElement.querySelector<HTMLElement>('.delete-button');
    assert.isNotNull(deleteButton);
    assert.strictEqual(
        deleteButton.getAttribute('aria-label'),
        'Delete annotation: A "thread_name" event annotated with the text "Entry Label 1"');
  });

  it('uses the URL for displaying network event labels and truncates it', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const event = parsedTrace.NetworkRequests.byTime.find(event => {
      return event.args.data.url.includes('private-aggregation-test');
    });
    assert.isOk(event);
    const annotation: Trace.Types.File.EntryLabelAnnotation = {
      type: 'ENTRY_LABEL',
      entry: event,
      label: 'hello world',
    };
    const component = await renderAnnotationsTab([annotation], new Map());

    assert.isNotNull(component.contentElement);

    const label = component.contentElement.querySelector<HTMLElement>('.annotation-identifier');
    assert.strictEqual(label?.innerText, 'private-aggregation-test.js (shared-storage-demo-content-producer.web.app)');
  });

  it('dispatches RemoveAnnotation Events when delete annotation button is clicked', async function() {
    const defaultTraceEvents = await TraceLoader.rawEvents(null, 'basic.json.gz');

    let removeAnnotationEventFired = false;

    // Create Entry Label annotation
    const entryLabelAnnotation: Trace.Types.File.Annotation = {
      type: 'ENTRY_LABEL',
      entry: defaultTraceEvents[0],
      label: 'Entry Label 1',
    };

    const component = await renderAnnotationsTab([entryLabelAnnotation], new Map());
    component.element.addEventListener('removeannotation', () => {
      removeAnnotationEventFired = true;
    });

    assert.isNotNull(component.contentElement);

    const deleteButton = component.contentElement.querySelector<HTMLElement>('.delete-button');
    assert.isNotNull(deleteButton);
    // Make sure the remove annotation event is not fired before clicking the button
    assert.isFalse(removeAnnotationEventFired);

    deleteButton.dispatchEvent(new MouseEvent('click'));
    assert.isTrue(removeAnnotationEventFired);
  });

  it('updates annotations list in the sidebar when a new list is passed in', async function() {
    const defaultTraceEvents = await TraceLoader.rawEvents(null, 'basic.json.gz');

    // Create Entry Label Annotation
    const entryLabelAnnotation: Trace.Types.File.Annotation = {
      type: 'ENTRY_LABEL',
      entry: defaultTraceEvents[0],
      label: 'Entry Label 1',
    };

    const entryLabelAnnotation2: Trace.Types.File.Annotation = {
      type: 'ENTRY_LABEL',
      entry: defaultTraceEvents[1],
      label: 'Entry Label 2',
    };

    const component = await renderAnnotationsTab([entryLabelAnnotation, entryLabelAnnotation2], new Map());

    const annotationsWrapperElement = component.contentElement.querySelector<HTMLElement>('.annotations');
    assert.isNotNull(annotationsWrapperElement);

    // Ensure there are 2 labels and their entry identifiers and labels and rendered
    const annotationIdentifierElements =
        component.contentElement.querySelectorAll<HTMLElement>('.annotation-identifier');
    assert.lengthOf(annotationIdentifierElements, 2);
    let annotationLabelElements = component.contentElement.querySelectorAll<HTMLElement>('.label');
    assert.lengthOf(annotationIdentifierElements, 2);

    assert.strictEqual(annotationLabelElements[0].innerText, 'Entry Label 1');
    assert.strictEqual(annotationLabelElements[1].innerText, 'Entry Label 2');

    // Update the labels and add a range annotation
    entryLabelAnnotation.label = 'New Entry Label 1';
    entryLabelAnnotation2.label = 'New Entry Label 2';

    const labelledTimeRangeAnnotation: Trace.Types.File.Annotation = {
      type: 'TIME_RANGE',
      bounds: {
        min: Trace.Types.Timing.Micro(0),
        max: Trace.Types.Timing.Micro(10),
        range: Trace.Types.Timing.Micro(10),
      },
      label: 'Labelled Time Range',
    };

    component.setData({
      annotations: [entryLabelAnnotation, entryLabelAnnotation2, labelledTimeRangeAnnotation],
      annotationEntryToColorMap: new Map()
    });
    await RenderCoordinator.done();
    await component.updateComplete;

    annotationLabelElements = component.contentElement.querySelectorAll<HTMLElement>('.label');

    // Ensure the labels changed to new ones and a labbel range was added
    assert.lengthOf(annotationLabelElements, 3);
    assert.strictEqual(annotationLabelElements[0].innerText, 'New Entry Label 1');
    assert.strictEqual(annotationLabelElements[1].innerText, 'New Entry Label 2');
    assert.strictEqual(annotationLabelElements[2].innerText, 'Labelled Time Range');
  });

  it('does not display multiple not started annotations for one entry', async function() {
    const defaultTraceEvents = await TraceLoader.rawEvents(null, 'basic.json.gz');

    // Create Empty Entry Label Annotation (considered not started)
    const entryLabelAnnotation: Trace.Types.File.Annotation = {
      type: 'ENTRY_LABEL',
      entry: defaultTraceEvents[0],
      label: '',
    };

    // Create Entries link that only has 'to' entry (considered not started)
    const entriesLink: Trace.Types.File.Annotation = {
      type: 'ENTRIES_LINK',
      entryFrom: defaultTraceEvents[0],
      state: Trace.Types.File.EntriesLinkState.CREATION_NOT_STARTED,
    };

    const component = await renderAnnotationsTab([entryLabelAnnotation, entriesLink], new Map());

    const annotationsWrapperElement = component.contentElement.querySelector<HTMLElement>('.annotations');
    assert.isNotNull(annotationsWrapperElement);

    // Ensure there is only one annotation displayed
    const annotationIdentifierElements =
        component.contentElement.querySelectorAll<HTMLElement>('.annotation-identifier');
    assert.lengthOf(annotationIdentifierElements, 1);
  });

  it('displays multiple not started annotations if they are not different entries', async function() {
    const defaultTraceEvents = await TraceLoader.rawEvents(null, 'basic.json.gz');

    // Create Empty Entry Label Annotation (considered not started)
    const entryLabelAnnotation: Trace.Types.File.Annotation = {
      type: 'ENTRY_LABEL',
      entry: defaultTraceEvents[0],
      label: '',
    };

    // Create Entries link that only has 'to' entry (considered not started).
    // Not started link is on a different entry than the other not started annotation
    const entriesLink: Trace.Types.File.Annotation = {
      type: 'ENTRIES_LINK',
      entryFrom: defaultTraceEvents[1],
      state: Trace.Types.File.EntriesLinkState.CREATION_NOT_STARTED,
    };

    const component = await renderAnnotationsTab([entryLabelAnnotation, entriesLink], new Map());

    const annotationsWrapperElement = component.contentElement.querySelector<HTMLElement>('.annotations');
    assert.isNotNull(annotationsWrapperElement);

    // Ensure both annotations are displayed
    const annotationIdentifierElements =
        component.contentElement.querySelectorAll<HTMLElement>('.annotation-identifier');
    assert.lengthOf(annotationIdentifierElements, 2);
  });
});
