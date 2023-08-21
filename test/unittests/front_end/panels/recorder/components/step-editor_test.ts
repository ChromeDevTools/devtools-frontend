// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

// eslint-disable-next-line rulesdir/es_modules_import
import * as EnvironmentHelpers from '../../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import type * as Components from '../../../../../../front_end/panels/recorder/components/components.js';
import * as Models from '../../../../../../front_end/panels/recorder/models/models.js';
// eslint-disable-next-line rulesdir/es_modules_import
import * as RecorderHelpers from '../helpers/RecorderHelpers.js';
import type * as SuggestionInput from '../../../../../../front_end/ui/components/suggestion_input/suggestion_input.js';

import {
  renderElementIntoDOM,
  getEventPromise,
  assertElement,
  dispatchKeyDownEvent,
} from '../../../helpers/DOMHelpers.js';

const {describeWithLocale} = EnvironmentHelpers;

function getStepEditedPromise(editor: Components.StepEditor.StepEditor) {
  return getEventPromise<Components.StepEditor.StepEditedEvent>(
             editor,
             'stepedited',
             )
      .then(({data}) => data);
}

const triggerMicroTaskQueue = async(n = 1): Promise<void> => {
  while (n > 0) {
    --n;
    await new Promise(resolve => setTimeout(resolve, 0));
  }
};

