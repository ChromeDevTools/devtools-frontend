/*
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2008 Matt Lilek <webkit@mattlilek.com>
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
Components.DOMPresentationUtils = {};

/**
 * @param {!SDK.Target} target
 * @param {string} originalImageURL
 * @param {boolean} showDimensions
 * @param {!Object=} precomputedFeatures
 * @return {!Promise<?Element>}
 */
Components.DOMPresentationUtils.buildImagePreviewContents = function(
    target, originalImageURL, showDimensions, precomputedFeatures) {
  var resourceTreeModel = target.model(SDK.ResourceTreeModel);
  if (!resourceTreeModel)
    return Promise.resolve(/** @type {?Element} */ (null));
  var resource = resourceTreeModel.resourceForURL(originalImageURL);
  var imageURL = originalImageURL;
  if (!isImageResource(resource) && precomputedFeatures && precomputedFeatures.currentSrc) {
    imageURL = precomputedFeatures.currentSrc;
    resource = resourceTreeModel.resourceForURL(imageURL);
  }
  if (!isImageResource(resource))
    return Promise.resolve(/** @type {?Element} */ (null));

  var fulfill;
  var promise = new Promise(x => fulfill = x);
  var imageElement = createElement('img');
  imageElement.addEventListener('load', buildContent, false);
  imageElement.addEventListener('error', () => fulfill(null), false);
  resource.populateImageSource(imageElement);
  return promise;

  /**
   * @param {?SDK.Resource} resource
   * @return {boolean}
   */
  function isImageResource(resource) {
    return !!resource && resource.resourceType() === Common.resourceTypes.Image;
  }

  function buildContent() {
    var container = createElement('table');
    UI.appendStyle(container, 'components/imagePreview.css');
    container.className = 'image-preview-container';
    var naturalWidth = precomputedFeatures ? precomputedFeatures.naturalWidth : imageElement.naturalWidth;
    var naturalHeight = precomputedFeatures ? precomputedFeatures.naturalHeight : imageElement.naturalHeight;
    var offsetWidth = precomputedFeatures ? precomputedFeatures.offsetWidth : naturalWidth;
    var offsetHeight = precomputedFeatures ? precomputedFeatures.offsetHeight : naturalHeight;
    var description;
    if (showDimensions) {
      if (offsetHeight === naturalHeight && offsetWidth === naturalWidth) {
        description = Common.UIString('%d \xd7 %d pixels', offsetWidth, offsetHeight);
      } else {
        description = Common.UIString(
            '%d \xd7 %d pixels (Natural: %d \xd7 %d pixels)', offsetWidth, offsetHeight, naturalWidth, naturalHeight);
      }
    }

    container.createChild('tr').createChild('td', 'image-container').appendChild(imageElement);
    if (description)
      container.createChild('tr').createChild('td').createChild('span', 'description').textContent = description;
    if (imageURL !== originalImageURL) {
      container.createChild('tr').createChild('td').createChild('span', 'description').textContent =
          String.sprintf('currentSrc: %s', imageURL.trimMiddle(100));
    }
    fulfill(container);
  }
};

/**
 * @param {?SDK.Target} target
 * @param {!Components.Linkifier} linkifier
 * @param {!Protocol.Runtime.StackTrace=} stackTrace
 * @param {function()=} contentUpdated
 * @return {!Element}
 */
Components.DOMPresentationUtils.buildStackTracePreviewContents = function(
    target, linkifier, stackTrace, contentUpdated) {
  var element = createElement('span');
  element.style.display = 'inline-block';
  var shadowRoot = UI.createShadowRootWithCoreStyles(element, 'components/domUtils.css');
  var contentElement = shadowRoot.createChild('table', 'stack-preview-container');
  var debuggerModel = target ? target.model(SDK.DebuggerModel) : null;
  var totalHiddenCallFramesCount = 0;

  /**
   * @param {!Protocol.Runtime.StackTrace} stackTrace
   * @return {boolean}
   */
  function appendStackTrace(stackTrace) {
    var hiddenCallFrames = 0;
    for (var stackFrame of stackTrace.callFrames) {
      var row = createElement('tr');
      row.createChild('td').textContent = '\n';
      row.createChild('td', 'function-name').textContent = UI.beautifyFunctionName(stackFrame.functionName);
      var link = linkifier.maybeLinkifyConsoleCallFrame(target, stackFrame);
      if (link) {
        link.addEventListener('contextmenu', populateContextMenu.bind(null, link));
        if (debuggerModel) {
          var location = debuggerModel.createRawLocationByScriptId(
              stackFrame.scriptId, stackFrame.lineNumber, stackFrame.columnNumber);
          if (location && Bindings.blackboxManager.isBlackboxedRawLocation(location)) {
            row.classList.add('blackboxed');
            ++hiddenCallFrames;
          }
        }

        row.createChild('td').textContent = ' @ ';
        row.createChild('td').appendChild(link);
      }
      contentElement.appendChild(row);
    }
    totalHiddenCallFramesCount += hiddenCallFrames;
    return stackTrace.callFrames.length === hiddenCallFrames;
  }

  /**
   * @param {!Element} link
   * @param {!Event} event
   */
  function populateContextMenu(link, event) {
    var contextMenu = new UI.ContextMenu(event);
    event.consume(true);
    var uiLocation = Components.Linkifier.uiLocation(link);
    if (uiLocation && Bindings.blackboxManager.canBlackboxUISourceCode(uiLocation.uiSourceCode)) {
      if (Bindings.blackboxManager.isBlackboxedUISourceCode(uiLocation.uiSourceCode)) {
        contextMenu.debugSection().appendItem(
            ls`Stop blackboxing`, () => Bindings.blackboxManager.unblackboxUISourceCode(uiLocation.uiSourceCode));
      } else {
        contextMenu.debugSection().appendItem(
            ls`Blackbox script`, () => Bindings.blackboxManager.blackboxUISourceCode(uiLocation.uiSourceCode));
      }
    }
    contextMenu.appendApplicableItems(event);
    contextMenu.show();
  }

  if (!stackTrace)
    return element;

  appendStackTrace(stackTrace);

  var asyncStackTrace = stackTrace.parent;
  while (asyncStackTrace) {
    if (!asyncStackTrace.callFrames.length) {
      asyncStackTrace = asyncStackTrace.parent;
      continue;
    }
    var row = contentElement.createChild('tr');
    row.createChild('td').textContent = '\n';
    row.createChild('td', 'stack-preview-async-description').textContent =
        UI.asyncStackTraceLabel(asyncStackTrace.description);
    row.createChild('td');
    row.createChild('td');
    if (appendStackTrace(asyncStackTrace))
      row.classList.add('blackboxed');
    asyncStackTrace = asyncStackTrace.parent;
  }

  if (totalHiddenCallFramesCount) {
    var row = contentElement.createChild('tr', 'show-blackboxed-link');
    row.createChild('td').textContent = '\n';
    var cell = row.createChild('td');
    cell.colSpan = 4;
    var showAllLink = cell.createChild('span', 'link');
    if (totalHiddenCallFramesCount === 1)
      showAllLink.textContent = ls`Show 1 more blackboxed frame`;
    else
      showAllLink.textContent = ls`Show ${totalHiddenCallFramesCount} more blackboxed frames`;
    showAllLink.addEventListener('click', () => {
      contentElement.classList.add('show-blackboxed');
      if (contentUpdated)
        contentUpdated();
    }, false);
  }

  return element;
};
