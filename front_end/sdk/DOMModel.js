/*
 * Copyright (C) 2009, 2010 Google Inc. All rights reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
SDK.DOMNode = class {
  /**
   * @param {!SDK.DOMModel} domModel
   */
  constructor(domModel) {
    this._domModel = domModel;
  }

  /**
   * @param {!SDK.DOMModel} domModel
   * @param {?SDK.DOMDocument} doc
   * @param {boolean} isInShadowTree
   * @param {!Protocol.DOM.Node} payload
   * @return {!SDK.DOMNode}
   */
  static create(domModel, doc, isInShadowTree, payload) {
    var node = new SDK.DOMNode(domModel);
    node._init(doc, isInShadowTree, payload);
    return node;
  }

  /**
   * @param {?SDK.DOMDocument} doc
   * @param {boolean} isInShadowTree
   * @param {!Protocol.DOM.Node} payload
   */
  _init(doc, isInShadowTree, payload) {
    this._agent = this._domModel._agent;
    this.ownerDocument = doc;
    this._isInShadowTree = isInShadowTree;

    this.id = payload.nodeId;
    this._backendNodeId = payload.backendNodeId;
    this._domModel._idToDOMNode[this.id] = this;
    this._nodeType = payload.nodeType;
    this._nodeName = payload.nodeName;
    this._localName = payload.localName;
    this._nodeValue = payload.nodeValue;
    this._pseudoType = payload.pseudoType;
    this._shadowRootType = payload.shadowRootType;
    this._frameOwnerFrameId = payload.frameId || null;
    this._xmlVersion = payload.xmlVersion;
    this._isSVGNode = !!payload.isSVG;

    this._shadowRoots = [];

    this._attributes = [];
    this._attributesMap = {};
    if (payload.attributes)
      this._setAttributesPayload(payload.attributes);

    /** @type {!Map<string, ?>} */
    this._markers = new Map();
    this._subtreeMarkerCount = 0;

    this._childNodeCount = payload.childNodeCount || 0;
    this._children = null;

    this.nextSibling = null;
    this.previousSibling = null;
    this.firstChild = null;
    this.lastChild = null;
    this.parentNode = null;

    if (payload.shadowRoots) {
      for (var i = 0; i < payload.shadowRoots.length; ++i) {
        var root = payload.shadowRoots[i];
        var node = SDK.DOMNode.create(this._domModel, this.ownerDocument, true, root);
        this._shadowRoots.push(node);
        node.parentNode = this;
      }
    }

    if (payload.templateContent) {
      this._templateContent = SDK.DOMNode.create(this._domModel, this.ownerDocument, true, payload.templateContent);
      this._templateContent.parentNode = this;
    }

    if (payload.importedDocument) {
      this._importedDocument = SDK.DOMNode.create(this._domModel, this.ownerDocument, true, payload.importedDocument);
      this._importedDocument.parentNode = this;
    }

    if (payload.distributedNodes)
      this._setDistributedNodePayloads(payload.distributedNodes);

    if (payload.children)
      this._setChildrenPayload(payload.children);

    this._setPseudoElements(payload.pseudoElements);

    if (payload.contentDocument) {
      this._contentDocument = new SDK.DOMDocument(this._domModel, payload.contentDocument);
      this._children = [this._contentDocument];
      this._renumber();
    }

    if (this._nodeType === Node.ELEMENT_NODE) {
      // HTML and BODY from internal iframes should not overwrite top-level ones.
      if (this.ownerDocument && !this.ownerDocument.documentElement && this._nodeName === 'HTML')
        this.ownerDocument.documentElement = this;
      if (this.ownerDocument && !this.ownerDocument.body && this._nodeName === 'BODY')
        this.ownerDocument.body = this;
    } else if (this._nodeType === Node.DOCUMENT_TYPE_NODE) {
      this.publicId = payload.publicId;
      this.systemId = payload.systemId;
      this.internalSubset = payload.internalSubset;
    } else if (this._nodeType === Node.ATTRIBUTE_NODE) {
      this.name = payload.name;
      this.value = payload.value;
    }
  }

  /**
   * @return {boolean}
   */
  isSVGNode() {
    return this._isSVGNode;
  }

  /**
   * @return {!SDK.DOMModel}
   */
  domModel() {
    return this._domModel;
  }

  /**
   * @return {number}
   */
  backendNodeId() {
    return this._backendNodeId;
  }

  /**
   * @return {?Array.<!SDK.DOMNode>}
   */
  children() {
    return this._children ? this._children.slice() : null;
  }

  /**
   * @return {boolean}
   */
  hasAttributes() {
    return this._attributes.length > 0;
  }

  /**
   * @return {number}
   */
  childNodeCount() {
    return this._childNodeCount;
  }

  /**
   * @return {boolean}
   */
  hasShadowRoots() {
    return !!this._shadowRoots.length;
  }

  /**
   * @return {!Array.<!SDK.DOMNode>}
   */
  shadowRoots() {
    return this._shadowRoots.slice();
  }

  /**
   * @return {?SDK.DOMNode}
   */
  templateContent() {
    return this._templateContent || null;
  }

  /**
   * @return {?SDK.DOMNode}
   */
  importedDocument() {
    return this._importedDocument || null;
  }

  /**
   * @return {number}
   */
  nodeType() {
    return this._nodeType;
  }

  /**
   * @return {string}
   */
  nodeName() {
    return this._nodeName;
  }

  /**
   * @return {string|undefined}
   */
  pseudoType() {
    return this._pseudoType;
  }

  /**
   * @return {boolean}
   */
  hasPseudoElements() {
    return this._pseudoElements.size > 0;
  }

  /**
   * @return {!Map<string, !SDK.DOMNode>}
   */
  pseudoElements() {
    return this._pseudoElements;
  }

  /**
   * @return {?SDK.DOMNode}
   */
  beforePseudoElement() {
    if (!this._pseudoElements)
      return null;
    return this._pseudoElements.get(SDK.DOMNode.PseudoElementNames.Before);
  }

  /**
   * @return {?SDK.DOMNode}
   */
  afterPseudoElement() {
    if (!this._pseudoElements)
      return null;
    return this._pseudoElements.get(SDK.DOMNode.PseudoElementNames.After);
  }

  /**
   * @return {boolean}
   */
  isInsertionPoint() {
    return !this.isXMLNode() &&
        (this._nodeName === 'SHADOW' || this._nodeName === 'CONTENT' || this._nodeName === 'SLOT');
  }

  /**
   * @return {!Array.<!SDK.DOMNodeShortcut>}
   */
  distributedNodes() {
    return this._distributedNodes || [];
  }

  /**
   * @return {boolean}
   */
  isInShadowTree() {
    return this._isInShadowTree;
  }

  /**
   * @return {?SDK.DOMNode}
   */
  ancestorShadowHost() {
    var ancestorShadowRoot = this.ancestorShadowRoot();
    return ancestorShadowRoot ? ancestorShadowRoot.parentNode : null;
  }

  /**
   * @return {?SDK.DOMNode}
   */
  ancestorShadowRoot() {
    if (!this._isInShadowTree)
      return null;

    var current = this;
    while (current && !current.isShadowRoot())
      current = current.parentNode;
    return current;
  }

  /**
   * @return {?SDK.DOMNode}
   */
  ancestorUserAgentShadowRoot() {
    var ancestorShadowRoot = this.ancestorShadowRoot();
    if (!ancestorShadowRoot)
      return null;
    return ancestorShadowRoot.shadowRootType() === SDK.DOMNode.ShadowRootTypes.UserAgent ? ancestorShadowRoot : null;
  }

  /**
   * @return {boolean}
   */
  isShadowRoot() {
    return !!this._shadowRootType;
  }

  /**
   * @return {?string}
   */
  shadowRootType() {
    return this._shadowRootType || null;
  }

  /**
   * @return {string}
   */
  nodeNameInCorrectCase() {
    var shadowRootType = this.shadowRootType();
    if (shadowRootType)
      return '#shadow-root (' + shadowRootType + ')';

    // If there is no local name, it's case sensitive
    if (!this.localName())
      return this.nodeName();

    // If the names are different lengths, there is a prefix and it's case sensitive
    if (this.localName().length !== this.nodeName().length)
      return this.nodeName();

    // Return the localname, which will be case insensitive if its an html node
    return this.localName();
  }

  /**
   * @param {string} name
   * @param {function(?Protocol.Error, number)=} callback
   */
  setNodeName(name, callback) {
    this._agent.invoke_setNodeName({nodeId: this.id, name}).then(response => {
      if (!response[Protocol.Error])
        this._domModel.markUndoableState();
      if (callback)
        callback(response[Protocol.Error] || null, response.nodeId);
    });
  }

  /**
   * @return {string}
   */
  localName() {
    return this._localName;
  }

  /**
   * @return {string}
   */
  nodeValue() {
    return this._nodeValue;
  }

  /**
   * @param {string} value
   * @param {function(?Protocol.Error)=} callback
   */
  setNodeValue(value, callback) {
    this._agent.invoke_setNodeValue({nodeId: this.id, value}).then(response => {
      if (!response[Protocol.Error])
        this._domModel.markUndoableState();
      if (callback)
        callback(response[Protocol.Error] || null);
    });
  }

  /**
   * @param {string} name
   * @return {string}
   */
  getAttribute(name) {
    var attr = this._attributesMap[name];
    return attr ? attr.value : undefined;
  }

  /**
   * @param {string} name
   * @param {string} text
   * @param {function(?Protocol.Error)=} callback
   */
  setAttribute(name, text, callback) {
    this._agent.invoke_setAttributesAsText({nodeId: this.id, text, name}).then(response => {
      if (!response[Protocol.Error])
        this._domModel.markUndoableState();
      if (callback)
        callback(response[Protocol.Error] || null);
    });
  }

  /**
   * @param {string} name
   * @param {string} value
   * @param {function(?Protocol.Error)=} callback
   */
  setAttributeValue(name, value, callback) {
    this._agent.invoke_setAttributeValue({nodeId: this.id, name, value}).then(response => {
      if (!response[Protocol.Error])
        this._domModel.markUndoableState();
      if (callback)
        callback(response[Protocol.Error] || null);
    });
  }

  /**
  * @param {string} name
  * @param {string} value
  * @return {!Promise<?Protocol.Error>}
  */
  setAttributeValuePromise(name, value) {
    return new Promise(fulfill => this.setAttributeValue(name, value, fulfill));
  }

  /**
   * @return {!Array<!SDK.DOMNode.Attribute>}
   */
  attributes() {
    return this._attributes;
  }

  /**
   * @param {string} name
   * @return {!Promise}
   */
  async removeAttribute(name) {
    var response = await this._agent.invoke_removeAttribute({nodeId: this.id, name});
    if (response[Protocol.Error])
      return;
    delete this._attributesMap[name];
    var index = this._attributes.findIndex(attr => attr.name === name);
    if (index !== -1)
      this._attributes.splice(index, 1);
    this._domModel.markUndoableState();
  }

  /**
   * @param {function(?Array<!SDK.DOMNode>)} callback
   */
  getChildNodes(callback) {
    if (this._children) {
      callback(this.children());
      return;
    }
    this._agent.invoke_requestChildNodes({nodeId: this.id}).then(response => {
      callback(response[Protocol.Error] ? null : this.children());
    });
  }

  /**
   * @param {number} depth
   * @return {!Promise<?Array<!SDK.DOMNode>>}
   */
  async getSubtree(depth) {
    var response = await this._agent.invoke_requestChildNodes({nodeId: this.id, depth});
    return response[Protocol.Error] ? null : this._children;
  }

  /**
   * @return {!Promise<?string>}
   */
  getOuterHTML() {
    return this._agent.getOuterHTML(this.id);
  }

  /**
   * @param {string} html
   * @param {function(?Protocol.Error)=} callback
   */
  setOuterHTML(html, callback) {
    this._agent.invoke_setOuterHTML({nodeId: this.id, outerHTML: html}).then(response => {
      if (!response[Protocol.Error])
        this._domModel.markUndoableState();
      if (callback)
        callback(response[Protocol.Error] || null);
    });
  }

  /**
   * @param {function(?Protocol.Error, !Protocol.DOM.NodeId=)=} callback
   */
  removeNode(callback) {
    this._agent.invoke_removeNode({nodeId: this.id}).then(response => {
      if (!response[Protocol.Error])
        this._domModel.markUndoableState();
      if (callback)
        callback(response[Protocol.Error] || null);
    });
  }

  /**
   * @return {!Promise<?string>}
   */
  async copyNode() {
    var text = await this._agent.getOuterHTML(this.id);
    if (text !== null)
      InspectorFrontendHost.copyText(text);
    return text;
  }

  /**
   * @return {string}
   */
  path() {
    /**
     * @param {?SDK.DOMNode} node
     */
    function canPush(node) {
      return node && ('index' in node || (node.isShadowRoot() && node.parentNode)) && node._nodeName.length;
    }

    var path = [];
    var node = this;
    while (canPush(node)) {
      var index = typeof node.index === 'number' ?
          node.index :
          (node.shadowRootType() === SDK.DOMNode.ShadowRootTypes.UserAgent ? 'u' : 'a');
      path.push([index, node._nodeName]);
      node = node.parentNode;
    }
    path.reverse();
    return path.join(',');
  }

  /**
   * @param {!SDK.DOMNode} node
   * @return {boolean}
   */
  isAncestor(node) {
    if (!node)
      return false;

    var currentNode = node.parentNode;
    while (currentNode) {
      if (this === currentNode)
        return true;
      currentNode = currentNode.parentNode;
    }
    return false;
  }

  /**
   * @param {!SDK.DOMNode} descendant
   * @return {boolean}
   */
  isDescendant(descendant) {
    return descendant !== null && descendant.isAncestor(this);
  }

  /**
   * @return {?Protocol.Page.FrameId}
   */
  frameId() {
    var node = this.parentNode || this;
    while (!node._frameOwnerFrameId && node.parentNode)
      node = node.parentNode;
    return node._frameOwnerFrameId;
  }

  /**
   * @param {!Array.<string>} attrs
   * @return {boolean}
   */
  _setAttributesPayload(attrs) {
    var attributesChanged = !this._attributes || attrs.length !== this._attributes.length * 2;
    var oldAttributesMap = this._attributesMap || {};

    this._attributes = [];
    this._attributesMap = {};

    for (var i = 0; i < attrs.length; i += 2) {
      var name = attrs[i];
      var value = attrs[i + 1];
      this._addAttribute(name, value);

      if (attributesChanged)
        continue;

      if (!oldAttributesMap[name] || oldAttributesMap[name].value !== value)
        attributesChanged = true;
    }
    return attributesChanged;
  }

  /**
   * @param {!SDK.DOMNode} prev
   * @param {!Protocol.DOM.Node} payload
   * @return {!SDK.DOMNode}
   */
  _insertChild(prev, payload) {
    var node = SDK.DOMNode.create(this._domModel, this.ownerDocument, this._isInShadowTree, payload);
    this._children.splice(this._children.indexOf(prev) + 1, 0, node);
    this._renumber();
    return node;
  }

  /**
   * @param {!SDK.DOMNode} node
   */
  _removeChild(node) {
    if (node.pseudoType()) {
      this._pseudoElements.delete(node.pseudoType());
    } else {
      var shadowRootIndex = this._shadowRoots.indexOf(node);
      if (shadowRootIndex !== -1) {
        this._shadowRoots.splice(shadowRootIndex, 1);
      } else {
        console.assert(this._children.indexOf(node) !== -1);
        this._children.splice(this._children.indexOf(node), 1);
      }
    }
    node.parentNode = null;
    this._subtreeMarkerCount -= node._subtreeMarkerCount;
    if (node._subtreeMarkerCount)
      this._domModel.dispatchEventToListeners(SDK.DOMModel.Events.MarkersChanged, this);
    this._renumber();
  }

  /**
   * @param {!Array.<!Protocol.DOM.Node>} payloads
   */
  _setChildrenPayload(payloads) {
    // We set children in the constructor.
    if (this._contentDocument)
      return;

    this._children = [];
    for (var i = 0; i < payloads.length; ++i) {
      var payload = payloads[i];
      var node = SDK.DOMNode.create(this._domModel, this.ownerDocument, this._isInShadowTree, payload);
      this._children.push(node);
    }
    this._renumber();
  }

  /**
   * @param {!Array.<!Protocol.DOM.Node>|undefined} payloads
   */
  _setPseudoElements(payloads) {
    this._pseudoElements = new Map();
    if (!payloads)
      return;

    for (var i = 0; i < payloads.length; ++i) {
      var node = SDK.DOMNode.create(this._domModel, this.ownerDocument, this._isInShadowTree, payloads[i]);
      node.parentNode = this;
      this._pseudoElements.set(node.pseudoType(), node);
    }
  }

  /**
   * @param {!Array.<!Protocol.DOM.BackendNode>} payloads
   */
  _setDistributedNodePayloads(payloads) {
    this._distributedNodes = [];
    for (var payload of payloads) {
      this._distributedNodes.push(
          new SDK.DOMNodeShortcut(this._domModel.target(), payload.backendNodeId, payload.nodeType, payload.nodeName));
    }
  }

  _renumber() {
    this._childNodeCount = this._children.length;
    if (this._childNodeCount === 0) {
      this.firstChild = null;
      this.lastChild = null;
      return;
    }
    this.firstChild = this._children[0];
    this.lastChild = this._children[this._childNodeCount - 1];
    for (var i = 0; i < this._childNodeCount; ++i) {
      var child = this._children[i];
      child.index = i;
      child.nextSibling = i + 1 < this._childNodeCount ? this._children[i + 1] : null;
      child.previousSibling = i - 1 >= 0 ? this._children[i - 1] : null;
      child.parentNode = this;
    }
  }

  /**
   * @param {string} name
   * @param {string} value
   */
  _addAttribute(name, value) {
    var attr = {name: name, value: value, _node: this};
    this._attributesMap[name] = attr;
    this._attributes.push(attr);
  }

  /**
   * @param {string} name
   * @param {string} value
   */
  _setAttribute(name, value) {
    var attr = this._attributesMap[name];
    if (attr)
      attr.value = value;
    else
      this._addAttribute(name, value);
  }

  /**
   * @param {string} name
   */
  _removeAttribute(name) {
    var attr = this._attributesMap[name];
    if (attr) {
      this._attributes.remove(attr);
      delete this._attributesMap[name];
    }
  }

  /**
   * @param {!SDK.DOMNode} targetNode
   * @param {?SDK.DOMNode} anchorNode
   * @param {function(?Protocol.Error, !Protocol.DOM.NodeId=)=} callback
   */
  copyTo(targetNode, anchorNode, callback) {
    this._agent
        .invoke_copyTo(
            {nodeId: this.id, targetNodeId: targetNode.id, insertBeforeNodeId: anchorNode ? anchorNode.id : undefined})
        .then(response => {
          if (!response[Protocol.Error])
            this._domModel.markUndoableState();
          if (callback)
            callback(response[Protocol.Error] || null, response.nodeId);
        });
  }

  /**
   * @param {!SDK.DOMNode} targetNode
   * @param {?SDK.DOMNode} anchorNode
   * @param {function(?Protocol.Error, !Protocol.DOM.NodeId=)=} callback
   */
  moveTo(targetNode, anchorNode, callback) {
    this._agent
        .invoke_moveTo(
            {nodeId: this.id, targetNodeId: targetNode.id, insertBeforeNodeId: anchorNode ? anchorNode.id : undefined})
        .then(response => {
          if (!response[Protocol.Error])
            this._domModel.markUndoableState();
          if (callback)
            callback(response[Protocol.Error] || null, response.nodeId);
        });
  }

  /**
   * @return {boolean}
   */
  isXMLNode() {
    return !!this._xmlVersion;
  }

  /**
   * @param {string} name
   * @param {?*} value
   */
  setMarker(name, value) {
    if (value === null) {
      if (!this._markers.has(name))
        return;

      this._markers.delete(name);
      for (var node = this; node; node = node.parentNode)
        --node._subtreeMarkerCount;
      for (var node = this; node; node = node.parentNode)
        this._domModel.dispatchEventToListeners(SDK.DOMModel.Events.MarkersChanged, node);
      return;
    }

    if (this.parentNode && !this._markers.has(name)) {
      for (var node = this; node; node = node.parentNode)
        ++node._subtreeMarkerCount;
    }
    this._markers.set(name, value);
    for (var node = this; node; node = node.parentNode)
      this._domModel.dispatchEventToListeners(SDK.DOMModel.Events.MarkersChanged, node);
  }

  /**
   * @param {string} name
   * @return {?T}
   * @template T
   */
  marker(name) {
    return this._markers.get(name) || null;
  }

  /**
   * @param {function(!SDK.DOMNode, string)} visitor
   */
  traverseMarkers(visitor) {
    /**
     * @param {!SDK.DOMNode} node
     */
    function traverse(node) {
      if (!node._subtreeMarkerCount)
        return;
      for (var marker of node._markers.keys())
        visitor(node, marker);
      if (!node._children)
        return;
      for (var child of node._children)
        traverse(child);
    }
    traverse(this);
  }

  /**
   * @param {string} url
   * @return {?string}
   */
  resolveURL(url) {
    if (!url)
      return url;
    for (var frameOwnerCandidate = this; frameOwnerCandidate; frameOwnerCandidate = frameOwnerCandidate.parentNode) {
      if (frameOwnerCandidate.baseURL)
        return Common.ParsedURL.completeURL(frameOwnerCandidate.baseURL, url);
    }
    return null;
  }

  /**
   * @param {string=} mode
   * @param {!Protocol.Runtime.RemoteObjectId=} objectId
   */
  highlight(mode, objectId) {
    this._domModel.overlayModel().highlightDOMNode(this.id, mode, undefined, objectId);
  }

  highlightForTwoSeconds() {
    this._domModel.overlayModel().highlightDOMNodeForTwoSeconds(this.id);
  }

  /**
   * @param {string=} objectGroup
   * @return {!Promise<?SDK.RemoteObject>}
   */
  async resolveToObject(objectGroup) {
    var object = await this._agent.resolveNode(this.id, undefined, objectGroup);
    return object && this._domModel._runtimeModel.createRemoteObject(object);
  }

  /**
   * @return {!Promise<?Protocol.DOM.BoxModel>}
   */
  boxModel() {
    return this._agent.getBoxModel(this.id);
  }

  setAsInspectedNode() {
    var node = this;
    while (true) {
      var ancestor = node.ancestorUserAgentShadowRoot();
      if (!ancestor)
        break;
      ancestor = node.ancestorShadowHost();
      if (!ancestor)
        break;
      // User agent shadow root, keep climbing up.
      node = ancestor;
    }
    this._agent.setInspectedNode(node.id);
  }

  /**
   *  @return {?SDK.DOMNode}
   */
  enclosingElementOrSelf() {
    var node = this;
    if (node && node.nodeType() === Node.TEXT_NODE && node.parentNode)
      node = node.parentNode;

    if (node && node.nodeType() !== Node.ELEMENT_NODE)
      node = null;
    return node;
  }

  async scrollIntoView() {
    var node = this.enclosingElementOrSelf();
    var object = await node.resolveToObject();
    if (!object)
      return;
    object.callFunction(scrollIntoView);
    object.release();
    node.highlightForTwoSeconds();

    /**
     * @suppressReceiverCheck
     * @this {!Element}
     */
    function scrollIntoView() {
      this.scrollIntoViewIfNeeded(true);
    }
  }

  async focus() {
    var node = this.enclosingElementOrSelf();
    var object = await node.resolveToObject();
    if (!object)
      return;
    await object.callFunctionPromise(focusInPage);
    object.release();
    node.highlightForTwoSeconds();
    this._domModel.target().pageAgent().bringToFront();

    /**
     * @suppressReceiverCheck
     * @this {!Element}
     */
    function focusInPage() {
      this.focus();
    }
  }
};

