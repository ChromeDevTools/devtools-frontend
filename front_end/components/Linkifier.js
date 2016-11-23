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
   * @param {!Element} anchor
   * @param {!Workspace.UILocation} uiLocation
   */
  static _bindUILocation(anchor, uiLocation) {
    Components.Linkifier._linkInfo(anchor).uiLocation = uiLocation;
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
    var info = Components.Linkifier._linkInfo(anchor);
    if (!info.uiLocation)
      return;

    var uiSourceCode = info.uiLocation.uiSourceCode;
    info.uiLocation = null;
    var sourceCodeAnchors = uiSourceCode[Components.Linkifier._sourceCodeAnchors];
    if (sourceCodeAnchors)
      sourceCodeAnchors.delete(anchor);
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
      var info = Components.Linkifier._linkInfo(anchor);
      info.liveLocation = null;
      Components.Linkifier._unbindUILocation(anchor);
      if (info.fallback) {
        anchor.href = info.fallback.href;
        anchor.title = info.fallback.title;
        anchor.className = info.fallback.className;
        anchor.textContent = info.fallback.textContent;
        anchor[Components.Linkifier._infoSymbol] = info.fallback[Components.Linkifier._infoSymbol];
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
        sourceURL ? Components.Linkifier.linkifyURL(sourceURL, undefined, classes, lineNumber, columnNumber) : null;
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

    var anchor = Components.Linkifier._createLink('', classes || '');
    var info = Components.Linkifier._linkInfo(anchor);
    info.enableDecorator = this._useLinkDecorator;
    info.fallback = fallbackAnchor;
    info.liveLocation = Bindings.debuggerWorkspaceBinding.createLiveLocation(
        rawLocation, this._updateAnchor.bind(this, anchor),
        /** @type {!Bindings.LiveLocationPool} */ (this._locationPoolByTarget.get(rawLocation.target())));

    var anchors = /** @type {!Array<!Element>} */ (this._anchorsByTarget.get(rawLocation.target()));
    anchors.push(anchor);
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
        Components.Linkifier.linkifyURL(sourceURL, undefined, classes, lineNumber, columnNumber);
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
        Components.Linkifier.linkifyURL(topFrame.url, undefined, classes, topFrame.lineNumber, topFrame.columnNumber);
    if (target.isDisposed())
      return fallbackAnchor;

    var debuggerModel = SDK.DebuggerModel.fromTarget(target);
    var rawLocations = debuggerModel.createRawLocationsByStackTrace(stackTrace);
    if (rawLocations.length === 0)
      return fallbackAnchor;

    var anchor = Components.Linkifier._createLink('', classes || '');
    var info = Components.Linkifier._linkInfo(anchor);
    info.enableDecorator = this._useLinkDecorator;
    info.fallback = fallbackAnchor;
    info.liveLocation = Bindings.debuggerWorkspaceBinding.createStackTraceTopFrameLiveLocation(
        rawLocations, this._updateAnchor.bind(this, anchor),
        /** @type {!Bindings.LiveLocationPool} */ (this._locationPoolByTarget.get(target)));

    var anchors = /** @type {!Array<!Element>} */ (this._anchorsByTarget.get(target));
    anchors.push(anchor);
    return anchor;
  }

  /**
   * @param {!SDK.CSSLocation} rawLocation
   * @param {string=} classes
   * @return {!Element}
   */
  linkifyCSSLocation(rawLocation, classes) {
    var anchor = Components.Linkifier._createLink('', classes || '');
    var info = Components.Linkifier._linkInfo(anchor);
    info.enableDecorator = this._useLinkDecorator;
    info.liveLocation = Bindings.cssWorkspaceBinding.createLiveLocation(
        rawLocation, this._updateAnchor.bind(this, anchor),
        /** @type {!Bindings.LiveLocationPool} */ (this._locationPoolByTarget.get(rawLocation.target())));

    var anchors = /** @type {!Array<!Element>} */ (this._anchorsByTarget.get(rawLocation.target()));
    anchors.push(anchor);
    return anchor;
  }

  /**
   * @param {!SDK.Target} target
   * @param {!Element} anchor
   */
  disposeAnchor(target, anchor) {
    Components.Linkifier._unbindUILocation(anchor);
    var info = Components.Linkifier._linkInfo(anchor);
    info.fallback = null;
    if (info.liveLocation) {
      info.liveLocation.dispose();
      info.liveLocation = null;
    }
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
    var info = Components.Linkifier._linkInfo(anchor);
    if (!info || !info.enableDecorator)
      return;
    if (!Components.Linkifier._decorator || !info.uiLocation)
      return;
    if (info.icon)
      anchor.removeChild(info.icon);
    var icon = Components.Linkifier._decorator.linkIcon(info.uiLocation.uiSourceCode);
    if (icon) {
      icon.style.setProperty('margin-right', '2px');
      anchor.insertBefore(icon, anchor.firstChild);
    }
    info.icon = icon;
  }

  /**
   * @param {string} url
   * @param {string=} text
   * @param {string=} className
   * @param {number=} lineNumber
   * @param {number=} columnNumber
   * @return {!Element}
   */
  static linkifyURL(url, text, className, lineNumber, columnNumber) {
    if (!url || url.trim().toLowerCase().startsWith('javascript:')) {
      var element = createElementWithClass('span', className);
      element.textContent = text || url || Common.UIString('(unknown)');
      return element;
    }

    var linkText = text || Bindings.displayNameForURL(url);
    if (typeof lineNumber === 'number' && !text)
      linkText += ':' + (lineNumber + 1);
    var title = linkText !== url ? url : '';
    var link = Components.Linkifier._createLink(linkText.trimMiddle(150), className || '', title, url);
    var info = Components.Linkifier._linkInfo(link);
    if (typeof lineNumber === 'number')
      info.lineNumber = lineNumber;
    if (typeof columnNumber === 'number')
      info.columnNumber = columnNumber;
    return link;
  }

  /**
   * @param {!Object} revealable
   * @param {string} text
   * @param {string=} fallbackHref
   * @return {!Element}
   */
  static linkifyRevealable(revealable, text, fallbackHref) {
    var link = Components.Linkifier._createLink(
        text.trimMiddle(Components.Linkifier.MaxLengthForDisplayedURLs), '', undefined, fallbackHref);
    Components.Linkifier._linkInfo(link).revealable = revealable;
    return link;
  }

  /**
   * @param {string} text
   * @param {string} className
   * @param {string=} title
   * @param {string=} href
   * @returns{!Element}
   */
  static _createLink(text, className, title, href) {
    var link = createElementWithClass('a', className);
    link.classList.add('webkit-html-resource-link');
    if (title)
      link.title = title;
    if (href)
      link.href = href;
    link.textContent = text;
    link[Components.Linkifier._infoSymbol] = {
      icon: null,
      enableDecorator: false,
      uiLocation: null,
      liveLocation: null,
      url: href || null,
      lineNumber: null,
      columnNumber: null,
      revealable: null,
      fallback: null
    };
    link.addEventListener('click', Components.Linkifier._handleClick, false);
    return link;
  }

  /**
   * @param {?Element} link
   * @return {?Components._LinkInfo}
   */
  static _linkInfo(link) {
    return /** @type {?Components._LinkInfo} */ (link ? link[Components.Linkifier._infoSymbol] || null : null);
  }

  /**
   * @param {!Event} event
   */
  static _handleClick(event) {
    var link = /** @type {!Element} */ (event.currentTarget);
    event.consume(true);
    if (link.preventFollow || UI.isBeingEdited(/** @type {!Node} */ (event.target)))
      return;
    var actions = Components.Linkifier._linkActions(link);
    if (actions.length)
      actions[0].handler.call(null);
  }

  /**
   * @return {!Common.Setting}
   */
  static _linkHandlerSetting() {
    if (!Components.Linkifier._linkHandlerSettingInstance) {
      Components.Linkifier._linkHandlerSettingInstance =
          Common.settings.createSetting('openLinkHandler', Common.UIString('auto'));
    }
    return Components.Linkifier._linkHandlerSettingInstance;
  }

  /**
   * @param {string} title
   * @param {!Components.Linkifier.LinkHandler} handler
   */
  static registerLinkHandler(title, handler) {
    Components.Linkifier._linkHandlers.set(title, handler);
    self.runtime.sharedInstance(Components.Linkifier.LinkHandlerSettingUI)._update();
  }

  /**
   * @param {string} title
   */
  static unregisterLinkHandler(title) {
    Components.Linkifier._linkHandlers.delete(title);
    self.runtime.sharedInstance(Components.Linkifier.LinkHandlerSettingUI)._update();
  }

  /**
   * @param {?Element} link
   * @return {!Array<{title: string, handler: function()}>}
   */
  static _linkActions(link) {
    var info = Components.Linkifier._linkInfo(link);
    var result = [];
    if (!info)
      return result;

    var url = '';
    var uiLocation = null;
    if (info.uiLocation) {
      uiLocation = info.uiLocation;
      url = uiLocation.uiSourceCode.contentURL();
    } else if (info.url) {
      url = info.url;
      var uiSourceCode = Workspace.workspace.uiSourceCodeForURL(url);
      uiLocation = uiSourceCode ? uiSourceCode.uiLocation(info.lineNumber || 0, info.columnNumber || 0) : null;
    }
    var resource = url ? Bindings.resourceForURL(url) : null;
    var request = url ? SDK.NetworkLog.requestForURL(url) : null;
    var contentProvider = uiLocation ? uiLocation.uiSourceCode : resource;

    if (info.revealable)
      result.push({title: Common.UIString('Reveal'), handler: () => Common.Revealer.reveal(info.revealable)});
    if (uiLocation) {
      result.push({
        title: Common.UIString.capitalize('Open in Sources ^panel'),
        handler: () => Common.Revealer.reveal(uiLocation)
      });
    }
    if (resource) {
      result.push({
        title: Common.UIString.capitalize('Open in Application ^panel'),
        handler: () => Common.Revealer.reveal(resource)
      });
    }
    if (request) {
      result.push({
        title: Common.UIString.capitalize('Open in Network ^panel'),
        handler: () => Common.Revealer.reveal(request)
      });
    }
    if (contentProvider) {
      var lineNumber = uiLocation ? uiLocation.lineNumber : info.lineNumber || 0;
      for (var title of Components.Linkifier._linkHandlers.keys()) {
        var handler = Components.Linkifier._linkHandlers.get(title);
        var action = {
          title: Common.UIString.capitalize('Open using %s', title),
          handler: handler.bind(null, contentProvider, lineNumber)
        };
        if (title === Components.Linkifier._linkHandlerSetting().get())
          result.unshift(action);
        else
          result.push(action);
      }
    }
    if (resource || info.url) {
      result.push({title: UI.openLinkExternallyLabel(), handler: () => InspectorFrontendHost.openInNewTab(url)});
      result.push({title: UI.copyLinkAddressLabel(), handler: () => InspectorFrontendHost.copyText(url)});
    }
    return result;
  }
};

