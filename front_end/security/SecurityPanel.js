// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.PanelWithSidebar}
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.SecurityPanel = function()
{
    WebInspector.PanelWithSidebar.call(this, "security");

    this._mainView = new WebInspector.SecurityMainView(this);

    this._sidebarMainViewElement = new WebInspector.SecurityPanelSidebarTreeElement(WebInspector.UIString("Overview"), this._setVisibleView.bind(this, this._mainView), "security-main-view-sidebar-tree-item", "lock-icon");
    this._sidebarTree = new WebInspector.SecurityPanelSidebarTree(this._sidebarMainViewElement, this.showOrigin.bind(this));
    this.panelSidebarElement().appendChild(this._sidebarTree.element);
    this.setDefaultFocusedElement(this._sidebarTree.contentElement);

    /** @type {!Map<!NetworkAgent.LoaderId, !WebInspector.NetworkRequest>} */
    this._lastResponseReceivedForLoaderId = new Map();

    /** @type {!Map<!WebInspector.SecurityPanel.Origin, !WebInspector.SecurityPanel.OriginState>} */
    this._origins = new Map();

    /** @type {!Map<!WebInspector.NetworkLogView.MixedContentFilterValues, number>} */
    this._filterRequestCounts = new Map();

    WebInspector.targetManager.observeTargets(this, WebInspector.Target.Type.Page);
}

/** @typedef {string} */
WebInspector.SecurityPanel.Origin;

/**
 * @typedef {Object}
 * @property {!SecurityAgent.SecurityState} securityState - Current security state of the origin.
 * @property {?NetworkAgent.SecurityDetails} securityDetails - Security details of the origin, if available.
 * @property {?Promise<!NetworkAgent.CertificateDetails>} certificateDetailsPromise - Certificate details of the origin. Only available if securityDetails are available.
 * @property {?WebInspector.SecurityOriginView} originView - Current SecurityOriginView corresponding to origin.
 */
WebInspector.SecurityPanel.OriginState;

