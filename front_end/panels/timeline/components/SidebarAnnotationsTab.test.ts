// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TraceEngine from '../../../models/trace/trace.js';
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
    const entryLabelAnnotation: TraceEngine.Types.File.Annotation = {
      type: 'ENTRY_LABEL',
      entry: defaultTraceEvents[0],
      label: 'Entry Label 1',
    };

    const entryLabelAnnotation2: TraceEngine.Types.File.Annotation = {
      type: 'ENTRY_LABEL',
      entry: defaultTraceEvents[1],
      label: 'Entry Label 2',
    };

    component.annotations = [entryLabelAnnotation, entryLabelAnnotation2];
    assert.isNotNull(component.shadowRoot);

    await coordinator.done();

    const annotationsWrapperElement = component.shadowRoot.querySelector<HTMLElement>('.annotations');
    assert.isNotNull(annotationsWrapperElement);

    const deleteButton = component.shadowRoot.querySelector<HTMLElement>('.bin-icon');
    assert.isNotNull(deleteButton);

    // Ensure there are 2 labels and their entry names and labels and rendered
    const annotationEntryNameElements = component.shadowRoot.querySelectorAll<HTMLElement>('.entry-name');
    assert.strictEqual(annotationEntryNameElements.length, 2);

    const annotationEntryLabelElements = component.shadowRoot.querySelectorAll<HTMLElement>('.label');
    assert.strictEqual(annotationEntryNameElements.length, 2);

    assert.strictEqual(annotationEntryLabelElements[0].innerText, 'Entry Label 1');
    assert.strictEqual(annotationEntryLabelElements[1].innerText, 'Entry Label 2');
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
    const entryLabelAnnotation: TraceEngine.Types.File.Annotation = {
      type: 'ENTRY_LABEL',
      entry: defaultTraceEvents[0],
      label: 'Entry Label 1',
    };

    component.annotations = [entryLabelAnnotation];
    assert.isNotNull(component.shadowRoot);

    await coordinator.done();

    const deleteButton = component.shadowRoot.querySelector<HTMLElement>('.bin-icon');
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
    const entryLabelAnnotation: TraceEngine.Types.File.Annotation = {
      type: 'ENTRY_LABEL',
      entry: defaultTraceEvents[0],
      label: 'Entry Label 1',
    };

    const entryLabelAnnotation2: TraceEngine.Types.File.Annotation = {
      type: 'ENTRY_LABEL',
      entry: defaultTraceEvents[1],
      label: 'Entry Label 2',
    };

    component.annotations = [entryLabelAnnotation, entryLabelAnnotation2];
    assert.isNotNull(component.shadowRoot);

    await coordinator.done();

    const annotationsWrapperElement = component.shadowRoot.querySelector<HTMLElement>('.annotations');
    assert.isNotNull(annotationsWrapperElement);

    // Ensure there are 2 labels and their entry names and labels and rendered
    const annotationEntryNameElements = component.shadowRoot.querySelectorAll<HTMLElement>('.entry-name');
    assert.strictEqual(annotationEntryNameElements.length, 2);
    const annotationEntryLabelElements = component.shadowRoot.querySelectorAll<HTMLElement>('.label');
    assert.strictEqual(annotationEntryNameElements.length, 2);

    assert.strictEqual(annotationEntryLabelElements[0].innerText, 'Entry Label 1');
    assert.strictEqual(annotationEntryLabelElements[1].innerText, 'Entry Label 2');

    // Update the labels and pass the list again
    entryLabelAnnotation.label = 'New Entry Label 1';
    entryLabelAnnotation2.label = 'New Entry Label 2';

    component.annotations = [entryLabelAnnotation, entryLabelAnnotation2];
    await coordinator.done();

    // Ensure the labels changed to new ones
    assert.strictEqual(annotationEntryLabelElements[0].innerText, 'New Entry Label 1');
    assert.strictEqual(annotationEntryLabelElements[1].innerText, 'New Entry Label 2');
  });
});
