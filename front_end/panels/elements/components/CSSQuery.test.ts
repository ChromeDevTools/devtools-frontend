// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../../core/sdk/sdk.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import type * as InlineEditor from '../../../ui/legacy/components/inline_editor/inline_editor.js';

import * as ElementsComponents from './components.js';

describe('CSSQuery', () => {
  it('renders a normal query correctly', () => {
    const component = new ElementsComponents.CSSQuery.CSSQuery();
    renderElementIntoDOM(component);
    component.data = {
      queryPrefix: '@container',
      queryText: '(min-width: 10px)',
      jslogContext: 'foo',
    };

    const queryElement = component.shadowRoot!.querySelector<HTMLElement>('.query');
    assert.isNotNull(queryElement, 'query element should exist');

    assert.strictEqual(
        queryElement.innerText,
        '@container (min-width: 10px) {',
        'text content of query element should match query text',
    );
  });

  it('renders an editable named query correctly', () => {
    const component = new ElementsComponents.CSSQuery.CSSQuery();
    renderElementIntoDOM(component);

    const clickListener = sinon.spy();

    component.data = {
      queryPrefix: '@container',
      queryName: 'container-query-1',
      queryText: '(max-width: 10px)',
      onQueryTextClick: clickListener,
      jslogContext: 'foo',
    };

    const queryElement = component.shadowRoot!.querySelector<HTMLElement>('.query');
    assert.isNotNull(queryElement, 'query element should exist');

    assert.strictEqual(
        queryElement.innerText,
        '@container container-query-1 (max-width: 10px) {',
        'text content of query element should match query text',
    );

    const queryText = queryElement.querySelector<HTMLElement>('.editable .query-text');
    assert.isNotNull(queryText, 'editable query text should exist');

    queryText.click();
    assert.strictEqual(clickListener.callCount, 1, 'query text click listener should be triggered by clicking');
  });

  it('renders a name-only container query correctly', () => {
    const component = new ElementsComponents.CSSQuery.CSSQuery();
    renderElementIntoDOM(component);
    component.data = {
      queryPrefix: '@container',
      queryName: '--bar',
      queryText: '',
      jslogContext: 'foo',
    };

    const queryElement = component.shadowRoot!.querySelector<HTMLElement>('.query');
    assert.isNotNull(queryElement, 'query element should exist');

    assert.strictEqual(
        queryElement.innerText,
        '@container --bar {',
        'text content of query element should match query text',
    );
  });

  it('renders links in style queries correctly', () => {
    const component = new ElementsComponents.CSSQuery.CSSQuery();
    renderElementIntoDOM(component);

    const clickListener = sinon.spy();
    component.data = {
      queryPrefix: '@container',
      queryText: 'style(--foo: bar)',
      onLinkActivate: clickListener,
      jslogContext: 'foo',
    };

    const matchedStyles = sinon.createStubInstance(SDK.CSSMatchedStyles.CSSMatchedStyles);
    const style = sinon.createStubInstance(SDK.CSSStyleDeclaration.CSSStyleDeclaration);
    const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    const variableValue = {
      value: 'bar',
      declaration: {} as unknown as SDK.CSSMatchedStyles.CSSValueSource,
    };
    matchedStyles.computeCSSVariable.callsFake((_style, name) => name === '--foo' ? variableValue : null);

    component.parseStyleQueries(matchedStyles, style, node, '');

    const swatch = component.shadowRoot!.querySelector('devtools-link-swatch') as InlineEditor.LinkSwatch.LinkSwatch;
    assert.exists(swatch);
    assert.strictEqual(swatch.data.text, '--foo');

    swatch.data.onLinkActivate('--foo');
    sinon.assert.calledOnce(clickListener);
  });
});