WebInspector.SecurityPanel.prototype = {

    /**
     * @param {!SecurityAgent.SecurityState} securityState
     */
    setRanInsecureContentStyle: function(securityState)
    {
        this._ranInsecureContentStyle = securityState;
    },

    /**
     * @param {!SecurityAgent.SecurityState} securityState
     */
    setDisplayedInsecureContentStyle: function(securityState)
    {
        this._displayedInsecureContentStyle = securityState;
    },

    /**
     * @param {!SecurityAgent.SecurityState} newSecurityState
     * @param {!Array<!SecurityAgent.SecurityStateExplanation>} explanations
     * @param {?SecurityAgent.MixedContentStatus} mixedContentStatus
     * @param {boolean} schemeIsCryptographic
     */
    _updateSecurityState: function(newSecurityState, explanations, mixedContentStatus, schemeIsCryptographic)
    {
        this._sidebarMainViewElement.setSecurityState(newSecurityState);
        this._mainView.updateSecurityState(newSecurityState, explanations, mixedContentStatus, schemeIsCryptographic);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onSecurityStateChanged: function(event)
    {
        var data = /** @type {!WebInspector.PageSecurityState} */ (event.data);
        var securityState = /** @type {!SecurityAgent.SecurityState} */ (data.securityState);
        var explanations = /** @type {!Array<!SecurityAgent.SecurityStateExplanation>} */ (data.explanations);
        var mixedContentStatus = /** @type {?SecurityAgent.MixedContentStatus} */ (data.mixedContentStatus);
        var schemeIsCryptographic = /** @type {boolean} */ (data.schemeIsCryptographic);
        this._updateSecurityState(securityState, explanations, mixedContentStatus, schemeIsCryptographic);
    },

    selectAndSwitchToMainView: function()
    {
        // The sidebar element will trigger displaying the main view. Rather than making a redundant call to display the main view, we rely on this.
        this._sidebarMainViewElement.select();
    },
    /**
     * @param {!WebInspector.SecurityPanel.Origin} origin
     */
    showOrigin: function(origin)
    {
        var originState = this._origins.get(origin);
        if (!originState.originView)
            originState.originView = new WebInspector.SecurityOriginView(this, origin, originState);

        this._setVisibleView(originState.originView);
    },

    wasShown: function()
    {
        WebInspector.Panel.prototype.wasShown.call(this);
        if (!this._visibleView)
            this.selectAndSwitchToMainView();
    },

    /**
     * @param {!WebInspector.VBox} view
     */
    _setVisibleView: function(view)
    {
        if (this._visibleView === view)
            return;

        if (this._visibleView)
            this._visibleView.detach();

        this._visibleView = view;

        if (view)
            this.splitWidget().setMainWidget(view);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onResponseReceived: function(event)
    {
        var request = /** @type {!WebInspector.NetworkRequest} */ (event.data);
        if (request.resourceType() === WebInspector.resourceTypes.Document)
            this._lastResponseReceivedForLoaderId.set(request.loaderId, request);
    },

    /**
     * @param {!WebInspector.NetworkRequest} request
     */
    _processRequest: function(request)
    {
        var origin = WebInspector.ParsedURL.extractOrigin(request.url);

        if (!origin) {
            // We don't handle resources like data: URIs. Most of them don't affect the lock icon.
            return;
        }

        var securityState = /** @type {!SecurityAgent.SecurityState} */ (request.securityState());

        if (request.mixedContentType === NetworkAgent.RequestMixedContentType.Blockable && this._ranInsecureContentStyle)
            securityState = this._ranInsecureContentStyle;
        else if (request.mixedContentType === NetworkAgent.RequestMixedContentType.OptionallyBlockable && this._displayedInsecureContentStyle)
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
            if (securityDetails) {
                originState.securityDetails = securityDetails;
                originState.certificateDetailsPromise = request.target().networkManager.certificateDetailsPromise(securityDetails.certificateId);
            }

            this._origins.set(origin, originState);

            this._sidebarTree.addOrigin(origin, securityState);

            // Don't construct the origin view yet (let it happen lazily).
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onRequestFinished: function(event)
    {
        var request = /** @type {!WebInspector.NetworkRequest} */ (event.data);
        this._updateFilterRequestCounts(request);
        this._processRequest(request);
    },

    /**
     * @param {!WebInspector.NetworkRequest} request
     */
    _updateFilterRequestCounts: function(request)
    {
        if (request.mixedContentType === NetworkAgent.RequestMixedContentType.None)
            return;

        /** @type {!WebInspector.NetworkLogView.MixedContentFilterValues} */
        var filterKey = WebInspector.NetworkLogView.MixedContentFilterValues.All;
        if (request.wasBlocked())
            filterKey = WebInspector.NetworkLogView.MixedContentFilterValues.Blocked;
        else if (request.mixedContentType === NetworkAgent.RequestMixedContentType.Blockable)
            filterKey = WebInspector.NetworkLogView.MixedContentFilterValues.BlockOverridden;
        else if (request.mixedContentType === NetworkAgent.RequestMixedContentType.OptionallyBlockable)
            filterKey = WebInspector.NetworkLogView.MixedContentFilterValues.Displayed;

        if (!this._filterRequestCounts.has(filterKey))
            this._filterRequestCounts.set(filterKey, 1);
        else
            this._filterRequestCounts.set(filterKey, this._filterRequestCounts.get(filterKey) + 1);

        this._mainView.refreshExplanations();
    },

    /**
     * @param {!WebInspector.NetworkLogView.MixedContentFilterValues} filterKey
     * @return {number}
     */
    filterRequestCount: function(filterKey)
    {
        return this._filterRequestCounts.get(filterKey) || 0;
    },

    /**
     * @param {!SecurityAgent.SecurityState} stateA
     * @param {!SecurityAgent.SecurityState} stateB
     * @return {!SecurityAgent.SecurityState}
     */
    _securityStateMin: function(stateA, stateB)
    {
        return WebInspector.SecurityModel.SecurityStateComparator(stateA, stateB) < 0 ? stateA : stateB;
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        if (this._target)
            return;

        this._target = target;

        target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated, this._onMainFrameNavigated, this);
        target.networkManager.addEventListener(WebInspector.NetworkManager.EventTypes.ResponseReceived, this._onResponseReceived, this);
        target.networkManager.addEventListener(WebInspector.NetworkManager.EventTypes.RequestFinished, this._onRequestFinished, this);

        var securityModel = WebInspector.SecurityModel.fromTarget(target);
        securityModel.addEventListener(WebInspector.SecurityModel.EventTypes.SecurityStateChanged, this._onSecurityStateChanged, this);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
    },

    _clearOrigins: function()
    {
        this.selectAndSwitchToMainView();
        this._sidebarTree.clearOrigins();
        this._origins.clear();
        this._lastResponseReceivedForLoaderId.clear();
        this._filterRequestCounts.clear();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onMainFrameNavigated: function(event) {

        var frame = /** type {!PageAgent.Frame}*/ (event.data);
        var request = this._lastResponseReceivedForLoaderId.get(frame.loaderId);
        this._clearOrigins();


        if (request) {
            var origin = WebInspector.ParsedURL.extractOrigin(request.url);
            this._sidebarTree.setMainOrigin(origin);
            this._processRequest(request);
        }
    },

    __proto__: WebInspector.PanelWithSidebar.prototype
}

/**
 * @return {!WebInspector.SecurityPanel}
 */
WebInspector.SecurityPanel._instance = function()
{
    if (!WebInspector.SecurityPanel._instanceObject)
        WebInspector.SecurityPanel._instanceObject = new WebInspector.SecurityPanel();
    return WebInspector.SecurityPanel._instanceObject;
}

/**
 * @param {string} text
 * @param {!SecurityAgent.CertificateId} certificateId
 * @return {!Element}
 */
WebInspector.SecurityPanel.createCertificateViewerButton = function(text, certificateId)
{
    /**
     * @param {!Event} e
     */
    function showCertificateViewer(e)
    {
        e.consume();
        WebInspector.multitargetNetworkManager.showCertificateViewer(/** @type {number} */ (certificateId));
    }

    return createTextButton(text, showCertificateViewer, "security-certificate-button");
}

/**
 * @constructor
 * @extends {TreeOutlineInShadow}
 * @param {!WebInspector.SecurityPanelSidebarTreeElement} mainViewElement
 * @param {function(!WebInspector.SecurityPanel.Origin)} showOriginInPanel
 */
WebInspector.SecurityPanelSidebarTree = function(mainViewElement, showOriginInPanel)
{
    this._showOriginInPanel = showOriginInPanel;

    this._mainOrigin = null;

    TreeOutlineInShadow.call(this);
    this.element.classList.add("sidebar-tree");
    this.registerRequiredCSS("security/sidebar.css");
    this.registerRequiredCSS("security/lockIcon.css");

    this.appendChild(mainViewElement);

    /** @type {!Map<!WebInspector.SecurityPanelSidebarTree.OriginGroupName, !WebInspector.SidebarSectionTreeElement>} */
    this._originGroups = new Map();

    for (var key in WebInspector.SecurityPanelSidebarTree.OriginGroupName) {
        var originGroupName = WebInspector.SecurityPanelSidebarTree.OriginGroupName[key];
        var originGroup = new WebInspector.SidebarSectionTreeElement(WebInspector.UIString(originGroupName));
        originGroup.listItemElement.classList.add("security-sidebar-origins");
        this._originGroups.set(originGroupName, originGroup);
        this.appendChild(originGroup);
    }
    this._clearOriginGroups();

    // This message will be removed by clearOrigins() during the first new page load after the panel was opened.
    var mainViewReloadMessage = new WebInspector.SidebarTreeElement("security-main-view-reload-message", WebInspector.UIString("Reload to view details"));
    mainViewReloadMessage.selectable = false;
    this._originGroups.get(WebInspector.SecurityPanelSidebarTree.OriginGroupName.MainOrigin).appendChild(mainViewReloadMessage);

    /** @type {!Map<!WebInspector.SecurityPanel.Origin, !WebInspector.SecurityPanelSidebarTreeElement>} */
    this._elementsByOrigin = new Map();
}

WebInspector.SecurityPanelSidebarTree.prototype = {
    /**
     * @param {!WebInspector.SecurityPanel.Origin} origin
     * @param {!SecurityAgent.SecurityState} securityState
     */
    addOrigin: function(origin, securityState)
    {
        var originElement = new WebInspector.SecurityPanelSidebarTreeElement(origin, this._showOriginInPanel.bind(this, origin), "security-sidebar-tree-item", "security-property");
        originElement.listItemElement.title = origin;
        this._elementsByOrigin.set(origin, originElement);
        this.updateOrigin(origin, securityState);
    },

    /**
     * @param {!WebInspector.SecurityPanel.Origin} origin
     */
    setMainOrigin: function(origin)
    {
        this._mainOrigin = origin;
    },

    /**
     * @param {!WebInspector.SecurityPanel.Origin} origin
     * @param {!SecurityAgent.SecurityState} securityState
     */
    updateOrigin: function(origin, securityState)
    {
        var originElement = /** @type {!WebInspector.SecurityPanelSidebarTreeElement} */ (this._elementsByOrigin.get(origin));
        originElement.setSecurityState(securityState);

        var newParent;
        if (origin === this._mainOrigin) {
            newParent = this._originGroups.get(WebInspector.SecurityPanelSidebarTree.OriginGroupName.MainOrigin);
        } else {
            switch (securityState) {
            case SecurityAgent.SecurityState.Secure:
                newParent = this._originGroups.get(WebInspector.SecurityPanelSidebarTree.OriginGroupName.Secure);
                break;
            case SecurityAgent.SecurityState.Unknown:
                newParent = this._originGroups.get(WebInspector.SecurityPanelSidebarTree.OriginGroupName.Unknown);
                break;
            default:
                newParent = this._originGroups.get(WebInspector.SecurityPanelSidebarTree.OriginGroupName.NonSecure);
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

    },

    _clearOriginGroups: function()
    {
        for (var originGroup of this._originGroups.values()) {
            originGroup.removeChildren();
            originGroup.hidden = true;
        }
        this._originGroups.get(WebInspector.SecurityPanelSidebarTree.OriginGroupName.MainOrigin).hidden = false;
    },

    clearOrigins: function()
    {
        this._clearOriginGroups();
        this._elementsByOrigin.clear();
    },

    __proto__: TreeOutlineInShadow.prototype
}


/**
 * A mapping from Javascript key IDs to names (sidebar section titles).
 * Note: The names are used as keys into a map, so they must be distinct from each other.
 * @enum {string}
 */
WebInspector.SecurityPanelSidebarTree.OriginGroupName = {
    MainOrigin: "Main Origin",
    NonSecure: "Non-Secure Origins",
    Secure: "Secure Origins",
    Unknown: "Unknown / Canceled"
}


/**
 * @constructor
 * @extends {WebInspector.SidebarTreeElement}
 * @param {string} text
 * @param {function()} selectCallback
 * @param {string} className
 * @param {string} cssPrefix
 */
WebInspector.SecurityPanelSidebarTreeElement = function(text, selectCallback, className, cssPrefix)
{
    this._selectCallback = selectCallback;
    this._cssPrefix = cssPrefix;

    WebInspector.SidebarTreeElement.call(this, className, text);
    this.iconElement.classList.add(this._cssPrefix);

    this.setSecurityState(SecurityAgent.SecurityState.Unknown);
}

WebInspector.SecurityPanelSidebarTreeElement.prototype = {
    /**
     * @param {!SecurityAgent.SecurityState} newSecurityState
     */
    setSecurityState: function(newSecurityState)
    {
        if (this._securityState)
            this.iconElement.classList.remove(this._cssPrefix + "-" + this._securityState)

        this._securityState = newSecurityState;
        this.iconElement.classList.add(this._cssPrefix + "-" + newSecurityState);
    },

    /**
     * @return {!SecurityAgent.SecurityState}
     */
    securityState: function()
    {
        return this._securityState;
    },

    /**
     * @override
     * @return {boolean}
     */
    onselect: function()
    {
        this._selectCallback();
        return true;
    },

    __proto__: WebInspector.SidebarTreeElement.prototype
}

/**
 * @param {!WebInspector.SecurityPanelSidebarTreeElement} a
 * @param {!WebInspector.SecurityPanelSidebarTreeElement} b
 * @return {number}
 */
WebInspector.SecurityPanelSidebarTreeElement.SecurityStateComparator = function(a, b)
{
    return WebInspector.SecurityModel.SecurityStateComparator(a.securityState(), b.securityState());
}

/**
 * @constructor
 * @implements {WebInspector.PanelFactory}
 */
WebInspector.SecurityPanelFactory = function()
{
}

WebInspector.SecurityPanelFactory.prototype = {
    /**
     * @override
     * @return {!WebInspector.Panel}
     */
    createPanel: function()
    {
        return WebInspector.SecurityPanel._instance();
    }
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.SecurityPanel} panel
 */
WebInspector.SecurityMainView = function(panel)
{
    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("security/mainView.css");
    this.registerRequiredCSS("security/lockIcon.css");
    this.setMinimumSize(200, 100);

    this.contentElement.classList.add("security-main-view");

    this._panel = panel;

    this._summarySection = this.contentElement.createChild("div", "security-summary");
    this._securityExplanations = this.contentElement.createChild("div", "security-explanation-list");

    // Fill the security summary section.
    this._summarySection.createChild("div", "security-summary-section-title").textContent = WebInspector.UIString("Security Overview");

    var lockSpectrum = this._summarySection.createChild("div", "lock-spectrum");
    lockSpectrum.createChild("div", "lock-icon lock-icon-secure").title = WebInspector.UIString("Secure");
    lockSpectrum.createChild("div", "security-summary-lock-spacer");
    lockSpectrum.createChild("div", "lock-icon lock-icon-neutral").title = WebInspector.UIString("Not Secure");
    lockSpectrum.createChild("div", "security-summary-lock-spacer");
    lockSpectrum.createChild("div", "lock-icon lock-icon-insecure").title = WebInspector.UIString("Insecure (Broken)");

    this._summarySection.createChild("div", "triangle-pointer-container").createChild("div", "triangle-pointer-wrapper").createChild("div", "triangle-pointer");

    this._summaryText = this._summarySection.createChild("div", "security-summary-text");
}

WebInspector.SecurityMainView.prototype = {
    /**
     * @param {!SecurityAgent.SecurityStateExplanation} explanation
     * @return {!Element}
     */
    _addExplanation: function(explanation)
    {
        var explanationSection = this._securityExplanations.createChild("div", "security-explanation");
        explanationSection.classList.add("security-explanation-" + explanation.securityState);

        explanationSection.createChild("div", "security-property").classList.add("security-property-" + explanation.securityState);
        var text = explanationSection.createChild("div", "security-explanation-text");
        text.createChild("div", "security-explanation-title").textContent = explanation.summary;
        text.createChild("div").textContent = explanation.description;

        if (explanation.certificateId) {
            text.appendChild(WebInspector.SecurityPanel.createCertificateViewerButton(WebInspector.UIString("View certificate"), explanation.certificateId));
        }

        return text;
    },

    /**
     * @param {!SecurityAgent.SecurityState} newSecurityState
     * @param {!Array<!SecurityAgent.SecurityStateExplanation>} explanations
     * @param {?SecurityAgent.MixedContentStatus} mixedContentStatus
     * @param {boolean} schemeIsCryptographic
     */
    updateSecurityState: function(newSecurityState, explanations, mixedContentStatus, schemeIsCryptographic)
    {
        // Remove old state.
        // It's safe to call this even when this._securityState is undefined.
        this._summarySection.classList.remove("security-summary-" + this._securityState);

        // Add new state.
        this._securityState = newSecurityState;
        this._summarySection.classList.add("security-summary-" + this._securityState);
        var summaryExplanationStrings = {
            "unknown":  WebInspector.UIString("The security of this page is unknown."),
            "insecure": WebInspector.UIString("This page is insecure (broken HTTPS)."),
            "neutral":  WebInspector.UIString("This page is not secure."),
            "secure":   WebInspector.UIString("This page is secure (valid HTTPS).")
        }
        this._summaryText.textContent = summaryExplanationStrings[this._securityState];

        this._explanations = explanations,
        this._mixedContentStatus = mixedContentStatus;
        this._schemeIsCryptographic = schemeIsCryptographic;

        this._panel.setRanInsecureContentStyle(mixedContentStatus.ranInsecureContentStyle);
        this._panel.setDisplayedInsecureContentStyle(mixedContentStatus.displayedInsecureContentStyle);

        this.refreshExplanations();
    },

    refreshExplanations: function()
    {
        this._securityExplanations.removeChildren();
        for (var explanation of this._explanations)
            this._addExplanation(explanation);

        this._addMixedContentExplanations();
    },

    _addMixedContentExplanations: function()
    {
        if (!this._schemeIsCryptographic)
            return;

        if (this._mixedContentStatus && (this._mixedContentStatus.ranInsecureContent || this._mixedContentStatus.displayedInsecureContent)) {
            if (this._mixedContentStatus.ranInsecureContent)
                this._addMixedContentExplanation(this._mixedContentStatus.ranInsecureContentStyle, WebInspector.UIString("Active Mixed Content"), WebInspector.UIString("You have recently allowed insecure content (such as scripts or iframes) to run on this site."), WebInspector.NetworkLogView.MixedContentFilterValues.BlockOverridden, showBlockOverriddenMixedContentInNetworkPanel);
            if (this._mixedContentStatus.displayedInsecureContent)
                this._addMixedContentExplanation(this._mixedContentStatus.displayedInsecureContentStyle, WebInspector.UIString("Mixed Content"), WebInspector.UIString("The site includes HTTP resources."), WebInspector.NetworkLogView.MixedContentFilterValues.Displayed, showDisplayedMixedContentInNetworkPanel);
        }

        if (this._mixedContentStatus && (!this._mixedContentStatus.displayedInsecureContent && !this._mixedContentStatus.ranInsecureContent)) {
            this._addExplanation(/** @type {!SecurityAgent.SecurityStateExplanation} */ ({
                "securityState": SecurityAgent.SecurityState.Secure,
                "summary": WebInspector.UIString("Secure Resources"),
                "description": WebInspector.UIString("All resources on this page are served securely.")
            }));
        }

        if (this._panel.filterRequestCount(WebInspector.NetworkLogView.MixedContentFilterValues.Blocked) > 0)
            this._addMixedContentExplanation(SecurityAgent.SecurityState.Info, WebInspector.UIString("Blocked mixed content"), WebInspector.UIString("Your page requested insecure resources that were blocked."), WebInspector.NetworkLogView.MixedContentFilterValues.Blocked, showBlockedMixedContentInNetworkPanel);

        /**
         * @param {!Event} e
         */
        function showDisplayedMixedContentInNetworkPanel(e)
        {
            e.consume();
            WebInspector.NetworkPanel.revealAndFilter([
                {
                    filterType: WebInspector.NetworkLogView.FilterType.MixedContent,
                    filterValue: WebInspector.NetworkLogView.MixedContentFilterValues.Displayed
                }
            ]);
        }

        /**
         * @param {!Event} e
         */
        function showBlockOverriddenMixedContentInNetworkPanel(e)
        {
            e.consume();
            WebInspector.NetworkPanel.revealAndFilter([
                {
                    filterType: WebInspector.NetworkLogView.FilterType.MixedContent,
                    filterValue: WebInspector.NetworkLogView.MixedContentFilterValues.BlockOverridden
                }
            ]);
        }

         /**
         * @param {!Event} e
         */
        function showBlockedMixedContentInNetworkPanel(e)
        {
            e.consume();
            WebInspector.NetworkPanel.revealAndFilter([
                {
                    filterType: WebInspector.NetworkLogView.FilterType.MixedContent,
                    filterValue: WebInspector.NetworkLogView.MixedContentFilterValues.Blocked
                }
            ]);
        }
    },

    /**
     * @param {!SecurityAgent.SecurityState} securityState
     * @param {string} summary
     * @param {string} description
     * @param {!WebInspector.NetworkLogView.MixedContentFilterValues} filterKey
     * @param {!Function} networkFilterFn
     */
    _addMixedContentExplanation: function(securityState, summary, description, filterKey, networkFilterFn)
    {
        var mixedContentExplanation = /** @type {!SecurityAgent.SecurityStateExplanation} */ ({
            "securityState": securityState,
            "summary": summary,
            "description": description
        });

        var filterRequestCount = this._panel.filterRequestCount(filterKey);
        var requestsAnchor = this._addExplanation(mixedContentExplanation).createChild("div", "security-mixed-content link");
        if (filterRequestCount > 0) {
            requestsAnchor.textContent = WebInspector.UIString("View %d request%s in Network Panel", filterRequestCount, (filterRequestCount > 1 ? "s" : ""));
        } else {
            // Network instrumentation might not have been enabled for the page load, so the security panel does not necessarily know a count of individual mixed requests at this point. Point the user at the Network Panel which prompts them to refresh.
            requestsAnchor.textContent = WebInspector.UIString("View requests in Network Panel");
        }
        requestsAnchor.href = "";
        requestsAnchor.addEventListener("click", networkFilterFn);
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.SecurityPanel} panel
 * @param {!WebInspector.SecurityPanel.Origin} origin
 * @param {!WebInspector.SecurityPanel.OriginState} originState
 */
WebInspector.SecurityOriginView = function(panel, origin, originState)
{
    this._panel = panel;
    WebInspector.VBox.call(this);
    this.setMinimumSize(200, 100);

    this.element.classList.add("security-origin-view");
    this.registerRequiredCSS("security/originView.css");
    this.registerRequiredCSS("security/lockIcon.css");

    var titleSection = this.element.createChild("div", "title-section");
    var originDisplay = titleSection.createChild("div", "origin-display");
    this._originLockIcon = originDisplay.createChild("span", "security-property");
    this._originLockIcon.classList.add("security-property-" + originState.securityState);
    // TODO(lgarron): Highlight the origin scheme. https://crbug.com/523589
    originDisplay.createChild("span", "origin").textContent = origin;
    var originNetworkLink = titleSection.createChild("div", "link");
    originNetworkLink.textContent = WebInspector.UIString("View requests in Network Panel");
    function showOriginRequestsInNetworkPanel()
    {
        var parsedURL = new WebInspector.ParsedURL(origin);
        WebInspector.NetworkPanel.revealAndFilter([
            {
                filterType: WebInspector.NetworkLogView.FilterType.Domain,
                filterValue: parsedURL.host
            },
            {
                filterType: WebInspector.NetworkLogView.FilterType.Scheme,
                filterValue: parsedURL.scheme
            }
        ]);
    }
    originNetworkLink.addEventListener("click", showOriginRequestsInNetworkPanel, false);


    if (originState.securityDetails) {
        var connectionSection = this.element.createChild("div", "origin-view-section");
        connectionSection.createChild("div", "origin-view-section-title").textContent = WebInspector.UIString("Connection");

        var table = new WebInspector.SecurityDetailsTable();
        connectionSection.appendChild(table.element());
        table.addRow("Protocol", originState.securityDetails.protocol);
        table.addRow("Key Exchange", originState.securityDetails.keyExchange);
        table.addRow("Cipher Suite", originState.securityDetails.cipher + (originState.securityDetails.mac ? " with " + originState.securityDetails.mac : ""));

        // Create the certificate section outside the callback, so that it appears in the right place.
        var certificateSection = this.element.createChild("div", "origin-view-section");
        certificateSection.createChild("div", "origin-view-section-title").textContent = WebInspector.UIString("Certificate");

        if (originState.securityDetails.signedCertificateTimestampList.length) {
            // Create the Certificate Transparency section outside the callback, so that it appears in the right place.
            var sctSection = this.element.createChild("div", "origin-view-section");
            sctSection.createChild("div", "origin-view-section-title").textContent = WebInspector.UIString("Certificate Transparency");
        }

        /**
         * @this {WebInspector.SecurityOriginView}
         * @param {?NetworkAgent.CertificateDetails} certificateDetails
         */
        function displayCertificateDetails(certificateDetails)
        {
            var sanDiv = this._createSanDiv(certificateDetails.subject);
            var validFromString = new Date(1000 * certificateDetails.validFrom).toUTCString();
            var validUntilString = new Date(1000 * certificateDetails.validTo).toUTCString();

            var table = new WebInspector.SecurityDetailsTable();
            certificateSection.appendChild(table.element());
            table.addRow(WebInspector.UIString("Subject"), certificateDetails.subject.name);
            table.addRow(WebInspector.UIString("SAN"), sanDiv);
            table.addRow(WebInspector.UIString("Valid From"), validFromString);
            table.addRow(WebInspector.UIString("Valid Until"), validUntilString);
            table.addRow(WebInspector.UIString("Issuer"), certificateDetails.issuer);
            table.addRow(WebInspector.UIString("SCTs"), this.sctSummary(originState.securityDetails.certificateValidationDetails));
            table.addRow("", WebInspector.SecurityPanel.createCertificateViewerButton(WebInspector.UIString("Open full certificate details"), originState.securityDetails.certificateId));

            if (!originState.securityDetails.signedCertificateTimestampList.length)
                return;

            // Show summary of SCT(s) of Certificate Transparency.
            var sctSummaryTable = new WebInspector.SecurityDetailsTable();
            sctSummaryTable.element().classList.add("sct-summary");
            sctSection.appendChild(sctSummaryTable.element());
            for (var i = 0; i < originState.securityDetails.signedCertificateTimestampList.length; i++)
            {
                var sct = originState.securityDetails.signedCertificateTimestampList[i];
                sctSummaryTable.addRow(WebInspector.UIString("SCT"), sct.logDescription + " (" + sct.origin + ", " + sct.status + ")");
            }

            // Show detailed SCT(s) of Certificate Transparency.
            var sctTableWrapper = sctSection.createChild("div", "sct-details");
            sctTableWrapper.classList.add("hidden");
            for (var i = 0; i < originState.securityDetails.signedCertificateTimestampList.length; i++)
            {
                var sctTable = new WebInspector.SecurityDetailsTable();
                sctTableWrapper.appendChild(sctTable.element());
                var sct = originState.securityDetails.signedCertificateTimestampList[i];
                sctTable.addRow(WebInspector.UIString("Log Name"), sct.logDescription);
                sctTable.addRow(WebInspector.UIString("Log ID"), sct.logId.replace(/(.{2})/g,"$1 "));
                sctTable.addRow(WebInspector.UIString("Validation Status"), sct.status);
                sctTable.addRow(WebInspector.UIString("Source"), sct.origin);
                sctTable.addRow(WebInspector.UIString("Issued At"), new Date(sct.timestamp).toUTCString());
                sctTable.addRow(WebInspector.UIString("Hash Algorithm"), sct.hashAlgorithm);
                sctTable.addRow(WebInspector.UIString("Signature Algorithm"), sct.signatureAlgorithm);
                sctTable.addRow(WebInspector.UIString("Signature Data"), sct.signatureData.replace(/(.{2})/g,"$1 "));
            }

            // Add link to toggle between displaying of the summary of the SCT(s) and the detailed SCT(s).
            var toggleSctsDetailsLink = sctSection.createChild("div", "link");
            toggleSctsDetailsLink.classList.add("sct-toggle");
            toggleSctsDetailsLink.textContent = WebInspector.UIString("Show full details");
            function toggleSctDetailsDisplay()
            {
                var isDetailsShown = !sctTableWrapper.classList.contains("hidden");
                if (isDetailsShown)
                    toggleSctsDetailsLink.textContent = WebInspector.UIString("Show full details");
                else
                    toggleSctsDetailsLink.textContent = WebInspector.UIString("Hide full details");
                sctSummaryTable.element().classList.toggle("hidden");
                sctTableWrapper.classList.toggle("hidden");
            }
            toggleSctsDetailsLink.addEventListener("click", toggleSctDetailsDisplay, false);
        }

        function displayCertificateDetailsUnavailable()
        {
            certificateSection.createChild("div").textContent = WebInspector.UIString("Certificate details unavailable.");
        }

        originState.certificateDetailsPromise.then(displayCertificateDetails.bind(this), displayCertificateDetailsUnavailable);

        var noteSection = this.element.createChild("div", "origin-view-section");
        // TODO(lgarron): Fix the issue and then remove this section. See comment in SecurityPanel._processRequest().
        noteSection.createChild("div").textContent = WebInspector.UIString("The security details above are from the first inspected response.");
    } else if (originState.securityState !== SecurityAgent.SecurityState.Unknown) {
        var notSecureSection = this.element.createChild("div", "origin-view-section");
        notSecureSection.createChild("div", "origin-view-section-title").textContent = WebInspector.UIString("Not Secure");
        notSecureSection.createChild("div").textContent = WebInspector.UIString("Your connection to this origin is not secure.");
    } else {
        var noInfoSection = this.element.createChild("div", "origin-view-section");
        noInfoSection.createChild("div", "origin-view-section-title").textContent = WebInspector.UIString("No Security Information");
        noInfoSection.createChild("div").textContent = WebInspector.UIString("No security details are available for this origin.");
    }
}

WebInspector.SecurityOriginView.prototype = {

    /**
     * @param {!NetworkAgent.CertificateSubject} certificateSubject
     * *return {!Element}
     */
    _createSanDiv: function(certificateSubject)
    {
        var sanDiv = createElement("div");
        var sanList = certificateSubject.sanDnsNames.concat(certificateSubject.sanIpAddresses);
        if (sanList.length === 0) {
            sanDiv.textContent = WebInspector.UIString("(N/A)");
            sanDiv.classList.add("empty-san");
        } else {
            var truncatedNumToShow = 2;
            var listIsTruncated = sanList.length > truncatedNumToShow;
            for (var i = 0; i < sanList.length; i++) {
                var span = sanDiv.createChild("span", "san-entry");
                span.textContent = sanList[i];
                if (listIsTruncated && i >= truncatedNumToShow)
                    span.classList.add("truncated-entry");
            }
            if (listIsTruncated) {
                var truncatedSANToggle = sanDiv.createChild("div", "link");
                truncatedSANToggle.href = "";

                function toggleSANTruncation()
                {
                    if (sanDiv.classList.contains("truncated-san")) {
                        sanDiv.classList.remove("truncated-san")
                        truncatedSANToggle.textContent = WebInspector.UIString("Show less");
                    } else {
                        sanDiv.classList.add("truncated-san");
                        truncatedSANToggle.textContent = WebInspector.UIString("Show more (%d total)", sanList.length);
                    }
                }
                truncatedSANToggle.addEventListener("click", toggleSANTruncation, false);
                toggleSANTruncation();
            }
        }
        return sanDiv;
    },

    /**
     * @param {!SecurityAgent.SecurityState} newSecurityState
     */
    setSecurityState: function(newSecurityState)
    {
        for (var className of Array.prototype.slice.call(this._originLockIcon.classList)) {
            if (className.startsWith("security-property-"))
                this._originLockIcon.classList.remove(className);
        }

        this._originLockIcon.classList.add("security-property-" + newSecurityState);
    },

    /**
     * @constructor
     * @param {?NetworkAgent.CertificateValidationDetails} details
     * @return {string}
     */
    sctSummary: function(details)
    {
        if (!details)
            return WebInspector.UIString("N/A");

        var sctTypeList = [];
        if (details.numValidScts)
            sctTypeList.push(WebInspector.UIString("%d valid SCT%s", details.numValidScts, (details.numValidScts > 1) ? "s" : ""));
        if (details.numInvalidScts)
            sctTypeList.push(WebInspector.UIString("%d invalid SCT%s", details.numInvalidScts, (details.numInvalidScts > 1) ? "s" : ""));
        if (details.numUnknownScts)
            sctTypeList.push(WebInspector.UIString("%d SCT%s from unknown logs", details.numUnknownScts, (details.numUnknownScts > 1) ? "s" : ""));
        return sctTypeList.length ? sctTypeList.join(", ") : WebInspector.UIString("0 SCTs");
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 */
WebInspector.SecurityDetailsTable = function()
{
    this._element = createElement("table");
    this._element.classList.add("details-table");
}

WebInspector.SecurityDetailsTable.prototype = {

    /**
     * @return: {!Element}
     */
    element: function()
    {
        return this._element;
    },

    /**
     * @param {string} key
     * @param {string|!Node} value
     */
    addRow: function(key, value)
    {
        var row = this._element.createChild("div", "details-table-row");
        row.createChild("div").textContent = key;

        var valueDiv = row.createChild("div");
        if (typeof value === "string") {
            valueDiv.textContent = value;
        } else {
            valueDiv.appendChild(value);
        }
    }
}
