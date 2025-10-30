// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as TimelineComponents from './components.js';

describeWithEnvironment('Export Trace Options ', () => {
  interface CallbackArgsType {
    includeResourceContent: boolean;
    includeSourceMaps: boolean;
    addModifications: boolean;
  }

  const initialCallback = (args: CallbackArgsType) => {
    args.addModifications = true;
    return Promise.resolve();
  };

  async function renderExportTraceOptionsDialog(callback: typeof initialCallback = initialCallback):
      Promise<HTMLElement> {
    const exportTraceOptions = new TimelineComponents.ExportTraceOptions.ExportTraceOptions();
    exportTraceOptions.data = {
      onExport: callback,
      buttonEnabled: false,
    };

    exportTraceOptions.updateContentVisibility({annotationsExist: true});
    // Render component and wait for completion
    renderElementIntoDOM(exportTraceOptions);
    await RenderCoordinator.done();
    return exportTraceOptions;
  }

  const waitFor = async(selector: string, root?: Element|ShadowRoot): Promise<Element|null> => {
    let element = null;
    // Poll for element until found
    while (!element) {
      element = root ? root.querySelector(selector) : document.querySelector(selector);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return element;
  };

  it('should render dialog button', async () => {
    const component = await renderExportTraceOptionsDialog();
    assert.isNotNull(component.shadowRoot);
  });

  it('should render all checkbox options when experiments are enabled', async () => {
    const component = await renderExportTraceOptionsDialog();

    assert.isNotNull(component.shadowRoot);
    await waitFor('devtools-button-dialog', component.shadowRoot) as HTMLElement;
    const buttonDialog = component.shadowRoot.querySelector('devtools-button-dialog');
    assert.isNotNull(buttonDialog);
    assert.isNotNull(buttonDialog.shadowRoot);
    const buttonFromDialog = buttonDialog.shadowRoot.querySelector('devtools-button');

    assert.isNotNull(buttonFromDialog);
    assert.isTrue(buttonFromDialog.disabled);
    buttonFromDialog.disabled = false;
    buttonFromDialog.click();
    const dialogContent = await waitFor('.export-trace-options-content', component.shadowRoot) as HTMLElement;
    assert.isNotNull(dialogContent);
    const regexRows = dialogContent.querySelectorAll('devtools-checkbox') || [];
    assert.lengthOf(regexRows, 4);
    assert.isTrue(regexRows[0].checked);
    assert.isFalse(regexRows[1].checked);
    assert.isFalse(regexRows[2].checked);
  });

  it('should show include annotations checkbox only when annotations are present', async () => {
    const component = await renderExportTraceOptionsDialog();
    (component as TimelineComponents.ExportTraceOptions.ExportTraceOptions).updateContentVisibility({
      annotationsExist: false
    });

    assert.isNotNull(component.shadowRoot);
    await waitFor('devtools-button-dialog', component.shadowRoot) as HTMLElement;
    const buttonDialog = component.shadowRoot.querySelector('devtools-button-dialog');
    assert.isNotNull(buttonDialog);
    assert.isNotNull(buttonDialog.shadowRoot);
    const buttonFromDialog = buttonDialog.shadowRoot.querySelector('devtools-button');

    assert.isNotNull(buttonFromDialog);
    assert.isTrue(buttonFromDialog.disabled);
    buttonFromDialog.disabled = false;
    buttonFromDialog.click();
    const dialogContent = await waitFor('.export-trace-options-content', component.shadowRoot) as HTMLElement;
    const resultElement =
        await waitFor('devtools-checkbox[title="Include resource content"]', dialogContent) as HTMLElement;
    assert.isNotNull(resultElement);
  });

  it('should show sourcemaps checkbox', async () => {
    const component = await renderExportTraceOptionsDialog();

    assert.isNotNull(component.shadowRoot);
    await waitFor('devtools-button-dialog', component.shadowRoot) as HTMLElement;
    const buttonDialog = component.shadowRoot.querySelector('devtools-button-dialog');
    assert.isNotNull(buttonDialog);
    assert.isNotNull(buttonDialog.shadowRoot);
    const buttonFromDialog = buttonDialog.shadowRoot.querySelector('devtools-button');

    assert.isNotNull(buttonFromDialog);
    assert.isTrue(buttonFromDialog.disabled);
    buttonFromDialog.disabled = false;
    buttonFromDialog.click();
    const dialogContent = await waitFor('.export-trace-options-content', component.shadowRoot) as HTMLElement;
    assert.isNotNull(dialogContent);
    const regexRows = dialogContent.querySelectorAll('devtools-checkbox') || [];
    assert.lengthOf(regexRows, 4);
  });

  it('should disable sourcemaps checkbox when resource content is disabled', async () => {
    const component = await renderExportTraceOptionsDialog();

    assert.isNotNull(component.shadowRoot);
    await waitFor('devtools-button-dialog', component.shadowRoot) as HTMLElement;
    const buttonDialog = component.shadowRoot.querySelector('devtools-button-dialog');
    assert.isNotNull(buttonDialog);
    assert.isNotNull(buttonDialog.shadowRoot);
    const buttonFromDialog = buttonDialog.shadowRoot.querySelector('devtools-button');

    assert.isNotNull(buttonFromDialog);
    assert.isTrue(buttonFromDialog.disabled);
    buttonFromDialog.disabled = false;
    buttonFromDialog.click();
    const dialogContent = await waitFor('.export-trace-options-content', component.shadowRoot) as HTMLElement;
    assert.isNotNull(dialogContent);
    let regexRows = dialogContent.querySelectorAll('devtools-checkbox') || [];
    assert.lengthOf(regexRows, 4);
    assert.isTrue(regexRows[0].checked);
    assert.isFalse(regexRows[1].checked);
    assert.isFalse(regexRows[2].checked);
    assert.isTrue(regexRows[2].disabled);
    regexRows[1].click();
    await waitFor('devtools-checkbox[title="Include resource content"][checked]', dialogContent) as HTMLElement;
    regexRows = dialogContent.querySelectorAll('devtools-checkbox') || [];
    assert.isTrue(regexRows[0].checked);
    assert.isTrue(regexRows[1].checked);
    assert.isFalse(regexRows[2].checked);
    assert.isFalse(regexRows[2].disabled);

    regexRows[1].click();  // Clean-up
    assert.isFalse(regexRows[1].checked);
  });

  it('should execute callback with correct parameters when save button is clicked', async () => {
    let callbackExecuted = false;

    let passedArgs = null;

    // Override callback to capture arguments passed from component
    const overridenCallback = (args: CallbackArgsType) => {
      callbackExecuted = true;
      passedArgs = args;
      return Promise.resolve();
    };

    const component = await renderExportTraceOptionsDialog(overridenCallback);

    assert.isNotNull(component.shadowRoot);
    await waitFor('devtools-button-dialog', component.shadowRoot) as HTMLElement;
    const buttonDialog = component.shadowRoot.querySelector('devtools-button-dialog');
    assert.isNotNull(buttonDialog);
    assert.isNotNull(buttonDialog.shadowRoot);
    const buttonFromDialog = buttonDialog.shadowRoot.querySelector('devtools-button');

    assert.isNotNull(buttonFromDialog);
    assert.isTrue(buttonFromDialog.disabled);
    buttonFromDialog.disabled = false;
    buttonFromDialog.click();  // Open the dialog
    const dialogContent = await waitFor('.export-trace-options-content', component.shadowRoot) as HTMLElement;
    assert.isNotNull(dialogContent);

    const saveButton = dialogContent.querySelector<HTMLElement>('devtools-button[data-export-button]');
    let regexRows = dialogContent.querySelectorAll('devtools-checkbox') || [];
    assert.lengthOf(regexRows, 4);
    // Initial checkbox states: annotations=true, resource=false, sourcemaps=false
    assert.isTrue(regexRows[0].checked);
    assert.isFalse(regexRows[1].checked);
    assert.isFalse(regexRows[2].checked);
    assert.isTrue(regexRows[2].disabled);
    regexRows[1].click();  // Enable resource content checkbox
    await waitFor('devtools-checkbox[title="Include resource content"][checked]', dialogContent) as HTMLElement;
    regexRows = dialogContent.querySelectorAll('devtools-checkbox') || [];
    assert.isTrue(regexRows[0].checked);
    assert.isTrue(regexRows[1].checked);
    assert.isFalse(regexRows[2].checked);
    assert.isFalse(regexRows[2].disabled);
    assert.isFalse(callbackExecuted);
    saveButton?.click();  // Trigger export callback
    assert.isTrue(callbackExecuted, 'The export callback was not called.');

    assert.isNotNull(passedArgs);
    // Verify callback receives correct checkbox states
    assert.isTrue((passedArgs as CallbackArgsType).addModifications);
    assert.isTrue((passedArgs as CallbackArgsType).includeResourceContent);
    assert.isFalse((passedArgs as CallbackArgsType).includeSourceMaps);

    regexRows[1].click();  // Clean-up
    assert.isFalse(regexRows[1].checked);
  });
});
