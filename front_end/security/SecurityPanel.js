// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as Network from '../network/network.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {Events, PageSecurityState, PageVisibleSecurityState, SecurityModel, SecurityStyleExplanation, SummaryMessages,} from './SecurityModel.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {SDK.SDKModel.SDKModelObserver<!SecurityModel>}
 * @unrestricted
 */
export class SecurityPanel extends UI.Panel.PanelWithSidebar {
  constructor() {
    super('security');

    this._mainView = new SecurityMainView(this);

    const title = createElementWithClass('span', 'title');
    title.textContent = Common.UIString.UIString('Overview');
    this._sidebarMainViewElement = new SecurityPanelSidebarTreeElement(
        title, this._setVisibleView.bind(this, this._mainView), 'security-main-view-sidebar-tree-item', 'lock-icon');
    this._sidebarMainViewElement.tooltip = title.textContent;
    this._sidebarTree = new SecurityPanelSidebarTree(this._sidebarMainViewElement, this.showOrigin.bind(this));
    this.panelSidebarElement().appendChild(this._sidebarTree.element);

    /** @type {!Map<!Protocol.Network.LoaderId, !SDK.NetworkRequest.NetworkRequest>} */
    this._lastResponseReceivedForLoaderId = new Map();

    /** @type {!Map<!Origin, !OriginState>} */
    this._origins = new Map();

    /** @type {!Map<!Network.NetworkLogView.MixedContentFilterValues, number>} */
    this._filterRequestCounts = new Map();

    SDK.SDKModel.TargetManager.instance().observeModels(SecurityModel, this);
  }

  /**
   * @return {!SecurityPanel}
   */
  static _instance() {
    return (
        /** @type {!SecurityPanel} */ (self.runtime.sharedInstance(SecurityPanel)));
  }

