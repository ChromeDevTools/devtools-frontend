// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../core/platform/platform.js';

import * as Adorners from './adorners.js';

const ADORNER_TAG_NAME = 'DEVTOOLS-ADORNER';

describe('Adorner', () => {
  function assertIsAdorner(element: HTMLElement) {
    assert.strictEqual(element.tagName, ADORNER_TAG_NAME, `element tag name is not ${ADORNER_TAG_NAME}`);
    assert.instanceOf(element, Adorners.Adorner.Adorner, 'element is not an instance of Adorner');
    assert.strictEqual(
        Object.getPrototypeOf(element), Adorners.Adorner.Adorner.prototype,
        'element is not on Adorner\'s prototype chain');
  }

  it('can be created by document.createElement', () => {
    const adorner = document.createElement('devtools-adorner');
    assertIsAdorner(adorner);
  });

  it('can interact as a toggle button with proper ARIA setup', () => {
    const ariaLabelDefault = 'adorner toggled on' as Platform.UIString.LocalizedString;
    const ariaLabelActive = 'adorner toggled off' as Platform.UIString.LocalizedString;

    const content = document.createElement('span');
    const adorner = new Adorners.Adorner.Adorner();
    adorner.name = ariaLabelDefault;
    adorner.append(content);
    assert.isNull(adorner.getAttribute('role'), 'non-interactive adorner had wrong aria role value');

    adorner.setAttribute('toggleable', 'true');

    // Adorner no longer handles clicks and keydowns automatically.
    // We simulate the consumer (like ElementsTreeElement) handling logic.
    const clickListener = () => {
      if (adorner.isActive()) {
        adorner.setAttribute('active', 'false');
        adorner.setAttribute('aria-label', ariaLabelDefault);
      } else {
        adorner.setAttribute('active', 'true');
        adorner.setAttribute('aria-label', ariaLabelActive);
      }
    };
    adorner.addEventListener('click', clickListener);

    // Initial state check after setting toggleable (should be inactive)
    assert.strictEqual(
        adorner.getAttribute('aria-pressed'), 'false',
        'toggle adorner didn\'t have correct initial aria-pressed value');

    // Simulate Click
    adorner.click();
    assert.strictEqual(
        adorner.getAttribute('aria-label'), ariaLabelActive,
        'interactive adorner didn\'t have correct active aria-label value');
    assert.strictEqual(
        adorner.getAttribute('role'), 'button', 'interactive adorner didn\'t have correct aria role setup');
    assert.strictEqual(
        adorner.getAttribute('aria-pressed'), 'true', 'toggle adorner didn\'t have correct active aria-pressed value');

    // Simulate toggle OFF
    adorner.click();
    assert.strictEqual(
        adorner.getAttribute('aria-label'), ariaLabelDefault,
        'interactive adorner didn\'t have correct inactive aria-label value');
    assert.strictEqual(
        adorner.getAttribute('aria-pressed'), 'false',
        'toggle adorner didn\'t have correct inactive aria-pressed value');
  });

  it('can be toggled programmatically', () => {
    const content = document.createElement('span');
    const adorner = new Adorners.Adorner.Adorner();
    adorner.name = 'foo';
    adorner.setAttribute('toggleable', 'true');
    adorner.append(content);
    assert.strictEqual(
        adorner.getAttribute('aria-pressed'), 'false',
        'toggle adorner didn\'t have correct initial aria-pressed value');

    adorner.setAttribute('active', 'true');
    assert.strictEqual(
        adorner.getAttribute('aria-pressed'), 'true', 'toggle adorner didn\'t have correct active aria-pressed value');
  });

  it('only contains the most recently slotted content after multiple data setting calls', () => {
    const content1 = document.createElement('span');
    content1.textContent = 'content 1';

    const content2 = document.createElement('div');
    content2.textContent = 'content 2';

    const content3 = document.createElement('span');
    content3.textContent = 'content 3';

    const adorner = new Adorners.Adorner.Adorner();
    adorner.data = {
      content: content1,
      name: 'foo',
    };
    adorner.data = {
      content: content2,
      name: 'foo',
    };
    adorner.data = {
      content: content3,
      name: 'foo',
    };

    const slottedChildren = adorner.children;
    assert.lengthOf(slottedChildren, 1, 'adorner light dom should only have one child with [slot="content"]');
    assert.strictEqual(
        slottedChildren[0].textContent, 'content 3', 'adorner content slot should have the most recent content');
  });
});
