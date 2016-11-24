// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Elements.ClassesPaneWidget = class extends UI.Widget {
  constructor() {
    super();
    this.element.className = 'styles-element-classes-pane';
    var container = this.element.createChild('div', 'title-container');
    this._input = container.createChild('div', 'new-class-input monospace');
    this._input.setAttribute('placeholder', Common.UIString('Add new class'));
    this.setDefaultFocusedElement(this._input);
    this._classesContainer = this.element.createChild('div', 'source-code');
    this._classesContainer.classList.add('styles-element-classes-container');
    this._prompt = new Elements.ClassesPaneWidget.ClassNamePrompt();
    this._prompt.setAutocompletionTimeout(0);
    this._prompt.renderAsBlock();

    var proxyElement = this._prompt.attach(this._input);
    proxyElement.addEventListener('keydown', this._onKeyDown.bind(this), false);

    SDK.targetManager.addModelListener(SDK.DOMModel, SDK.DOMModel.Events.DOMMutated, this._onDOMMutated, this);
    /** @type {!Set<!SDK.DOMNode>} */
    this._mutatingNodes = new Set();
    UI.context.addFlavorChangeListener(SDK.DOMNode, this._update, this);
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    var text = event.target.textContent;
    if (isEscKey(event)) {
      event.target.textContent = '';
      if (!text.isWhitespace())
        event.consume(true);
      return;
    }

    if (!isEnterKey(event))
      return;
    var node = UI.context.flavor(SDK.DOMNode);
    if (!node)
      return;

    this._prompt.clearAutocomplete();
    event.target.textContent = '';
    var classNames = text.split(/[.,\s]/);
    for (var className of classNames) {
      var className = className.trim();
      if (!className.length)
        continue;
      this._toggleClass(node, className, true);
    }
    this._installNodeClasses(node);
    this._update();
    event.consume(true);
  }

  /**
   * @param {!Common.Event} event
   */
  _onDOMMutated(event) {
    var node = /** @type {!SDK.DOMNode} */ (event.data);
    if (this._mutatingNodes.has(node))
      return;
    delete node[Elements.ClassesPaneWidget._classesSymbol];
    this._update();
  }

  /**
   * @override
   */
  wasShown() {
    this._update();
  }

  _update() {
    if (!this.isShowing())
      return;

    var node = UI.context.flavor(SDK.DOMNode);
    if (node)
      node = node.enclosingElementOrSelf();

    this._classesContainer.removeChildren();
    this._input.disabled = !node;

    if (!node)
      return;

    var classes = this._nodeClasses(node);
    var keys = classes.keysArray();
    keys.sort(String.caseInsensetiveComparator);
    for (var i = 0; i < keys.length; ++i) {
      var className = keys[i];
      var label = createCheckboxLabel(className, classes.get(className));
      label.visualizeFocus = true;
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
    var node = UI.context.flavor(SDK.DOMNode);
    if (!node)
      return;
    var enabled = event.target.checked;
    this._toggleClass(node, className, enabled);
    this._installNodeClasses(node);
  }

  /**
   * @param {!SDK.DOMNode} node
   * @return {!Map<string, boolean>}
   */
  _nodeClasses(node) {
    var result = node[Elements.ClassesPaneWidget._classesSymbol];
    if (!result) {
      var classAttribute = node.getAttribute('class') || '';
      var classes = classAttribute.split(/\s/);
      result = new Map();
      for (var i = 0; i < classes.length; ++i) {
        var className = classes[i].trim();
        if (!className.length)
          continue;
        result.set(className, true);
      }
      node[Elements.ClassesPaneWidget._classesSymbol] = result;
    }
    return result;
  }

  /**
   * @param {!SDK.DOMNode} node
   * @param {string} className
   * @param {boolean} enabled
   */
  _toggleClass(node, className, enabled) {
    var classes = this._nodeClasses(node);
    classes.set(className, enabled);
  }

  /**
   * @param {!SDK.DOMNode} node
   */
  _installNodeClasses(node) {
    var classes = this._nodeClasses(node);
    var activeClasses = new Set();
    for (var className of classes.keys()) {
      if (classes.get(className))
        activeClasses.add(className);
    }

    var newClasses = activeClasses.valuesArray();
    newClasses.sort();
    this._mutatingNodes.add(node);
    node.setAttributeValue('class', newClasses.join(' '), onClassNameUpdated.bind(this));

    /**
     * @this {Elements.ClassesPaneWidget}
     */
    function onClassNameUpdated() {
      this._mutatingNodes.delete(node);
    }
  }
};

Elements.ClassesPaneWidget._classesSymbol = Symbol('Elements.ClassesPaneWidget._classesSymbol');

/**
 * @implements {UI.ToolbarItem.Provider}
 * @unrestricted
 */
Elements.ClassesPaneWidget.ButtonProvider = class {
  constructor() {
    this._button = new UI.ToolbarToggle(Common.UIString('Element Classes'), '');
    this._button.setText('.cls');
    this._button.element.classList.add('monospace');
    this._button.addEventListener('click', this._clicked, this);
    this._view = new Elements.ClassesPaneWidget();
  }

  _clicked() {
    Elements.ElementsPanel.instance().showToolbarPane(!this._view.isShowing() ? this._view : null, this._button);
  }

  /**
   * @override
   * @return {!UI.ToolbarItem}
   */
  item() {
    return this._button;
  }
};

/**
 * @unrestricted
 */
Elements.ClassesPaneWidget.ClassNamePrompt = class extends UI.TextPrompt {
  constructor() {
    super();
    this.initialize(this._buildClassNameCompletions.bind(this), ' ');
    this.disableDefaultSuggestionForEmptyInput();
    this._selectedFrameId = '';
    this._classNamesPromise = null;
  }

  /**
   * @param {!SDK.DOMNode} selectedNode
   * @return {!Promise.<!Array.<string>>}
   */
  _getClassNames(selectedNode) {
    var promises = [];
    var completions = new Set();
    this._selectedFrameId = selectedNode.frameId();

    var cssModel = SDK.CSSModel.fromTarget(selectedNode.target());
    var allStyleSheets = cssModel.allStyleSheets();
    for (var stylesheet of allStyleSheets) {
      if (stylesheet.frameId !== this._selectedFrameId)
        continue;
      var cssPromise = cssModel.classNamesPromise(stylesheet.id).then(classes => completions.addAll(classes));
      promises.push(cssPromise);
    }

    var domPromise = selectedNode.domModel()
                         .classNamesPromise(selectedNode.ownerDocument.id)
                         .then(classes => completions.addAll(classes));
    promises.push(domPromise);
    return Promise.all(promises).then(() => completions.valuesArray());
  }

  /**
   * @param {string} expression
   * @param {string} prefix
   * @param {boolean=} force
   * @return {!Promise<!UI.SuggestBox.Suggestions>}
   */
  _buildClassNameCompletions(expression, prefix, force) {
    if (!prefix || force)
      this._classNamesPromise = null;

    var selectedNode = UI.context.flavor(SDK.DOMNode);
    if (!selectedNode || (!prefix && !force && !expression.trim()))
      return Promise.resolve([]);

    if (!this._classNamesPromise || this._selectedFrameId !== selectedNode.frameId())
      this._classNamesPromise = this._getClassNames(selectedNode);

    return this._classNamesPromise.then(completions => {
      if (prefix[0] === '.')
        completions = completions.map(value => '.' + value);
      return completions.filter(value => value.startsWith(prefix)).map(completion => ({title: completion}));
    });
  }
};