  /**
   * @param {string} text
   * @param {string} origin
   * @return {!Element}
   */
  static createCertificateViewerButtonForOrigin(text, origin) {
    const certificateButton = UI.UIUtils.createTextButton(text, async e => {
      e.consume();
      const names = await self.SDK.multitargetNetworkManager.getCertificate(origin);
      if (names.length > 0) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.showCertificateViewer(names);
      }
    }, 'origin-button');
    UI.ARIAUtils.markAsButton(certificateButton);
    return certificateButton;
  }

  /**
   * @param {string} text
   * @param {!Array<string>} names
   * @return {!Element}
   */
  static createCertificateViewerButtonForCert(text, names) {
    const certificateButton = UI.UIUtils.createTextButton(text, e => {
      e.consume();
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.showCertificateViewer(names);
    }, 'origin-button');
    UI.ARIAUtils.markAsButton(certificateButton);
    return certificateButton;
  }

  /**
   * @param {string} url
   * @param {string} securityState
   * @return {!Element}
   */
  static createHighlightedUrl(url, securityState) {
    const schemeSeparator = '://';
    const index = url.indexOf(schemeSeparator);

    // If the separator is not found, just display the text without highlighting.
    if (index === -1) {
      const text = createElement('span', '');
      text.textContent = url;
      return text;
    }

    const highlightedUrl = createElement('span');

    const scheme = url.substr(0, index);
    const content = url.substr(index + schemeSeparator.length);
    highlightedUrl.createChild('span', 'url-scheme-' + securityState).textContent = scheme;
    highlightedUrl.createChild('span', 'url-scheme-separator').textContent = schemeSeparator;
    highlightedUrl.createChild('span').textContent = content;

    return highlightedUrl;
  }

  /**
   * @param {!Protocol.Security.SecurityState} newSecurityState
   * @param {!Array<!Protocol.Security.SecurityStateExplanation>} explanations
   * @param {?string} summary
   */
  _updateSecurityState(newSecurityState, explanations, summary) {
    this._sidebarMainViewElement.setSecurityState(newSecurityState);
    this._mainView.updateSecurityState(newSecurityState, explanations, summary);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onSecurityStateChanged(event) {
    const data = /** @type {!PageSecurityState} */ (event.data);
    const securityState = /** @type {!Protocol.Security.SecurityState} */ (data.securityState);
    const explanations = /** @type {!Array<!Protocol.Security.SecurityStateExplanation>} */ (data.explanations);
    const summary = /** @type {?string} */ (data.summary);
    this._updateSecurityState(securityState, explanations, summary);
  }

  /**
   * @param {!PageVisibleSecurityState} visibleSecurityState
   */
  _updateVisibleSecurityState(visibleSecurityState) {
    this._sidebarMainViewElement.setSecurityState(visibleSecurityState.securityState);
    this._mainView.updateVisibleSecurityState(visibleSecurityState);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onVisibleSecurityStateChanged(event) {
    const data = /** @type {!PageVisibleSecurityState} */ (event.data);
    this._updateVisibleSecurityState(data);
  }

  selectAndSwitchToMainView() {
    // The sidebar element will trigger displaying the main view. Rather than making a redundant call to display the main view, we rely on this.
    this._sidebarMainViewElement.select(true);
  }
  /**
   * @param {!Origin} origin
   */
  showOrigin(origin) {
    const originState = this._origins.get(origin);
    if (!originState.originView) {
      originState.originView = new SecurityOriginView(this, origin, originState);
    }

    this._setVisibleView(originState.originView);
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    if (!this._visibleView) {
      this.selectAndSwitchToMainView();
    }
  }

  /**
   * @override
   */
  focus() {
    this._sidebarTree.focus();
  }

  /**
   * @param {!UI.Widget.VBox} view
   */
  _setVisibleView(view) {
    if (this._visibleView === view) {
      return;
    }

    if (this._visibleView) {
      this._visibleView.detach();
    }

    this._visibleView = view;

    if (view) {
      this.splitWidget().setMainWidget(view);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onResponseReceived(event) {
    const request = /** @type {!SDK.NetworkRequest.NetworkRequest} */ (event.data);
    if (request.resourceType() === Common.ResourceType.resourceTypes.Document) {
      this._lastResponseReceivedForLoaderId.set(request.loaderId, request);
    }
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  _processRequest(request) {
    const origin = Common.ParsedURL.ParsedURL.extractOrigin(request.url());

    if (!origin) {
      // We don't handle resources like data: URIs. Most of them don't affect the lock icon.
      return;
    }

    let securityState = /** @type {!Protocol.Security.SecurityState} */ (request.securityState());

    if (request.mixedContentType === Protocol.Security.MixedContentType.Blockable ||
        request.mixedContentType === Protocol.Security.MixedContentType.OptionallyBlockable) {
      securityState = Protocol.Security.SecurityState.Insecure;
    }

    if (this._origins.has(origin)) {
      const originState = this._origins.get(origin);
      const oldSecurityState = originState.securityState;
      originState.securityState = this._securityStateMin(oldSecurityState, securityState);
      if (oldSecurityState !== originState.securityState) {
        const securityDetails = /** @type {?Protocol.Network.SecurityDetails} */ (request.securityDetails());
        if (securityDetails) {
          originState.securityDetails = securityDetails;
        }
        this._sidebarTree.updateOrigin(origin, securityState);
        if (originState.originView) {
          originState.originView.setSecurityState(securityState);
        }
      }
    } else {
      // This stores the first security details we see for an origin, but we should
      // eventually store a (deduplicated) list of all the different security
      // details we have seen. https://crbug.com/503170
      const originState = {};
      originState.securityState = securityState;

      const securityDetails = request.securityDetails();
      if (securityDetails) {
        originState.securityDetails = securityDetails;
      }

      originState.loadedFromCache = request.cached();

      this._origins.set(origin, originState);

      this._sidebarTree.addOrigin(origin, securityState);

      // Don't construct the origin view yet (let it happen lazily).
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onRequestFinished(event) {
    const request = /** @type {!SDK.NetworkRequest.NetworkRequest} */ (event.data);
    this._updateFilterRequestCounts(request);
    this._processRequest(request);
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  _updateFilterRequestCounts(request) {
    if (request.mixedContentType === Protocol.Security.MixedContentType.None) {
      return;
    }

    /** @type {!Network.NetworkLogView.MixedContentFilterValues} */
    let filterKey = Network.NetworkLogView.MixedContentFilterValues.All;
    if (request.wasBlocked()) {
      filterKey = Network.NetworkLogView.MixedContentFilterValues.Blocked;
    } else if (request.mixedContentType === Protocol.Security.MixedContentType.Blockable) {
      filterKey = Network.NetworkLogView.MixedContentFilterValues.BlockOverridden;
    } else if (request.mixedContentType === Protocol.Security.MixedContentType.OptionallyBlockable) {
      filterKey = Network.NetworkLogView.MixedContentFilterValues.Displayed;
    }

    if (!this._filterRequestCounts.has(filterKey)) {
      this._filterRequestCounts.set(filterKey, 1);
    } else {
      this._filterRequestCounts.set(filterKey, this._filterRequestCounts.get(filterKey) + 1);
    }

    this._mainView.refreshExplanations();
  }

  /**
   * @param {!Network.NetworkLogView.MixedContentFilterValues} filterKey
   * @return {number}
   */
  filterRequestCount(filterKey) {
    return this._filterRequestCounts.get(filterKey) || 0;
  }

  /**
   * @param {!Protocol.Security.SecurityState} stateA
   * @param {!Protocol.Security.SecurityState} stateB
   * @return {!Protocol.Security.SecurityState}
   */
  _securityStateMin(stateA, stateB) {
    return SecurityModel.SecurityStateComparator(stateA, stateB) < 0 ? stateA : stateB;
  }

  /**
   * @override
   * @param {!SecurityModel} securityModel
   */
  modelAdded(securityModel) {
    if (this._securityModel) {
      return;
    }

    this._securityModel = securityModel;
    const resourceTreeModel = securityModel.resourceTreeModel();
    const networkManager = securityModel.networkManager();
    this._eventListeners = [
      securityModel.addEventListener(Events.VisibleSecurityStateChanged, this._onVisibleSecurityStateChanged, this),
      resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.MainFrameNavigated, this._onMainFrameNavigated, this),
      resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.InterstitialShown, this._onInterstitialShown, this),
      resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.InterstitialHidden, this._onInterstitialHidden, this),
      networkManager.addEventListener(SDK.NetworkManager.Events.ResponseReceived, this._onResponseReceived, this),
      networkManager.addEventListener(SDK.NetworkManager.Events.RequestFinished, this._onRequestFinished, this),
    ];

    if (resourceTreeModel.isInterstitialShowing()) {
      this._onInterstitialShown();
    }
  }

  /**
   * @override
   * @param {!SecurityModel} securityModel
   */
  modelRemoved(securityModel) {
    if (this._securityModel !== securityModel) {
      return;
    }

    delete this._securityModel;
    Common.EventTarget.EventTarget.removeEventListeners(this._eventListeners);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onMainFrameNavigated(event) {
    const frame = /** type {!Protocol.Page.Frame}*/ (event.data);
    const request = this._lastResponseReceivedForLoaderId.get(frame.loaderId);

    this.selectAndSwitchToMainView();
    this._sidebarTree.clearOrigins();
    this._origins.clear();
    this._lastResponseReceivedForLoaderId.clear();
    this._filterRequestCounts.clear();
    // After clearing the filtered request counts, refresh the
    // explanations to reflect the new counts.
    this._mainView.refreshExplanations();

    // If we could not find a matching request (as in the case of clicking
    // through an interstitial, see https://crbug.com/669309), set the origin
    // based upon the url data from the MainFrameNavigated event itself.
    const origin = Common.ParsedURL.ParsedURL.extractOrigin(request ? request.url() : frame.url);
    this._sidebarTree.setMainOrigin(origin);

    if (request) {
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
}

/**
 * @unrestricted
 */
export class SecurityPanelSidebarTree extends UI.TreeOutline.TreeOutlineInShadow {
  /**
   * @param {!SecurityPanelSidebarTreeElement} mainViewElement
   * @param {function(!Origin)} showOriginInPanel
   */
  constructor(mainViewElement, showOriginInPanel) {
    super();
    this.registerRequiredCSS('security/sidebar.css');
    this.registerRequiredCSS('security/lockIcon.css');
    this.appendChild(mainViewElement);

    this._showOriginInPanel = showOriginInPanel;
    this._mainOrigin = null;

    /** @type {!Map<!OriginGroup, !UI.TreeOutline.TreeElement>} */
    this._originGroups = new Map();

    /** @type {!Map<!OriginGroup, string>} */
    this._originGroupTitles = new Map([
      [OriginGroup.MainOrigin, ls`Main origin`],
      [OriginGroup.NonSecure, ls`Non-secure origins`],
      [OriginGroup.Secure, ls`Secure origins`],
      [OriginGroup.Unknown, ls`Unknown / canceled`],
    ]);

    for (const key in OriginGroup) {
      const group = OriginGroup[key];
      const element = this._createOriginGroupElement(this._originGroupTitles.get(group));
      this._originGroups.set(group, element);
      this.appendChild(element);
    }

    this._clearOriginGroups();

    // This message will be removed by clearOrigins() during the first new page load after the panel was opened.
    const mainViewReloadMessage = new UI.TreeOutline.TreeElement(Common.UIString.UIString('Reload to view details'));
    mainViewReloadMessage.selectable = false;
    mainViewReloadMessage.listItemElement.classList.add('security-main-view-reload-message');
    this._originGroups.get(OriginGroup.MainOrigin).appendChild(mainViewReloadMessage);

    /** @type {!Map<!Origin, !SecurityPanelSidebarTreeElement>} */
    this._elementsByOrigin = new Map();
  }

  /**
   * @param {string} originGroupTitle
   * @return {!UI.TreeOutline.TreeElement}
   */
  _createOriginGroupElement(originGroupTitle) {
    const originGroup = new UI.TreeOutline.TreeElement(originGroupTitle, true);
    originGroup.selectable = false;
    originGroup.setCollapsible(false);
    originGroup.expand();
    originGroup.listItemElement.classList.add('security-sidebar-origins');
    UI.ARIAUtils.setAccessibleName(originGroup.childrenListElement, originGroupTitle);
    return originGroup;
  }

  /**
   * @param {boolean} hidden
   */
  toggleOriginsList(hidden) {
    for (const element of this._originGroups.values()) {
      element.hidden = hidden;
    }
  }

  /**
   * @param {!Origin} origin
   * @param {!Protocol.Security.SecurityState} securityState
   */
  addOrigin(origin, securityState) {
    const originElement = new SecurityPanelSidebarTreeElement(
        SecurityPanel.createHighlightedUrl(origin, securityState), this._showOriginInPanel.bind(this, origin),
        'security-sidebar-tree-item', 'security-property');
    originElement.tooltip = origin;
    this._elementsByOrigin.set(origin, originElement);
    this.updateOrigin(origin, securityState);
  }

  /**
   * @param {!Origin} origin
   */
  setMainOrigin(origin) {
    this._mainOrigin = origin;
  }

  /**
   * @param {!Origin} origin
   * @param {!Protocol.Security.SecurityState} securityState
   */
  updateOrigin(origin, securityState) {
    const originElement =
        /** @type {!SecurityPanelSidebarTreeElement} */ (this._elementsByOrigin.get(origin));
    originElement.setSecurityState(securityState);

    let newParent;
    if (origin === this._mainOrigin) {
      newParent = this._originGroups.get(OriginGroup.MainOrigin);
      if (securityState === Protocol.Security.SecurityState.Secure) {
        newParent.title = ls`Main origin (secure)`;
      } else {
        newParent.title = ls`Main origin (non-secure)`;
      }
      UI.ARIAUtils.setAccessibleName(newParent.childrenListElement, newParent.title);
    } else {
      switch (securityState) {
        case Protocol.Security.SecurityState.Secure:
          newParent = this._originGroups.get(OriginGroup.Secure);
          break;
        case Protocol.Security.SecurityState.Unknown:
          newParent = this._originGroups.get(OriginGroup.Unknown);
          break;
        default:
          newParent = this._originGroups.get(OriginGroup.NonSecure);
          break;
      }
    }

    const oldParent = originElement.parent;
    if (oldParent !== newParent) {
      if (oldParent) {
        oldParent.removeChild(originElement);
        if (oldParent.childCount() === 0) {
          oldParent.hidden = true;
        }
      }
      newParent.appendChild(originElement);
      newParent.hidden = false;
    }
  }

  _clearOriginGroups() {
    for (const originGroup of this._originGroups.values()) {
      originGroup.removeChildren();
      originGroup.hidden = true;
    }
    const mainOrigin = this._originGroups.get(OriginGroup.MainOrigin);
    mainOrigin.title = this._originGroupTitles.get(OriginGroup.MainOrigin);
    mainOrigin.hidden = false;
  }

  clearOrigins() {
    this._clearOriginGroups();
    this._elementsByOrigin.clear();
  }
}

/** @enum {symbol} */
export const OriginGroup = {
  MainOrigin: Symbol('MainOrigin'),
  NonSecure: Symbol('NonSecure'),
  Secure: Symbol('Secure'),
  Unknown: Symbol('Unknown')
};

/**
 * @unrestricted
 */
export class SecurityPanelSidebarTreeElement extends UI.TreeOutline.TreeElement {
  /**
   * @param {!Element} textElement
   * @param {function()} selectCallback
   * @param {string} className
   * @param {string} cssPrefix
   */
  constructor(textElement, selectCallback, className, cssPrefix) {
    super('', false);
    this._selectCallback = selectCallback;
    this._cssPrefix = cssPrefix;
    this.listItemElement.classList.add(className);
    this._iconElement = this.listItemElement.createChild('div', 'icon');
    this._iconElement.classList.add(this._cssPrefix);
    this.listItemElement.appendChild(textElement);
    this.setSecurityState(Protocol.Security.SecurityState.Unknown);
  }

  /**
   * @param {!SecurityPanelSidebarTreeElement} a
   * @param {!Security.SecurityPanelSidebarTreeElement} b
   * @return {number}
   */
  static SecurityStateComparator(a, b) {
    return SecurityModel.SecurityStateComparator(a.securityState(), b.securityState());
  }

  /**
   * @param {!Protocol.Security.SecurityState} newSecurityState
   */
  setSecurityState(newSecurityState) {
    if (this._securityState) {
      this._iconElement.classList.remove(this._cssPrefix + '-' + this._securityState);
    }

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
}

/**
 * @unrestricted
 */
export class SecurityMainView extends UI.Widget.VBox {
  /**
   * @param {!SecurityPanel} panel
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
    this._securityExplanationsMain =
        this.contentElement.createChild('div', 'security-explanation-list security-explanations-main');
    this._securityExplanationsExtra =
        this.contentElement.createChild('div', 'security-explanation-list security-explanations-extra');

    // Fill the security summary section.
    const summaryDiv = this._summarySection.createChild('div', 'security-summary-section-title');
    summaryDiv.textContent = ls`Security overview`;
    UI.ARIAUtils.markAsHeading(summaryDiv, 1);

    const lockSpectrum = this._summarySection.createChild('div', 'lock-spectrum');
    this._lockSpectrum = new Map([
      [Protocol.Security.SecurityState.Secure, lockSpectrum.createChild('div', 'lock-icon lock-icon-secure')],
      [Protocol.Security.SecurityState.Neutral, lockSpectrum.createChild('div', 'lock-icon lock-icon-neutral')],
      [Protocol.Security.SecurityState.Insecure, lockSpectrum.createChild('div', 'lock-icon lock-icon-insecure')],
    ]);
    this._lockSpectrum.get(Protocol.Security.SecurityState.Secure).title = Common.UIString.UIString('Secure');
    this._lockSpectrum.get(Protocol.Security.SecurityState.Neutral).title = Common.UIString.UIString('Info');
    this._lockSpectrum.get(Protocol.Security.SecurityState.Insecure).title = Common.UIString.UIString('Not secure');

    this._summarySection.createChild('div', 'triangle-pointer-container')
        .createChild('div', 'triangle-pointer-wrapper')
        .createChild('div', 'triangle-pointer');

    this._summaryText = this._summarySection.createChild('div', 'security-summary-text');
    UI.ARIAUtils.markAsHeading(this._summaryText, 2);
  }

  /**
   * @param {!Element} parent
   * @param {!Protocol.Security.SecurityStateExplanation} explanation
   * @return {!Element}
   */
  _addExplanation(parent, explanation) {
    const explanationSection = parent.createChild('div', 'security-explanation');
    explanationSection.classList.add('security-explanation-' + explanation.securityState);

    explanationSection.createChild('div', 'security-property')
        .classList.add('security-property-' + explanation.securityState);
    const text = explanationSection.createChild('div', 'security-explanation-text');

    const explanationHeader = text.createChild('div', 'security-explanation-title');

    if (explanation.title) {
      explanationHeader.createChild('span').textContent = explanation.title + ' - ';
      explanationHeader.createChild('span', 'security-explanation-title-' + explanation.securityState).textContent =
          explanation.summary;
    } else {
      explanationHeader.textContent = explanation.summary;
    }

    text.createChild('div').textContent = explanation.description;

    if (explanation.certificate.length) {
      text.appendChild(SecurityPanel.createCertificateViewerButtonForCert(
          Common.UIString.UIString('View certificate'), explanation.certificate));
    }

    if (explanation.recommendations && explanation.recommendations.length) {
      const recommendationList = text.createChild('ul', 'security-explanation-recommendations');
      for (const recommendation of explanation.recommendations) {
        recommendationList.createChild('li').textContent = recommendation;
      }
    }
    return text;
  }

  /**
   * @param {!Protocol.Security.SecurityState} newSecurityState
   * @param {!Array<!Protocol.Security.SecurityStateExplanation>} explanations
   * @param {?string} summary
   */
  updateSecurityState(newSecurityState, explanations, summary) {
    // Remove old state.
    // It's safe to call this even when this._securityState is undefined.
    this._summarySection.classList.remove('security-summary-' + this._securityState);

    // Add new state.
    this._securityState = newSecurityState;

    this._summarySection.classList.add('security-summary-' + this._securityState);
    const summaryExplanationStrings = {
      'unknown': ls`The security of this page is unknown.`,
      'insecure': ls`This page is not secure.`,
      'neutral': ls`This page is not secure.`,
      'secure': ls`This page is secure (valid HTTPS).`,
      'insecure-broken': ls`This page is not secure (broken HTTPS).`
    };

    // Update the color and title of the triangle icon in the lock spectrum to
    // match the security state.
    if (this._securityState === Protocol.Security.SecurityState.Insecure) {
      this._lockSpectrum.get(Protocol.Security.SecurityState.Insecure).classList.add('lock-icon-insecure');
      this._lockSpectrum.get(Protocol.Security.SecurityState.Insecure).classList.remove('lock-icon-insecure-broken');
      this._lockSpectrum.get(Protocol.Security.SecurityState.Insecure).title = Common.UIString.UIString('Not secure');
    } else if (this._securityState === Protocol.Security.SecurityState.InsecureBroken) {
      this._lockSpectrum.get(Protocol.Security.SecurityState.Insecure).classList.add('lock-icon-insecure-broken');
      this._lockSpectrum.get(Protocol.Security.SecurityState.Insecure).classList.remove('lock-icon-insecure');
      this._lockSpectrum.get(Protocol.Security.SecurityState.Insecure).title =
          Common.UIString.UIString('Not secure (broken)');
    }

    // Use override summary if present, otherwise use base explanation
    this._summaryText.textContent = summary || summaryExplanationStrings[this._securityState];

    this._explanations = explanations;

    this.refreshExplanations();
  }

  /**
   * @param {!PageVisibleSecurityState} visibleSecurityState
   */
  updateVisibleSecurityState(visibleSecurityState) {
    // Remove old state.
    // It's safe to call this even when this._securityState is undefined.
    this._summarySection.classList.remove('security-summary-' + this._securityState);

    // Add new state.
    this._securityState = visibleSecurityState.securityState;
    this._summarySection.classList.add('security-summary-' + this._securityState);

    // Update the color and title of the triangle icon in the lock spectrum to
    // match the security state.
    if (this._securityState === Protocol.Security.SecurityState.Insecure) {
      this._lockSpectrum.get(Protocol.Security.SecurityState.Insecure).classList.add('lock-icon-insecure');
      this._lockSpectrum.get(Protocol.Security.SecurityState.Insecure).classList.remove('lock-icon-insecure-broken');
      this._lockSpectrum.get(Protocol.Security.SecurityState.Insecure).title = ls`Not secure`;
    } else if (this._securityState === Protocol.Security.SecurityState.InsecureBroken) {
      this._lockSpectrum.get(Protocol.Security.SecurityState.Insecure).classList.add('lock-icon-insecure-broken');
      this._lockSpectrum.get(Protocol.Security.SecurityState.Insecure).classList.remove('lock-icon-insecure');
      this._lockSpectrum.get(Protocol.Security.SecurityState.Insecure).title = ls`Not secure (broken)`;
    }

    const {summary, explanations} = this._getSecuritySummaryAndExplanations(visibleSecurityState);
    // Use override summary if present, otherwise use base explanation
    this._summaryText.textContent = summary || SummaryMessages[this._securityState];

    this._explanations = this._orderExplanations(explanations);

    this.refreshExplanations();
  }

  /**
   * @param {!PageVisibleSecurityState} visibleSecurityState
   * @returns {!{summary: (string|undefined), explanations: !Array<SecurityStyleExplanation>}}
   */
  _getSecuritySummaryAndExplanations(visibleSecurityState) {
    const {securityState, securityStateIssueIds} = visibleSecurityState;
    let summary;
    const explanations = [];
    summary = this._explainSafetyTipSecurity(visibleSecurityState, summary, explanations);
    if (securityStateIssueIds.includes('malicious-content')) {
      summary = ls`This page is dangerous (flagged by Google Safe Browsing).`;
      // Always insert SafeBrowsing explanation at the front.
      explanations.unshift(new SecurityStyleExplanation(
          Protocol.Security.SecurityState.Insecure, undefined, ls`Flagged by Google Safe Browsing`,
          ls`To check this page's status, visit g.co/safebrowsingstatus.`));
    } else if (
        securityStateIssueIds.includes('is-error-page') &&
        (visibleSecurityState.certificateSecurityState === null ||
         visibleSecurityState.certificateSecurityState.certificateNetworkError === null)) {
      summary = ls`This is an error page.`;
      // In the case of a non cert error page, we usually don't have a
      // certificate, connection, or content that needs to be explained, e.g. in
      // the case of a net error, so we can early return.
      return {summary, explanations};
    } else if (
        securityState === Protocol.Security.SecurityState.InsecureBroken &&
        securityStateIssueIds.includes('scheme-is-not-cryptographic')) {
      summary = summary || ls`This page is insecure (unencrypted HTTP).`;
      if (securityStateIssueIds.includes('insecure-input-events')) {
        explanations.push(new SecurityStyleExplanation(
            Protocol.Security.SecurityState.Insecure, undefined, ls`Form field edited on a non-secure page`,
            ls`Data was entered in a field on a non-secure page. A warning has been added to the URL bar.`));
      }
    }

    if (securityStateIssueIds.includes('scheme-is-not-cryptographic')) {
      if (securityState === Protocol.Security.SecurityState.Neutral &&
          !securityStateIssueIds.includes('insecure-origin')) {
        summary = ls`This page has a non-HTTPS secure origin.`;
      }
      return {summary, explanations};
    }

    this._explainCertificateSecurity(visibleSecurityState, explanations);
    this._explainConnectionSecurity(visibleSecurityState, explanations);
    this._explainContentSecurity(visibleSecurityState, explanations);
    return {summary, explanations};
  }

  /**
   * @param {!PageVisibleSecurityState} visibleSecurityState
   * @param {string|undefined} summary
   * @param {!Array<!SecurityStyleExplanation>} explanations
   * @returns {string|undefined}
   */
  _explainSafetyTipSecurity(visibleSecurityState, summary, explanations) {
    const {securityStateIssueIds, safetyTipInfo} = visibleSecurityState;
    const currentExplanations = [];

    if (securityStateIssueIds.includes('bad_reputation')) {
      currentExplanations.push({
        summary: ls`This page is suspicious`,
        description: ls
        `Chrome has determined that this site could be fake or fraudulent.\n\nIf you believe this is shown in error please visit https://bugs.chromium.org/p/chromium/issues/entry?template=Safety+Tips+Appeals.`
      });
    } else if (securityStateIssueIds.includes('lookalike') && safetyTipInfo.safeUrl) {
      currentExplanations.push({
        summary: ls`Possible spoofing URL`,
        description: ls`This site's hostname looks similar to ${
            new URL(safetyTipInfo.safeUrl)
                .hostname}. Attackers sometimes mimic sites by making small, hard-to-see changes to the domain name.\n\nIf you believe this is shown in error please visit https://bugs.chromium.org/p/chromium/issues/entry?template=Safety+Tips+Appeals.`
      });
    }

    if (currentExplanations.length > 0) {
      // To avoid overwriting SafeBrowsing's title, set the main summary only if
      // it's empty. The title set here can be overridden by later checks (e.g.
      // bad HTTP).
      summary = summary || ls`This page is suspicious (flagged by Chrome).`;
      explanations.push(new SecurityStyleExplanation(
          Protocol.Security.SecurityState.Insecure, undefined, currentExplanations[0].summary,
          currentExplanations[0].description));
    }
    return summary;
  }

  /**
   * @param {!PageVisibleSecurityState} visibleSecurityState
   * @param {!Array<!SecurityStyleExplanation>} explanations
   */
  _explainCertificateSecurity(visibleSecurityState, explanations) {
    const {certificateSecurityState, securityStateIssueIds} = visibleSecurityState;
    const title = ls`Certificate`;
    if (certificateSecurityState && certificateSecurityState.certificateHasSha1Signature) {
      const explanationSummary = ls`insecure (SHA-1)`;
      const description = ls`The certificate chain for this site contains a certificate signed using SHA-1.`;
      if (certificateSecurityState.certificateHasWeakSignature) {
        explanations.push(new SecurityStyleExplanation(
            Protocol.Security.SecurityState.Insecure, title, explanationSummary, description,
            certificateSecurityState.certificate, Protocol.Security.MixedContentType.None));
      } else {
        explanations.push(new SecurityStyleExplanation(
            Protocol.Security.SecurityState.Neutral, title, explanationSummary, description,
            certificateSecurityState.certificate, Protocol.Security.MixedContentType.None));
      }
    }

    if (certificateSecurityState && securityStateIssueIds.includes('cert-missing-subject-alt-name')) {
      explanations.push(new SecurityStyleExplanation(
          Protocol.Security.SecurityState.Insecure, title, ls`Subject Alternative Name missing`,
          ls
          `The certificate for this site does not contain a Subject Alternative Name extension containing a domain name or IP address.`,
          certificateSecurityState.certificate, Protocol.Security.MixedContentType.None));
    }

    if (certificateSecurityState && certificateSecurityState.certificateNetworkError !== null) {
      explanations.push(new SecurityStyleExplanation(
          Protocol.Security.SecurityState.Insecure, title, ls`missing`,
          ls`This site is missing a valid, trusted certificate (${certificateSecurityState.certificateNetworkError}).`,
          certificateSecurityState.certificate, Protocol.Security.MixedContentType.None));
    } else if (certificateSecurityState && !certificateSecurityState.certificateHasSha1Signature) {
      explanations.push(new SecurityStyleExplanation(
          Protocol.Security.SecurityState.Secure, title, ls`valid and trusted`,
          ls`The connection to this site is using a valid, trusted server certificate issued by ${
              certificateSecurityState.issuer}.`,
          certificateSecurityState.certificate, Protocol.Security.MixedContentType.None));
    }

    if (securityStateIssueIds.includes('pkp-bypassed')) {
      explanations.push(new SecurityStyleExplanation(
          Protocol.Security.SecurityState.Info, title, ls`Public-Key-Pinning bypassed`,
          ls`Public-Key-Pinning was bypassed by a local root certificate.`));
    }

    if (certificateSecurityState && certificateSecurityState.isCertificateExpiringSoon()) {
      explanations.push(new SecurityStyleExplanation(
          Protocol.Security.SecurityState.Info, undefined, ls`Certificate expires soon`,
          ls`The certificate for this site expires in less than 48 hours and needs to be renewed.`));
    }
  }

  /**
   * @param {!PageVisibleSecurityState} visibleSecurityState
   * @param {!Array<!SecurityStyleExplanation>} explanations
   */
  _explainConnectionSecurity(visibleSecurityState, explanations) {
    const certificateSecurityState = visibleSecurityState.certificateSecurityState;
    if (!certificateSecurityState) {
      return;
    }

    const title = ls`Connection`;
    if (certificateSecurityState.modernSSL) {
      explanations.push(new SecurityStyleExplanation(
          Protocol.Security.SecurityState.Secure, title, ls`secure connection settings`,
          ls`The connection to this site is encrypted and authenticated using ${certificateSecurityState.protocol}, ${
              certificateSecurityState.getKeyExchangeName()}, and ${certificateSecurityState.getCipherFullName()}.`));
      return;
    }

    const recommendations = [];
    if (certificateSecurityState.obsoleteSslProtocol) {
      recommendations.push(ls`${certificateSecurityState.protocol} is obsolete. Enable TLS 1.2 or later.`);
    }
    if (certificateSecurityState.obsoleteSslKeyExchange) {
      recommendations.push(ls`RSA key exchange is obsolete. Enable an ECDHE-based cipher suite.`);
    }
    if (certificateSecurityState.obsoleteSslCipher) {
      recommendations.push(ls`${certificateSecurityState.cipher} is obsolete. Enable an AES-GCM-based cipher suite.`);
    }
    if (certificateSecurityState.obsoleteSslSignature) {
      recommendations.push(
          ls
          `The server signature uses SHA-1, which is obsolete. Enable a SHA-2 signature algorithm instead. (Note this is different from the signature in the certificate.)`);
    }

    explanations.push(new SecurityStyleExplanation(
        Protocol.Security.SecurityState.Info, title, ls`obsolete connection settings`,
        ls`The connection to this site is encrypted and authenticated using ${certificateSecurityState.protocol}, ${
            certificateSecurityState.getKeyExchangeName()}, and ${certificateSecurityState.getCipherFullName()}.`,
        undefined, undefined, recommendations));
  }

  /**
   * @param {!PageVisibleSecurityState} visibleSecurityState
   * @param {!Array<!SecurityStyleExplanation>} explanations
   */
  _explainContentSecurity(visibleSecurityState, explanations) {
    // Add the secure explanation unless there is an issue.
    let addSecureExplanation = true;
    const title = ls`Resources`;
    const securityStateIssueIds = visibleSecurityState.securityStateIssueIds;

    if (securityStateIssueIds.includes('ran-mixed-content')) {
      addSecureExplanation = false;
      explanations.push(new SecurityStyleExplanation(
          Protocol.Security.SecurityState.Insecure, title, ls`active mixed content`,
          ls`You have recently allowed non-secure content (such as scripts or iframes) to run on this site.`, [],
          Protocol.Security.MixedContentType.Blockable));
    }

    if (securityStateIssueIds.includes('displayed-mixed-content')) {
      addSecureExplanation = false;
      explanations.push(new SecurityStyleExplanation(
          Protocol.Security.SecurityState.Neutral, title, ls`mixed content`, ls`This page includes HTTP resources.`, [],
          Protocol.Security.MixedContentType.OptionallyBlockable));
    }

    if (securityStateIssueIds.includes('contained-mixed-form')) {
      addSecureExplanation = false;
      explanations.push(new SecurityStyleExplanation(
          Protocol.Security.SecurityState.Neutral, title, ls`non-secure form`,
          ls`This page includes a form with a non-secure "action" attribute.`));
    }

    if (visibleSecurityState.certificateSecurityState === null ||
        visibleSecurityState.certificateSecurityState.certificateNetworkError === null) {
      if (securityStateIssueIds.includes('ran-content-with-cert-error')) {
        addSecureExplanation = false;
        explanations.push(new SecurityStyleExplanation(
            Protocol.Security.SecurityState.Insecure, title, ls`active content with certificate errors`,
            ls
            `You have recently allowed content loaded with certificate errors (such as scripts or iframes) to run on this site.`));
      }

      if (securityStateIssueIds.includes('displayed-content-with-cert-errors')) {
        addSecureExplanation = false;
        explanations.push(new SecurityStyleExplanation(
            Protocol.Security.SecurityState.Neutral, title, ls`content with certificate errors`,
            ls`This page includes resources that were loaded with certificate errors.`));
      }
    }

    if (addSecureExplanation) {
      if (!securityStateIssueIds.includes('scheme-is-not-cryptographic')) {
        explanations.push(new SecurityStyleExplanation(
            Protocol.Security.SecurityState.Secure, title, ls`all served securely`,
            ls`All resources on this page are served securely.`));
      }
    }
  }

  /**
   * @param {!Array<!SecurityStyleExplanation>} explanations
   * @return {!Array<!Security.SecurityStyleExplanation>}
   */
  _orderExplanations(explanations) {
    if (explanations.length === 0) {
      return explanations;
    }
    const securityStateOrder = [
      Protocol.Security.SecurityState.Insecure, Protocol.Security.SecurityState.Neutral,
      Protocol.Security.SecurityState.Secure, Protocol.Security.SecurityState.Info
    ];
    const orderedExplanations = [];
    securityStateOrder.forEach(
        securityState => orderedExplanations.push(
            ...explanations.filter(explanation => explanation.securityState === securityState)));
    return orderedExplanations;
  }

  refreshExplanations() {
    this._securityExplanationsMain.removeChildren();
    this._securityExplanationsExtra.removeChildren();
    for (const explanation of this._explanations) {
      if (explanation.securityState === Protocol.Security.SecurityState.Info) {
        this._addExplanation(this._securityExplanationsExtra, explanation);
      } else {
        switch (explanation.mixedContentType) {
          case Protocol.Security.MixedContentType.Blockable:
            this._addMixedContentExplanation(
                this._securityExplanationsMain, explanation,
                Network.NetworkLogView.MixedContentFilterValues.BlockOverridden);
            break;
          case Protocol.Security.MixedContentType.OptionallyBlockable:
            this._addMixedContentExplanation(
                this._securityExplanationsMain, explanation, Network.NetworkLogView.MixedContentFilterValues.Displayed);
            break;
          default:
            this._addExplanation(this._securityExplanationsMain, explanation);
            break;
        }
      }
    }

    if (this._panel.filterRequestCount(Network.NetworkLogView.MixedContentFilterValues.Blocked) > 0) {
      const explanation = /** @type {!Protocol.Security.SecurityStateExplanation} */ ({
        securityState: Protocol.Security.SecurityState.Info,
        summary: Common.UIString.UIString('Blocked mixed content'),
        description: Common.UIString.UIString('Your page requested non-secure resources that were blocked.'),
        mixedContentType: Protocol.Security.MixedContentType.Blockable,
        certificate: []
      });
      this._addMixedContentExplanation(
          this._securityExplanationsMain, explanation, Network.NetworkLogView.MixedContentFilterValues.Blocked);
    }
  }

  /**
   * @param {!Element} parent
   * @param {!Protocol.Security.SecurityStateExplanation} explanation
   * @param {!Network.NetworkLogView.MixedContentFilterValues} filterKey
   */
  _addMixedContentExplanation(parent, explanation, filterKey) {
    const element = this._addExplanation(parent, explanation);

    const filterRequestCount = this._panel.filterRequestCount(filterKey);
    if (!filterRequestCount) {
      // Network instrumentation might not have been enabled for the page
      // load, so the security panel does not necessarily know a count of
      // individual mixed requests at this point. Prompt them to refresh
      // instead of pointing them to the Network panel to get prompted
      // to refresh.
      const refreshPrompt = element.createChild('div', 'security-mixed-content');
      refreshPrompt.textContent = Common.UIString.UIString('Reload the page to record requests for HTTP resources.');
      return;
    }

    const requestsAnchor = element.createChild('div', 'security-mixed-content devtools-link');
    UI.ARIAUtils.markAsLink(requestsAnchor);
    requestsAnchor.tabIndex = 0;
    if (filterRequestCount === 1) {
      requestsAnchor.textContent = Common.UIString.UIString('View %d request in Network Panel', filterRequestCount);
    } else {
      requestsAnchor.textContent = Common.UIString.UIString('View %d requests in Network Panel', filterRequestCount);
    }

    requestsAnchor.addEventListener('click', this.showNetworkFilter.bind(this, filterKey));
    requestsAnchor.addEventListener('keydown', event => {
      if (isEnterKey(event)) {
        this.showNetworkFilter(filterKey, event);
      }
    });
  }

  /**
   * @param {!Network.NetworkLogView.MixedContentFilterValues} filterKey
   * @param {!Event} e
   */
  showNetworkFilter(filterKey, e) {
    e.consume();
    Network.NetworkPanel.NetworkPanel.revealAndFilter(
        [{filterType: Network.NetworkLogView.FilterType.MixedContent, filterValue: filterKey}]);
  }
}

/**
 * @unrestricted
 */
export class SecurityOriginView extends UI.Widget.VBox {
  /**
   * @param {!SecurityPanel} panel
   * @param {!Origin} origin
   * @param {!OriginState} originState
   */
  constructor(panel, origin, originState) {
    super();
    this._panel = panel;
    this.setMinimumSize(200, 100);

    this.element.classList.add('security-origin-view');
    this.registerRequiredCSS('security/originView.css');
    this.registerRequiredCSS('security/lockIcon.css');

    const titleSection = this.element.createChild('div', 'title-section');
    const titleDiv = titleSection.createChild('div', 'title-section-header');
    titleDiv.textContent = ls`Origin`;
    UI.ARIAUtils.markAsHeading(titleDiv, 1);

    const originDisplay = titleSection.createChild('div', 'origin-display');
    this._originLockIcon = originDisplay.createChild('span', 'security-property');
    this._originLockIcon.classList.add('security-property-' + originState.securityState);

    originDisplay.appendChild(SecurityPanel.createHighlightedUrl(origin, originState.securityState));

    const originNetworkDiv = titleSection.createChild('div', 'view-network-button');
    const originNetworkLink = originNetworkDiv.createChild('span', 'devtools-link origin-button');
    originNetworkLink.textContent = ls`View requests in Network Panel`;
    originNetworkLink.addEventListener('click', e => {
      e.consume();
      const parsedURL = new Common.ParsedURL.ParsedURL(origin);
      Network.NetworkPanel.NetworkPanel.revealAndFilter([
        {filterType: Network.NetworkLogView.FilterType.Domain, filterValue: parsedURL.host},
        {filterType: Network.NetworkLogView.FilterType.Scheme, filterValue: parsedURL.scheme}
      ]);
    });
    UI.ARIAUtils.markAsLink(originNetworkLink);

    if (originState.securityDetails) {
      const connectionSection = this.element.createChild('div', 'origin-view-section');
      const connectionDiv = connectionSection.createChild('div', 'origin-view-section-title');
      connectionDiv.textContent = ls`Connection`;
      UI.ARIAUtils.markAsHeading(connectionDiv, 2);

      let table = new SecurityDetailsTable();
      connectionSection.appendChild(table.element());
      table.addRow(Common.UIString.UIString('Protocol'), originState.securityDetails.protocol);
      if (originState.securityDetails.keyExchange) {
        table.addRow(Common.UIString.UIString('Key exchange'), originState.securityDetails.keyExchange);
      }
      if (originState.securityDetails.keyExchangeGroup) {
        table.addRow(Common.UIString.UIString('Key exchange group'), originState.securityDetails.keyExchangeGroup);
      }
      table.addRow(
          Common.UIString.UIString('Cipher'),
          originState.securityDetails.cipher +
              (originState.securityDetails.mac ? ' with ' + originState.securityDetails.mac : ''));

      // Create the certificate section outside the callback, so that it appears in the right place.
      const certificateSection = this.element.createChild('div', 'origin-view-section');
      const certificateDiv = certificateSection.createChild('div', 'origin-view-section-title');
      certificateDiv.textContent = ls`Certificate`;
      UI.ARIAUtils.markAsHeading(certificateDiv, 2);

      const sctListLength = originState.securityDetails.signedCertificateTimestampList.length;
      const ctCompliance = originState.securityDetails.certificateTransparencyCompliance;
      let sctSection;
      if (sctListLength || ctCompliance !== Protocol.Network.CertificateTransparencyCompliance.Unknown) {
        // Create the Certificate Transparency section outside the callback, so that it appears in the right place.
        sctSection = this.element.createChild('div', 'origin-view-section');
        const sctDiv = sctSection.createChild('div', 'origin-view-section-title');
        sctDiv.textContent = ls`Certificate Transparency`;
        UI.ARIAUtils.markAsHeading(sctDiv, 2);
      }

      const sanDiv = this._createSanDiv(originState.securityDetails.sanList);
      const validFromString = new Date(1000 * originState.securityDetails.validFrom).toUTCString();
      const validUntilString = new Date(1000 * originState.securityDetails.validTo).toUTCString();

      table = new SecurityDetailsTable();
      certificateSection.appendChild(table.element());
      table.addRow(Common.UIString.UIString('Subject'), originState.securityDetails.subjectName);
      table.addRow(Common.UIString.UIString('SAN'), sanDiv);
      table.addRow(Common.UIString.UIString('Valid from'), validFromString);
      table.addRow(Common.UIString.UIString('Valid until'), validUntilString);
      table.addRow(Common.UIString.UIString('Issuer'), originState.securityDetails.issuer);

      table.addRow(
          '',
          SecurityPanel.createCertificateViewerButtonForOrigin(
              Common.UIString.UIString('Open full certificate details'), origin));

      if (!sctSection) {
        return;
      }

      // Show summary of SCT(s) of Certificate Transparency.
      const sctSummaryTable = new SecurityDetailsTable();
      sctSummaryTable.element().classList.add('sct-summary');
      sctSection.appendChild(sctSummaryTable.element());
      for (let i = 0; i < sctListLength; i++) {
        const sct = originState.securityDetails.signedCertificateTimestampList[i];
        sctSummaryTable.addRow(
            Common.UIString.UIString('SCT'), sct.logDescription + ' (' + sct.origin + ', ' + sct.status + ')');
      }

      // Show detailed SCT(s) of Certificate Transparency.
      const sctTableWrapper = sctSection.createChild('div', 'sct-details');
      sctTableWrapper.classList.add('hidden');
      for (let i = 0; i < sctListLength; i++) {
        const sctTable = new SecurityDetailsTable();
        sctTableWrapper.appendChild(sctTable.element());
        const sct = originState.securityDetails.signedCertificateTimestampList[i];
        sctTable.addRow(Common.UIString.UIString('Log name'), sct.logDescription);
        sctTable.addRow(Common.UIString.UIString('Log ID'), sct.logId.replace(/(.{2})/g, '$1 '));
        sctTable.addRow(Common.UIString.UIString('Validation status'), sct.status);
        sctTable.addRow(Common.UIString.UIString('Source'), sct.origin);
        sctTable.addRow(Common.UIString.UIString('Issued at'), new Date(sct.timestamp).toUTCString());
        sctTable.addRow(Common.UIString.UIString('Hash algorithm'), sct.hashAlgorithm);
        sctTable.addRow(Common.UIString.UIString('Signature algorithm'), sct.signatureAlgorithm);
        sctTable.addRow(Common.UIString.UIString('Signature data'), sct.signatureData.replace(/(.{2})/g, '$1 '));
      }

      // Add link to toggle between displaying of the summary of the SCT(s) and the detailed SCT(s).
      if (sctListLength) {
        function toggleSctDetailsDisplay() {
          let buttonText;
          const isDetailsShown = !sctTableWrapper.classList.contains('hidden');
          if (isDetailsShown) {
            buttonText = ls`Show full details`;
          } else {
            buttonText = ls`Hide full details`;
          }
          toggleSctsDetailsLink.textContent = buttonText;
          UI.ARIAUtils.setAccessibleName(toggleSctsDetailsLink, buttonText);
          UI.ARIAUtils.setExpanded(toggleSctsDetailsLink, !isDetailsShown);
          sctSummaryTable.element().classList.toggle('hidden');
          sctTableWrapper.classList.toggle('hidden');
        }
        const toggleSctsDetailsLink =
            UI.UIUtils.createTextButton(ls`Show full details`, toggleSctDetailsDisplay, 'details-toggle');
        sctSection.appendChild(toggleSctsDetailsLink);
      }

      switch (ctCompliance) {
        case Protocol.Network.CertificateTransparencyCompliance.Compliant:
          sctSection.createChild('div', 'origin-view-section-notes').textContent =
              Common.UIString.UIString('This request complies with Chrome\'s Certificate Transparency policy.');
          break;
        case Protocol.Network.CertificateTransparencyCompliance.NotCompliant:
          sctSection.createChild('div', 'origin-view-section-notes').textContent =
              Common.UIString.UIString('This request does not comply with Chrome\'s Certificate Transparency policy.');
          break;
        case Protocol.Network.CertificateTransparencyCompliance.Unknown:
          break;
      }

      const noteSection = this.element.createChild('div', 'origin-view-section origin-view-notes');
      if (originState.loadedFromCache) {
        noteSection.createChild('div').textContent =
            Common.UIString.UIString('This response was loaded from cache. Some security details might be missing.');
      }
      noteSection.createChild('div').textContent =
          Common.UIString.UIString('The security details above are from the first inspected response.');
    } else if (originState.securityState === Protocol.Security.SecurityState.Secure) {
      // If the security state is secure but there are no security details,
      // this means that the origin is a non-cryptographic secure origin, e.g.
      // chrome:// or about:.
      const secureSection = this.element.createChild('div', 'origin-view-section');
      const secureDiv = secureSection.createChild('div', 'origin-view-section-title');
      secureDiv.textContent = ls`Secure`;
      UI.ARIAUtils.markAsHeading(secureDiv, 2);
      secureSection.createChild('div').textContent = ls`This origin is a non-HTTPS secure origin.`;
    } else if (originState.securityState !== Protocol.Security.SecurityState.Unknown) {
      const notSecureSection = this.element.createChild('div', 'origin-view-section');
      const notSecureDiv = notSecureSection.createChild('div', 'origin-view-section-title');
      notSecureDiv.textContent = ls`Not secure`;
      UI.ARIAUtils.markAsHeading(notSecureDiv, 2);
      notSecureSection.createChild('div').textContent =
          Common.UIString.UIString('Your connection to this origin is not secure.');
    } else {
      const noInfoSection = this.element.createChild('div', 'origin-view-section');
      const noInfoDiv = noInfoSection.createChild('div', 'origin-view-section-title');
      noInfoDiv.textContent = ls`No security information`;
      UI.ARIAUtils.markAsHeading(noInfoDiv, 2);
      noInfoSection.createChild('div').textContent =
          Common.UIString.UIString('No security details are available for this origin.');
    }
  }

  /**
   * @param {!Array<string>} sanList
   * @return {!Element}
   */
  _createSanDiv(sanList) {
    const sanDiv = createElement('div');
    if (sanList.length === 0) {
      sanDiv.textContent = Common.UIString.UIString('(n/a)');
      sanDiv.classList.add('empty-san');
    } else {
      const truncatedNumToShow = 2;
      const listIsTruncated = sanList.length > truncatedNumToShow + 1;
      for (let i = 0; i < sanList.length; i++) {
        const span = sanDiv.createChild('span', 'san-entry');
        span.textContent = sanList[i];
        if (listIsTruncated && i >= truncatedNumToShow) {
          span.classList.add('truncated-entry');
        }
      }
      if (listIsTruncated) {
        function toggleSANTruncation() {
          const isTruncated = sanDiv.classList.contains('truncated-san');
          let buttonText;
          if (isTruncated) {
            sanDiv.classList.remove('truncated-san');
            buttonText = ls`Show less`;
          } else {
            sanDiv.classList.add('truncated-san');
            buttonText = ls`Show more (${sanList.length} total)`;
          }
          truncatedSANToggle.textContent = buttonText;
          UI.ARIAUtils.setAccessibleName(truncatedSANToggle, buttonText);
          UI.ARIAUtils.setExpanded(truncatedSANToggle, isTruncated);
        }
        const truncatedSANToggle =
            UI.UIUtils.createTextButton(ls`Show more (${sanList.length} total)`, toggleSANTruncation);
        sanDiv.appendChild(truncatedSANToggle);
        toggleSANTruncation();
      }
    }
    return sanDiv;
  }

  /**
   * @param {!Protocol.Security.SecurityState} newSecurityState
   */
  setSecurityState(newSecurityState) {
    for (const className of Array.prototype.slice.call(this._originLockIcon.classList)) {
      if (className.startsWith('security-property-')) {
        this._originLockIcon.classList.remove(className);
      }
    }

    this._originLockIcon.classList.add('security-property-' + newSecurityState);
  }
}

/**
 * @unrestricted
 */
export class SecurityDetailsTable {
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
    const row = this._element.createChild('div', 'details-table-row');
    row.createChild('div').textContent = key;

    const valueDiv = row.createChild('div');
    if (typeof value === 'string') {
      valueDiv.textContent = value;
    } else {
      valueDiv.appendChild(value);
    }
  }
}

/**
 * @typedef {{
 * securityState: !Protocol.Security.SecurityState,
 * securityDetails: ?Protocol.Network.SecurityDetails,
 * loadedFromCache: boolean,
 * originView: (?SecurityOriginView|undefined),
 * }}
 */
export let OriginState;

/** @typedef {string} */
export let Origin;
