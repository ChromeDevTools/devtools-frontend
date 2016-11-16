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
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
Components.Linkifier = class {
  /**
   * @param {number=} maxLengthForDisplayedURLs
   * @param {boolean=} useLinkDecorator
   */
  constructor(maxLengthForDisplayedURLs, useLinkDecorator) {
    this._maxLength = maxLengthForDisplayedURLs || Components.Linkifier.MaxLengthForDisplayedURLs;
    /** @type {!Map<!SDK.Target, !Array<!Element>>} */
    this._anchorsByTarget = new Map();
    /** @type {!Map<!SDK.Target, !Bindings.LiveLocationPool>} */
    this._locationPoolByTarget = new Map();
    this._useLinkDecorator = !!useLinkDecorator;
    Components.Linkifier._instances.add(this);
    SDK.targetManager.observeTargets(this);
  }

  /**
   * @param {!Components.LinkDecorator} decorator
   */
  static setLinkDecorator(decorator) {
    console.assert(!Components.Linkifier._decorator, 'Cannot re-register link decorator.');
    Components.Linkifier._decorator = decorator;
    decorator.addEventListener(Components.LinkDecorator.Events.LinkIconChanged, onLinkIconChanged);
    for (var linkifier of Components.Linkifier._instances)
      linkifier._updateAllAnchorDecorations();

    /**
     * @param {!Common.Event} event
     */
    function onLinkIconChanged(event) {
      var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
      var links = uiSourceCode[Components.Linkifier._sourceCodeAnchors] || [];
      for (var link of links)
        Components.Linkifier._updateLinkDecorations(link);
    }
  }

  _updateAllAnchorDecorations() {
    for (var anchors of this._anchorsByTarget.values()) {
      for (var anchor of anchors)
        Components.Linkifier._updateLinkDecorations(anchor);
    }
  }

  /**
   * @param {?Components.Linkifier.LinkHandler} handler
   */
  static setLinkHandler(handler) {
    Components.Linkifier._linkHandler = handler;
  }

  /**
   * @param {string} url
   * @param {number=} lineNumber
   * @return {boolean}
   */
  static handleLink(url, lineNumber) {
    if (!Components.Linkifier._linkHandler)
      return false;
    return Components.Linkifier._linkHandler.handleLink(url, lineNumber);
  }

  /**
   * @param {!Object} revealable
   * @param {string} text
   * @param {string=} fallbackHref
   * @param {number=} fallbackLineNumber
   * @param {string=} title
   * @param {string=} classes
   * @return {!Element}
   */
  static linkifyUsingRevealer(revealable, text, fallbackHref, fallbackLineNumber, title, classes) {
    var a = createElement('a');
    a.className = (classes || '') + ' webkit-html-resource-link';
    a.textContent = text.trimMiddle(Components.Linkifier.MaxLengthForDisplayedURLs);
    a.title = title || text;
    if (fallbackHref) {
      a.href = fallbackHref;
      a.lineNumber = fallbackLineNumber;
    }

    /**
     * @param {!Event} event
     * @this {Object}
     */
    function clickHandler(event) {
      event.stopImmediatePropagation();
      event.preventDefault();
      if (fallbackHref && Components.Linkifier.handleLink(fallbackHref, fallbackLineNumber))
        return;

      Common.Revealer.reveal(this);
    }
    a.addEventListener('click', clickHandler.bind(revealable), false);
    return a;
  }

  /**
   * @param {!Element} anchor
   * @return {?Workspace.UILocation} uiLocation
   */
  static uiLocationByAnchor(anchor) {
    return anchor[Components.Linkifier._uiLocationSymbol];
  }

  /**
   * @param {!Element} anchor
   * @param {!Workspace.UILocation} uiLocation
   */
  static _bindUILocation(anchor, uiLocation) {
    anchor[Components.Linkifier._uiLocationSymbol] = uiLocation;
    if (!uiLocation)
      return;
    var uiSourceCode = uiLocation.uiSourceCode;
    var sourceCodeAnchors = uiSourceCode[Components.Linkifier._sourceCodeAnchors];
    if (!sourceCodeAnchors) {
      sourceCodeAnchors = new Set();
      uiSourceCode[Components.Linkifier._sourceCodeAnchors] = sourceCodeAnchors;
    }
    sourceCodeAnchors.add(anchor);
  }

  /**
   * @param {!Element} anchor
   */
  static _unbindUILocation(anchor) {
    if (!anchor[Components.Linkifier._uiLocationSymbol])
      return;

    var uiSourceCode = anchor[Components.Linkifier._uiLocationSymbol].uiSourceCode;
    anchor[Components.Linkifier._uiLocationSymbol] = null;
    var sourceCodeAnchors = uiSourceCode[Components.Linkifier._sourceCodeAnchors];
    if (sourceCodeAnchors)
      sourceCodeAnchors.delete(anchor);
  }

  /**
   * @param {!SDK.Target} target
   * @param {string} scriptId
   * @param {number} lineNumber
   * @param {number=} columnNumber
   * @return {string}
   */
  static liveLocationText(target, scriptId, lineNumber, columnNumber) {
    var debuggerModel = SDK.DebuggerModel.fromTarget(target);
    if (!debuggerModel)
      return '';
    var script = debuggerModel.scriptForId(scriptId);
    if (!script)
      return '';
    var location = /** @type {!SDK.DebuggerModel.Location} */ (
        debuggerModel.createRawLocation(script, lineNumber, columnNumber || 0));
    var uiLocation =
        /** @type {!Workspace.UILocation} */ (Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(location));
    return uiLocation.linkText();
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    this._anchorsByTarget.set(target, []);
    this._locationPoolByTarget.set(target, new Bindings.LiveLocationPool());
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    var locationPool = /** @type {!Bindings.LiveLocationPool} */ (this._locationPoolByTarget.remove(target));
    locationPool.disposeAll();
    var anchors = this._anchorsByTarget.remove(target);
    for (var anchor of anchors) {
      delete anchor[Components.Linkifier._liveLocationSymbol];
      Components.Linkifier._unbindUILocation(anchor);
      var fallbackAnchor = anchor[Components.Linkifier._fallbackAnchorSymbol];
      if (fallbackAnchor) {
        anchor.href = fallbackAnchor.href;
        anchor.lineNumber = fallbackAnchor.lineNumber;
        anchor.title = fallbackAnchor.title;
        anchor.className = fallbackAnchor.className;
        anchor.textContent = fallbackAnchor.textContent;
        delete anchor[Components.Linkifier._fallbackAnchorSymbol];
      }
    }
  }

  /**
   * @param {?SDK.Target} target
   * @param {?string} scriptId
   * @param {string} sourceURL
   * @param {number} lineNumber
   * @param {number=} columnNumber
   * @param {string=} classes
   * @return {?Element}
   */
  maybeLinkifyScriptLocation(target, scriptId, sourceURL, lineNumber, columnNumber, classes) {
    var fallbackAnchor =
        sourceURL ? Components.linkifyResourceAsNode(sourceURL, lineNumber, columnNumber, classes) : null;
    if (!target || target.isDisposed())
      return fallbackAnchor;
    var debuggerModel = SDK.DebuggerModel.fromTarget(target);
    if (!debuggerModel)
      return fallbackAnchor;

    var rawLocation =
        (scriptId ? debuggerModel.createRawLocationByScriptId(scriptId, lineNumber, columnNumber || 0) : null) ||
        debuggerModel.createRawLocationByURL(sourceURL, lineNumber, columnNumber || 0);
    if (!rawLocation)
      return fallbackAnchor;

    var anchor = this._createAnchor(classes);
    var liveLocation = Bindings.debuggerWorkspaceBinding.createLiveLocation(
        rawLocation, this._updateAnchor.bind(this, anchor),
        /** @type {!Bindings.LiveLocationPool} */ (this._locationPoolByTarget.get(rawLocation.target())));
    var anchors = /** @type {!Array<!Element>} */ (this._anchorsByTarget.get(rawLocation.target()));
    anchors.push(anchor);
    anchor[Components.Linkifier._liveLocationSymbol] = liveLocation;
    anchor[Components.Linkifier._fallbackAnchorSymbol] = fallbackAnchor;
    return anchor;
  }

  /**
   * @param {?SDK.Target} target
   * @param {?string} scriptId
   * @param {string} sourceURL
   * @param {number} lineNumber
   * @param {number=} columnNumber
   * @param {string=} classes
   * @return {!Element}
   */
  linkifyScriptLocation(target, scriptId, sourceURL, lineNumber, columnNumber, classes) {
    return this.maybeLinkifyScriptLocation(target, scriptId, sourceURL, lineNumber, columnNumber, classes) ||
        Components.linkifyResourceAsNode(sourceURL, lineNumber, columnNumber, classes);
  }

  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @param {string} fallbackUrl
   * @param {string=} classes
   * @return {!Element}
   */
  linkifyRawLocation(rawLocation, fallbackUrl, classes) {
    return this.linkifyScriptLocation(
        rawLocation.target(), rawLocation.scriptId, fallbackUrl, rawLocation.lineNumber, rawLocation.columnNumber,
        classes);
  }

  /**
   * @param {?SDK.Target} target
   * @param {!Protocol.Runtime.CallFrame} callFrame
   * @param {string=} classes
   * @return {?Element}
   */
  maybeLinkifyConsoleCallFrame(target, callFrame, classes) {
    return this.maybeLinkifyScriptLocation(
        target, callFrame.scriptId, callFrame.url, callFrame.lineNumber, callFrame.columnNumber, classes);
  }

  /**
   * @param {!SDK.Target} target
   * @param {!Protocol.Runtime.StackTrace} stackTrace
   * @param {string=} classes
   * @return {!Element}
   */
  linkifyStackTraceTopFrame(target, stackTrace, classes) {
    console.assert(stackTrace.callFrames && stackTrace.callFrames.length);

    var topFrame = stackTrace.callFrames[0];
    var fallbackAnchor =
        Components.linkifyResourceAsNode(topFrame.url, topFrame.lineNumber, topFrame.columnNumber, classes);
    if (target.isDisposed())
      return fallbackAnchor;

    var debuggerModel = SDK.DebuggerModel.fromTarget(target);
    var rawLocations = debuggerModel.createRawLocationsByStackTrace(stackTrace);
    if (rawLocations.length === 0)
      return fallbackAnchor;

    var anchor = this._createAnchor(classes);
    var liveLocation = Bindings.debuggerWorkspaceBinding.createStackTraceTopFrameLiveLocation(
        rawLocations, this._updateAnchor.bind(this, anchor),
        /** @type {!Bindings.LiveLocationPool} */ (this._locationPoolByTarget.get(target)));
    var anchors = /** @type {!Array<!Element>} */ (this._anchorsByTarget.get(target));
    anchors.push(anchor);
    anchor[Components.Linkifier._liveLocationSymbol] = liveLocation;
    anchor[Components.Linkifier._fallbackAnchorSymbol] = fallbackAnchor;
    return anchor;
  }

  /**
   * @param {!SDK.CSSLocation} rawLocation
   * @param {string=} classes
   * @return {!Element}
   */
  linkifyCSSLocation(rawLocation, classes) {
    var anchor = this._createAnchor(classes);
    var liveLocation = Bindings.cssWorkspaceBinding.createLiveLocation(
        rawLocation, this._updateAnchor.bind(this, anchor),
        /** @type {!Bindings.LiveLocationPool} */ (this._locationPoolByTarget.get(rawLocation.target())));
    var anchors = /** @type {!Array<!Element>} */ (this._anchorsByTarget.get(rawLocation.target()));
    anchors.push(anchor);
    anchor[Components.Linkifier._liveLocationSymbol] = liveLocation;
    return anchor;
  }

  /**
   * @param {!SDK.Target} target
   * @param {!Element} anchor
   */
  disposeAnchor(target, anchor) {
    Components.Linkifier._unbindUILocation(anchor);
    delete anchor[Components.Linkifier._fallbackAnchorSymbol];
    var liveLocation = anchor[Components.Linkifier._liveLocationSymbol];
    if (liveLocation)
      liveLocation.dispose();
    delete anchor[Components.Linkifier._liveLocationSymbol];
  }

  /**
   * @param {string=} classes
   * @return {!Element}
   */
  _createAnchor(classes) {
    var anchor = createElement('a');
    if (this._useLinkDecorator)
      anchor[Components.Linkifier._enableDecoratorSymbol] = true;
    anchor.className = (classes || '') + ' webkit-html-resource-link';

    /**
     * @param {!Event} event
     */
    function clickHandler(event) {
      var uiLocation = anchor[Components.Linkifier._uiLocationSymbol];
      if (!uiLocation)
        return;

      event.consume(true);
      if (Components.Linkifier.handleLink(uiLocation.uiSourceCode.url(), uiLocation.lineNumber))
        return;
      Common.Revealer.reveal(uiLocation);
    }
    anchor.addEventListener('click', clickHandler, false);
    return anchor;
  }

  reset() {
    for (var target of this._anchorsByTarget.keysArray()) {
      this.targetRemoved(target);
      this.targetAdded(target);
    }
  }

  dispose() {
    for (var target of this._anchorsByTarget.keysArray())
      this.targetRemoved(target);
    SDK.targetManager.unobserveTargets(this);
    Components.Linkifier._instances.delete(this);
  }

  /**
   * @param {!Element} anchor
   * @param {!Bindings.LiveLocation} liveLocation
   */
  _updateAnchor(anchor, liveLocation) {
    Components.Linkifier._unbindUILocation(anchor);
    var uiLocation = liveLocation.uiLocation();
    if (!uiLocation)
      return;

    Components.Linkifier._bindUILocation(anchor, uiLocation);
    var text = uiLocation.linkText();
    text = text.replace(/([a-f0-9]{7})[a-f0-9]{13}[a-f0-9]*/g, '$1\u2026');
    if (this._maxLength)
      text = text.trimMiddle(this._maxLength);
    anchor.textContent = text;

    var titleText = uiLocation.uiSourceCode.url();
    if (typeof uiLocation.lineNumber === 'number')
      titleText += ':' + (uiLocation.lineNumber + 1);
    anchor.title = titleText;
    anchor.classList.toggle('webkit-html-blackbox-link', liveLocation.isBlackboxed());
    Components.Linkifier._updateLinkDecorations(anchor);
  }

  /**
   * @param {!Element} anchor
   */
  static _updateLinkDecorations(anchor) {
    if (!anchor[Components.Linkifier._enableDecoratorSymbol])
      return;
    var uiLocation = anchor[Components.Linkifier._uiLocationSymbol];
    if (!Components.Linkifier._decorator || !uiLocation)
      return;
    var icon = anchor[Components.Linkifier._iconSymbol];
    if (icon)
      icon.remove();
    icon = Components.Linkifier._decorator.linkIcon(uiLocation.uiSourceCode);
    if (icon) {
      icon.style.setProperty('margin-right', '2px');
      anchor.insertBefore(icon, anchor.firstChild);
    }
    anchor[Components.Linkifier._iconSymbol] = icon;
  }
};

