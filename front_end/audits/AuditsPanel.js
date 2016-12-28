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
 * @unrestricted
 */
Audits.AuditsPanel = class extends UI.PanelWithSidebar {
  constructor() {
    super('audits');
    this.registerRequiredCSS('ui/panelEnablerView.css');
    this.registerRequiredCSS('audits/auditsPanel.css');

    this._sidebarTree = new UI.TreeOutlineInShadow();
    this._sidebarTree.registerRequiredCSS('audits/auditsSidebarTree.css');
    this.panelSidebarElement().appendChild(this._sidebarTree.element);

    this._auditsItemTreeElement = new Audits.AuditsSidebarTreeElement(this);
    this._sidebarTree.appendChild(this._auditsItemTreeElement);

    this._auditResultsTreeElement = new UI.TreeElement(Common.UIString('RESULTS'), true);
    this._auditResultsTreeElement.selectable = false;
    this._auditResultsTreeElement.listItemElement.classList.add('audits-sidebar-results');
    this._auditResultsTreeElement.expand();
    this._sidebarTree.appendChild(this._auditResultsTreeElement);

    this._constructCategories();

    this._auditController = new Audits.AuditController(this);
    this._launcherView = new Audits.AuditLauncherView(this._auditController);
    for (var id in this.categoriesById)
      this._launcherView.addCategory(this.categoriesById[id]);

    var extensionCategories = Extensions.extensionServer.auditCategories();
    for (var i = 0; i < extensionCategories.length; ++i) {
      var category = extensionCategories[i];
      this.addCategory(new Audits.AuditExtensionCategory(
          category.extensionOrigin, category.id, category.displayName, category.ruleCount));
    }
    Extensions.extensionServer.addEventListener(
        Extensions.ExtensionServer.Events.AuditCategoryAdded, this._extensionAuditCategoryAdded, this);
  }

  /**
   * @return {!Audits.AuditsPanel}
   */
  static instance() {
    return /** @type {!Audits.AuditsPanel} */ (self.runtime.sharedInstance(Audits.AuditsPanel));
  }

  /**
   * @return {!Object.<string, !Audits.AuditCategory>}
   */
  get categoriesById() {
    return this._auditCategoriesById;
  }

  /**
   * @param {!Audits.AuditCategory} category
   */
  addCategory(category) {
    this.categoriesById[category.id] = category;
    this._launcherView.addCategory(category);
  }

  /**
   * @param {string} id
   * @return {!Audits.AuditCategory}
   */
  getCategory(id) {
    return this.categoriesById[id];
  }

  _constructCategories() {
    this._auditCategoriesById = {};
    for (var categoryCtorID in Audits.AuditCategories) {
      var auditCategory = new Audits.AuditCategories[categoryCtorID]();
      auditCategory._id = categoryCtorID;
      this.categoriesById[categoryCtorID] = auditCategory;
    }
  }

  /**
   * @param {string} mainResourceURL
   * @param {!Array.<!Audits.AuditCategoryResult>} results
   */
  auditFinishedCallback(mainResourceURL, results) {
    var ordinal = 1;
    for (var child of this._auditResultsTreeElement.children()) {
      if (child.mainResourceURL === mainResourceURL)
        ordinal++;
    }

    var resultTreeElement = new Audits.AuditResultSidebarTreeElement(this, results, mainResourceURL, ordinal);
    this._auditResultsTreeElement.appendChild(resultTreeElement);
    resultTreeElement.revealAndSelect();
  }

  /**
   * @param {!Array.<!Audits.AuditCategoryResult>} categoryResults
   */
  showResults(categoryResults) {
    if (!categoryResults._resultLocation) {
      categoryResults.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      var resultView = UI.viewManager.createStackLocation();
      resultView.widget().element.classList.add('audit-result-view');
      for (var i = 0; i < categoryResults.length; ++i)
        resultView.showView(new Audits.AuditCategoryResultPane(categoryResults[i]));
      categoryResults._resultLocation = resultView;
    }
    this.visibleView = categoryResults._resultLocation.widget();
  }

  showLauncherView() {
    this.visibleView = this._launcherView;
  }

  get visibleView() {
    return this._visibleView;
  }

  set visibleView(x) {
    if (this._visibleView === x)
      return;

    if (this._visibleView)
      this._visibleView.detach();

    this._visibleView = x;

    if (x)
      this.splitWidget().setMainWidget(x);
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    if (!this._visibleView)
      this._auditsItemTreeElement.select();
  }

  /**
   * @override
   */
  focus() {
    this._sidebarTree.focus();
  }

  clearResults() {
    this._auditsItemTreeElement.revealAndSelect();
    this._auditResultsTreeElement.removeChildren();
  }

  /**
   * @param {!Common.Event} event
   */
  _extensionAuditCategoryAdded(event) {
    var category = /** @type {!Extensions.ExtensionAuditCategory} */ (event.data);
    this.addCategory(new Audits.AuditExtensionCategory(
        category.extensionOrigin, category.id, category.displayName, category.ruleCount));
  }
};

