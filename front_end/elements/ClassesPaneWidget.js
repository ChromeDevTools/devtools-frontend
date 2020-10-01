// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {ElementsPanel} from './ElementsPanel.js';

/**
 * @unrestricted
 */
export class ClassesPaneWidget extends UI.Widget.Widget {
  constructor() {
    super(true);
    this.registerRequiredCSS('elements/classesPaneWidget.css');
    this.contentElement.className = 'styles-element-classes-pane';
    const container = this.contentElement.createChild('div', 'title-container');
    this._input = container.createChild('div', 'new-class-input monospace');
    this.setDefaultFocusedElement(this._input);
    this._classesContainer = this.contentElement.createChild('div', 'source-code');
    this._classesContainer.classList.add('styles-element-classes-container');
    this._prompt = new ClassNamePrompt(this._nodeClasses.bind(this));
    this._prompt.setAutocompletionTimeout(0);
    this._prompt.renderAsBlock();

    const proxyElement = this._prompt.attach(this._input);
    this._prompt.setPlaceholder(Common.UIString.UIString('Add new class'));
    this._prompt.addEventListener(UI.TextPrompt.Events.TextChanged, this._onTextChanged, this);
    proxyElement.addEventListener('keydown', this._onKeyDown.bind(this), false);

    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.DOMMutated, this._onDOMMutated, this);
    /** @type {!Set<!SDK.DOMModel.DOMNode>} */
    this._mutatingNodes = new Set();
    /** @type {!Map<!SDK.DOMModel.DOMNode, string>} */
    this._pendingNodeClasses = new Map();
    this._updateNodeThrottler = new Common.Throttler.Throttler(0);
    /** @type {?SDK.DOMModel.DOMNode} */
    this._previousTarget = null;
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this._onSelectedNodeChanged, this);
  }

  /**
   * @param {string} text
   * @return {!Array.<string>}
   */
  _splitTextIntoClasses(text) {
    return text.split(/[,\s]/).map(className => className.trim()).filter(className => className.length);
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    if (!isEnterKey(event) && !isEscKey(event)) {
      return;
    }

    if (isEnterKey(event)) {
      event.consume();
      if (this._prompt.acceptAutoComplete()) {
        return;
      }
    }

    const eventTarget = /** @type {!HTMLElement} */ (event.target);
    let text = /** @type {string} */ (eventTarget.textContent);
    if (isEscKey(event)) {
      if (!Platform.StringUtilities.isWhitespace(text)) {
        event.consume(true);
      }
      text = '';
    }

    this._prompt.clearAutocomplete();
    eventTarget.textContent = '';

    const node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (!node) {
      return;
    }

    const classNames = this._splitTextIntoClasses(text);
    if (!classNames.length) {
      this._installNodeClasses(node);
      return;
    }

    for (const className of classNames) {
      this._toggleClass(node, className, true);
    }

    // annoucementString is used for screen reader to announce that the class(es) has been added successfully.
    const joinClassString = classNames.join(' ');
    const announcementString =
        classNames.length > 1 ? ls`Classes ${joinClassString} added.` : ls`Class ${joinClassString} added.`;
    UI.ARIAUtils.alert(announcementString, this.contentElement);

    this._installNodeClasses(node);
    this._update();
  }

  _onTextChanged() {
    const node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (!node) {
      return;
    }
    this._installNodeClasses(node);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onDOMMutated(event) {
    const node = /** @type {!SDK.DOMModel.DOMNode} */ (event.data);
    if (this._mutatingNodes.has(node)) {
      return;
    }
    cachedClassesMap.delete(node);
    this._update();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onSelectedNodeChanged(event) {
    if (this._previousTarget && this._prompt.text()) {
      this._input.textContent = '';
      this._installNodeClasses(this._previousTarget);
    }
    this._previousTarget = /** @type {?SDK.DOMModel.DOMNode} */ (event.data);
    this._update();
  }

  /**
   * @override
   */
  wasShown() {
    this._update();
  }

  _update() {
    if (!this.isShowing()) {
      return;
    }

    let node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (node) {
      node = node.enclosingElementOrSelf();
    }

    this._classesContainer.removeChildren();
    // @ts-ignore this._input is a div, not an input element. So this line makes no sense at all
    this._input.disabled = !node;

    if (!node) {
      return;
    }

    const classes = this._nodeClasses(node);
    const keys = [...classes.keys()];
    keys.sort(Platform.StringUtilities.caseInsensetiveComparator);
    for (const className of keys) {
      const label = UI.UIUtils.CheckboxLabel.create(className, classes.get(className));
      label.classList.add('monospace');
      label.checkboxElement.addEventListener('click', this._onClick.bind(this, className), false);
      this._classesContainer.appendChild(label);
    }
  }

  /**
   * @param {string} className
   * @param {!Event} event
   */
  _onClick(className, event) {
    const node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (!node) {
      return;
    }
    const enabled = /** @type {!HTMLInputElement} */ (event.target).checked;
    this._toggleClass(node, className, enabled);
    this._installNodeClasses(node);
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @return {!Map<string, boolean>}
   */
  _nodeClasses(node) {
    let result = cachedClassesMap.get(node);
    if (!result) {
      const classAttribute = node.getAttribute('class') || '';
      const classes = classAttribute.split(/\s/);
      result = new Map();
      for (let i = 0; i < classes.length; ++i) {
        const className = classes[i].trim();
        if (!className.length) {
          continue;
        }
        result.set(className, true);
      }
      cachedClassesMap.set(node, result);
    }
    return result;
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @param {string} className
   * @param {boolean} enabled
   */
  _toggleClass(node, className, enabled) {
    const classes = this._nodeClasses(node);
    classes.set(className, enabled);
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   */
  _installNodeClasses(node) {
    const classes = this._nodeClasses(node);
    const activeClasses = new Set();
    for (const className of classes.keys()) {
      if (classes.get(className)) {
        activeClasses.add(className);
      }
    }

    const additionalClasses = this._splitTextIntoClasses(this._prompt.textWithCurrentSuggestion());
    for (const className of additionalClasses) {
      activeClasses.add(className);
    }

    const newClasses = [...activeClasses.values()].sort();

    this._pendingNodeClasses.set(node, newClasses.join(' '));
    this._updateNodeThrottler.schedule(this._flushPendingClasses.bind(this));
  }

  /**
   * @return {!Promise<void>}
   */
  async _flushPendingClasses() {
    const promises = [];
    for (const node of this._pendingNodeClasses.keys()) {
      this._mutatingNodes.add(node);
      const promise = node.setAttributeValuePromise('class', /** @type {string} */ (this._pendingNodeClasses.get(node)))
                          .then(onClassValueUpdated.bind(this, node));
      promises.push(promise);
    }
    this._pendingNodeClasses.clear();
    await Promise.all(promises);

    /**
     * @param {!SDK.DOMModel.DOMNode} node
     * @this {ClassesPaneWidget}
     */
    function onClassValueUpdated(node) {
      this._mutatingNodes.delete(node);
    }
  }
}

/** @type {!WeakMap<!SDK.DOMModel.DOMNode, !Map<string, boolean>>} */
const cachedClassesMap = new WeakMap();

/**
 * @implements {UI.Toolbar.Provider}
 * @unrestricted
 */
export class ButtonProvider {
  constructor() {
    this._button = new UI.Toolbar.ToolbarToggle(Common.UIString.UIString('Element Classes'), '');
    this._button.setText('.cls');
    this._button.element.classList.add('monospace');
    this._button.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._clicked, this);
    this._view = new ClassesPaneWidget();
  }

  _clicked() {
    ElementsPanel.instance().showToolbarPane(!this._view.isShowing() ? this._view : null, this._button);
  }

  /**
   * @override
   * @return {!UI.Toolbar.ToolbarItem}
   */
  item() {
    return this._button;
  }
}

/**
 * @unrestricted
 */
export class ClassNamePrompt extends UI.TextPrompt.TextPrompt {
  /**
   * @param {function(!SDK.DOMModel.DOMNode):!Map<string, boolean>} nodeClasses
   */
  constructor(nodeClasses) {
    super();
    this._nodeClasses = nodeClasses;
    this.initialize(this._buildClassNameCompletions.bind(this), ' ');
    this.disableDefaultSuggestionForEmptyInput();
    /** @type {?string} */
    this._selectedFrameId = '';
    this._classNamesPromise = null;
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} selectedNode
   * @return {!Promise.<!Array.<string>>}
   */
  async _getClassNames(selectedNode) {
    const promises = [];
    const completions = new Set();
    this._selectedFrameId = selectedNode.frameId();

    const cssModel = selectedNode.domModel().cssModel();
    const allStyleSheets = cssModel.allStyleSheets();
    for (const stylesheet of allStyleSheets) {
      if (stylesheet.frameId !== this._selectedFrameId) {
        continue;
      }
      const cssPromise = cssModel.classNamesPromise(stylesheet.id).then(classes => {
        for (const className of classes) {
          completions.add(className);
        }
      });
      promises.push(cssPromise);
    }

    const ownerDocumentId = /** @type {number} */ (
        /** @type {!SDK.DOMModel.DOMDocument} */ (selectedNode.ownerDocument).id);

    const domPromise = selectedNode.domModel().classNamesPromise(ownerDocumentId).then(classes => {
      for (const className of classes) {
        completions.add(className);
      }
    });
    promises.push(domPromise);
    await Promise.all(promises);
    return [...completions];
  }

  /**
   * @param {string} expression
   * @param {string} prefix
   * @param {boolean=} force
   * @return {!Promise<!UI.SuggestBox.Suggestions>}
   */
  _buildClassNameCompletions(expression, prefix, force) {
    if (!prefix || force) {
      this._classNamesPromise = null;
    }

    const selectedNode = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);
    if (!selectedNode || (!prefix && !force && !expression.trim())) {
      return Promise.resolve([]);
    }

    if (!this._classNamesPromise || this._selectedFrameId !== selectedNode.frameId()) {
      this._classNamesPromise = this._getClassNames(selectedNode);
    }

    return this._classNamesPromise.then(completions => {
      const classesMap = this._nodeClasses(/** @type {!SDK.DOMModel.DOMNode} */ (selectedNode));
      completions = completions.filter(value => !classesMap.get(value));

      if (prefix[0] === '.') {
        completions = completions.map(value => '.' + value);
      }
      return completions.filter(value => value.startsWith(prefix)).sort().map(completion => ({
                                                                                text: completion,
                                                                                title: undefined,
                                                                                subtitle: undefined,
                                                                                iconType: undefined,
                                                                                priority: undefined,
                                                                                isSecondary: undefined,
                                                                                subtitleRenderer: undefined,
                                                                                selectionRange: undefined,
                                                                                hideGhostText: undefined
                                                                              }));
    });
  }
}
