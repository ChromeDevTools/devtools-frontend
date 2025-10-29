"use strict";
import { ObjectWrapper } from "./Object.js";
import { reveal } from "./Revealer.js";
let consoleInstance;
export class Console extends ObjectWrapper {
  #messages = [];
  static instance(opts) {
    if (!consoleInstance || opts?.forceNew) {
      consoleInstance = new Console();
    }
    return consoleInstance;
  }
  static removeInstance() {
    consoleInstance = void 0;
  }
  /**
   * Add a message to the Console panel.
   *
   * @param text the message text.
   * @param level the message level.
   * @param show whether to show the Console panel (if it's not already shown).
   * @param source the message source.
   */
  addMessage(text, level = "info" /* INFO */, show = false, source) {
    const message = new Message(text, level, Date.now(), show, source);
    this.#messages.push(message);
    this.dispatchEventToListeners("messageAdded" /* MESSAGE_ADDED */, message);
  }
  log(text) {
    this.addMessage(text, "info" /* INFO */);
  }
  warn(text, source) {
    this.addMessage(text, "warning" /* WARNING */, void 0, source);
  }
  /**
   * Adds an error message to the Console panel.
   *
   * @param text the message text.
   * @param show whether to show the Console panel (if it's not already shown).
   */
  error(text, show = true) {
    this.addMessage(text, "error" /* ERROR */, show);
  }
  messages() {
    return this.#messages;
  }
  show() {
    void this.showPromise();
  }
  showPromise() {
    return reveal(this);
  }
}
export var Events = /* @__PURE__ */ ((Events2) => {
  Events2["MESSAGE_ADDED"] = "messageAdded";
  return Events2;
})(Events || {});
export var MessageLevel = /* @__PURE__ */ ((MessageLevel2) => {
  MessageLevel2["INFO"] = "info";
  MessageLevel2["WARNING"] = "warning";
  MessageLevel2["ERROR"] = "error";
  return MessageLevel2;
})(MessageLevel || {});
export var FrontendMessageSource = /* @__PURE__ */ ((FrontendMessageSource2) => {
  FrontendMessageSource2["CSS"] = "css";
  FrontendMessageSource2["ConsoleAPI"] = "console-api";
  FrontendMessageSource2["ISSUE_PANEL"] = "issue-panel";
  FrontendMessageSource2["SELF_XSS"] = "self-xss";
  return FrontendMessageSource2;
})(FrontendMessageSource || {});
export class Message {
  text;
  level;
  timestamp;
  show;
  source;
  constructor(text, level, timestamp, show, source) {
    this.text = text;
    this.level = level;
    this.timestamp = typeof timestamp === "number" ? timestamp : Date.now();
    this.show = show;
    if (source) {
      this.source = source;
    }
  }
}
//# sourceMappingURL=Console.js.map