/** @type {!Set<!Components.Linkifier>} */
Components.Linkifier._instances = new Set();
/** @type {?Components.LinkDecorator} */
Components.Linkifier._decorator = null;

Components.Linkifier._iconSymbol = Symbol('Linkifier.iconSymbol');
Components.Linkifier._enableDecoratorSymbol = Symbol('Linkifier.enableIconsSymbol');
Components.Linkifier._sourceCodeAnchors = Symbol('Linkifier.anchors');
Components.Linkifier._uiLocationSymbol = Symbol('uiLocation');
Components.Linkifier._fallbackAnchorSymbol = Symbol('fallbackAnchor');
Components.Linkifier._liveLocationSymbol = Symbol('liveLocation');

/**
 * The maximum number of characters to display in a URL.
 * @const
 * @type {number}
 */
Components.Linkifier.MaxLengthForDisplayedURLs = 150;

/**
 * The maximum length before strings are considered too long for finding URLs.
 * @const
 * @type {number}
 */
Components.Linkifier.MaxLengthToIgnoreLinkifier = 10000;

/**
 * @interface
 */
Components.Linkifier.LinkHandler = function() {};

Components.Linkifier.LinkHandler.prototype = {
  /**
   * @param {string} url
   * @param {number=} lineNumber
   * @return {boolean}
   */
  handleLink: function(url, lineNumber) {}
};

