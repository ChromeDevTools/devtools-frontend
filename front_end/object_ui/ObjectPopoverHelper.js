/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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
ObjectUI.ObjectPopoverHelper = class extends UI.PopoverHelper {
  /**
   * @param {!Element} panelElement
   * @param {function(!Element, !Event):(!Element|!AnchorBox|undefined)} getAnchor
   * @param {function(!Element, function(!SDK.RemoteObject, boolean, !Element=):undefined, string):undefined} queryObject
   * @param {function()=} onHide
   * @param {boolean=} disableOnClick
   */
  constructor(panelElement, getAnchor, queryObject, onHide, disableOnClick) {
    super(panelElement, disableOnClick);
    this.initializeCallbacks(getAnchor, this._showObjectPopover.bind(this), this._onHideObjectPopover.bind(this));
    this._queryObject = queryObject;
    this._onHideCallback = onHide;
    this._popoverObjectGroup = 'popover';
    panelElement.addEventListener('scroll', this.hidePopover.bind(this), true);
  }

  /**
   * @param {!Element} element
   * @param {!UI.Popover} popover
   */
  _showObjectPopover(element, popover) {
    /**
     * @param {!SDK.RemoteObject} funcObject
     * @param {!Element} popoverContentElement
     * @param {!Element} popoverValueElement
     * @param {!Element} anchorElement
     * @param {?Array.<!SDK.RemoteObjectProperty>} properties
     * @param {?Array.<!SDK.RemoteObjectProperty>} internalProperties
     * @this {ObjectUI.ObjectPopoverHelper}
     */
    function didGetFunctionProperties(
        funcObject, popoverContentElement, popoverValueElement, anchorElement, properties, internalProperties) {
      if (internalProperties) {
        for (var i = 0; i < internalProperties.length; i++) {
          if (internalProperties[i].name === '[[TargetFunction]]') {
            funcObject = internalProperties[i].value;
            break;
          }
        }
      }
      ObjectUI.ObjectPropertiesSection.formatObjectAsFunction(funcObject, popoverValueElement, true);
      funcObject.debuggerModel()
          .functionDetailsPromise(funcObject)
          .then(didGetFunctionDetails.bind(this, popoverContentElement, anchorElement));
    }

    /**
     * @param {!Element} popoverContentElement
     * @param {!Element} anchorElement
     * @param {?SDK.DebuggerModel.FunctionDetails} response
     * @this {ObjectUI.ObjectPopoverHelper}
     */
    function didGetFunctionDetails(popoverContentElement, anchorElement, response) {
      if (!response || this._disposed)
        return;

      var container = createElementWithClass('div', 'object-popover-container');
      var title = container.createChild('div', 'function-popover-title source-code');
      var functionName = title.createChild('span', 'function-name');
      functionName.textContent = UI.beautifyFunctionName(response.functionName);

      var rawLocation = response.location;
      var linkContainer = title.createChild('div', 'function-title-link-container');
      var sourceURL = rawLocation && rawLocation.script() ? rawLocation.script().sourceURL : null;
      if (rawLocation && sourceURL)
        linkContainer.appendChild(this._lazyLinkifier().linkifyRawLocation(rawLocation, sourceURL));
      container.appendChild(popoverContentElement);
      popover.showForAnchor(container, anchorElement);
    }

    /**
     * @param {!SDK.RemoteObject} result
     * @param {boolean} wasThrown
     * @param {!Element=} anchorOverride
     * @this {ObjectUI.ObjectPopoverHelper}
     */
    function didQueryObject(result, wasThrown, anchorOverride) {
      if (this._disposed)
        return;
      if (wasThrown) {
        this.hidePopover();
        return;
      }
      this._objectTarget = result.target();
      var anchorElement = anchorOverride || element;
      var description = result.description.trimEnd(ObjectUI.ObjectPopoverHelper.MaxPopoverTextLength);
      var popoverContentElement = null;
      if (result.type !== 'object') {
        popoverContentElement = createElement('span');
        UI.appendStyle(popoverContentElement, 'object_ui/objectValue.css');
        UI.appendStyle(popoverContentElement, 'object_ui/objectPopover.css');
        var valueElement = popoverContentElement.createChild('span', 'monospace object-value-' + result.type);
        valueElement.style.whiteSpace = 'pre';

        if (result.type === 'string')
          valueElement.createTextChildren('"', description, '"');
        else if (result.type !== 'function')
          valueElement.textContent = description;

        if (result.type === 'function') {
          result.getOwnProperties(
              false /* generatePreview */,
              didGetFunctionProperties.bind(this, result, popoverContentElement, valueElement, anchorElement));
          return;
        }
        popover.showForAnchor(popoverContentElement, anchorElement);
      } else {
        if (result.subtype === 'node') {
          SDK.DOMModel.highlightObjectAsDOMNode(result);
          this._resultHighlightedAsDOM = true;
        }

        if (result.customPreview()) {
          var customPreviewComponent = new ObjectUI.CustomPreviewComponent(result);
          customPreviewComponent.expandIfPossible();
          popoverContentElement = customPreviewComponent.element;
        } else {
          popoverContentElement = createElement('div');
          UI.appendStyle(popoverContentElement, 'object_ui/objectPopover.css');
          this._titleElement = popoverContentElement.createChild('div', 'monospace object-popover-title');
          this._titleElement.createChild('span').textContent = description;
          var section = new ObjectUI.ObjectPropertiesSection(result, '', this._lazyLinkifier());
          section.element.classList.add('object-popover-tree');
          section.titleLessMode();
          popoverContentElement.appendChild(section.element);
        }
        var popoverWidth = 300;
        var popoverHeight = 250;
        popover.showForAnchor(popoverContentElement, anchorElement, popoverWidth, popoverHeight);
      }
    }
    this._disposed = false;
    this._queryObject(element, didQueryObject.bind(this), this._popoverObjectGroup);
  }

  _onHideObjectPopover() {
    this._disposed = true;
    if (this._resultHighlightedAsDOM) {
      SDK.DOMModel.hideDOMNodeHighlight();
      delete this._resultHighlightedAsDOM;
    }
    if (this._linkifier) {
      this._linkifier.dispose();
      delete this._linkifier;
    }
    if (this._onHideCallback)
      this._onHideCallback();
    if (this._objectTarget) {
      this._objectTarget.runtimeAgent().releaseObjectGroup(this._popoverObjectGroup);
      delete this._objectTarget;
    }
  }

  /**
   * @return {!Components.Linkifier}
   */
  _lazyLinkifier() {
    if (!this._linkifier)
      this._linkifier = new Components.Linkifier();
    return this._linkifier;
  }
};

ObjectUI.ObjectPopoverHelper.MaxPopoverTextLength = 10000;
