// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.AccessibilitySidebarView = class extends WebInspector.ThrottledWidget {
  constructor() {
    super();
    this._node = null;
    this._axNode = null;
    this._sidebarPaneStack = WebInspector.viewManager.createStackLocation();
    this._treeSubPane = new WebInspector.AXTreePane();
    this._sidebarPaneStack.showView(this._treeSubPane);
    this._ariaSubPane = new WebInspector.ARIAAttributesPane();
    this._sidebarPaneStack.showView(this._ariaSubPane);
    this._axNodeSubPane = new WebInspector.AXNodeSubPane();
    this._sidebarPaneStack.showView(this._axNodeSubPane);
    this._sidebarPaneStack.widget().show(this.element);
    WebInspector.context.addFlavorChangeListener(WebInspector.DOMNode, this._pullNode, this);
    this._pullNode();
  }

  /**
   * @return {?WebInspector.DOMNode}
   */
  node() {
    return this._node;
  }

  /**
   * @param {?WebInspector.AccessibilityNode} axNode
   */
  accessibilityNodeCallback(axNode) {
    if (!axNode)
      return;

    this._axNode = axNode;

    if (axNode.ignored())
      this._sidebarPaneStack.removeView(this._ariaSubPane);
    else
      this._sidebarPaneStack.showView(this._ariaSubPane, this._axNodeSubPane);

    if (this._axNodeSubPane)
      this._axNodeSubPane.setAXNode(axNode);
    if (this._treeSubPane)
      this._treeSubPane.setAXNode(axNode);
  }

  /**
   * @override
   * @protected
   * @return {!Promise.<?>}
   */
  doUpdate() {
    var node = this.node();
    this._treeSubPane.setNode(node);
    this._axNodeSubPane.setNode(node);
    this._ariaSubPane.setNode(node);
    if (!node)
      return Promise.resolve();
    var accessibilityModel = WebInspector.AccessibilityModel.fromTarget(node.target());
    accessibilityModel.clear();
    return accessibilityModel.requestPartialAXTree(node)
        .then(() => {
          this.accessibilityNodeCallback(accessibilityModel.axNodeForDOMNode(node));
        });
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();

    this._treeSubPane.setNode(this.node());
    this._axNodeSubPane.setNode(this.node());
    this._ariaSubPane.setNode(this.node());

    WebInspector.targetManager.addModelListener(
        WebInspector.DOMModel, WebInspector.DOMModel.Events.AttrModified, this._onAttrChange, this);
    WebInspector.targetManager.addModelListener(
        WebInspector.DOMModel, WebInspector.DOMModel.Events.AttrRemoved, this._onAttrChange, this);
    WebInspector.targetManager.addModelListener(
        WebInspector.DOMModel, WebInspector.DOMModel.Events.CharacterDataModified, this._onNodeChange, this);
    WebInspector.targetManager.addModelListener(
        WebInspector.DOMModel, WebInspector.DOMModel.Events.ChildNodeCountUpdated, this._onNodeChange, this);
  }

  /**
   * @override
   */
  willHide() {
    WebInspector.targetManager.removeModelListener(
        WebInspector.DOMModel, WebInspector.DOMModel.Events.AttrModified, this._onAttrChange, this);
    WebInspector.targetManager.removeModelListener(
        WebInspector.DOMModel, WebInspector.DOMModel.Events.AttrRemoved, this._onAttrChange, this);
    WebInspector.targetManager.removeModelListener(
        WebInspector.DOMModel, WebInspector.DOMModel.Events.CharacterDataModified, this._onNodeChange, this);
    WebInspector.targetManager.removeModelListener(
        WebInspector.DOMModel, WebInspector.DOMModel.Events.ChildNodeCountUpdated, this._onNodeChange, this);
  }

  _pullNode() {
    this._node = WebInspector.context.flavor(WebInspector.DOMNode);
    this.update();
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onAttrChange(event) {
    if (!this.node())
      return;
    var node = event.data.node;
    if (this.node() !== node)
      return;
    this.update();
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _onNodeChange(event) {
    if (!this.node())
      return;
    var node = event.data;
    if (this.node() !== node)
      return;
    this.update();
  }
};

/**
 * @unrestricted
 */
WebInspector.AccessibilitySubPane = class extends WebInspector.SimpleView {
  /**
   * @param {string} name
   */
  constructor(name) {
    super(name);

    this._axNode = null;
    this.registerRequiredCSS('accessibility/accessibilityNode.css');
  }

  /**
   * @param {?WebInspector.AccessibilityNode} axNode
   * @protected
   */
  setAXNode(axNode) {
  }

  /**
   * @return {?WebInspector.DOMNode}
   */
  node() {
    return this._node;
  }

  /**
   * @param {?WebInspector.DOMNode} node
   */
  setNode(node) {
    this._node = node;
  }

  /**
   * @param {string} textContent
   * @param {string=} className
   * @return {!Element}
   */
  createInfo(textContent, className) {
    var classNameOrDefault = className || 'gray-info-message';
    var info = this.element.createChild('div', classNameOrDefault);
    info.textContent = textContent;
    return info;
  }

  /**
   * @return {!TreeOutline}
   */
  createTreeOutline() {
    var treeOutline = new TreeOutlineInShadow();
    treeOutline.registerRequiredCSS('accessibility/accessibilityNode.css');
    treeOutline.registerRequiredCSS('components/objectValue.css');

    treeOutline.element.classList.add('hidden');
    this.element.appendChild(treeOutline.element);
    return treeOutline;
  }
};
