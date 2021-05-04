// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../../../front_end/core/common/common.js';
import type * as Platform from '../../../../../../front_end/core/platform/platform.js';
import type * as ElementsComponentsModule from '../../../../../../front_end/panels/elements/components/components.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';

const ADORNER_TAG_NAME = 'DEVTOOLS-ADORNER';

describeWithEnvironment('Adorner', async () => {
  let ElementsComponents: typeof ElementsComponentsModule;
  before(async () => {
    ElementsComponents = await import('../../../../../../front_end/panels/elements/components/components.js');
  });

  function assertIsAdorner(element: HTMLElement) {
    assert.strictEqual(element.tagName, ADORNER_TAG_NAME, `element tag name is not ${ADORNER_TAG_NAME}`);
    assert.isTrue(element instanceof ElementsComponents.Adorner.Adorner, 'element is not an instance of Adorner');
    assert.strictEqual(
        Object.getPrototypeOf(element), ElementsComponents.Adorner.Adorner.prototype,
        'element is not on Adorner\'s prototype chain');
  }

  it('can be created by document.createElement', () => {
    const adorner = document.createElement('devtools-adorner');
    assertIsAdorner(adorner);
  });

  it('can interacts as a toggle button with proper ARIA setup', () => {
    const content = document.createElement('span');
    const adorner = new ElementsComponents.Adorner.Adorner();
    adorner.data = {
      content,
      ...ElementsComponents.AdornerManager.AdornerRegistry.GRID,
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
    const adorner = new ElementsComponents.Adorner.Adorner();
    adorner.data = {
      content,
      ...ElementsComponents.AdornerManager.AdornerRegistry.GRID,
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
});
