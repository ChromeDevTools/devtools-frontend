// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import {ObjectWrapper} from './Object.js';
import {reveal} from './Revealer.js';

let consoleInstance: Console;

export class Console extends ObjectWrapper {
  _messages: Message[];
  /**
   * Instantiable via the instance() factory below.
   */
  private constructor() {
    super();
    this._messages = [];
  }

  static instance({forceNew}: {
    forceNew: boolean,
  } = {forceNew: false}): Console {
    if (!consoleInstance || forceNew) {
      consoleInstance = new Console();
    }

    return consoleInstance;
  }

  addMessage(text: string, level: MessageLevel, show?: boolean): void {
    const message = new Message(text, level || MessageLevel.Info, Date.now(), show || false);
    this._messages.push(message);
    this.dispatchEventToListeners(Events.MessageAdded, message);
  }

  log(text: string): void {
    this.addMessage(text, MessageLevel.Info);
  }

  warn(text: string): void {
    this.addMessage(text, MessageLevel.Warning);
  }

  error(text: string): void {
    this.addMessage(text, MessageLevel.Error, true);
  }

  messages(): Message[] {
    return this._messages;
  }

  show(): void {
    this.showPromise();
  }

  showPromise(): Promise<void> {
    return reveal(this);
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  MessageAdded = 'messageAdded',
}


// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum MessageLevel {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
}


export class Message {
  text: string;
  level: MessageLevel;
  timestamp: number;
  show: boolean;
  constructor(text: string, level: MessageLevel, timestamp: number, show: boolean) {
    this.text = text;
    this.level = level;
    this.timestamp = (typeof timestamp === 'number') ? timestamp : Date.now();
    this.show = show;
  }
}