/** @type {!Set<!Components.Linkifier>} */
Components.Linkifier._instances = new Set();
/** @type {?Components.LinkDecorator} */
Components.Linkifier._decorator = null;

Components.Linkifier._sourceCodeAnchors = Symbol('Linkifier.anchors');
Components.Linkifier._infoSymbol = Symbol('Linkifier.info');

/**
 * @typedef {{
 *     icon: ?UI.Icon,
 *     enableDecorator: boolean,
 *     uiLocation: ?Workspace.UILocation,
 *     liveLocation: ?Bindings.LiveLocation,
 *     url: ?string,
 *     lineNumber: ?number,
 *     columnNumber: ?number,
 *     revealable: ?Object,
 *     fallback: ?Element
 * }}
 */
Components._LinkInfo;

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
 * @typedef {function(!Common.ContentProvider, number)}
 */
Components.Linkifier.LinkHandler;

/** @type {!Map<string, !Components.Linkifier.LinkHandler>} */
Components.Linkifier._linkHandlers = new Map();

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
  linkIcon(uiSourceCode) {}
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
    return Components.Linkifier.linkifyURL(url, title, undefined, lineNumber, columnNumber);
  }

  return Components.linkifyStringAsFragmentWithCustomLinkifier(string, linkifier);
};

/**
 * @implements {UI.ContextMenu.Provider}
 * @unrestricted
 */