/**
 * @implements {Audits.AuditCategory}
 * @unrestricted
 */
Audits.AuditCategoryImpl = class {
  /**
   * @param {string} displayName
   */
  constructor(displayName) {
    this._displayName = displayName;
    this._rules = [];
  }

  /**
   * @override
   * @return {string}
   */
  get id() {
    // this._id value is injected at construction time.
    return this._id;
  }

  /**
   * @override
   * @return {string}
   */
  get displayName() {
    return this._displayName;
  }

  /**
   * @param {!Audits.AuditRule} rule
   * @param {!Audits.AuditRule.Severity} severity
   */
  addRule(rule, severity) {
    rule.severity = severity;
    this._rules.push(rule);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   * @param {!Array.<!SDK.NetworkRequest>} requests
   * @param {function(!Audits.AuditRuleResult)} ruleResultCallback
   * @param {!Common.Progress} progress
   */
  run(target, requests, ruleResultCallback, progress) {
    this._ensureInitialized();
    var remainingRulesCount = this._rules.length;
    progress.setTotalWork(remainingRulesCount);
    function callbackWrapper(result) {
      ruleResultCallback(result);
      progress.worked();
      if (!--remainingRulesCount)
        progress.done();
    }
    for (var i = 0; i < this._rules.length; ++i) {
      if (!progress.isCanceled())
        this._rules[i].run(target, requests, callbackWrapper, progress);
      else
        callbackWrapper(null);
    }
  }

  _ensureInitialized() {
    if (!this._initialized) {
      if ('initialize' in this)
        this.initialize();
      this._initialized = true;
    }
  }
};

/**
 * @unrestricted
 */
Audits.AuditRule = class {
  /**
   * @param {string} id
   * @param {string} displayName
   */
  constructor(id, displayName) {
    this._id = id;
    this._displayName = displayName;
  }

  get id() {
    return this._id;
  }

  get displayName() {
    return this._displayName;
  }

  /**
   * @param {!Audits.AuditRule.Severity} severity
   */
  set severity(severity) {
    this._severity = severity;
  }

  /**
   * @param {!SDK.Target} target
   * @param {!Array.<!SDK.NetworkRequest>} requests
   * @param {function(?Audits.AuditRuleResult)} callback
   * @param {!Common.Progress} progress
   */
  run(target, requests, callback, progress) {
    if (progress.isCanceled())
      return;

    var result = new Audits.AuditRuleResult(this.displayName);
    result.severity = this._severity;
    this.doRun(target, requests, result, callback, progress);
  }

  /**
   * @param {!SDK.Target} target
   * @param {!Array.<!SDK.NetworkRequest>} requests
   * @param {!Audits.AuditRuleResult} result
   * @param {function(?Audits.AuditRuleResult)} callback
   * @param {!Common.Progress} progress
   */
  doRun(target, requests, result, callback, progress) {
    throw new Error('doRun() not implemented');
  }
};

/**
 * @enum {string}
 */
Audits.AuditRule.Severity = {
  Info: 'info',
  Warning: 'warning',
  Severe: 'severe'
};

Audits.AuditRule.SeverityOrder = {
  'info': 3,
  'warning': 2,
  'severe': 1
};

/**
 * @unrestricted
 */
Audits.AuditCategoryResult = class {
  /**
   * @param {!Audits.AuditCategory} category
   */
  constructor(category) {
    this.title = category.displayName;
    this.ruleResults = [];
  }

  /**
   * @param {!Audits.AuditRuleResult} ruleResult
   */
  addRuleResult(ruleResult) {
    this.ruleResults.push(ruleResult);
  }
};

/**
 * @unrestricted
 */
Audits.AuditRuleResult = class {
  /**
   * @param {(string|boolean|number|!Object)} value
   * @param {boolean=} expanded
   * @param {string=} className
   */
  constructor(value, expanded, className) {
    this.value = value;
    this.className = className;
    this.expanded = expanded;
    this.violationCount = 0;
    this._formatters = {r: Audits.AuditRuleResult.linkifyDisplayName};
    var standardFormatters = Object.keys(String.standardFormatters);
    for (var i = 0; i < standardFormatters.length; ++i)
      this._formatters[standardFormatters[i]] = String.standardFormatters[standardFormatters[i]];
  }

  /**
   * @param {string} url
   * @return {!Element}
   */
  static linkifyDisplayName(url) {
    return Components.Linkifier.linkifyURL(url, Bindings.displayNameForURL(url));
  }

  /**
   * @param {string} domain
   * @return {string}
   */
  static resourceDomain(domain) {
    return domain || Common.UIString('[empty domain]');
  }

  /**
   * @param {(string|boolean|number|!Object)} value
   * @param {boolean=} expanded
   * @param {string=} className
   * @return {!Audits.AuditRuleResult}
   */
  addChild(value, expanded, className) {
    if (!this.children)
      this.children = [];
    var entry = new Audits.AuditRuleResult(value, expanded, className);
    this.children.push(entry);
    return entry;
  }

  /**
   * @param {string} url
   */
  addURL(url) {
    this.addChild(Audits.AuditRuleResult.linkifyDisplayName(url));
  }

  /**
   * @param {!Array.<string>} urls
   */
  addURLs(urls) {
    for (var i = 0; i < urls.length; ++i)
      this.addURL(urls[i]);
  }

  /**
   * @param {string} snippet
   */
  addSnippet(snippet) {
    this.addChild(snippet, false, 'source-code');
  }

  /**
   * @param {string} format
   * @param {...*} vararg
   * @return {!Audits.AuditRuleResult}
   */
  addFormatted(format, vararg) {
    var substitutions = Array.prototype.slice.call(arguments, 1);
    var fragment = createDocumentFragment();

    function append(a, b) {
      if (!(b instanceof Node))
        b = createTextNode(b);
      a.appendChild(b);
      return a;
    }

    var formattedResult = String.format(format, substitutions, this._formatters, fragment, append).formattedResult;
    if (formattedResult instanceof Node)
      formattedResult.normalize();
    return this.addChild(formattedResult);
  }
};


/**
 * @unrestricted
 */
Audits.AuditsSidebarTreeElement = class extends UI.TreeElement {
  /**
   * @param {!Audits.AuditsPanel} panel
   */
  constructor(panel) {
    super(Common.UIString('Audits'), false);
    this.selectable = true;
    this._panel = panel;
    this.listItemElement.classList.add('audits-sidebar-header');
    this.listItemElement.insertBefore(createElementWithClass('div', 'icon'), this.listItemElement.firstChild);
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect() {
    this._panel.showLauncherView();
    return true;
  }
};

/**
 * @unrestricted
 */
Audits.AuditResultSidebarTreeElement = class extends UI.TreeElement {
  /**
   * @param {!Audits.AuditsPanel} panel
   * @param {!Array.<!Audits.AuditCategoryResult>} results
   * @param {string} mainResourceURL
   * @param {number} ordinal
   */
  constructor(panel, results, mainResourceURL, ordinal) {
    super(String.sprintf('%s (%d)', mainResourceURL, ordinal), false);
    this.selectable = true;
    this._panel = panel;
    this.results = results;
    this.mainResourceURL = mainResourceURL;
    this.listItemElement.classList.add('audit-result-sidebar-tree-item');
    this.listItemElement.insertBefore(createElementWithClass('div', 'icon'), this.listItemElement.firstChild);
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect() {
    this._panel.showResults(this.results);
    return true;
  }
};


// Contributed audit rules should go into this namespace.
Audits.AuditRules = {};

/**
 * Contributed audit categories should go into this namespace.
 * @type {!Object.<string, function(new:Audits.AuditCategory)>}
 */
Audits.AuditCategories = {};
