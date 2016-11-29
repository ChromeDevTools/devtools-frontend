// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
Security.SecurityPanel = class extends UI.PanelWithSidebar {
  constructor() {
    super('security');

    this._mainView = new Security.SecurityMainView(this);

    this._sidebarMainViewElement = new Security.SecurityPanelSidebarTreeElement(
        Common.UIString('Overview'), this._setVisibleView.bind(this, this._mainView),
        'security-main-view-sidebar-tree-item', 'lock-icon');
    this._sidebarTree = new Security.SecurityPanelSidebarTree(this._sidebarMainViewElement, this.showOrigin.bind(this));
    this.panelSidebarElement().appendChild(this._sidebarTree.element);

    /** @type {!Map<!Protocol.Network.LoaderId, !SDK.NetworkRequest>} */
    this._lastResponseReceivedForLoaderId = new Map();

    /** @type {!Map<!Security.SecurityPanel.Origin, !Security.SecurityPanel.OriginState>} */
    this._origins = new Map();

    /** @type {!Map<!Network.NetworkLogView.MixedContentFilterValues, number>} */
    this._filterRequestCounts = new Map();

    /** @type {!Map<!SDK.Target, !Array<!Common.EventTarget.EventDescriptor>>}*/
    this._eventListeners = new Map();
    SDK.targetManager.observeTargets(this, SDK.Target.Capability.Network);
  }

  /**
   * @return {!Security.SecurityPanel}
   */
  static _instance() {
    return /** @type {!Security.SecurityPanel} */ (self.runtime.sharedInstance(Security.SecurityPanel));
  }

  /**
   * @param {string} text
   * @param {!Security.SecurityPanel} panel
   * @return {!Element}
   */
  static createCertificateViewerButton(text, panel) {
    /**
     * @param {!Event} e
     */
    function showCertificateViewer(e) {
      e.consume();
      panel.showCertificateViewer();
    }

    return createTextButton(text, showCertificateViewer, 'security-certificate-button');
  }

  /**
   * @param {string} text
   * @param {string} origin
   * @return {!Element}
   */
  static createCertificateViewerButton2(text, origin) {
    /**
     * @param {!Event} e
     */
    function showCertificateViewer(e) {
      function certificateCallback(names) {
        InspectorFrontendHost.showCertificateViewer(names);
      }

      e.consume();
      SDK.multitargetNetworkManager.getCertificate(origin, certificateCallback);
    }

    return createTextButton(text, showCertificateViewer, 'security-certificate-button');
  }

  /**
   * @param {!Protocol.Security.SecurityState} securityState
   */
  setRanInsecureContentStyle(securityState) {
    this._ranInsecureContentStyle = securityState;
  }

  /**
   * @param {!Protocol.Security.SecurityState} securityState
   */
  setDisplayedInsecureContentStyle(securityState) {
    this._displayedInsecureContentStyle = securityState;
  }

  /**
   * @param {!Protocol.Security.SecurityState} newSecurityState
   * @param {!Array<!Protocol.Security.SecurityStateExplanation>} explanations
   * @param {?Protocol.Security.InsecureContentStatus} insecureContentStatus
   * @param {boolean} schemeIsCryptographic
   */
  _updateSecurityState(newSecurityState, explanations, insecureContentStatus, schemeIsCryptographic) {
    this._sidebarMainViewElement.setSecurityState(newSecurityState);
    this._mainView.updateSecurityState(newSecurityState, explanations, insecureContentStatus, schemeIsCryptographic);
  }

  /**
   * @param {!Common.Event} event
   */
  _onSecurityStateChanged(event) {
    var data = /** @type {!Security.PageSecurityState} */ (event.data);
    var securityState = /** @type {!Protocol.Security.SecurityState} */ (data.securityState);
    var explanations = /** @type {!Array<!Protocol.Security.SecurityStateExplanation>} */ (data.explanations);
    var insecureContentStatus = /** @type {?Protocol.Security.InsecureContentStatus} */ (data.insecureContentStatus);
    var schemeIsCryptographic = /** @type {boolean} */ (data.schemeIsCryptographic);
    this._updateSecurityState(securityState, explanations, insecureContentStatus, schemeIsCryptographic);
  }

  selectAndSwitchToMainView() {
    // The sidebar element will trigger displaying the main view. Rather than making a redundant call to display the main view, we rely on this.
    this._sidebarMainViewElement.select();
  }
  /**
   * @param {!Security.SecurityPanel.Origin} origin
   */
  showOrigin(origin) {
    var originState = this._origins.get(origin);
    if (!originState.originView)
      originState.originView = new Security.SecurityOriginView(this, origin, originState);

    this._setVisibleView(originState.originView);
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    if (!this._visibleView)
      this.selectAndSwitchToMainView();
  }

  /**
   * @override
   */
  focus() {
    this._sidebarTree.focus();
  }

  /**
   * @param {!UI.VBox} view
   */
  _setVisibleView(view) {
    if (this._visibleView === view)
      return;

    if (this._visibleView)
      this._visibleView.detach();

    this._visibleView = view;

    if (view)
      this.splitWidget().setMainWidget(view);
  }

  /**
   * @param {!Common.Event} event
   */
  _onResponseReceived(event) {
    var request = /** @type {!SDK.NetworkRequest} */ (event.data);
    if (request.resourceType() === Common.resourceTypes.Document)
      this._lastResponseReceivedForLoaderId.set(request.loaderId, request);
  }

  /**
   * @param {!SDK.NetworkRequest} request
   */
  _processRequest(request) {
    var origin = Common.ParsedURL.extractOrigin(request.url);

    if (!origin) {
      // We don't handle resources like data: URIs. Most of them don't affect the lock icon.
      return;
    }

    var securityState = /** @type {!Protocol.Security.SecurityState} */ (request.securityState());

    if (request.mixedContentType === Protocol.Network.RequestMixedContentType.Blockable &&
        this._ranInsecureContentStyle)
      securityState = this._ranInsecureContentStyle;
    else if (
        request.mixedContentType === Protocol.Network.RequestMixedContentType.OptionallyBlockable &&
        this._displayedInsecureContentStyle)
      securityState = this._displayedInsecureContentStyle;

    if (this._origins.has(origin)) {
      var originState = this._origins.get(origin);
      var oldSecurityState = originState.securityState;
      originState.securityState = this._securityStateMin(oldSecurityState, securityState);
      if (oldSecurityState !== originState.securityState) {
        this._sidebarTree.updateOrigin(origin, securityState);
        if (originState.originView)
          originState.originView.setSecurityState(securityState);
      }
    } else {
      // TODO(lgarron): Store a (deduplicated) list of different security details we have seen. https://crbug.com/503170
      var originState = {};
      originState.securityState = securityState;

      var securityDetails = request.securityDetails();
      if (securityDetails)
        originState.securityDetails = securityDetails;


      this._origins.set(origin, originState);

      this._sidebarTree.addOrigin(origin, securityState);

      // Don't construct the origin view yet (let it happen lazily).
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _onRequestFinished(event) {
    var request = /** @type {!SDK.NetworkRequest} */ (event.data);
    this._updateFilterRequestCounts(request);
    this._processRequest(request);
  }

  /**
   * @param {!SDK.NetworkRequest} request
   */
  _updateFilterRequestCounts(request) {
    if (request.mixedContentType === Protocol.Network.RequestMixedContentType.None)
      return;

    /** @type {!Network.NetworkLogView.MixedContentFilterValues} */
    var filterKey = Network.NetworkLogView.MixedContentFilterValues.All;
    if (request.wasBlocked())
      filterKey = Network.NetworkLogView.MixedContentFilterValues.Blocked;
    else if (request.mixedContentType === Protocol.Network.RequestMixedContentType.Blockable)
      filterKey = Network.NetworkLogView.MixedContentFilterValues.BlockOverridden;
    else if (request.mixedContentType === Protocol.Network.RequestMixedContentType.OptionallyBlockable)
      filterKey = Network.NetworkLogView.MixedContentFilterValues.Displayed;

    if (!this._filterRequestCounts.has(filterKey))
      this._filterRequestCounts.set(filterKey, 1);
    else
      this._filterRequestCounts.set(filterKey, this._filterRequestCounts.get(filterKey) + 1);

    this._mainView.refreshExplanations();
  }

  /**
   * @param {!Network.NetworkLogView.MixedContentFilterValues} filterKey
   * @return {number}
   */
  filterRequestCount(filterKey) {
    return this._filterRequestCounts.get(filterKey) || 0;
  }

  showCertificateViewer() {
    var securityModel = Security.SecurityModel.fromTarget(this._target);
    securityModel.showCertificateViewer();
  }

  /**
   * @param {!Protocol.Security.SecurityState} stateA
   * @param {!Protocol.Security.SecurityState} stateB
   * @return {!Protocol.Security.SecurityState}
   */
  _securityStateMin(stateA, stateB) {
    return Security.SecurityModel.SecurityStateComparator(stateA, stateB) < 0 ? stateA : stateB;
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    if (this._target)
      return;

    var listeners = [];
    var resourceTreeModel = SDK.ResourceTreeModel.fromTarget(target);
    if (resourceTreeModel) {
      listeners = listeners.concat([
        resourceTreeModel.addEventListener(
            SDK.ResourceTreeModel.Events.MainFrameNavigated, this._onMainFrameNavigated, this),
        resourceTreeModel.addEventListener(
            SDK.ResourceTreeModel.Events.InterstitialShown, this._onInterstitialShown, this),
        resourceTreeModel.addEventListener(
            SDK.ResourceTreeModel.Events.InterstitialHidden, this._onInterstitialHidden, this),
      ]);

      if (resourceTreeModel.isInterstitialShowing())
        this._onInterstitialShown();
    }

    var networkManager = SDK.NetworkManager.fromTarget(target);
    if (networkManager) {
      listeners = listeners.concat([
        networkManager.addEventListener(SDK.NetworkManager.Events.ResponseReceived, this._onResponseReceived, this),
        networkManager.addEventListener(SDK.NetworkManager.Events.RequestFinished, this._onRequestFinished, this),
      ]);
    }

    var securityModel = Security.SecurityModel.fromTarget(target);
    if (securityModel) {
      listeners = listeners.concat([securityModel.addEventListener(
          Security.SecurityModel.Events.SecurityStateChanged, this._onSecurityStateChanged, this)]);
    }

    this._target = target;
    this._eventListeners.set(target, listeners);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    if (this._target !== target)
      return;

    delete this._target;

    Common.EventTarget.removeEventListeners(this._eventListeners.get(target));
    this._eventListeners.delete(target);
  }

  /**
   * @param {!Common.Event} event
   */
  _onMainFrameNavigated(event) {
    var frame = /** type {!Protocol.Page.Frame}*/ (event.data);
    var request = this._lastResponseReceivedForLoaderId.get(frame.loaderId);

    this.selectAndSwitchToMainView();
    this._sidebarTree.clearOrigins();
    this._origins.clear();
    this._lastResponseReceivedForLoaderId.clear();
    this._filterRequestCounts.clear();
    // After clearing the filtered request counts, refresh the
    // explanations to reflect the new counts.
    this._mainView.refreshExplanations();

    if (request) {
      var origin = Common.ParsedURL.extractOrigin(request.url);
      this._sidebarTree.setMainOrigin(origin);
      this._processRequest(request);
    }
  }

  _onInterstitialShown() {
    // The panel might have been displaying the origin view on the
    // previously loaded page. When showing an interstitial, switch
    // back to the Overview view.
    this.selectAndSwitchToMainView();
    this._sidebarTree.toggleOriginsList(true /* hidden */);
  }

  _onInterstitialHidden() {
    this._sidebarTree.toggleOriginsList(false /* hidden */);
  }
};

/** @typedef {string} */
Security.SecurityPanel.Origin;

/**
 * @typedef {Object}
 * @property {!Protocol.Security.SecurityState} securityState - Current security state of the origin.
 * @property {?Protocol.Network.SecurityDetails} securityDetails - Security details of the origin, if available.
 * @property {?Promise<>} certificateDetailsPromise - Certificate details of the origin.
 * @property {?Security.SecurityOriginView} originView - Current SecurityOriginView corresponding to origin.
 */
Security.SecurityPanel.OriginState;


/**
 * @unrestricted
 */
Security.SecurityPanelSidebarTree = class extends TreeOutlineInShadow {
  /**
   * @param {!Security.SecurityPanelSidebarTreeElement} mainViewElement
   * @param {function(!Security.SecurityPanel.Origin)} showOriginInPanel
   */
  constructor(mainViewElement, showOriginInPanel) {
    super();
    this.registerRequiredCSS('security/sidebar.css');
    this.registerRequiredCSS('security/lockIcon.css');
    this.appendChild(mainViewElement);

    this._showOriginInPanel = showOriginInPanel;
    this._mainOrigin = null;

    /** @type {!Map<!Security.SecurityPanelSidebarTree.OriginGroupName, !TreeElement>} */
    this._originGroups = new Map();

    for (var key in Security.SecurityPanelSidebarTree.OriginGroupName) {
      var originGroupName = Security.SecurityPanelSidebarTree.OriginGroupName[key];
      var originGroup = new TreeElement(originGroupName, true);
      originGroup.selectable = false;
      originGroup.expand();
      originGroup.listItemElement.classList.add('security-sidebar-origins');
      this._originGroups.set(originGroupName, originGroup);
      this.appendChild(originGroup);
    }
    this._clearOriginGroups();

    // This message will be removed by clearOrigins() during the first new page load after the panel was opened.
    var mainViewReloadMessage = new TreeElement(Common.UIString('Reload to view details'));
    mainViewReloadMessage.selectable = false;
    mainViewReloadMessage.listItemElement.classList.add('security-main-view-reload-message');
    this._originGroups.get(Security.SecurityPanelSidebarTree.OriginGroupName.MainOrigin)
        .appendChild(mainViewReloadMessage);

    /** @type {!Map<!Security.SecurityPanel.Origin, !Security.SecurityPanelSidebarTreeElement>} */
    this._elementsByOrigin = new Map();
  }

  /**
   * @param {boolean} hidden
   */
  toggleOriginsList(hidden) {
    for (var key in Security.SecurityPanelSidebarTree.OriginGroupName) {
      var originGroupName = Security.SecurityPanelSidebarTree.OriginGroupName[key];
      var group = this._originGroups.get(originGroupName);
      if (group)
        group.hidden = hidden;
    }
  }

  /**
   * @param {!Security.SecurityPanel.Origin} origin
   * @param {!Protocol.Security.SecurityState} securityState
   */
  addOrigin(origin, securityState) {
    var originElement = new Security.SecurityPanelSidebarTreeElement(
        origin, this._showOriginInPanel.bind(this, origin), 'security-sidebar-tree-item', 'security-property');
    originElement.listItemElement.title = origin;
    this._elementsByOrigin.set(origin, originElement);
    this.updateOrigin(origin, securityState);
  }

  /**
   * @param {!Security.SecurityPanel.Origin} origin
   */
  setMainOrigin(origin) {
    this._mainOrigin = origin;
  }

  /**
   * @param {!Security.SecurityPanel.Origin} origin
   * @param {!Protocol.Security.SecurityState} securityState
   */
  updateOrigin(origin, securityState) {
    var originElement =
        /** @type {!Security.SecurityPanelSidebarTreeElement} */ (this._elementsByOrigin.get(origin));
    originElement.setSecurityState(securityState);

    var newParent;
    if (origin === this._mainOrigin) {
      newParent = this._originGroups.get(Security.SecurityPanelSidebarTree.OriginGroupName.MainOrigin);
    } else {
      switch (securityState) {
        case Protocol.Security.SecurityState.Secure:
          newParent = this._originGroups.get(Security.SecurityPanelSidebarTree.OriginGroupName.Secure);
          break;
        case Protocol.Security.SecurityState.Unknown:
          newParent = this._originGroups.get(Security.SecurityPanelSidebarTree.OriginGroupName.Unknown);
          break;
        default:
          newParent = this._originGroups.get(Security.SecurityPanelSidebarTree.OriginGroupName.NonSecure);
          break;
      }
    }

    var oldParent = originElement.parent;
    if (oldParent !== newParent) {
      if (oldParent) {
        oldParent.removeChild(originElement);
        if (oldParent.childCount() === 0)
          oldParent.hidden = true;
      }
      newParent.appendChild(originElement);
      newParent.hidden = false;
    }
  }

  _clearOriginGroups() {
    for (var originGroup of this._originGroups.values()) {
      originGroup.removeChildren();
      originGroup.hidden = true;
    }
    this._originGroups.get(Security.SecurityPanelSidebarTree.OriginGroupName.MainOrigin).hidden = false;
  }

  clearOrigins() {
    this._clearOriginGroups();
    this._elementsByOrigin.clear();
  }
};

/**
 * A mapping from Javascript key IDs to names (sidebar section titles).
 * Note: The names are used as keys into a map, so they must be distinct from each other.
 * @enum {string}
 */
Security.SecurityPanelSidebarTree.OriginGroupName = {
  MainOrigin: Common.UIString('Main Origin'),
  NonSecure: Common.UIString('Non-Secure Origins'),
  Secure: Common.UIString('Secure Origins'),
  Unknown: Common.UIString('Unknown / Canceled')
};

/**
 * @unrestricted
 */
Security.SecurityPanelSidebarTreeElement = class extends TreeElement {
  /**
   * @param {string} text
   * @param {function()} selectCallback
   * @param {string} className
   * @param {string} cssPrefix
   */
  constructor(text, selectCallback, className, cssPrefix) {
    super('', false);
    this._selectCallback = selectCallback;
    this._cssPrefix = cssPrefix;
    this.listItemElement.classList.add(className);
    this._iconElement = this.listItemElement.createChild('div', 'icon');
    this._iconElement.classList.add(this._cssPrefix);
    this.listItemElement.createChild('span', 'title').textContent = text;
    this.setSecurityState(Protocol.Security.SecurityState.Unknown);
  }

  /**
   * @param {!Security.SecurityPanelSidebarTreeElement} a
   * @param {!Security.SecurityPanelSidebarTreeElement} b
   * @return {number}
   */
  static SecurityStateComparator(a, b) {
    return Security.SecurityModel.SecurityStateComparator(a.securityState(), b.securityState());
  }

  /**
   * @param {!Protocol.Security.SecurityState} newSecurityState
   */
  setSecurityState(newSecurityState) {
    if (this._securityState)
      this._iconElement.classList.remove(this._cssPrefix + '-' + this._securityState);

    this._securityState = newSecurityState;
    this._iconElement.classList.add(this._cssPrefix + '-' + newSecurityState);
  }

  /**
   * @return {!Protocol.Security.SecurityState}
   */
  securityState() {
    return this._securityState;
  }

  /**
   * @override
   * @return {boolean}
   */
  onselect() {
    this._selectCallback();
    return true;
  }
};


/**
 * @unrestricted
 */
Security.SecurityMainView = class extends UI.VBox {
  /**
   * @param {!Security.SecurityPanel} panel
   */
  constructor(panel) {
    super(true);
    this.registerRequiredCSS('security/mainView.css');
    this.registerRequiredCSS('security/lockIcon.css');
    this.setMinimumSize(200, 100);

    this.contentElement.classList.add('security-main-view');

    this._panel = panel;

    this._summarySection = this.contentElement.createChild('div', 'security-summary');

    // Info explanations should appear after all others.
    this._securityExplanationsMain = this.contentElement.createChild('div', 'security-explanation-list');
    this._securityExplanationsExtra =
        this.contentElement.createChild('div', 'security-explanation-list security-explanations-extra');

    // Fill the security summary section.
    this._summarySection.createChild('div', 'security-summary-section-title').textContent =
        Common.UIString('Security Overview');

    var lockSpectrum = this._summarySection.createChild('div', 'lock-spectrum');
    lockSpectrum.createChild('div', 'lock-icon lock-icon-secure').title = Common.UIString('Secure');
    lockSpectrum.createChild('div', 'lock-icon lock-icon-neutral').title = Common.UIString('Not Secure');
    lockSpectrum.createChild('div', 'lock-icon lock-icon-insecure').title = Common.UIString('Not Secure (Broken)');

    this._summarySection.createChild('div', 'triangle-pointer-container')
        .createChild('div', 'triangle-pointer-wrapper')
        .createChild('div', 'triangle-pointer');

    this._summaryText = this._summarySection.createChild('div', 'security-summary-text');
  }

  /**
   * @param {!Element} parent
   * @param {!Protocol.Security.SecurityStateExplanation} explanation
   * @return {!Element}
   */
  _addExplanation(parent, explanation) {
    var explanationSection = parent.createChild('div', 'security-explanation');
    explanationSection.classList.add('security-explanation-' + explanation.securityState);

    explanationSection.createChild('div', 'security-property')
        .classList.add('security-property-' + explanation.securityState);
    var text = explanationSection.createChild('div', 'security-explanation-text');
    text.createChild('div', 'security-explanation-title').textContent = explanation.summary;
    text.createChild('div').textContent = explanation.description;

    if (explanation.hasCertificate) {
      text.appendChild(
          Security.SecurityPanel.createCertificateViewerButton(Common.UIString('View certificate'), this._panel));
    }

    return text;
  }

  /**
   * @param {!Protocol.Security.SecurityState} newSecurityState
   * @param {!Array<!Protocol.Security.SecurityStateExplanation>} explanations
   * @param {?Protocol.Security.InsecureContentStatus} insecureContentStatus
   * @param {boolean} schemeIsCryptographic
   */
  updateSecurityState(newSecurityState, explanations, insecureContentStatus, schemeIsCryptographic) {
    // Remove old state.
    // It's safe to call this even when this._securityState is undefined.
    this._summarySection.classList.remove('security-summary-' + this._securityState);

    // Add new state.
    this._securityState = newSecurityState;
    this._summarySection.classList.add('security-summary-' + this._securityState);
    var summaryExplanationStrings = {
      'unknown': Common.UIString('The security of this page is unknown.'),
      'insecure': Common.UIString('This page is not secure (broken HTTPS).'),
      'neutral': Common.UIString('This page is not secure.'),
      'secure': Common.UIString('This page is secure (valid HTTPS).')
    };
    this._summaryText.textContent = summaryExplanationStrings[this._securityState];

    this._explanations = explanations, this._insecureContentStatus = insecureContentStatus;
    this._schemeIsCryptographic = schemeIsCryptographic;

    this._panel.setRanInsecureContentStyle(insecureContentStatus.ranInsecureContentStyle);
    this._panel.setDisplayedInsecureContentStyle(insecureContentStatus.displayedInsecureContentStyle);

    this.refreshExplanations();
  }

  refreshExplanations() {
    this._securityExplanationsMain.removeChildren();
    this._securityExplanationsExtra.removeChildren();
    for (var explanation of this._explanations) {
      if (explanation.securityState === Protocol.Security.SecurityState.Info)
        this._addExplanation(this._securityExplanationsExtra, explanation);
      else
        this._addExplanation(this._securityExplanationsMain, explanation);
    }

    this._addMixedContentExplanations();
    this._addContentWithCertErrorsExplanations();

    // If all resources were served securely, add a Secure explanation.
    if (this._schemeIsCryptographic && this._insecureContentStatus &&
        (!this._insecureContentStatus.displayedMixedContent && !this._insecureContentStatus.ranMixedContent &&
         !this._insecureContentStatus.displayedContentWithCertErrors &&
         !this._insecureContentStatus.ranContentWithCertErrors)) {
      this._addExplanation(this._securityExplanationsMain, /** @type {!Protocol.Security.SecurityStateExplanation} */ ({
                             'securityState': Protocol.Security.SecurityState.Secure,
                             'summary': Common.UIString('Secure Resources'),
                             'description': Common.UIString('All resources on this page are served securely.')
                           }));
    }
  }

  _addMixedContentExplanations() {
    if (!this._schemeIsCryptographic)
      return;

    if (this._insecureContentStatus &&
        (this._insecureContentStatus.ranMixedContent || this._insecureContentStatus.displayedMixedContent)) {
      if (this._insecureContentStatus.ranMixedContent) {
        this._addMixedContentExplanation(
            this._securityExplanationsMain, this._insecureContentStatus.ranInsecureContentStyle,
            Common.UIString('Active Mixed Content'),
            Common.UIString(
                'You have recently allowed non-secure content (such as scripts or iframes) to run on this site.'),
            Network.NetworkLogView.MixedContentFilterValues.BlockOverridden,
            showBlockOverriddenMixedContentInNetworkPanel);
      }
      if (this._insecureContentStatus.displayedMixedContent) {
        this._addMixedContentExplanation(
            this._securityExplanationsMain, this._insecureContentStatus.displayedInsecureContentStyle,
            Common.UIString('Mixed Content'), Common.UIString('The site includes HTTP resources.'),
            Network.NetworkLogView.MixedContentFilterValues.Displayed, showDisplayedMixedContentInNetworkPanel);
      }
    }

    if (this._panel.filterRequestCount(Network.NetworkLogView.MixedContentFilterValues.Blocked) > 0) {
      this._addMixedContentExplanation(
          this._securityExplanationsExtra, Protocol.Security.SecurityState.Info,
          Common.UIString('Blocked mixed content'),
          Common.UIString('Your page requested non-secure resources that were blocked.'),
          Network.NetworkLogView.MixedContentFilterValues.Blocked, showBlockedMixedContentInNetworkPanel);
    }

    /**
     * @param {!Event} e
     */
    function showDisplayedMixedContentInNetworkPanel(e) {
      e.consume();
      Network.NetworkPanel.revealAndFilter([{
        filterType: Network.NetworkLogView.FilterType.MixedContent,
        filterValue: Network.NetworkLogView.MixedContentFilterValues.Displayed
      }]);
    }

    /**
     * @param {!Event} e
     */
    function showBlockOverriddenMixedContentInNetworkPanel(e) {
      e.consume();
      Network.NetworkPanel.revealAndFilter([{
        filterType: Network.NetworkLogView.FilterType.MixedContent,
        filterValue: Network.NetworkLogView.MixedContentFilterValues.BlockOverridden
      }]);
    }

    /**
     * @param {!Event} e
     */
    function showBlockedMixedContentInNetworkPanel(e) {
      e.consume();
      Network.NetworkPanel.revealAndFilter([{
        filterType: Network.NetworkLogView.FilterType.MixedContent,
        filterValue: Network.NetworkLogView.MixedContentFilterValues.Blocked
      }]);
    }
  }

  /**
   * @param {!Element} parent
   * @param {!Protocol.Security.SecurityState} securityState
   * @param {string} summary
   * @param {string} description
   * @param {!Network.NetworkLogView.MixedContentFilterValues} filterKey
   * @param {!Function} networkFilterFn
   */
  _addMixedContentExplanation(parent, securityState, summary, description, filterKey, networkFilterFn) {
    var mixedContentExplanation = /** @type {!Protocol.Security.SecurityStateExplanation} */ (
        {'securityState': securityState, 'summary': summary, 'description': description});

    var explanation = this._addExplanation(parent, mixedContentExplanation);

    var filterRequestCount = this._panel.filterRequestCount(filterKey);
    if (!filterRequestCount) {
      // Network instrumentation might not have been enabled for the page
      // load, so the security panel does not necessarily know a count of
      // individual mixed requests at this point. Prompt them to refresh
      // instead of pointing them to the Network panel to get prompted
      // to refresh.
      var refreshPrompt = explanation.createChild('div', 'security-mixed-content');
      refreshPrompt.textContent = Common.UIString('Reload the page to record requests for HTTP resources.');
      return;
    }

    var requestsAnchor = explanation.createChild('div', 'security-mixed-content link');
    if (filterRequestCount === 1)
      requestsAnchor.textContent = Common.UIString('View %d request in Network Panel', filterRequestCount);
    else
      requestsAnchor.textContent = Common.UIString('View %d requests in Network Panel', filterRequestCount);

    requestsAnchor.href = '';
    requestsAnchor.addEventListener('click', networkFilterFn);
  }

  _addContentWithCertErrorsExplanations() {
    if (!this._schemeIsCryptographic)
      return;

    if (!this._insecureContentStatus)
      return;

    if (this._insecureContentStatus.ranContentWithCertErrors) {
      this._addExplanation(
          this._securityExplanationsMain, /** @type {!Protocol.Security.SecurityStateExplanation} */ ({
            'securityState': this._insecureContentStatus.ranInsecureContentStyle,
            'summary': Common.UIString('Active content with certificate errors'),
            'description': Common.UIString(
                'You have recently allowed content loaded with certificate errors (such as scripts or iframes) to run on this site.')
          }));
    }

    if (this._insecureContentStatus.displayedContentWithCertErrors) {
      this._addExplanation(
          this._securityExplanationsMain, /** @type {!Protocol.Security.SecurityStateExplanation} */ ({
            'securityState': this._insecureContentStatus.displayedInsecureContentStyle,
            'summary': Common.UIString('Content with certificate errors'),
            'description': Common.UIString('This site includes resources that were loaded with certificate errors.')
          }));
    }
  }
};

/**
 * @unrestricted
 */
Security.SecurityOriginView = class extends UI.VBox {
  /**
   * @param {!Security.SecurityPanel} panel
   * @param {!Security.SecurityPanel.Origin} origin
   * @param {!Security.SecurityPanel.OriginState} originState
   */
  constructor(panel, origin, originState) {
    super();
    this._panel = panel;
    this.setMinimumSize(200, 100);

    this.element.classList.add('security-origin-view');
    this.registerRequiredCSS('security/originView.css');
    this.registerRequiredCSS('security/lockIcon.css');

    var titleSection = this.element.createChild('div', 'title-section');
    var originDisplay = titleSection.createChild('div', 'origin-display');
    this._originLockIcon = originDisplay.createChild('span', 'security-property');
    this._originLockIcon.classList.add('security-property-' + originState.securityState);
    // TODO(lgarron): Highlight the origin scheme. https://crbug.com/523589
    originDisplay.createChild('span', 'origin').textContent = origin;
    var originNetworkLink = titleSection.createChild('div', 'link');
    originNetworkLink.textContent = Common.UIString('View requests in Network Panel');
    function showOriginRequestsInNetworkPanel() {
      var parsedURL = new Common.ParsedURL(origin);
      Network.NetworkPanel.revealAndFilter([
        {filterType: Network.NetworkLogView.FilterType.Domain, filterValue: parsedURL.host},
        {filterType: Network.NetworkLogView.FilterType.Scheme, filterValue: parsedURL.scheme}
      ]);
    }
    originNetworkLink.addEventListener('click', showOriginRequestsInNetworkPanel, false);

    if (originState.securityDetails) {
      var connectionSection = this.element.createChild('div', 'origin-view-section');
      connectionSection.createChild('div', 'origin-view-section-title').textContent = Common.UIString('Connection');

      var table = new Security.SecurityDetailsTable();
      connectionSection.appendChild(table.element());
      table.addRow('Protocol', originState.securityDetails.protocol);
      if (originState.securityDetails.keyExchange)
        table.addRow('Key Exchange', originState.securityDetails.keyExchange);
      if (originState.securityDetails.keyExchangeGroup)
        table.addRow('Key Exchange Group', originState.securityDetails.keyExchangeGroup);
      table.addRow(
          'Cipher', originState.securityDetails.cipher +
              (originState.securityDetails.mac ? ' with ' + originState.securityDetails.mac : ''));

      // Create the certificate section outside the callback, so that it appears in the right place.
      var certificateSection = this.element.createChild('div', 'origin-view-section');
      certificateSection.createChild('div', 'origin-view-section-title').textContent = Common.UIString('Certificate');

      if (originState.securityDetails.signedCertificateTimestampList.length) {
        // Create the Certificate Transparency section outside the callback, so that it appears in the right place.
        var sctSection = this.element.createChild('div', 'origin-view-section');
        sctSection.createChild('div', 'origin-view-section-title').textContent =
            Common.UIString('Certificate Transparency');
      }

      var sanDiv = this._createSanDiv(originState.securityDetails.sanList);
      var validFromString = new Date(1000 * originState.securityDetails.validFrom).toUTCString();
      var validUntilString = new Date(1000 * originState.securityDetails.validTo).toUTCString();

      table = new Security.SecurityDetailsTable();
      certificateSection.appendChild(table.element());
      table.addRow(Common.UIString('Subject'), originState.securityDetails.subjectName);
      table.addRow(Common.UIString('SAN'), sanDiv);
      table.addRow(Common.UIString('Valid From'), validFromString);
      table.addRow(Common.UIString('Valid Until'), validUntilString);
      table.addRow(Common.UIString('Issuer'), originState.securityDetails.issuer);
      table.addRow(
          '', Security.SecurityPanel.createCertificateViewerButton2(
                  Common.UIString('Open full certificate details'), origin));

      if (!originState.securityDetails.signedCertificateTimestampList.length)
        return;

      // Show summary of SCT(s) of Certificate Transparency.
      var sctSummaryTable = new Security.SecurityDetailsTable();
      sctSummaryTable.element().classList.add('sct-summary');
      sctSection.appendChild(sctSummaryTable.element());
      for (var i = 0; i < originState.securityDetails.signedCertificateTimestampList.length; i++) {
        var sct = originState.securityDetails.signedCertificateTimestampList[i];
        sctSummaryTable.addRow(
            Common.UIString('SCT'), sct.logDescription + ' (' + sct.origin + ', ' + sct.status + ')');
      }

      // Show detailed SCT(s) of Certificate Transparency.
      var sctTableWrapper = sctSection.createChild('div', 'sct-details');
      sctTableWrapper.classList.add('hidden');
      for (var i = 0; i < originState.securityDetails.signedCertificateTimestampList.length; i++) {
        var sctTable = new Security.SecurityDetailsTable();
        sctTableWrapper.appendChild(sctTable.element());
        var sct = originState.securityDetails.signedCertificateTimestampList[i];
        sctTable.addRow(Common.UIString('Log Name'), sct.logDescription);
        sctTable.addRow(Common.UIString('Log ID'), sct.logId.replace(/(.{2})/g, '$1 '));
        sctTable.addRow(Common.UIString('Validation Status'), sct.status);
        sctTable.addRow(Common.UIString('Source'), sct.origin);
        sctTable.addRow(Common.UIString('Issued At'), new Date(sct.timestamp).toUTCString());
        sctTable.addRow(Common.UIString('Hash Algorithm'), sct.hashAlgorithm);
        sctTable.addRow(Common.UIString('Signature Algorithm'), sct.signatureAlgorithm);
        sctTable.addRow(Common.UIString('Signature Data'), sct.signatureData.replace(/(.{2})/g, '$1 '));
      }

      // Add link to toggle between displaying of the summary of the SCT(s) and the detailed SCT(s).
      var toggleSctsDetailsLink = sctSection.createChild('div', 'link');
      toggleSctsDetailsLink.classList.add('sct-toggle');
      toggleSctsDetailsLink.textContent = Common.UIString('Show full details');
      function toggleSctDetailsDisplay() {
        var isDetailsShown = !sctTableWrapper.classList.contains('hidden');
        if (isDetailsShown)
          toggleSctsDetailsLink.textContent = Common.UIString('Show full details');
        else
          toggleSctsDetailsLink.textContent = Common.UIString('Hide full details');
        sctSummaryTable.element().classList.toggle('hidden');
        sctTableWrapper.classList.toggle('hidden');
      }
      toggleSctsDetailsLink.addEventListener('click', toggleSctDetailsDisplay, false);

      var noteSection = this.element.createChild('div', 'origin-view-section');
      // TODO(lgarron): Fix the issue and then remove this section. See comment in SecurityPanel._processRequest().
      noteSection.createChild('div').textContent =
          Common.UIString('The security details above are from the first inspected response.');
    } else if (originState.securityState !== Protocol.Security.SecurityState.Unknown) {
      var notSecureSection = this.element.createChild('div', 'origin-view-section');
      notSecureSection.createChild('div', 'origin-view-section-title').textContent = Common.UIString('Not Secure');
      notSecureSection.createChild('div').textContent =
          Common.UIString('Your connection to this origin is not secure.');
    } else {
      var noInfoSection = this.element.createChild('div', 'origin-view-section');
      noInfoSection.createChild('div', 'origin-view-section-title').textContent =
          Common.UIString('No Security Information');
      noInfoSection.createChild('div').textContent =
          Common.UIString('No security details are available for this origin.');
    }
  }

  /**
   * @param {!Array<string>} sanList
   * *return {!Element}
   */
  _createSanDiv(sanList) {
    var sanDiv = createElement('div');
    if (sanList.length === 0) {
      sanDiv.textContent = Common.UIString('(N/A)');
      sanDiv.classList.add('empty-san');
    } else {
      var truncatedNumToShow = 2;
      var listIsTruncated = sanList.length > truncatedNumToShow + 1;
      for (var i = 0; i < sanList.length; i++) {
        var span = sanDiv.createChild('span', 'san-entry');
        span.textContent = sanList[i];
        if (listIsTruncated && i >= truncatedNumToShow)
          span.classList.add('truncated-entry');
      }
      if (listIsTruncated) {
        var truncatedSANToggle = sanDiv.createChild('div', 'link');
        truncatedSANToggle.href = '';

        function toggleSANTruncation() {
          if (sanDiv.classList.contains('truncated-san')) {
            sanDiv.classList.remove('truncated-san');
            truncatedSANToggle.textContent = Common.UIString('Show less');
          } else {
            sanDiv.classList.add('truncated-san');
            truncatedSANToggle.textContent = Common.UIString('Show more (%d total)', sanList.length);
          }
        }
        truncatedSANToggle.addEventListener('click', toggleSANTruncation, false);
        toggleSANTruncation();
      }
    }
    return sanDiv;
  }

  /**
   * @param {!Protocol.Security.SecurityState} newSecurityState
   */
  setSecurityState(newSecurityState) {
    for (var className of Array.prototype.slice.call(this._originLockIcon.classList)) {
      if (className.startsWith('security-property-'))
        this._originLockIcon.classList.remove(className);
    }

    this._originLockIcon.classList.add('security-property-' + newSecurityState);
  }
};

/**
 * @unrestricted
 */
Security.SecurityDetailsTable = class {
  constructor() {
    this._element = createElement('table');
    this._element.classList.add('details-table');
  }

  /**
   * @return: {!Element}
   */
  element() {
    return this._element;
  }

  /**
   * @param {string} key
   * @param {string|!Node} value
   */
  addRow(key, value) {
    var row = this._element.createChild('div', 'details-table-row');
    row.createChild('div').textContent = key;

    var valueDiv = row.createChild('div');
    if (typeof value === 'string')
      valueDiv.textContent = value;
    else
      valueDiv.appendChild(value);
  }
};