Components.Linkifier.LinkContextMenuProvider = class {
  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} target
   */
  appendApplicableItems(event, contextMenu, target) {
    var targetNode = /** @type {!Node} */ (target);
    while (targetNode && !targetNode[Components.Linkifier._infoSymbol])
      targetNode = targetNode.parentNodeOrShadowHost();
    var link = /** @type {?Element} */ (targetNode);
    var actions = Components.Linkifier._linkActions(link);
    for (var action of actions)
      contextMenu.appendItem(action.title, action.handler);
  }
};

/**
 * @implements {UI.SettingUI}
 * @unrestricted
 */
Components.Linkifier.LinkHandlerSettingUI = class {
  constructor() {
    this._element = createElementWithClass('select', 'chrome-select');
    this._element.addEventListener('change', this._onChange.bind(this), false);
    this._update();
  }

  _update() {
    this._element.removeChildren();
    var names = Components.Linkifier._linkHandlers.keysArray();
    names.unshift(Common.UIString('auto'));
    for (var name of names) {
      var option = createElement('option');
      option.textContent = name;
      option.selected = name === Components.Linkifier._linkHandlerSetting().get();
      this._element.appendChild(option);
    }
    this._element.disabled = names.length <= 1;
  }

  /**
   * @param {!Event} event
   */
  _onChange(event) {
    var value = event.target.value;
    Components.Linkifier._linkHandlerSetting().set(value);
  }

  /**
   * @override
   * @return {?Element}
   */
  settingElement() {
    return UI.SettingsUI.createCustomSetting(Common.UIString('Link handling:'), this._element);
  }
};

