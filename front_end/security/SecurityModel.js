// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.SecurityModel = class extends WebInspector.SDKModel {
  /**
   * @param {!WebInspector.Target} target
   */
  constructor(target) {
    super(WebInspector.SecurityModel, target);
    this._dispatcher = new WebInspector.SecurityDispatcher(this);
    this._securityAgent = target.securityAgent();
    target.registerSecurityDispatcher(this._dispatcher);
    this._securityAgent.enable();
  }

  /**
   * @param {!WebInspector.Target} target
   * @return {?WebInspector.SecurityModel}
   */
  static fromTarget(target) {
    var model = /** @type {?WebInspector.SecurityModel} */ (target.model(WebInspector.SecurityModel));
    if (!model)
      model = new WebInspector.SecurityModel(target);
    return model;
  }

  /**
   * @param {!Protocol.Security.SecurityState} a
   * @param {!Protocol.Security.SecurityState} b
   * @return {number}
   */
  static SecurityStateComparator(a, b) {
    var securityStateMap;
    if (WebInspector.SecurityModel._symbolicToNumericSecurityState) {
      securityStateMap = WebInspector.SecurityModel._symbolicToNumericSecurityState;
    } else {
      securityStateMap = new Map();
      var ordering = [
        Protocol.Security.SecurityState.Info, Protocol.Security.SecurityState.Insecure, Protocol.Security.SecurityState.Neutral,
        Protocol.Security.SecurityState.Warning, Protocol.Security.SecurityState.Secure,
        // Unknown is max so that failed/cancelled requests don't overwrite the origin security state for successful requests,
        // and so that failed/cancelled requests appear at the bottom of the origins list.
        Protocol.Security.SecurityState.Unknown
      ];
      for (var i = 0; i < ordering.length; i++)
        securityStateMap.set(ordering[i], i + 1);
      WebInspector.SecurityModel._symbolicToNumericSecurityState = securityStateMap;
    }
    var aScore = securityStateMap.get(a) || 0;
    var bScore = securityStateMap.get(b) || 0;

    return aScore - bScore;
  }

  showCertificateViewer() {
    this._securityAgent.showCertificateViewer();
  }
};

/** @enum {symbol} */
WebInspector.SecurityModel.Events = {
  SecurityStateChanged: Symbol('SecurityStateChanged')
};


/**
 * @unrestricted
 */
WebInspector.PageSecurityState = class {
  /**
   * @param {!Protocol.Security.SecurityState} securityState
   * @param {!Array<!Protocol.Security.SecurityStateExplanation>} explanations
   * @param {?Protocol.Security.InsecureContentStatus} insecureContentStatus
   * @param {boolean} schemeIsCryptographic
   */
  constructor(securityState, explanations, insecureContentStatus, schemeIsCryptographic) {
    this.securityState = securityState;
    this.explanations = explanations;
    this.insecureContentStatus = insecureContentStatus;
    this.schemeIsCryptographic = schemeIsCryptographic;
  }
};

/**
 * @implements {Protocol.SecurityDispatcher}
 * @unrestricted
 */
WebInspector.SecurityDispatcher = class {
  constructor(model) {
    this._model = model;
  }

  /**
   * @override
   * @param {!Protocol.Security.SecurityState} securityState
   * @param {!Array<!Protocol.Security.SecurityStateExplanation>=} explanations
   * @param {!Protocol.Security.InsecureContentStatus=} insecureContentStatus
   * @param {boolean=} schemeIsCryptographic
   */
  securityStateChanged(securityState, explanations, insecureContentStatus, schemeIsCryptographic) {
    var pageSecurityState = new WebInspector.PageSecurityState(
        securityState, explanations || [], insecureContentStatus || null, schemeIsCryptographic || false);
    this._model.dispatchEventToListeners(WebInspector.SecurityModel.Events.SecurityStateChanged, pageSecurityState);
  }
};