/**
 * @enum {string}
 */
SDK.DOMNode.PseudoElementNames = {
  Before: 'before',
  After: 'after'
};

/**
 * @enum {string}
 */
SDK.DOMNode.ShadowRootTypes = {
  UserAgent: 'user-agent',
  Open: 'open',
  Closed: 'closed'
};

/** @typedef {{name: string, value: string, _node: SDK.DOMNode}} */
SDK.DOMNode.Attribute;

/**
 * @unrestricted
 */
SDK.DeferredDOMNode = class {
  /**
   * @param {!SDK.Target} target
   * @param {number} backendNodeId
   */
  constructor(target, backendNodeId) {
    this._domModel = target.model(SDK.DOMModel);
    this._backendNodeId = backendNodeId;
  }

  /**
   * @param {function(?SDK.DOMNode)} callback
   */
  resolve(callback) {
    this.resolvePromise().then(callback);
  }

  /**
   * @return {!Promise<?SDK.DOMNode>}
   */
  async resolvePromise() {
    if (!this._domModel)
      return null;
    var nodeIds = await this._domModel.pushNodesByBackendIdsToFrontend(new Set([this._backendNodeId]));
    return nodeIds && nodeIds.get(this._backendNodeId) || null;
  }

  /**
   * @return {number}
   */
  backendNodeId() {
    return this._backendNodeId;
  }

  highlight() {
    if (this._domModel)
      this._domModel.overlayModel().highlightDOMNode(undefined, undefined, this._backendNodeId);
  }
};