/**
 * @implements {UI.ContextMenu.Provider}
 * @unrestricted
 */
Components.Linkifier.ContentProviderContextMenuProvider = class {
  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu} contextMenu
   * @param {!Object} target
   */
  appendApplicableItems(event, contextMenu, target) {
    var contentProvider = /** @type {!Common.ContentProvider} */ (target);
    if (!contentProvider.contentURL())
      return;

    contextMenu.appendItem(
        UI.openLinkExternallyLabel(), () => InspectorFrontendHost.openInNewTab(contentProvider.contentURL()));
    for (var title of Components.Linkifier._linkHandlers.keys()) {
      var handler = Components.Linkifier._linkHandlers.get(title);
      contextMenu.appendItem(
          Common.UIString.capitalize('Open using %s', title), handler.bind(null, contentProvider, 0));
    }
    if (contentProvider instanceof SDK.NetworkRequest)
      return;

    contextMenu.appendItem(
        UI.copyLinkAddressLabel(), () => InspectorFrontendHost.copyText(contentProvider.contentURL()));
    if (!contentProvider.contentType().isDocumentOrScriptOrStyleSheet())
      return;

    /**
     * @param {boolean} forceSaveAs
     * @param {?string} content
     */
    function doSave(forceSaveAs, content) {
      var url = contentProvider.contentURL();
      Workspace.fileManager.save(url, /** @type {string} */ (content), forceSaveAs);
      Workspace.fileManager.close(url);
    }

    /**
     * @param {boolean} forceSaveAs
     */
    function save(forceSaveAs) {
      if (contentProvider instanceof Workspace.UISourceCode) {
        var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (contentProvider);
        if (forceSaveAs)
          uiSourceCode.saveAs();
        else
          uiSourceCode.commitWorkingCopy();
        return;
      }
      contentProvider.requestContent().then(doSave.bind(null, forceSaveAs));
    }

    contextMenu.appendSeparator();
    contextMenu.appendItem(Common.UIString('Save'), save.bind(null, false));

    if (contentProvider instanceof Workspace.UISourceCode) {
      var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (contentProvider);
      if (uiSourceCode.project().type() !== Workspace.projectTypes.FileSystem &&
          uiSourceCode.project().type() !== Workspace.projectTypes.Snippets)
        contextMenu.appendItem(Common.UIString.capitalize('Save ^as...'), save.bind(null, true));
    }
  }
};
