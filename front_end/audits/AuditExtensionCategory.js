/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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
 * @implements {Audits.AuditCategory}
 * @unrestricted
 */
Audits.AuditExtensionCategory = class {
  /**
   * @param {string} extensionOrigin
   * @param {string} id
   * @param {string} displayName
   * @param {number=} ruleCount
   */
  constructor(extensionOrigin, id, displayName, ruleCount) {
    this._extensionOrigin = extensionOrigin;
    this._id = id;
    this._displayName = displayName;
    this._ruleCount = ruleCount;
  }

  /**
   * @override
   */
  get id() {
    return this._id;
  }

  /**
   * @override
   */
  get displayName() {
    return this._displayName;
  }

  /**
   * @override
   * @param {!SDK.Target} target
   * @param {!Array.<!SDK.NetworkRequest>} requests
   * @param {function(!Audits.AuditRuleResult)} ruleResultCallback
   * @param {!Common.Progress} progress
   */
  run(target, requests, ruleResultCallback, progress) {
    var results = new Audits.AuditExtensionCategoryResults(this, target, ruleResultCallback, progress);
    Extensions.extensionServer.startAuditRun(this.id, results);
  }
};

/**
 * @implements {Extensions.ExtensionAuditCategoryResults}
 * @unrestricted
 */
Audits.AuditExtensionCategoryResults = class {
  /**
   * @param {!Audits.AuditExtensionCategory} category
   * @param {!SDK.Target} target
   * @param {function(!Audits.AuditRuleResult)} ruleResultCallback
   * @param {!Common.Progress} progress
   */
  constructor(category, target, ruleResultCallback, progress) {
    this._target = target;
    this._category = category;
    this._ruleResultCallback = ruleResultCallback;
    this._progress = progress;
    this._progress.setTotalWork(1);
    this._expectedResults = category._ruleCount;
    this._actualResults = 0;

    this._id = category.id + '-' + ++Audits.AuditExtensionCategoryResults._lastId;
  }

  /**
   * @override
   * @return {string}
   */
  id() {
    return this._id;
  }

  /**
   * @override
   */
  done() {
    Extensions.extensionServer.stopAuditRun(this);
    this._progress.done();
  }

  /**
   * @override
   * @param {string} displayName
   * @param {string} description
   * @param {string} severity
   * @param {!Object} details
   */
  addResult(displayName, description, severity, details) {
    var result = new Audits.AuditRuleResult(displayName);
    if (description)
      result.addChild(description);
    result.severity = severity;
    if (details)
      this._addNode(result, details);
    this._addResult(result);
  }

  _addNode(parent, node) {
    var contents = Audits.auditFormatters.partiallyApply(Audits.AuditExtensionFormatters, this, node.contents);
    var addedNode = parent.addChild(contents, node.expanded);
    if (node.children) {
      for (var i = 0; i < node.children.length; ++i)
        this._addNode(addedNode, node.children[i]);
    }
  }

  _addResult(result) {
    this._ruleResultCallback(result);
    ++this._actualResults;
    if (typeof this._expectedResults === 'number') {
      this._progress.setWorked(this._actualResults / this._expectedResults);
      if (this._actualResults === this._expectedResults)
        this.done();
    }
  }

  /**
   * @override
   * @param {number} progress
   */
  updateProgress(progress) {
    this._progress.setWorked(progress);
  }

  /**
   * @param {string} expression
   * @param {?Object} evaluateOptions
   * @param {function(!SDK.RemoteObject)} callback
   */
  evaluate(expression, evaluateOptions, callback) {
    /**
     * @param {?string} error
     * @param {?SDK.RemoteObject} result
     * @param {boolean=} wasThrown
     * @this {Audits.AuditExtensionCategoryResults}
     */
    function onEvaluate(error, result, wasThrown) {
      var runtimeModel = this._target.model(SDK.RuntimeModel);
      if (wasThrown || !runtimeModel || !result)
        return;
      callback(result);
    }
    Extensions.extensionServer.evaluate(
        expression, false, false, evaluateOptions, this._category._extensionOrigin, onEvaluate.bind(this));
  }
};

Audits.AuditExtensionFormatters = {
  /**
   * @this {Audits.AuditExtensionCategoryResults}
   * @param {string} expression
   * @param {string} title
   * @param {?Object} evaluateOptions
   * @return {!Element}
   */
  object: function(expression, title, evaluateOptions) {
    var parentElement = createElement('div');
    function onEvaluate(remoteObject) {
      var section = new ObjectUI.ObjectPropertiesSection(remoteObject, title);
      section.expand();
      section.editable = false;
      parentElement.appendChild(section.element);
    }
    this.evaluate(expression, evaluateOptions, onEvaluate);
    return parentElement;
  },

  /**
   * @this {Audits.AuditExtensionCategoryResults}
   * @param {string} expression
   * @param {?Object} evaluateOptions
   * @return {!Element}
   */
  node: function(expression, evaluateOptions) {
    var parentElement = createElement('div');
    this.evaluate(expression, evaluateOptions, async remoteObject => {
      await append(remoteObject);
      remoteObject.release();
    });
    return parentElement;

    /**
     * @param {!SDK.RemoteObject} remoteObject
     */
    async function append(remoteObject) {
      if (!remoteObject.isNode())
        return;
      var domModel = remoteObject.runtimeModel().target().model(SDK.DOMModel);
      if (!domModel)
        return;
      var node = await domModel.pushObjectAsNodeToFrontend(remoteObject);
      if (!node)
        return;
      var element = await Common.Renderer.renderPromise(/** @type {!SDK.DOMNode} */ (node));
      parentElement.appendChild(element);
    }
  }
};

Audits.AuditExtensionCategoryResults._lastId = 0;
