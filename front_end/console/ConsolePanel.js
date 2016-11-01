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
 * @unrestricted
 */
WebInspector.ConsolePanel = class extends WebInspector.Panel {
  constructor() {
    super('console');
    this._view = WebInspector.ConsoleView.instance();
  }

  /**
   * @return {!WebInspector.ConsolePanel}
   */
  static instance() {
    return /** @type {!WebInspector.ConsolePanel} */ (self.runtime.sharedInstance(WebInspector.ConsolePanel));
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    var wrapper = WebInspector.ConsolePanel.WrapperView._instance;
    if (wrapper && wrapper.isShowing())
      WebInspector.inspectorView.setDrawerMinimized(true);
    this._view.show(this.element);
  }

  /**
   * @override
   */
  willHide() {
    super.willHide();
    if (WebInspector.ConsolePanel.WrapperView._instance)
      WebInspector.ConsolePanel.WrapperView._instance._showViewInWrapper();
    WebInspector.inspectorView.setDrawerMinimized(false);
  }

  /**
   * @override
   * @return {?WebInspector.SearchableView}
   */
  searchableView() {
    return WebInspector.ConsoleView.instance().searchableView();
  }
};

/**
 * @unrestricted
 */
WebInspector.ConsolePanel.WrapperView = class extends WebInspector.VBox {
  constructor() {
    super();
    this.element.classList.add('console-view-wrapper');

    WebInspector.ConsolePanel.WrapperView._instance = this;

    this._view = WebInspector.ConsoleView.instance();
  }

  /**
   * @override
   */
  wasShown() {
    if (!WebInspector.ConsolePanel.instance().isShowing())
      this._showViewInWrapper();
    else
      WebInspector.inspectorView.setDrawerMinimized(true);
  }

  /**
   * @override
   */
  willHide() {
    WebInspector.inspectorView.setDrawerMinimized(false);
  }

  _showViewInWrapper() {
    this._view.show(this.element);
  }
};

/**
 * @implements {WebInspector.Revealer}
 * @unrestricted
 */
WebInspector.ConsolePanel.ConsoleRevealer = class {
  /**
   * @override
   * @param {!Object} object
   * @return {!Promise}
   */
  reveal(object) {
    var consoleView = WebInspector.ConsoleView.instance();
    if (consoleView.isShowing()) {
      consoleView.focus();
      return Promise.resolve();
    }
    WebInspector.viewManager.showView('console-view');
    return Promise.resolve();
  }
};


