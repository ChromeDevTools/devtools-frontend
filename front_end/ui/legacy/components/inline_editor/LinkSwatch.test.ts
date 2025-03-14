// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../../../testing/EnvironmentHelpers.js';

import * as InlineEditor from './inline_editor.js';

function assertLinkSwatch(swatch: InlineEditor.LinkSwatch.LinkSwatch, expected: {
  text: string|null,
  title: string|null,
  isDefined: boolean,
}) {
  const link = swatch!.querySelector('button');

  assert.strictEqual(
      link!.classList.contains('undefined'), !expected.isDefined,
      'The link only has the class undefined when the property is undefined');
  assert.strictEqual(link!.getAttribute('title'), expected.title, 'The link has the right tooltip');
  assert.strictEqual(link!.textContent, expected.text, 'The link has the right text content');
}

describeWithLocale('LinkSwatch', () => {
  it('can be instantiated successfully', () => {
    const component = new InlineEditor.LinkSwatch.LinkSwatch();
    renderElementIntoDOM(component);

    assert.instanceOf(component, HTMLElement, 'The swatch is an instance of HTMLElement');
  });

  it('renders a simple text', () => {
    const component = new InlineEditor.LinkSwatch.LinkSwatch();
    component.data = {
      text: 'test',
      tooltip: undefined,
      isDefined: true,
      onLinkActivate: () => {},
      jslogContext: 'test',
    };
    renderElementIntoDOM(component);

    assertLinkSwatch(component, {
      text: 'test',
      title: null,
      isDefined: true,
    });
  });

  it('renders a missing test', () => {
    const component = new InlineEditor.LinkSwatch.LinkSwatch();
    component.data = {
      text: 'test',
      tooltip: {title: 'test is not defined'},
      isDefined: false,
      onLinkActivate: () => {},
      jslogContext: 'test',
    };
    renderElementIntoDOM(component);

    assertLinkSwatch(component, {
      text: 'test',
      title: 'test is not defined',
      isDefined: false,
    });
  });

  it('calls the onLinkActivate callback', async () => {
    const component = new InlineEditor.LinkSwatch.LinkSwatch();
    let callbackCalled = false;
    component.data = {
      text: 'testHandler',
      tooltip: undefined,
      isDefined: true,
      onLinkActivate: () => {
        callbackCalled = true;
      },
      jslogContext: 'test',
    };

    const element = renderElementIntoDOM(component).querySelector('button') as HTMLButtonElement;
    element.click();

    assert.isTrue(callbackCalled);
  });
});
