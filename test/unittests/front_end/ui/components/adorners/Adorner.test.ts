// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../../../front_end/core/common/common.js';
import * as Adorners from '../../../../../../front_end/ui/components/adorners/adorners.js';
import type * as Platform from '../../../../../../front_end/core/platform/platform.js';

const ADORNER_TAG_NAME = 'DEVTOOLS-ADORNER';

describe('Adorner', async () => {
  function assertIsAdorner(element: HTMLElement) {
    assert.strictEqual(element.tagName, ADORNER_TAG_NAME, `element tag name is not ${ADORNER_TAG_NAME}`);
    assert.isTrue(element instanceof Adorners.Adorner.Adorner, 'element is not an instance of Adorner');
    assert.strictEqual(
        Object.getPrototypeOf(element), Adorners.Adorner.Adorner.prototype,
        'element is not on Adorner\'s prototype chain');
  }

  it('can be created by document.createElement', () => {
    const adorner = document.createElement('devtools-adorner');
    assertIsAdorner(adorner);
  });

  it('can interacts as a toggle button with proper ARIA setup', () => {
    const content = document.createElement('span');
    const adorner = new Adorners.Adorner.Adorner();
    adorner.data = {
      content,
      name: 'foo',
    };
    assert.isNull(adorner.getAttribute('role'), 'non-interactive adorner had wrong aria role value');

    let clickCounter = 0;
    const clickListener = () => {
      clickCounter++;
    };

    const ariaLabelDefault = 'adorner toggled on' as Platform.UIString.LocalizedString;
    const ariaLabelActive = 'adorner toggled off' as Platform.UIString.LocalizedString;
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
    const adorner = new Adorners.Adorner.Adorner();
    adorner.data = {
      content,
      name: 'foo',
    };
    adorner.addInteraction(() => {}, {
      isToggle: true,
      shouldPropagateOnKeydown: false,
      ariaLabelActive: Common.UIString.LocalizedEmptyString,
      ariaLabelDefault: Common.UIString.LocalizedEmptyString,
    });
    assert.strictEqual(
        adorner.getAttribute('aria-pressed'), 'false',
        'toggle adorner didn\'t have correct initial aria-pressed value');

    adorner.toggle();
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

    const slottedChildren = adorner.querySelectorAll('[slot="content"]');
    assert.strictEqual(slottedChildren.length, 1, 'adorner light dom should only have one child with [slot="content"]');
    assert.strictEqual(
        slottedChildren[0].textContent, 'content 3', 'adorner content slot should have the most recent content');
  });
});
