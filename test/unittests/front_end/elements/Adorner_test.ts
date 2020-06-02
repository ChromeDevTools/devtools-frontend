// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {Adorner, AdornerCategories} from '../../../../front_end/elements/Adorner.js';

const ADORNER_TAG_NAME = 'DEVTOOLS-ADORNER';
const ADORNER_NAME = 'grid';

function assertIsAdorner(element: HTMLElement) {
  assert.strictEqual(element.tagName, ADORNER_TAG_NAME, `element tag name is not ${ADORNER_TAG_NAME}`);
  assert.isTrue(element instanceof Adorner, 'element is not an instance of Adorner');
  assert.strictEqual(Object.getPrototypeOf(element), Adorner.prototype, 'element is not on Adorner\'s prototype chain');
}

describe('Adorner', () => {
  it('can be created by document.createElement', () => {
    const adorner = document.createElement('devtools-adorner');
    assertIsAdorner(adorner);
  });

  it('can be created by Adorner.create', () => {
    const content = document.createElement('span');
    content.textContent = ADORNER_NAME;
    const adorner = Adorner.create(content, ADORNER_NAME);
    assertIsAdorner(adorner);

    const options = {
      category: AdornerCategories.Layout,
    };
    const adornerWithOptions = Adorner.create(content, ADORNER_NAME, options);
    assertIsAdorner(adornerWithOptions);
    assert.strictEqual(adornerWithOptions.category, AdornerCategories.Layout);
  });

  it('can interacts as a toggle button with proper ARIA setup', () => {
    const content = document.createElement('span');
    const adorner = Adorner.create(content, ADORNER_NAME);
    assert.isNull(adorner.getAttribute('role'), 'non-interactive adorner had wrong aria role value');

    let clickCounter = 0;
    const clickListener = () => {
      clickCounter++;
    };

    const ariaLabelDefault = 'adorner toggled on';
    const ariaLabelActive = 'adorner toggled off';
    adorner.addInteraction(clickListener, {
      isToggle: true,
      shouldPropagateOnKeydown: false,
      ariaLabelActive,
      ariaLabelDefault,
    });
    assert.strictEqual(
        adorner.getAttribute('aria-label'), ariaLabelDefault,
        'interactive adorner didn\'t have correct initial aria-label value');
    assert.strictEqual(
        adorner.getAttribute('role'), 'button', 'interactive adorner didn\'t have correct aria role setup');
    assert.strictEqual(
        adorner.getAttribute('aria-pressed'), 'false',
        'toggle adorner didn\'t have correct initial aria-pressed value');

    adorner.click();
    assert.strictEqual(clickCounter, 1, 'interactive adorner was not triggered by clicking');
    assert.strictEqual(
        adorner.getAttribute('aria-label'), ariaLabelActive,
        'interactive adorner didn\'t have correct active aria-label value');
    assert.strictEqual(
        adorner.getAttribute('aria-pressed'), 'true', 'toggle adorner didn\'t have correct active aria-pressed value');

    adorner.dispatchEvent(new KeyboardEvent('keydown', {'code': 'Enter'}));
    assert.strictEqual(clickCounter, 2, 'interactive adorner was not triggered by Enter key');
    assert.strictEqual(
        adorner.getAttribute('aria-label'), ariaLabelDefault,
        'interactive adorner didn\'t have correct inactive aria-label value');
    assert.strictEqual(
        adorner.getAttribute('aria-pressed'), 'false',
        'toggle adorner didn\'t have correct inactive aria-pressed value');

    adorner.dispatchEvent(new KeyboardEvent('keydown', {'code': 'Space'}));
    assert.strictEqual(clickCounter, 3, 'interactive adorner was not triggered by Space key');
    assert.strictEqual(
        adorner.getAttribute('aria-label'), ariaLabelActive,
        'interactive adorner didn\'t have correct active aria-label value');
    assert.strictEqual(
        adorner.getAttribute('aria-pressed'), 'true', 'toggle adorner didn\'t have correct active aria-pressed value');
  });

  it('can be toggled programmatically', () => {
    const content = document.createElement('span');
    const adorner = Adorner.create(content, ADORNER_NAME);
    adorner.addInteraction(() => {}, {
      isToggle: true,
      shouldPropagateOnKeydown: false,
      ariaLabelActive: '',
      ariaLabelDefault: '',
    });
    assert.strictEqual(
        adorner.getAttribute('aria-pressed'), 'false',
        'toggle adorner didn\'t have correct initial aria-pressed value');

    adorner.toggle();
    assert.strictEqual(
        adorner.getAttribute('aria-pressed'), 'true', 'toggle adorner didn\'t have correct active aria-pressed value');
  });
});
