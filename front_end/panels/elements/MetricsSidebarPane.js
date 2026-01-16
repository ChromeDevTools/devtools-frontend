// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/*
 * Copyright (C) 2007 Apple Inc.  All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { ElementsSidebarPane } from './ElementsSidebarPane.js';
import metricsSidebarPaneStyles from './metricsSidebarPane.css.js';
const { live } = Directives;
const DEFAULT_VIEW = (input, output, target) => {
    const { style, highlightedMode, node, contentWidth, contentHeight, onHighlightNode, onStartEditing } = input;
    function createBoxPartElement(style, name, side, suffix) {
        const propertyName = (name !== 'position' ? name + '-' : '') + side + suffix;
        let value = style.get(propertyName);
        if (value === '' || (name !== 'position' && value === 'unset')) {
            value = '\u2012';
        }
        else if (name === 'position' && value === 'auto') {
            value = '\u2012';
        }
        value = value?.replace(/px$/, '');
        value = value ? Platform.NumberUtilities.toFixedIfFloating(value) : value;
        // clang-format off
        return html `<div class=${side} jslog=${VisualLogging.value(propertyName).track({
            dblclick: true, keydown: 'Enter|Escape|ArrowUp|ArrowDown|PageUp|PageDown', change: true,
        })}
        @dblclick=${(e) => onStartEditing(e.currentTarget, name, propertyName, style)}
        .innerText=${live(value ?? '')}>
    </div>`;
        // clang-format on
    }
    // Display types for which margin is ignored.
    const noMarginDisplayType = new Set([
        'table-cell',
        'table-column',
        'table-column-group',
        'table-footer-group',
        'table-header-group',
        'table-row',
        'table-row-group',
    ]);
    // Display types for which padding is ignored.
    const noPaddingDisplayType = new Set([
        'table-column',
        'table-column-group',
        'table-footer-group',
        'table-header-group',
        'table-row',
        'table-row-group',
    ]);
    // Position types for which top, left, bottom and right are ignored.
    const noPositionType = new Set(['static']);
    const boxes = ['content', 'padding', 'border', 'margin', 'position'];
    const boxColors = [
        Common.Color.PageHighlight.Content,
        Common.Color.PageHighlight.Padding,
        Common.Color.PageHighlight.Border,
        Common.Color.PageHighlight.Margin,
        Common.Color.Legacy.fromRGBA([0, 0, 0, 0]),
    ];
    const boxLabels = ['content', 'padding', 'border', 'margin', 'position'];
    let previousBox = nothing;
    for (let i = 0; i < boxes.length; ++i) {
        const name = boxes[i];
        const display = style.get('display');
        const position = style.get('position');
        if (!display || !position) {
            continue;
        }
        if (name === 'margin' && noMarginDisplayType.has(display)) {
            continue;
        }
        if (name === 'padding' && noPaddingDisplayType.has(display)) {
            continue;
        }
        if (name === 'position' && noPositionType.has(position)) {
            continue;
        }
        const shouldHighlight = !node || highlightedMode === 'all' || name === highlightedMode;
        const backgroundColor = boxColors[i].asString("rgba" /* Common.Color.Format.RGBA */) || '';
        const suffix = (name === 'border' ? '-width' : '');
        // clang-format off
        const box = html `
      <div
          class="${name} ${shouldHighlight ? 'highlighted' : ''}"
          style="background-color: ${shouldHighlight ? backgroundColor : ''}"
          jslog=${VisualLogging.metricsBox().context(name).track({ hover: true })}
          @mouseover=${(e) => { e.consume(); onHighlightNode(true, name === 'position' ? 'all' : name); }}>
      ${name === 'content' ? html `
        <span jslog=${VisualLogging.value('width').track({
            dblclick: true,
            keydown: 'Enter|Escape|ArrowUp|ArrowDown|PageUp|PageDown',
            change: true,
        })}
            @dblclick=${(e) => onStartEditing(e.currentTarget, 'width', 'width', style)}
            .innerText=${live(contentWidth)}>
        </span>
        <span> × </span>
        <span jslog=${VisualLogging.value('height').track({
            dblclick: true,
            keydown: 'Enter|Escape|ArrowUp|ArrowDown|PageUp|PageDown',
            change: true,
        })}
            @dblclick=${(e) => onStartEditing(e.currentTarget, 'height', 'height', style)}
            .innerText=${live(contentHeight)}>
        </span>` : html `
        <div class="label">${boxLabels[i]}</div>
          ${createBoxPartElement(style, name, 'top', suffix)}
          <br>
          ${createBoxPartElement(style, name, 'left', suffix)}
          ${previousBox}
          ${createBoxPartElement(style, name, 'right', suffix)}
          <br>
          ${createBoxPartElement(style, name, 'bottom', suffix)}`}
        </div>`;
        // clang-format on
        previousBox = box;
    }
    // clang-format off
    render(html `
    <div class="metrics ${!node ? 'collapsed' : ''}" @mouseover=${(e) => { e.consume(); onHighlightNode(true, 'all'); }}
        @mouseleave=${(e) => { e.consume(); onHighlightNode(false, 'all'); }}>
      ${previousBox}
    </div>`, target);
    // clang-format on
};
export class MetricsSidebarPane extends ElementsSidebarPane {
    originalPropertyData;
    previousPropertyDataCandidate;
    inlineStyle;
    highlightMode;
    computedStyle;
    isEditingMetrics;
    view;
    constructor(computedStyleModel, view = DEFAULT_VIEW) {
        super(computedStyleModel, { jslog: `${VisualLogging.pane('styles-metrics')}` });
        this.registerRequiredCSS(metricsSidebarPaneStyles);
        this.originalPropertyData = null;
        this.previousPropertyDataCandidate = null;
        this.inlineStyle = null;
        this.highlightMode = '';
        this.computedStyle = null;
        this.view = view;
    }
    async performUpdate() {
        // "style" attribute might have changed. Update metrics unless they are being edited
        // (if a CSS property is added, a StyleSheetChanged event is dispatched).
        if (this.isEditingMetrics) {
            return await Promise.resolve();
        }
        // FIXME: avoid updates of a collapsed pane.
        const node = this.node();
        const cssModel = this.cssModel();
        if (!node || node.nodeType() !== Node.ELEMENT_NODE || !cssModel) {
            this.view({
                style: new Map(),
                highlightedMode: '',
                node: null,
                contentWidth: '',
                contentHeight: '',
                onHighlightNode: () => { },
                onStartEditing: () => { },
            }, undefined, this.contentElement);
            return await Promise.resolve();
        }
        function callback(style) {
            if (!style || this.node() !== node) {
                this.computedStyle = null;
                return;
            }
            this.computedStyle = style;
            this.updateMetrics(style);
        }
        if (!node.id) {
            return await Promise.resolve();
        }
        const promises = [
            cssModel.getComputedStyle(node.id).then(callback.bind(this)),
            cssModel.getInlineStyles(node.id).then(inlineStyleResult => {
                if (inlineStyleResult && this.node() === node) {
                    this.inlineStyle = inlineStyleResult.inlineStyle;
                }
            }),
        ];
        return await Promise.all(promises);
    }
    onCSSModelChanged() {
        this.requestUpdate();
    }
    getPropertyValueAsPx(style, propertyName) {
        const propertyValue = style.get(propertyName);
        if (!propertyValue) {
            return 0;
        }
        return Number(propertyValue.replace(/px$/, '') || 0);
    }
    getBox(computedStyle, componentName) {
        const suffix = componentName === 'border' ? '-width' : '';
        const left = this.getPropertyValueAsPx(computedStyle, componentName + '-left' + suffix);
        const top = this.getPropertyValueAsPx(computedStyle, componentName + '-top' + suffix);
        const right = this.getPropertyValueAsPx(computedStyle, componentName + '-right' + suffix);
        const bottom = this.getPropertyValueAsPx(computedStyle, componentName + '-bottom' + suffix);
        return { left, top, right, bottom };
    }
    highlightDOMNode(showHighlight, mode) {
        const node = this.node();
        if (showHighlight && node) {
            if (this.highlightMode === mode) {
                return;
            }
            this.highlightMode = mode;
            node.highlight(mode);
        }
        else {
            this.highlightMode = '';
            SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
        }
        if (this.computedStyle) {
            this.updateMetrics(this.computedStyle, mode);
        }
    }
    getContentAreaWidthPx(style) {
        let width = style.get('width');
        if (!width) {
            return '';
        }
        width = width.replace(/px$/, '');
        const widthValue = Number(width);
        if (!isNaN(widthValue) && style.get('box-sizing') === 'border-box') {
            const borderBox = this.getBox(style, 'border');
            const paddingBox = this.getBox(style, 'padding');
            width = (widthValue - borderBox.left - borderBox.right - paddingBox.left - paddingBox.right).toString();
        }
        return Platform.NumberUtilities.toFixedIfFloating(width);
    }
    getContentAreaHeightPx(style) {
        let height = style.get('height');
        if (!height) {
            return '';
        }
        height = height.replace(/px$/, '');
        const heightValue = Number(height);
        if (!isNaN(heightValue) && style.get('box-sizing') === 'border-box') {
            const borderBox = this.getBox(style, 'border');
            const paddingBox = this.getBox(style, 'padding');
            height = (heightValue - borderBox.top - borderBox.bottom - paddingBox.top - paddingBox.bottom).toString();
        }
        return Platform.NumberUtilities.toFixedIfFloating(height);
    }
    updateMetrics(style, highlightedMode = 'all') {
        this.view({
            style,
            highlightedMode,
            node: this.node(),
            contentWidth: this.getContentAreaWidthPx(style),
            contentHeight: this.getContentAreaHeightPx(style),
            onHighlightNode: this.highlightDOMNode.bind(this),
            onStartEditing: this.startEditing.bind(this),
        }, undefined, this.contentElement);
    }
    startEditing(targetElement, box, styleProperty, computedStyle) {
        if (UI.UIUtils.isBeingEdited(targetElement)) {
            return;
        }
        const context = { box, styleProperty, computedStyle, keyDownHandler: () => { } };
        const boundKeyDown = this.handleKeyDown.bind(this, context);
        context.keyDownHandler = boundKeyDown;
        targetElement.addEventListener('keydown', boundKeyDown, false);
        this.isEditingMetrics = true;
        const config = new UI.InplaceEditor.Config(this.editingCommitted.bind(this), this.editingCancelled.bind(this), context);
        UI.InplaceEditor.InplaceEditor.startEditing(targetElement, config);
        const selection = targetElement.getComponentSelection();
        selection?.selectAllChildren(targetElement);
    }
    handleKeyDown(context, event) {
        const element = event.currentTarget;
        function finishHandler(originalValue, replacementString) {
            this.applyUserInput(element, replacementString, originalValue, context, false);
        }
        function customNumberHandler(prefix, number, suffix) {
            if (context.styleProperty !== 'margin' && number < 0) {
                number = 0;
            }
            return prefix + number + suffix;
        }
        UI.UIUtils.handleElementValueModifications(event, element, finishHandler.bind(this), undefined, customNumberHandler);
    }
    editingEnded(element, context) {
        this.originalPropertyData = null;
        this.previousPropertyDataCandidate = null;
        element.removeEventListener('keydown', context.keyDownHandler, false);
        delete this.isEditingMetrics;
    }
    editingCancelled(element, context) {
        if (this.inlineStyle) {
            if (!this.originalPropertyData) {
                // An added property, remove the last property in the style.
                const pastLastSourcePropertyIndex = this.inlineStyle.pastLastSourcePropertyIndex();
                if (pastLastSourcePropertyIndex) {
                    void this.inlineStyle.allProperties()[pastLastSourcePropertyIndex - 1].setText('', false);
                }
            }
            else {
                void this.inlineStyle.allProperties()[this.originalPropertyData.index].setText(this.originalPropertyData.propertyText || '', false);
            }
        }
        this.editingEnded(element, context);
        this.requestUpdate();
    }
    applyUserInput(element, userInput, previousContent, context, commitEditor) {
        if (!this.inlineStyle) {
            // Element has no renderer.
            return this.editingCancelled(element, context); // nothing changed, so cancel
        }
        if (commitEditor && userInput === previousContent) {
            return this.editingCancelled(element, context);
        } // nothing changed, so cancel
        if (context.box !== 'position' && (!userInput || userInput === '\u2012' || userInput === '-')) {
            userInput = 'unset';
        }
        else if (context.box === 'position' && (!userInput || userInput === '\u2012' || userInput === '-')) {
            userInput = 'auto';
        }
        userInput = userInput.toLowerCase();
        // Append a "px" unit if the user input was just a number.
        if (/^\d+$/.test(userInput)) {
            userInput += 'px';
        }
        const styleProperty = context.styleProperty;
        const computedStyle = context.computedStyle;
        if (computedStyle.get('box-sizing') === 'border-box' && (styleProperty === 'width' || styleProperty === 'height')) {
            if (!userInput.match(/px$/)) {
                Common.Console.Console.instance().error('For elements with box-sizing: border-box, only absolute content area dimensions can be applied');
                return;
            }
            const borderBox = this.getBox(computedStyle, 'border');
            const paddingBox = this.getBox(computedStyle, 'padding');
            let userValuePx = Number(userInput.replace(/px$/, ''));
            if (isNaN(userValuePx)) {
                return;
            }
            if (styleProperty === 'width') {
                userValuePx += borderBox.left + borderBox.right + paddingBox.left + paddingBox.right;
            }
            else {
                userValuePx += borderBox.top + borderBox.bottom + paddingBox.top + paddingBox.bottom;
            }
            userInput = userValuePx + 'px';
        }
        this.previousPropertyDataCandidate = null;
        const allProperties = this.inlineStyle.allProperties();
        for (let i = 0; i < allProperties.length; ++i) {
            const property = allProperties[i];
            if (property.name !== context.styleProperty || (property.parsedOk && !property.activeInStyle())) {
                continue;
            }
            this.previousPropertyDataCandidate = property;
            property.setValue(userInput, commitEditor, true, callback.bind(this));
            return;
        }
        this.inlineStyle.appendProperty(context.styleProperty, userInput, callback.bind(this));
        function callback(success) {
            if (!success) {
                return;
            }
            if (!this.originalPropertyData) {
                this.originalPropertyData = this.previousPropertyDataCandidate;
            }
            if (this.highlightMode) {
                const node = this.node();
                if (!node) {
                    return;
                }
                node.highlight(this.highlightMode);
            }
            if (commitEditor) {
                this.requestUpdate();
            }
        }
    }
    editingCommitted(element, userInput, previousContent, context) {
        this.editingEnded(element, context);
        this.applyUserInput(element, userInput, previousContent, context, true);
    }
}
//# sourceMappingURL=MetricsSidebarPane.js.map