/**
 * @unrestricted
 */
SDK.DOMNodeShortcut = class {
  /**
   * @param {!SDK.Target} target
   * @param {number} backendNodeId
   * @param {number} nodeType
   * @param {string} nodeName
   */
  constructor(target, backendNodeId, nodeType, nodeName) {
    this.nodeType = nodeType;
    this.nodeName = nodeName;
    this.deferredNode = new SDK.DeferredDOMNode(target, backendNodeId);
  }
};

/**
 * @unrestricted
 */
SDK.DOMDocument = class extends SDK.DOMNode {
  /**
   * @param {!SDK.DOMModel} domModel
   * @param {!Protocol.DOM.Node} payload
   */
  constructor(domModel, payload) {
    super(domModel);
    this._init(this, false, payload);
    this.documentURL = payload.documentURL || '';
    this.baseURL = payload.baseURL || '';
  }
};

/**
 * @unrestricted
 */
SDK.DOMModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);

    this._agent = target.domAgent();

    /** @type {!Object.<number, !SDK.DOMNode>} */
    this._idToDOMNode = {};
    /** @type {?SDK.DOMDocument} */
    this._document = null;
    /** @type {!Set<number>} */
    this._attributeLoadNodeIds = new Set();
    target.registerDOMDispatcher(new SDK.DOMDispatcher(this));

    this._runtimeModel = /** @type {!SDK.RuntimeModel} */ (target.model(SDK.RuntimeModel));

    if (!target.suspended())
      this._agent.enable();
  }

  /**
   * @return {!SDK.RuntimeModel}
   */
  runtimeModel() {
    return this._runtimeModel;
  }

  /**
   * @return {!SDK.CSSModel}
   */
  cssModel() {
    return /** @type {!SDK.CSSModel} */ (this.target().model(SDK.CSSModel));
  }

  /**
   * @return {!SDK.OverlayModel}
   */
  overlayModel() {
    return /** @type {!SDK.OverlayModel} */ (this.target().model(SDK.OverlayModel));
  }

  static cancelSearch() {
    for (var domModel of SDK.targetManager.models(SDK.DOMModel))
      domModel._cancelSearch();
  }

  /**
   * @param {!SDK.DOMNode} node
   */
  _scheduleMutationEvent(node) {
    if (!this.hasEventListeners(SDK.DOMModel.Events.DOMMutated))
      return;

    this._lastMutationId = (this._lastMutationId || 0) + 1;
    Promise.resolve().then(callObserve.bind(this, node, this._lastMutationId));

    /**
     * @this {SDK.DOMModel}
     * @param {!SDK.DOMNode} node
     * @param {number} mutationId
     */
    function callObserve(node, mutationId) {
      if (!this.hasEventListeners(SDK.DOMModel.Events.DOMMutated) || this._lastMutationId !== mutationId)
        return;

      this.dispatchEventToListeners(SDK.DOMModel.Events.DOMMutated, node);
    }
  }

  /**
   * @param {function(!SDK.DOMDocument)} callback
   */
  requestDocument(callback) {
    if (this._document)
      callback(this._document);
    else
      this.requestDocumentPromise().then(callback);
  }

  /**
   * @return {!Promise<!SDK.DOMDocument>}
   */
  requestDocumentPromise() {
    if (this._document)
      return Promise.resolve(this._document);
    if (this._pendingDocumentRequestPromise)
      return this._pendingDocumentRequestPromise;

    this._pendingDocumentRequestPromise = this._agent.getDocument().then(root => {
      if (root)
        this._setDocument(root);
      delete this._pendingDocumentRequestPromise;
      if (!this._document)
        console.error('No document');
      return this._document;
    });
    return this._pendingDocumentRequestPromise;
  }

  /**
   * @return {?SDK.DOMDocument}
   */
  existingDocument() {
    return this._document;
  }

  /**
   * @param {!Protocol.Runtime.RemoteObjectId} objectId
   * @return {!Promise<?SDK.DOMNode>}
   */
  async pushNodeToFrontend(objectId) {
    await this.requestDocumentPromise();
    var nodeId = await this._agent.requestNode(objectId);
    return nodeId ? this.nodeForId(nodeId) : null;
  }

  /**
   * @param {string} path
   * @return {!Promise<?Protocol.DOM.NodeId>}
   */
  pushNodeByPathToFrontend(path) {
    return this.requestDocumentPromise().then(() => this._agent.pushNodeByPathToFrontend(path));
  }

  /**
   * @param {!Set<number>} backendNodeIds
   * @return {!Promise<?Map<number, ?SDK.DOMNode>>}
   */
  async pushNodesByBackendIdsToFrontend(backendNodeIds) {
    await this.requestDocumentPromise();
    var backendNodeIdsArray = backendNodeIds.valuesArray();
    var nodeIds = await this._agent.pushNodesByBackendIdsToFrontend(backendNodeIdsArray);
    if (!nodeIds)
      return null;
    /** @type {!Map<number, ?SDK.DOMNode>} */
    var map = new Map();
    for (var i = 0; i < nodeIds.length; ++i) {
      if (nodeIds[i])
        map.set(backendNodeIdsArray[i], this.nodeForId(nodeIds[i]));
    }
    return map;
  }

  /**
   * @param {function(?T)} callback
   * @return {function(?Protocol.Error, !T=)}
   * @template T
   */
  _wrapClientCallback(callback) {
    /**
     * @param {?Protocol.Error} error
     * @param {!T=} result
     * @template T
     */
    function wrapper(error, result) {
      // Caller is responsible for handling the actual error.
      callback(error ? null : result || null);
    }
    return wrapper;
  }

  /**
   * @param {!Protocol.DOM.NodeId} nodeId
   * @param {string} name
   * @param {string} value
   */
  _attributeModified(nodeId, name, value) {
    var node = this._idToDOMNode[nodeId];
    if (!node)
      return;

    node._setAttribute(name, value);
    this.dispatchEventToListeners(SDK.DOMModel.Events.AttrModified, {node: node, name: name});
    this._scheduleMutationEvent(node);
  }

  /**
   * @param {!Protocol.DOM.NodeId} nodeId
   * @param {string} name
   */
  _attributeRemoved(nodeId, name) {
    var node = this._idToDOMNode[nodeId];
    if (!node)
      return;
    node._removeAttribute(name);
    this.dispatchEventToListeners(SDK.DOMModel.Events.AttrRemoved, {node: node, name: name});
    this._scheduleMutationEvent(node);
  }

  /**
   * @param {!Array<!Protocol.DOM.NodeId>} nodeIds
   */
  _inlineStyleInvalidated(nodeIds) {
    this._attributeLoadNodeIds.addAll(nodeIds);
    if (!this._loadNodeAttributesTimeout)
      this._loadNodeAttributesTimeout = setTimeout(this._loadNodeAttributes.bind(this), 20);
  }

  _loadNodeAttributes() {
    delete this._loadNodeAttributesTimeout;
    for (let nodeId of this._attributeLoadNodeIds) {
      this._agent.getAttributes(nodeId).then(attributes => {
        if (!attributes) {
          // We are calling _loadNodeAttributes asynchronously, it is ok if node is not found.
          return;
        }
        var node = this._idToDOMNode[nodeId];
        if (!node)
          return;
        if (node._setAttributesPayload(attributes)) {
          this.dispatchEventToListeners(SDK.DOMModel.Events.AttrModified, {node: node, name: 'style'});
          this._scheduleMutationEvent(node);
        }
      });
    }
    this._attributeLoadNodeIds.clear();
  }

  /**
   * @param {!Protocol.DOM.NodeId} nodeId
   * @param {string} newValue
   */
  _characterDataModified(nodeId, newValue) {
    var node = this._idToDOMNode[nodeId];
    node._nodeValue = newValue;
    this.dispatchEventToListeners(SDK.DOMModel.Events.CharacterDataModified, node);
    this._scheduleMutationEvent(node);
  }

  /**
   * @param {!Protocol.DOM.NodeId} nodeId
   * @return {?SDK.DOMNode}
   */
  nodeForId(nodeId) {
    return this._idToDOMNode[nodeId] || null;
  }

  _documentUpdated() {
    this._setDocument(null);
  }

  /**
   * @param {?Protocol.DOM.Node} payload
   */
  _setDocument(payload) {
    this._idToDOMNode = {};
    if (payload && 'nodeId' in payload)
      this._document = new SDK.DOMDocument(this, payload);
    else
      this._document = null;
    this.dispatchEventToListeners(SDK.DOMModel.Events.DocumentUpdated, this);
  }

  /**
   * @param {!Protocol.DOM.Node} payload
   */
  _setDetachedRoot(payload) {
    if (payload.nodeName === '#document')
      new SDK.DOMDocument(this, payload);
    else
      SDK.DOMNode.create(this, null, false, payload);
  }

  /**
   * @param {!Protocol.DOM.NodeId} parentId
   * @param {!Array.<!Protocol.DOM.Node>} payloads
   */
  _setChildNodes(parentId, payloads) {
    if (!parentId && payloads.length) {
      this._setDetachedRoot(payloads[0]);
      return;
    }

    var parent = this._idToDOMNode[parentId];
    parent._setChildrenPayload(payloads);
  }

  /**
   * @param {!Protocol.DOM.NodeId} nodeId
   * @param {number} newValue
   */
  _childNodeCountUpdated(nodeId, newValue) {
    var node = this._idToDOMNode[nodeId];
    node._childNodeCount = newValue;
    this.dispatchEventToListeners(SDK.DOMModel.Events.ChildNodeCountUpdated, node);
    this._scheduleMutationEvent(node);
  }

  /**
   * @param {!Protocol.DOM.NodeId} parentId
   * @param {!Protocol.DOM.NodeId} prevId
   * @param {!Protocol.DOM.Node} payload
   */
  _childNodeInserted(parentId, prevId, payload) {
    var parent = this._idToDOMNode[parentId];
    var prev = this._idToDOMNode[prevId];
    var node = parent._insertChild(prev, payload);
    this._idToDOMNode[node.id] = node;
    this.dispatchEventToListeners(SDK.DOMModel.Events.NodeInserted, node);
    this._scheduleMutationEvent(node);
  }

  /**
   * @param {!Protocol.DOM.NodeId} parentId
   * @param {!Protocol.DOM.NodeId} nodeId
   */
  _childNodeRemoved(parentId, nodeId) {
    var parent = this._idToDOMNode[parentId];
    var node = this._idToDOMNode[nodeId];
    parent._removeChild(node);
    this._unbind(node);
    this.dispatchEventToListeners(SDK.DOMModel.Events.NodeRemoved, {node: node, parent: parent});
    this._scheduleMutationEvent(node);
  }

  /**
   * @param {!Protocol.DOM.NodeId} hostId
   * @param {!Protocol.DOM.Node} root
   */
  _shadowRootPushed(hostId, root) {
    var host = this._idToDOMNode[hostId];
    if (!host)
      return;
    var node = SDK.DOMNode.create(this, host.ownerDocument, true, root);
    node.parentNode = host;
    this._idToDOMNode[node.id] = node;
    host._shadowRoots.unshift(node);
    this.dispatchEventToListeners(SDK.DOMModel.Events.NodeInserted, node);
    this._scheduleMutationEvent(node);
  }

  /**
   * @param {!Protocol.DOM.NodeId} hostId
   * @param {!Protocol.DOM.NodeId} rootId
   */
  _shadowRootPopped(hostId, rootId) {
    var host = this._idToDOMNode[hostId];
    if (!host)
      return;
    var root = this._idToDOMNode[rootId];
    if (!root)
      return;
    host._removeChild(root);
    this._unbind(root);
    this.dispatchEventToListeners(SDK.DOMModel.Events.NodeRemoved, {node: root, parent: host});
    this._scheduleMutationEvent(root);
  }

  /**
   * @param {!Protocol.DOM.NodeId} parentId
   * @param {!Protocol.DOM.Node} pseudoElement
   */
  _pseudoElementAdded(parentId, pseudoElement) {
    var parent = this._idToDOMNode[parentId];
    if (!parent)
      return;
    var node = SDK.DOMNode.create(this, parent.ownerDocument, false, pseudoElement);
    node.parentNode = parent;
    this._idToDOMNode[node.id] = node;
    console.assert(!parent._pseudoElements.get(node.pseudoType()));
    parent._pseudoElements.set(node.pseudoType(), node);
    this.dispatchEventToListeners(SDK.DOMModel.Events.NodeInserted, node);
    this._scheduleMutationEvent(node);
  }

  /**
   * @param {!Protocol.DOM.NodeId} parentId
   * @param {!Protocol.DOM.NodeId} pseudoElementId
   */
  _pseudoElementRemoved(parentId, pseudoElementId) {
    var parent = this._idToDOMNode[parentId];
    if (!parent)
      return;
    var pseudoElement = this._idToDOMNode[pseudoElementId];
    if (!pseudoElement)
      return;
    parent._removeChild(pseudoElement);
    this._unbind(pseudoElement);
    this.dispatchEventToListeners(SDK.DOMModel.Events.NodeRemoved, {node: pseudoElement, parent: parent});
    this._scheduleMutationEvent(pseudoElement);
  }

  /**
   * @param {!Protocol.DOM.NodeId} insertionPointId
   * @param {!Array.<!Protocol.DOM.BackendNode>} distributedNodes
   */
  _distributedNodesUpdated(insertionPointId, distributedNodes) {
    var insertionPoint = this._idToDOMNode[insertionPointId];
    if (!insertionPoint)
      return;
    insertionPoint._setDistributedNodePayloads(distributedNodes);
    this.dispatchEventToListeners(SDK.DOMModel.Events.DistributedNodesChanged, insertionPoint);
    this._scheduleMutationEvent(insertionPoint);
  }

  /**
   * @param {!SDK.DOMNode} node
   */
  _unbind(node) {
    delete this._idToDOMNode[node.id];
    for (var i = 0; node._children && i < node._children.length; ++i)
      this._unbind(node._children[i]);
    for (var i = 0; i < node._shadowRoots.length; ++i)
      this._unbind(node._shadowRoots[i]);
    var pseudoElements = node.pseudoElements();
    for (var value of pseudoElements.values())
      this._unbind(value);
    if (node._templateContent)
      this._unbind(node._templateContent);
  }

  /**
   * @param {string} query
   * @param {boolean} includeUserAgentShadowDOM
   * @return {!Promise<number>}
   */
  async performSearch(query, includeUserAgentShadowDOM) {
    var response = await this._agent.invoke_performSearch({query, includeUserAgentShadowDOM});
    if (!response[Protocol.Error])
      this._searchId = response.searchId;
    return response[Protocol.Error] ? 0 : response.resultCount;
  }

  /**
   * @param {number} index
   * @return {!Promise<?SDK.DOMNode>}
   */
  async searchResult(index) {
    if (!this._searchId)
      return null;
    var nodeIds = await this._agent.getSearchResults(this._searchId, index, index + 1);
    return nodeIds && nodeIds.length === 1 ? this.nodeForId(nodeIds[0]) : null;
  }

  _cancelSearch() {
    if (!this._searchId)
      return;
    this._agent.discardSearchResults(this._searchId);
    delete this._searchId;
  }

  /**
   * @param {!Protocol.DOM.NodeId} nodeId
   * @return {!Promise<!Array<string>>}
   */
  classNamesPromise(nodeId) {
    return this._agent.collectClassNamesFromSubtree(nodeId).then(classNames => classNames || []);
  }

  /**
   * @param {!Protocol.DOM.NodeId} nodeId
   * @param {string} selectors
   * @return {!Promise<?Protocol.DOM.NodeId>}
   */
  querySelector(nodeId, selectors) {
    return this._agent.querySelector(nodeId, selectors);
  }

  /**
   * @param {!Protocol.DOM.NodeId} nodeId
   * @param {string} selectors
   * @return {!Promise<?Array<!Protocol.DOM.NodeId>>}
   */
  querySelectorAll(nodeId, selectors) {
    return this._agent.querySelectorAll(nodeId, selectors);
  }

  markUndoableState() {
    this._agent.markUndoableState();
  }

  /**
   * @return {!Promise}
   */
  undo() {
    return this._agent.undo();
  }

  /**
   * @return {!Promise}
   */
  redo() {
    return this._agent.redo();
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {boolean} includeUserAgentShadowDOM
   * @return {!Promise<?SDK.DOMNode>}
   */
  nodeForLocation(x, y, includeUserAgentShadowDOM) {
    return this._agent.getNodeForLocation(x, y, includeUserAgentShadowDOM)
        .then(nodeId => nodeId ? this.nodeForId(nodeId) : null);
  }

  /**
   * @param {!SDK.RemoteObject} object
   * @return {!Promise<?SDK.DOMNode>}
   */
  pushObjectAsNodeToFrontend(object) {
    return object.isNode() ? this.pushNodeToFrontend(/** @type {string} */ (object.objectId)) : Promise.resolve(null);
  }

  /**
   * @override
   * @return {!Promise}
   */
  suspendModel() {
    return this._agent.disable().then(() => this._setDocument(null));
  }

  /**
   * @override
   * @return {!Promise}
   */
  resumeModel() {
    return this._agent.enable();
  }
};

