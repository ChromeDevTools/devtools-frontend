/*
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

/**
 * @constructor
 * @extends {WebInspector.Panel}
 */
WebInspector.ConsolePanel = function() {
  WebInspector.Panel.call(this, 'console');
  this._view = WebInspector.ConsoleView.instance();
};

WebInspector.ConsolePanel.prototype = {
  /**
   * @override
   */
  wasShown: function() {
    WebInspector.Panel.prototype.wasShown.call(this);
    var wrapper = WebInspector.ConsolePanel.WrapperView._instance;
    if (wrapper && wrapper.isShowing())
      WebInspector.inspectorView.setDrawerMinimized(true);
    this._view.show(this.element);
  },

  /**
   * @override
   */
  willHide: function() {
    WebInspector.Panel.prototype.willHide.call(this);
    if (WebInspector.ConsolePanel.WrapperView._instance)
      WebInspector.ConsolePanel.WrapperView._instance._showViewInWrapper();
    WebInspector.inspectorView.setDrawerMinimized(false);
  },

  /**
     * @override
     * @return {?WebInspector.SearchableView}
     */
  searchableView: function() { return WebInspector.ConsoleView.instance().searchableView(); },

  __proto__: WebInspector.Panel.prototype
};

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.ConsolePanel.WrapperView = function() {
  WebInspector.VBox.call(this);
  this.element.classList.add('console-view-wrapper');

  WebInspector.ConsolePanel.WrapperView._instance = this;

  this._view = WebInspector.ConsoleView.instance();
};

WebInspector.ConsolePanel.WrapperView.prototype = {
  wasShown: function() {
    if (!WebInspector.inspectorView.currentPanel() ||
        WebInspector.inspectorView.currentPanel().name !== 'console')
      this._showViewInWrapper();
    else
      WebInspector.inspectorView.setDrawerMinimized(true);
  },

  willHide: function() { WebInspector.inspectorView.setDrawerMinimized(false); },

  _showViewInWrapper: function() { this._view.show(this.element); },

  __proto__: WebInspector.VBox.prototype
};

/**
 * @constructor
 * @implements {WebInspector.Revealer}
 */
WebInspector.ConsolePanel.ConsoleRevealer = function() {};

WebInspector.ConsolePanel.ConsoleRevealer.prototype = {
  /**
     * @override
     * @param {!Object} object
     * @return {!Promise}
     */
  reveal: function(object) {
    var consoleView = WebInspector.ConsoleView.instance();
    if (consoleView.isShowing()) {
      consoleView.focus();
      return Promise.resolve();
    }
    WebInspector.viewManager.showView('console');
    return Promise.resolve();
  }
};

WebInspector.ConsolePanel.show = function() {
  WebInspector.inspectorView.setCurrentPanel(WebInspector.ConsolePanel._instance());
};

/**
 * @return {!WebInspector.ConsolePanel}
 */
WebInspector.ConsolePanel._instance = function() {
  return /** @type {!WebInspector.ConsolePanel} */ (
      self.runtime.sharedInstance(WebInspector.ConsolePanel));
};
