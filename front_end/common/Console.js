// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.Console = class extends WebInspector.Object {
  constructor() {
    super();
    /** @type {!Array.<!WebInspector.Console.Message>} */
    this._messages = [];
  }

  /**
   * @param {string} text
   * @param {!WebInspector.Console.MessageLevel} level
   * @param {boolean=} show
   */
  addMessage(text, level, show) {
    var message = new WebInspector.Console.Message(
        text, level || WebInspector.Console.MessageLevel.Log, Date.now(), show || false);
    this._messages.push(message);
    this.dispatchEventToListeners(WebInspector.Console.Events.MessageAdded, message);
  }

  /**
   * @param {string} text
   */
  log(text) {
    this.addMessage(text, WebInspector.Console.MessageLevel.Log);
  }

  /**
   * @param {string} text
   */
  warn(text) {
    this.addMessage(text, WebInspector.Console.MessageLevel.Warning);
  }

  /**
   * @param {string} text
   */
  error(text) {
    this.addMessage(text, WebInspector.Console.MessageLevel.Error, true);
  }

  /**
   * @return {!Array.<!WebInspector.Console.Message>}
   */
  messages() {
    return this._messages;
  }

  show() {
    this.showPromise();
  }

  /**
   * @return {!Promise.<undefined>}
   */
  showPromise() {
    return WebInspector.Revealer.revealPromise(this);
  }
};

/** @enum {symbol} */
WebInspector.Console.Events = {
  MessageAdded: Symbol('messageAdded')
};

/**
 * @enum {string}
 */
WebInspector.Console.MessageLevel = {
  Log: 'log',
  Warning: 'warning',
  Error: 'error'
};

/**
 * @unrestricted
 */
WebInspector.Console.Message = class {
  /**
   * @param {string} text
   * @param {!WebInspector.Console.MessageLevel} level
   * @param {number} timestamp
   * @param {boolean} show
   */
  constructor(text, level, timestamp, show) {
    this.text = text;
    this.level = level;
    this.timestamp = (typeof timestamp === 'number') ? timestamp : Date.now();
    this.show = show;
  }
};

WebInspector.console = new WebInspector.Console();
