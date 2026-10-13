// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as ComputedStyle from '../../models/computed_style/computed_style.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createStubbedDomNodeWithModels} from '../../testing/StyleHelpers.js';

import * as Elements from './elements.js';

describeWithEnvironment('MetricsSidebarPane', () => {
  function createWidget(
      computedStyle: Map<string, string>,
      boxModel: Protocol.DOM.BoxModel|null,
      inlineStyle: SDK.CSSStyleDeclaration.CSSStyleDeclaration|null = null,
      ): Elements.MetricsSidebarPane.MetricsSidebarPane {
    const {node, cssModel} = createStubbedDomNodeWithModels({nodeId: 1});
    (node.nodeType as sinon.SinonStub).returns(Node.ELEMENT_NODE);
    (node.boxModel as sinon.SinonStub).resolves(boxModel);
    (cssModel.isEnabled as sinon.SinonStub).returns(true);
    (cssModel.getComputedStyle as sinon.SinonStub).resolves(computedStyle);
    (cssModel.getInlineStyles as sinon.SinonStub).resolves(inlineStyle ? {inlineStyle, attributesStyle: null} : null);

    const computedStyleModel = new ComputedStyle.ComputedStyleModel.ComputedStyleModel(node);
    const widget = new Elements.MetricsSidebarPane.MetricsSidebarPane(computedStyleModel);
    renderElementIntoDOM(widget);
    return widget;
  }

  function getMetricsValues(widget: Elements.MetricsSidebarPane.MetricsSidebarPane) {
    const getText = (box: string, side: string) =>
        widget.contentElement.querySelector(`.${box} > .${side}`)?.textContent?.trim() ?? '';
    const spans = widget.contentElement.querySelectorAll('.content span');
    return {
      margin: `${getText('margin', 'top')} ${getText('margin', 'right')} ${getText('margin', 'bottom')} ${
          getText('margin', 'left')}`,
      border: `${getText('border', 'top')} ${getText('border', 'right')} ${getText('border', 'bottom')} ${
          getText('border', 'left')}`,
      padding: `${getText('padding', 'top')} ${getText('padding', 'right')} ${getText('padding', 'bottom')} ${
          getText('padding', 'left')}`,
      contentWidth: spans[0]?.textContent?.trim() ?? '',
      contentHeight: spans[2]?.textContent?.trim() ?? '',
    };
  }

  function createBoxSizingComputedStyle(boxSizing: 'border-box'|'content-box') {
    return new Map([
      ['display', 'block'],
      ['position', 'static'],
      ['box-sizing', boxSizing],
      ['width', '55px'],
      ['height', '55px'],
      ['margin-top', '1px'],
      ['margin-right', '1px'],
      ['margin-bottom', '1px'],
      ['margin-left', '1px'],
      ['padding-top', '7px'],
      ['padding-right', '7px'],
      ['padding-bottom', '7px'],
      ['padding-left', '7px'],
      ['border-top-width', '3px'],
      ['border-right-width', '3px'],
      ['border-bottom-width', '3px'],
      ['border-left-width', '3px'],
    ]);
  }

  function createStubInlineStyle() {
    const inlineStyle = sinon.createStubInstance(SDK.CSSStyleDeclaration.CSSStyleDeclaration);
    inlineStyle.allProperties.returns([]);
    inlineStyle.appendProperty.callsFake((_name: string, _value: string, callback?: (success: boolean) => void) => {
      callback?.(true);
    });
    return inlineStyle;
  }

  function editContentWidth(widget: Elements.MetricsSidebarPane.MetricsSidebarPane, newWidth: string) {
    const contentWidthSpan = widget.contentElement.querySelectorAll('.content span')[0] as HTMLElement;
    contentWidthSpan.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
    contentWidthSpan.textContent = newWidth;
    contentWidthSpan.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
  }

  it('renders content width and height from boxModel.content when available', async () => {
    const computedStyle = new Map([
      ['display', 'block'],
      ['position', 'static'],
      ['width', '300px'],
      ['height', '100px'],
      ['box-sizing', 'content-box'],
    ]);

    const boxModel: Protocol.DOM.BoxModel = {
      content: [10, 10, 275, 10, 275, 90, 10, 90],
      padding: [0, 0, 300, 0, 300, 100, 0, 100],
      border: [0, 0, 300, 0, 300, 100, 0, 100],
      margin: [0, 0, 300, 0, 300, 100, 0, 100],
      width: 300,
      height: 100,
    };

    const widget = createWidget(computedStyle, boxModel);
    widget.wasShown();
    await widget.performUpdate();

    const spans = widget.contentElement.querySelectorAll('.content span');
    assert.exists(spans);
    assert.strictEqual(spans[0].textContent, '265');
    assert.strictEqual(spans[2].textContent, '80');
    widget.detach();
  });

  it('falls back to computed style width and height when boxModel is not available', async () => {
    const computedStyle = new Map([
      ['display', 'block'],
      ['position', 'static'],
      ['width', '300px'],
      ['height', '100px'],
      ['box-sizing', 'content-box'],
    ]);

    const widget = createWidget(computedStyle, null);
    widget.wasShown();
    await widget.performUpdate();

    const spans = widget.contentElement.querySelectorAll('.content span');
    assert.exists(spans);
    assert.strictEqual(spans[0].textContent, '300');
    assert.strictEqual(spans[2].textContent, '100');
    widget.detach();
  });

  it('handles border-box dimensions and calculates inline width on edit', async () => {
    const computedStyle = createBoxSizingComputedStyle('border-box');
    const inlineStyle = createStubInlineStyle();

    const widget = createWidget(computedStyle, null, inlineStyle);
    widget.wasShown();
    await widget.performUpdate();

    const initialMetrics = getMetricsValues(widget);
    assert.strictEqual(initialMetrics.margin, '1 1 1 1');
    assert.strictEqual(initialMetrics.border, '3 3 3 3');
    assert.strictEqual(initialMetrics.padding, '7 7 7 7');
    assert.strictEqual(initialMetrics.contentWidth, '35');
    assert.strictEqual(initialMetrics.contentHeight, '35');

    editContentWidth(widget, '60');

    // For border-box, editing content width to 60px adds border (3+3) and padding (7+7) to set inline width to 80px.
    assert.isTrue(inlineStyle.appendProperty.calledOnceWith('width', '80px'));

    computedStyle.set('width', '80px');
    await widget.performUpdate();

    const modifiedMetrics = getMetricsValues(widget);
    assert.strictEqual(modifiedMetrics.margin, '1 1 1 1');
    assert.strictEqual(modifiedMetrics.border, '3 3 3 3');
    assert.strictEqual(modifiedMetrics.padding, '7 7 7 7');
    assert.strictEqual(modifiedMetrics.contentWidth, '60');
    assert.strictEqual(modifiedMetrics.contentHeight, '35');

    widget.detach();
  });

  it('handles content-box dimensions and calculates inline width on edit', async () => {
    const computedStyle = createBoxSizingComputedStyle('content-box');
    const inlineStyle = createStubInlineStyle();

    const widget = createWidget(computedStyle, null, inlineStyle);
    widget.wasShown();
    await widget.performUpdate();

    const initialMetrics = getMetricsValues(widget);
    assert.strictEqual(initialMetrics.margin, '1 1 1 1');
    assert.strictEqual(initialMetrics.border, '3 3 3 3');
    assert.strictEqual(initialMetrics.padding, '7 7 7 7');
    assert.strictEqual(initialMetrics.contentWidth, '55');
    assert.strictEqual(initialMetrics.contentHeight, '55');

    editContentWidth(widget, '60');

    // For content-box, editing content width to 60px directly sets inline width to 60px.
    assert.isTrue(inlineStyle.appendProperty.calledOnceWith('width', '60px'));

    computedStyle.set('width', '60px');
    await widget.performUpdate();

    const modifiedMetrics = getMetricsValues(widget);
    assert.strictEqual(modifiedMetrics.margin, '1 1 1 1');
    assert.strictEqual(modifiedMetrics.border, '3 3 3 3');
    assert.strictEqual(modifiedMetrics.padding, '7 7 7 7');
    assert.strictEqual(modifiedMetrics.contentWidth, '60');
    assert.strictEqual(modifiedMetrics.contentHeight, '55');

    widget.detach();
  });
});