/**
 * @extends {Common.EventTarget}
 * @interface
 */
Components.LinkDecorator = function() {};

Components.LinkDecorator.prototype = {
  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {?UI.Icon}
   */
  linkIcon: function(uiSourceCode) {}
};

Components.LinkDecorator.Events = {
  LinkIconChanged: Symbol('LinkIconChanged')
};

/**
 * @param {string} string
 * @param {function(string,string,number=,number=):!Node} linkifier
 * @return {!DocumentFragment}
 */
Components.linkifyStringAsFragmentWithCustomLinkifier = function(string, linkifier) {
  var container = createDocumentFragment();
  var linkStringRegEx =
      /(?:[a-zA-Z][a-zA-Z0-9+.-]{2,}:\/\/|data:|www\.)[\w$\-_+*'=\|\/\\(){}[\]^%@&#~,:;.!?]{2,}[\w$\-_+*=\|\/\\({^%@&#~]/;
  var pathLineRegex = /(?:\/[\w\.-]*)+\:[\d]+/;

  while (string && string.length < Components.Linkifier.MaxLengthToIgnoreLinkifier) {
    var linkString = linkStringRegEx.exec(string) || pathLineRegex.exec(string);
    if (!linkString)
      break;

    linkString = linkString[0];
    var linkIndex = string.indexOf(linkString);
    var nonLink = string.substring(0, linkIndex);
    container.appendChild(createTextNode(nonLink));

    var title = linkString;
    var realURL = (linkString.startsWith('www.') ? 'http://' + linkString : linkString);
    var splitResult = Common.ParsedURL.splitLineAndColumn(realURL);
    var linkNode;
    if (splitResult)
      linkNode = linkifier(title, splitResult.url, splitResult.lineNumber, splitResult.columnNumber);
    else
      linkNode = linkifier(title, realURL);

    container.appendChild(linkNode);
    string = string.substring(linkIndex + linkString.length, string.length);
  }

  if (string)
    container.appendChild(createTextNode(string));

  return container;
};

/**
 * @param {string} string
 * @return {!DocumentFragment}
 */
Components.linkifyStringAsFragment = function(string) {
  /**
   * @param {string} title
   * @param {string} url
   * @param {number=} lineNumber
   * @param {number=} columnNumber
   * @return {!Node}
   */
  function linkifier(title, url, lineNumber, columnNumber) {
    var isExternal = !Bindings.resourceForURL(url) && !Workspace.workspace.uiSourceCodeForURL(url);
    var urlNode = UI.linkifyURLAsNode(url, title, undefined, isExternal);
    if (typeof lineNumber !== 'undefined') {
      urlNode.lineNumber = lineNumber;
      if (typeof columnNumber !== 'undefined')
        urlNode.columnNumber = columnNumber;
    }

    return urlNode;
  }

  return Components.linkifyStringAsFragmentWithCustomLinkifier(string, linkifier);
};

/**
 * @param {string} url
 * @param {number=} lineNumber
 * @param {number=} columnNumber
 * @param {string=} classes
 * @param {string=} tooltipText
 * @param {string=} urlDisplayName
 * @return {!Element}
 */
Components.linkifyResourceAsNode = function(url, lineNumber, columnNumber, classes, tooltipText, urlDisplayName) {
  if (!url) {
    var element = createElementWithClass('span', classes);
    element.textContent = urlDisplayName || Common.UIString('(unknown)');
    return element;
  }
  var linkText = urlDisplayName || Bindings.displayNameForURL(url);
  if (typeof lineNumber === 'number')
    linkText += ':' + (lineNumber + 1);
  var anchor = UI.linkifyURLAsNode(url, linkText, classes, false, tooltipText);
  anchor.lineNumber = lineNumber;
  anchor.columnNumber = columnNumber;
  return anchor;
};

/**
 * @param {!SDK.NetworkRequest} request
 * @return {!Element}
 */
Components.linkifyRequestAsNode = function(request) {
  var anchor = UI.linkifyURLAsNode(request.url);
  anchor.requestId = request.requestId;
  return anchor;
};