SDK.SDKModel.register(SDK.DOMModel, SDK.Target.Capability.DOM, true);

/** @enum {symbol} */
SDK.DOMModel.Events = {
  AttrModified: Symbol('AttrModified'),
  AttrRemoved: Symbol('AttrRemoved'),
  CharacterDataModified: Symbol('CharacterDataModified'),
  DOMMutated: Symbol('DOMMutated'),
  NodeInserted: Symbol('NodeInserted'),
  NodeRemoved: Symbol('NodeRemoved'),
  DocumentUpdated: Symbol('DocumentUpdated'),
  ChildNodeCountUpdated: Symbol('ChildNodeCountUpdated'),
  DistributedNodesChanged: Symbol('DistributedNodesChanged'),
  MarkersChanged: Symbol('MarkersChanged')
};


/**
 * @implements {Protocol.DOMDispatcher}
 * @unrestricted
 */
SDK.DOMDispatcher = class {
  /**
   * @param {!SDK.DOMModel} domModel
   */
  constructor(domModel) {
    this._domModel = domModel;
  }

  /**
   * @override
   */
  documentUpdated() {
    this._domModel._documentUpdated();
  }

  /**
   * @override
   * @param {!Protocol.DOM.NodeId} nodeId
   * @param {string} name
   * @param {string} value
   */
  attributeModified(nodeId, name, value) {
    this._domModel._attributeModified(nodeId, name, value);
  }

  /**
   * @override
   * @param {!Protocol.DOM.NodeId} nodeId
   * @param {string} name
   */
  attributeRemoved(nodeId, name) {
    this._domModel._attributeRemoved(nodeId, name);
  }

  /**
   * @override
   * @param {!Array.<!Protocol.DOM.NodeId>} nodeIds
   */
  inlineStyleInvalidated(nodeIds) {
    this._domModel._inlineStyleInvalidated(nodeIds);
  }

  /**
   * @override
   * @param {!Protocol.DOM.NodeId} nodeId
   * @param {string} characterData
   */
  characterDataModified(nodeId, characterData) {
    this._domModel._characterDataModified(nodeId, characterData);
  }

  /**
   * @override
   * @param {!Protocol.DOM.NodeId} parentId
   * @param {!Array.<!Protocol.DOM.Node>} payloads
   */
  setChildNodes(parentId, payloads) {
    this._domModel._setChildNodes(parentId, payloads);
  }

  /**
   * @override
   * @param {!Protocol.DOM.NodeId} nodeId
   * @param {number} childNodeCount
   */
  childNodeCountUpdated(nodeId, childNodeCount) {
    this._domModel._childNodeCountUpdated(nodeId, childNodeCount);
  }

  /**
   * @override
   * @param {!Protocol.DOM.NodeId} parentNodeId
   * @param {!Protocol.DOM.NodeId} previousNodeId
   * @param {!Protocol.DOM.Node} payload
   */
  childNodeInserted(parentNodeId, previousNodeId, payload) {
    this._domModel._childNodeInserted(parentNodeId, previousNodeId, payload);
  }

  /**
   * @override
   * @param {!Protocol.DOM.NodeId} parentNodeId
   * @param {!Protocol.DOM.NodeId} nodeId
   */
  childNodeRemoved(parentNodeId, nodeId) {
    this._domModel._childNodeRemoved(parentNodeId, nodeId);
  }

  /**
   * @override
   * @param {!Protocol.DOM.NodeId} hostId
   * @param {!Protocol.DOM.Node} root
   */
  shadowRootPushed(hostId, root) {
    this._domModel._shadowRootPushed(hostId, root);
  }

  /**
   * @override
   * @param {!Protocol.DOM.NodeId} hostId
   * @param {!Protocol.DOM.NodeId} rootId
   */
  shadowRootPopped(hostId, rootId) {
    this._domModel._shadowRootPopped(hostId, rootId);
  }

  /**
   * @override
   * @param {!Protocol.DOM.NodeId} parentId
   * @param {!Protocol.DOM.Node} pseudoElement
   */
  pseudoElementAdded(parentId, pseudoElement) {
    this._domModel._pseudoElementAdded(parentId, pseudoElement);
  }

  /**
   * @override
   * @param {!Protocol.DOM.NodeId} parentId
   * @param {!Protocol.DOM.NodeId} pseudoElementId
   */
  pseudoElementRemoved(parentId, pseudoElementId) {
    this._domModel._pseudoElementRemoved(parentId, pseudoElementId);
  }

  /**
   * @override
   * @param {!Protocol.DOM.NodeId} insertionPointId
   * @param {!Array.<!Protocol.DOM.BackendNode>} distributedNodes
   */
  distributedNodesUpdated(insertionPointId, distributedNodes) {
    this._domModel._distributedNodesUpdated(insertionPointId, distributedNodes);
  }
};
