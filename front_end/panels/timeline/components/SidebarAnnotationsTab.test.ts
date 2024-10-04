// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as TimelineComponents from './components.js';

describeWithEnvironment('SidebarAnnotationsTab', () => {
  const {SidebarAnnotationsTab} = TimelineComponents.SidebarAnnotationsTab;
  const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

  it('renders annotations tab in the sidebar', async () => {
    const component = new SidebarAnnotationsTab();
    renderElementIntoDOM(component);

    await coordinator.done();

    assert.isNotNull(component.shadowRoot);
    const annotationsWrapperElement = component.shadowRoot.querySelector<HTMLElement>('.annotations');
    assert.isNotNull(annotationsWrapperElement);
  });

  it('renders annotations list in the sidebar', async function() {
    const component = new SidebarAnnotationsTab();
    const defaultTraceEvents = await TraceLoader.rawEvents(null, 'basic.json.gz');
    renderElementIntoDOM(component);

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
        min: Trace.Types.Timing.MicroSeconds(0),
        max: Trace.Types.Timing.MicroSeconds(10),
        range: Trace.Types.Timing.MicroSeconds(10),
      },
      label: 'Labelled Time Range',
    };

    const colorsMap = new Map<Trace.Types.Events.Event, string>([
      [entryLabelAnnotation.entry, 'rgb(82, 252, 3)'],
      [entryLabelAnnotation2.entry, '#fc039d'],
    ]);

    component.annotations = [entryLabelAnnotation, entryLabelAnnotation2, labelledTimeRangeAnnotation];
    component.annotationEntryToColorMap = colorsMap;

    assert.isNotNull(component.shadowRoot);

    await coordinator.done();

    const annotationsWrapperElement = component.shadowRoot.querySelector<HTMLElement>('.annotations');
    assert.isNotNull(annotationsWrapperElement);

    const deleteButton = component.shadowRoot.querySelector<HTMLElement>('.bin-icon');
    assert.isNotNull(deleteButton);

    // Ensure annotations identifiers and labels are rendered for all 3 annotations -
    // 2 entry labels and 1 labelled time range
    const annotationEntryIdentifierElements =
        component.shadowRoot.querySelectorAll<HTMLElement>('.annotation-identifier');
    assert.strictEqual(annotationEntryIdentifierElements.length, 3);

    const annotationEntryLabelElements = component.shadowRoot.querySelectorAll<HTMLElement>('.label');
    assert.strictEqual(annotationEntryIdentifierElements.length, 3);

    assert.strictEqual(annotationEntryLabelElements[0].innerText, 'Entry Label 1');
    assert.strictEqual(annotationEntryIdentifierElements[0].style['backgroundColor'], 'rgb(82, 252, 3)');
    assert.strictEqual(annotationEntryLabelElements[1].innerText, 'Entry Label 2');
    assert.strictEqual(annotationEntryIdentifierElements[1].style['backgroundColor'], 'rgb(252, 3, 157)');
    assert.strictEqual(annotationEntryLabelElements[2].innerText, 'Labelled Time Range');
  });

  it('gives the delete button accessible labels', async function() {
    const component = new SidebarAnnotationsTab();
    const defaultTraceEvents = await TraceLoader.rawEvents(null, 'basic.json.gz');
    renderElementIntoDOM(component);

    const entryLabelAnnotation: Trace.Types.File.Annotation = {
      type: 'ENTRY_LABEL',
      entry: defaultTraceEvents[0],
      label: 'Entry Label 1',
    };
    component.annotations = [entryLabelAnnotation];
    assert.isNotNull(component.shadowRoot);
    await coordinator.done();

    const deleteButton = component.shadowRoot.querySelector<HTMLElement>('.delete-button');
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
    const component = new SidebarAnnotationsTab();
    renderElementIntoDOM(component);
    component.annotations = [annotation];
    await coordinator.done();

    assert.isNotNull(component.shadowRoot);

    const label = component.shadowRoot.querySelector<HTMLElement>('.annotation-identifier');
    assert.strictEqual(label?.innerText, 'private-aggregation-test.js (shared-sto…');
  });

  it('dispatches RemoveAnnotation Events when delete annotation button is clicked', async function() {
    const component = new SidebarAnnotationsTab();
    const defaultTraceEvents = await TraceLoader.rawEvents(null, 'basic.json.gz');
    renderElementIntoDOM(component);

    let removeAnnotationEventFired = false;
    component.addEventListener('removeannotation', () => {
      removeAnnotationEventFired = true;
    });

    // Create Entry Label annotation
    const entryLabelAnnotation: Trace.Types.File.Annotation = {
      type: 'ENTRY_LABEL',
      entry: defaultTraceEvents[0],
      label: 'Entry Label 1',
    };

    component.annotations = [entryLabelAnnotation];
    await coordinator.done();
    assert.isNotNull(component.shadowRoot);

    const deleteButton = component.shadowRoot.querySelector<HTMLElement>('.delete-button');
    assert.isNotNull(deleteButton);
    // Make sure the remove annotation event is not fired before clicking the button
    assert.isFalse(removeAnnotationEventFired);

    deleteButton.dispatchEvent(new MouseEvent('click'));
    assert.isTrue(removeAnnotationEventFired);
  });

  it('updates annotations list in the sidebar when a new list is passed in', async function() {
    const component = new SidebarAnnotationsTab();
    const defaultTraceEvents = await TraceLoader.rawEvents(null, 'basic.json.gz');
    renderElementIntoDOM(component);

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

    component.annotations = [entryLabelAnnotation, entryLabelAnnotation2];
    assert.isNotNull(component.shadowRoot);

    await coordinator.done();

    const annotationsWrapperElement = component.shadowRoot.querySelector<HTMLElement>('.annotations');
    assert.isNotNull(annotationsWrapperElement);

    // Ensure there are 2 labels and their entry identifiers and labels and rendered
    const annotationIdentifierElements = component.shadowRoot.querySelectorAll<HTMLElement>('.annotation-identifier');
    assert.strictEqual(annotationIdentifierElements.length, 2);
    let annotationLabelElements = component.shadowRoot.querySelectorAll<HTMLElement>('.label');
    assert.strictEqual(annotationIdentifierElements.length, 2);

    assert.strictEqual(annotationLabelElements[0].innerText, 'Entry Label 1');
    assert.strictEqual(annotationLabelElements[1].innerText, 'Entry Label 2');

    // Update the labels and add a range annotation
    entryLabelAnnotation.label = 'New Entry Label 1';
    entryLabelAnnotation2.label = 'New Entry Label 2';

    const labelledTimeRangeAnnotation: Trace.Types.File.Annotation = {
      type: 'TIME_RANGE',
      bounds: {
        min: Trace.Types.Timing.MicroSeconds(0),
        max: Trace.Types.Timing.MicroSeconds(10),
        range: Trace.Types.Timing.MicroSeconds(10),
      },
      label: 'Labelled Time Range',
    };

    component.annotations = [entryLabelAnnotation, entryLabelAnnotation2, labelledTimeRangeAnnotation];
    await coordinator.done();

    annotationLabelElements = component.shadowRoot.querySelectorAll<HTMLElement>('.label');

    // Ensure the labels changed to new ones and a labbel range was added
    assert.strictEqual(annotationLabelElements.length, 3);
    assert.strictEqual(annotationLabelElements[0].innerText, 'New Entry Label 1');
    assert.strictEqual(annotationLabelElements[1].innerText, 'New Entry Label 2');
    assert.strictEqual(annotationLabelElements[2].innerText, 'Labelled Time Range');
  });

  it('does not display multiple not started annotations for one entry', async function() {
    const component = new SidebarAnnotationsTab();
    const defaultTraceEvents = await TraceLoader.rawEvents(null, 'basic.json.gz');
    renderElementIntoDOM(component);

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

    component.annotations = [entryLabelAnnotation, entriesLink];
    assert.isNotNull(component.shadowRoot);

    await coordinator.done();

    const annotationsWrapperElement = component.shadowRoot.querySelector<HTMLElement>('.annotations');
    assert.isNotNull(annotationsWrapperElement);

    // Ensure there is only one annotation displayed
    const annotationIdentifierElements = component.shadowRoot.querySelectorAll<HTMLElement>('.annotation-identifier');
    assert.strictEqual(annotationIdentifierElements.length, 1);
  });

  it('displays multiple not started annotations if they are not different entries', async function() {
    const component = new SidebarAnnotationsTab();
    const defaultTraceEvents = await TraceLoader.rawEvents(null, 'basic.json.gz');
    renderElementIntoDOM(component);

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

    component.annotations = [entryLabelAnnotation, entriesLink];
    assert.isNotNull(component.shadowRoot);

    await coordinator.done();

    const annotationsWrapperElement = component.shadowRoot.querySelector<HTMLElement>('.annotations');
    assert.isNotNull(annotationsWrapperElement);

    // Ensure both annotations are displayed
    const annotationIdentifierElements = component.shadowRoot.querySelectorAll<HTMLElement>('.annotation-identifier');
    assert.strictEqual(annotationIdentifierElements.length, 2);
  });

});