describeWithLocale('StepEditor', () => {
  async function renderEditor(
      step: Models.Schema.Step,
      ): Promise<Components.StepEditor.StepEditor> {
    const editor = document.createElement('devtools-recorder-step-editor');
    editor.step = structuredClone(step) as typeof editor.step;
    renderElementIntoDOM(editor, {});
    await editor.updateComplete;
    return editor;
  }

  function getInputByAttribute(
      editor: Components.StepEditor.StepEditor,
      attribute: string,
      ): SuggestionInput.SuggestionInput.SuggestionInput {
    const input = editor.renderRoot.querySelector(
        `.attribute[data-attribute="${attribute}"] devtools-suggestion-input`,
    );
    if (!input) {
      throw new Error(`${attribute} devtools-suggestion-input not found`);
    }
    return input as SuggestionInput.SuggestionInput.SuggestionInput;
  }

  function getAllInputValues(
      editor: Components.StepEditor.StepEditor,
      ): string[] {
    const result = [];
    const inputs = editor.renderRoot.querySelectorAll(
        'devtools-suggestion-input',
    );
    for (const input of inputs) {
      result.push(input.value);
    }
    return result;
  }

  async function addOptionalField(
      editor: Components.StepEditor.StepEditor,
      attribute: string,
      ): Promise<void> {
    const button = editor.renderRoot.querySelector(
        `devtools-button.add-row[data-attribute="${attribute}"]`,
    );
    assertElement(button, HTMLElement);
    button.click();
    await triggerMicroTaskQueue();
    await editor.updateComplete;
  }

  async function deleteOptionalField(
      editor: Components.StepEditor.StepEditor,
      attribute: string,
      ): Promise<void> {
    const button = editor.renderRoot.querySelector(
        `devtools-button.delete-row[data-attribute="${attribute}"]`,
    );
    assertElement(button, HTMLElement);
    button.click();
    await triggerMicroTaskQueue();
    await editor.updateComplete;
  }

  async function clickFrameLevelButton(
      editor: Components.StepEditor.StepEditor,
      className: string,
      ): Promise<void> {
    const button = editor.renderRoot.querySelector(
        `.attribute[data-attribute="frame"] devtools-button${className}`,
    );
    assertElement(button, HTMLElement);
    button.click();
    await editor.updateComplete;
  }

  async function clickSelectorLevelButton(
      editor: Components.StepEditor.StepEditor,
      path: number[],
      className: string,
      ): Promise<void> {
    const button = editor.renderRoot.querySelector(
        `[data-selector-path="${path.join('.')}"] devtools-button${className}`,
    );
    assertElement(button, HTMLElement);
    button.click();
    await editor.updateComplete;
  }

  /**
   * Extra button to be able to focus on it in tests to see how
   * the step editor reacts when the focus moves outside of it.
   */
  function createFocusOutsideButton() {
    const button = document.createElement('button');
    button.innerText = 'click';
    renderElementIntoDOM(button, {allowMultipleChildren: true});

    return {
      focus() {
        button.focus();
      },
    };
  }

  beforeEach(() => {
    RecorderHelpers.installMocksForRecordingPlayer();
  });

  it('should edit step type', async () => {
    const editor = await renderEditor({
      type: Models.Schema.StepType.Click,
      selectors: [['.cls']],
      offsetX: 1,
      offsetY: 1,
    });
    const step = getStepEditedPromise(editor);

    const input = getInputByAttribute(editor, 'type');
    input.focus();
    input.value = 'change';
    await input.updateComplete;

    input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          composed: true,
        }),
    );
    await editor.updateComplete;

    assert.deepStrictEqual(await step, {
      type: Models.Schema.StepType.Change,
      selectors: ['.cls'],
      value: 'Value',
    });
    assert.deepStrictEqual(getAllInputValues(editor), [
      'change',
      '.cls',
      'Value',
    ]);
  });

  it('should edit step type via dropdown', async () => {
    const editor = await renderEditor({type: Models.Schema.StepType.Scroll});
    const step = getStepEditedPromise(editor);

    const input = getInputByAttribute(editor, 'type');
    input.focus();
    input.value = '';
    await input.updateComplete;

    // Use the drop down.
    input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          composed: true,
        }),
    );
    input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          composed: true,
        }),
    );
    await editor.updateComplete;

    assert.deepStrictEqual(await step, {
      type: Models.Schema.StepType.Click,
      selectors: ['.cls'],
      offsetX: 1,
      offsetY: 1,
    });
    assert.deepStrictEqual(getAllInputValues(editor), [
      'click',
      '.cls',
      '1',
      '1',
    ]);
  });

  it('should edit other attributes', async () => {
    const editor = await renderEditor({
      type: Models.Schema.StepType.CustomStep,
      name: 'test',
      parameters: {},
    });
    const step = getStepEditedPromise(editor);

    const input = getInputByAttribute(editor, 'parameters');
    input.focus();
    input.value = '{"custom":"test"}';
    await input.updateComplete;

    input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          composed: true,
        }),
    );
    await editor.updateComplete;

    assert.deepStrictEqual(await step, {
      type: Models.Schema.StepType.CustomStep,
      name: 'test',
      parameters: {custom: 'test'},
    });
    assert.deepStrictEqual(getAllInputValues(editor), [
      'customStep',
      'test',
      '{"custom":"test"}',
    ]);
  });

  it('should close dropdown on Enter', async () => {
    const editor = await renderEditor({type: Models.Schema.StepType.Scroll});

    const input = getInputByAttribute(editor, 'type');
    input.focus();
    input.value = '';
    await input.updateComplete;

    const suggestions = input.renderRoot.querySelector(
        'devtools-suggestion-box',
    );
    if (!suggestions) {
      throw new Error('Failed to find element');
    }
    assert.strictEqual(
        window.getComputedStyle(suggestions).display,
        'block',
    );

    input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          composed: true,
        }),
    );
    assert.strictEqual(
        window.getComputedStyle(suggestions).display,
        'none',
    );
  });

  it('should close dropdown on focus elsewhere', async () => {
    const editor = await renderEditor({type: Models.Schema.StepType.Scroll});
    const button = createFocusOutsideButton();

    const input = getInputByAttribute(editor, 'type');
    input.focus();
    input.value = '';
    await input.updateComplete;

    const suggestions = input.renderRoot.querySelector(
        'devtools-suggestion-box',
    );
    if (!suggestions) {
      throw new Error('Failed to find element');
    }
    assert.strictEqual(
        window.getComputedStyle(suggestions).display,
        'block',
    );

    button.focus();
    assert.strictEqual(
        window.getComputedStyle(suggestions).display,
        'none',
    );
  });

  it('should add optional fields', async () => {
    const editor = await renderEditor({type: Models.Schema.StepType.Scroll});
    const step = getStepEditedPromise(editor);

    await addOptionalField(editor, 'x');

    assert.deepStrictEqual(await step, {
      type: Models.Schema.StepType.Scroll,
      x: 0,
    });
    assert.deepStrictEqual(getAllInputValues(editor), ['scroll', '0']);
  });

  it('should add the duration field', async () => {
    const editor = await renderEditor({
      type: Models.Schema.StepType.Click,
      offsetX: 1,
      offsetY: 1,
      selectors: ['.cls'],
    });
    const step = getStepEditedPromise(editor);

    await addOptionalField(editor, 'duration');

    assert.deepStrictEqual(await step, {
      type: Models.Schema.StepType.Click,
      offsetX: 1,
      offsetY: 1,
      selectors: ['.cls'],
      duration: 50,
    });
    assert.deepStrictEqual(getAllInputValues(editor), [
      'click',
      '.cls',
      '1',
      '1',
      '50',
    ]);
  });

  it('should add the parameters field', async () => {
    const editor = await renderEditor({
      type: Models.Schema.StepType.WaitForElement,
      selectors: ['.cls'],
    });
    const step = getStepEditedPromise(editor);

    await addOptionalField(editor, 'properties');

    assert.deepStrictEqual(await step, {
      type: Models.Schema.StepType.WaitForElement,
      selectors: ['.cls'],
      properties: {},
    });
    assert.deepStrictEqual(getAllInputValues(editor), [
      'waitForElement',
      '.cls',
      '{}',
    ]);
  });

  it('should edit timeout fields', async () => {
    const editor = await renderEditor({
      type: Models.Schema.StepType.Navigate,
      url: 'https://example.com',
    });
    const step = getStepEditedPromise(editor);

    await addOptionalField(editor, 'timeout');

    assert.deepStrictEqual(await step, {
      type: Models.Schema.StepType.Navigate,
      url: 'https://example.com',
      timeout: 5000,
    });
    assert.deepStrictEqual(getAllInputValues(editor), [
      'navigate',
      'https://example.com',
      '5000',
    ]);
  });

  it('should delete optional fields', async () => {
    const editor = await renderEditor({
      type: Models.Schema.StepType.Scroll,
      x: 1,
    });
    const step = getStepEditedPromise(editor);

    await deleteOptionalField(editor, 'x');

    assert.deepStrictEqual(await step, {type: Models.Schema.StepType.Scroll});
    assert.deepStrictEqual(getAllInputValues(editor), ['scroll']);
  });

  it('should add/remove frames', async () => {
    const editor = await renderEditor({
      type: Models.Schema.StepType.Scroll,
      frame: [0],
    });
    {
      const step = getStepEditedPromise(editor);

      await clickFrameLevelButton(editor, '.add-frame');

      assert.deepStrictEqual(await step, {
        type: Models.Schema.StepType.Scroll,
        frame: [0, 0],
      });
      assert.deepStrictEqual(getAllInputValues(editor), ['scroll', '0', '0']);

      assert.isTrue(
          editor.shadowRoot?.activeElement?.matches(
              'devtools-suggestion-input[data-path="frame.1"]',
              ),
      );
    }
    {
      const step = getStepEditedPromise(editor);

      await clickFrameLevelButton(editor, '.remove-frame');

      assert.deepStrictEqual(await step, {
        type: Models.Schema.StepType.Scroll,
        frame: [0],
      });
      assert.deepStrictEqual(getAllInputValues(editor), ['scroll', '0']);

      assert.isTrue(
          editor.shadowRoot?.activeElement?.matches(
              'devtools-suggestion-input[data-path="frame.0"]',
              ),
      );
    }
  });

  it('should add/remove selector parts', async () => {
    const editor = await renderEditor({
      type: Models.Schema.StepType.Scroll,
      selectors: [['.part1']],
    });

    {
      const step = getStepEditedPromise(editor);

      await clickSelectorLevelButton(editor, [0, 0], '.add-selector-part');

      assert.deepStrictEqual(await step, {
        type: Models.Schema.StepType.Scroll,
        selectors: [['.part1', '.cls']],
      });
      assert.deepStrictEqual(getAllInputValues(editor), [
        'scroll',
        '.part1',
        '.cls',
      ]);

      assert.isTrue(
          editor.shadowRoot?.activeElement?.matches(
              'devtools-suggestion-input[data-path="selectors.0.1"]',
              ),
      );
    }

    {
      const step = getStepEditedPromise(editor);

      await clickSelectorLevelButton(editor, [0, 0], '.remove-selector-part');

      assert.deepStrictEqual(await step, {
        type: Models.Schema.StepType.Scroll,
        selectors: ['.cls'],
      });
      assert.deepStrictEqual(getAllInputValues(editor), ['scroll', '.cls']);

      assert.isTrue(
          editor.shadowRoot?.activeElement?.matches(
              'devtools-suggestion-input[data-path="selectors.0.0"]',
              ),
      );
    }
  });

  it('should add/remove selectors', async () => {
    const editor = await renderEditor({
      type: Models.Schema.StepType.Scroll,
      selectors: [['.part1']],
    });
    {
      const step = getStepEditedPromise(editor);

      await clickSelectorLevelButton(editor, [0], '.add-selector');

      assert.deepStrictEqual(await step, {
        type: Models.Schema.StepType.Scroll,
        selectors: ['.part1', '.cls'],
      });
      assert.deepStrictEqual(getAllInputValues(editor), [
        'scroll',
        '.part1',
        '.cls',
      ]);
      assert.isTrue(
          editor.shadowRoot?.activeElement?.matches(
              'devtools-suggestion-input[data-path="selectors.1.0"]',
              ),
      );
    }
    {
      const step = getStepEditedPromise(editor);

      await clickSelectorLevelButton(editor, [1], '.remove-selector');

      assert.deepStrictEqual(await step, {
        type: Models.Schema.StepType.Scroll,
        selectors: ['.part1'],
      });
      assert.deepStrictEqual(getAllInputValues(editor), ['scroll', '.part1']);
      assert.isTrue(
          editor.shadowRoot?.activeElement?.matches(
              'devtools-suggestion-input[data-path="selectors.0.0"]',
              ),
      );
    }
  });

  it('should become readonly if disabled', async () => {
    const editor = await renderEditor({
      type: Models.Schema.StepType.Scroll,
      selectors: [['.part1']],
    });
    editor.disabled = true;
    await editor.updateComplete;

    for (const input of editor.renderRoot.querySelectorAll(
             'devtools-suggestion-input',
             )) {
      assert.isTrue(input.disabled);
    }
  });

  it('clears text selection when navigating away from devtools-suggestion-input', async () => {
    const editor = await renderEditor({type: Models.Schema.StepType.Scroll});

    // Clicking on the type devtools-suggestion-input should select the entire text in the field.
    const input = getInputByAttribute(editor, 'type');
    input.focus();
    input.click();
    assert.strictEqual(window.getSelection()?.toString(), 'scroll');

    // Navigating away should remove the selection.
    dispatchKeyDownEvent(input, {
      key: 'Enter',
      bubbles: true,
      composed: true,
    });
    assert.strictEqual(window.getSelection()?.toString(), '');
  });

  it('should add an attribute after another\'s deletion', async () => {
    const editor = await renderEditor({
      type: Models.Schema.StepType.WaitForElement,
      selectors: [['.cls']],
    });

    await addOptionalField(editor, 'operator');
    await deleteOptionalField(editor, 'operator');
    const step = getStepEditedPromise(editor);
    await addOptionalField(editor, 'count');

    assert.deepStrictEqual(await step, {
      type: Models.Schema.StepType.WaitForElement,
      selectors: ['.cls'],
      count: 1,
    });
    assert.deepStrictEqual(getAllInputValues(editor), [
      'waitForElement',
      '.cls',
      '1',
    ]);
  });

  it('should edit asserted events', async () => {
    const editor = await renderEditor({
      type: Models.Schema.StepType.Navigate,
      url: 'www.example.com',
      assertedEvents: [{
        type: 'navigation' as Models.Schema.AssertedEventType,
        title: 'Test',
        url: 'www.example.com',
      }],
    });

    const step = getStepEditedPromise(editor);

    const input = getInputByAttribute(editor, 'assertedEvents');
    input.focus();
    input.value = 'None';
    await input.updateComplete;

    input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          composed: true,
        }),
    );
    await editor.updateComplete;

    assert.deepStrictEqual(await step, {
      type: Models.Schema.StepType.Navigate,
      url: 'www.example.com',
      assertedEvents: [{
        type: 'navigation' as Models.Schema.AssertedEventType,
        title: 'None',
        url: 'www.example.com',
      }],
    });
  });

  it('should add/remove attribute assertion', async () => {
    const editor = await renderEditor({
      type: Models.Schema.StepType.WaitForElement,
      selectors: ['.part1'],
      attributes: {
        a: 'b',
      },
    });
    {
      const step = getStepEditedPromise(editor);

      editor.renderRoot.querySelectorAll<HTMLElement>('.add-attribute-assertion')[0]?.click();

      assert.deepStrictEqual(await step, {
        type: Models.Schema.StepType.WaitForElement,
        selectors: ['.part1'],
        attributes: {a: 'b', attribute: 'value'},
      });
      assert.deepStrictEqual(getAllInputValues(editor), [
        'waitForElement',
        '.part1',
        'a',
        'b',
        'attribute',
        'value',
      ]);
    }
    {
      const step = getStepEditedPromise(editor);

      editor.renderRoot.querySelectorAll<HTMLElement>('.remove-attribute-assertion')[1]?.click();

      assert.deepStrictEqual(await step, {
        type: Models.Schema.StepType.WaitForElement,
        selectors: ['.part1'],
        attributes: {a: 'b'},
      });
      assert.deepStrictEqual(getAllInputValues(editor), [
        'waitForElement',
        '.part1',
        'a',
        'b',
      ]);
    }
  });

  it('should edit attribute assertion', async () => {
    const editor = await renderEditor({
      type: Models.Schema.StepType.WaitForElement,
      selectors: ['.part1'],
      attributes: {
        a: 'b',
      },
    });

    const step = getStepEditedPromise(editor);

    const input = getInputByAttribute(editor, 'attributes');
    input.focus();
    input.value = 'innerText';
    await input.updateComplete;

    input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          composed: true,
        }),
    );
    await editor.updateComplete;

    assert.deepStrictEqual(await step, {
      type: Models.Schema.StepType.WaitForElement,
      selectors: ['.part1'],
      attributes: {
        innerText: 'b',
      },
    });
  });
});
