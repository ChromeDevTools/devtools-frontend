// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2009 Apple Inc. All rights reserved.
 * Copyright (C) 2009 Google Inc. All rights reserved.
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

import * as Host from '../../core/host/host.js';

import {DefaultShortcutSetting} from './ShortcutRegistry.js';

export class KeyboardShortcut {
  descriptors: Descriptor[];
  action: string;
  type: Type;
  keybindSets: Set<string>;

  constructor(descriptors: Descriptor[], action: string, type: Type, keybindSets?: Set<string>) {
    this.descriptors = descriptors;
    this.action = action;
    this.type = type;
    this.keybindSets = keybindSets || new Set();
  }

  title(): string {
    return this.descriptors.map(descriptor => descriptor.name).join(' ');
  }

  isDefault(): boolean {
    return this.type === Type.DEFAULT_SHORTCUT || this.type === Type.DISABLED_DEFAULT ||
        (this.type === Type.KEYBIND_SET_SHORTCUT && this.keybindSets.has(DefaultShortcutSetting));
  }

  changeType(type: Type): KeyboardShortcut {
    return new KeyboardShortcut(this.descriptors, this.action, type);
  }

  changeKeys(descriptors: Descriptor[]): KeyboardShortcut {
    this.descriptors = descriptors;
    return this;
  }

  descriptorsMatch(descriptors: Descriptor[]): boolean {
    if (descriptors.length !== this.descriptors.length) {
      return false;
    }
    return descriptors.every((descriptor, index) => descriptor.key === this.descriptors[index].key);
  }

  hasKeybindSet(keybindSet: string): boolean {
    return !this.keybindSets || this.keybindSets.has(keybindSet);
  }

  equals(shortcut: KeyboardShortcut): boolean {
    return this.descriptorsMatch(shortcut.descriptors) && this.type === shortcut.type &&
        this.action === shortcut.action;
  }

  static createShortcutFromSettingObject(settingObject: {
    action: string,
    descriptors: Array<Descriptor>,
    type: Type,
  }): KeyboardShortcut {
    return new KeyboardShortcut(settingObject.descriptors, settingObject.action, settingObject.type);
  }

  /**
   * Creates a number encoding keyCode in the lower 8 bits and modifiers mask in the higher 8 bits.
   * It is useful for matching pressed keys.
   */
  static makeKey(keyCode: string|number, modifiers?: number): number {
    if (typeof keyCode === 'string') {
      keyCode = keyCode.charCodeAt(0) - (/^[a-z]/.test(keyCode) ? 32 : 0);
    }
    modifiers = modifiers || Modifiers.None;
    return KeyboardShortcut.makeKeyFromCodeAndModifiers(keyCode, modifiers);
  }

  static makeKeyFromEvent(keyboardEvent: KeyboardEvent): number {
    let modifiers = Modifiers.None;
    if (keyboardEvent.shiftKey) {
      modifiers |= Modifiers.Shift;
    }
    if (keyboardEvent.ctrlKey) {
      modifiers |= Modifiers.Ctrl;
    }
    if (keyboardEvent.altKey) {
      modifiers |= Modifiers.Alt;
    }
    if (keyboardEvent.metaKey) {
      modifiers |= Modifiers.Meta;
    }

    // Use either a real or a synthetic keyCode (for events originating from extensions).
    // @ts-ignore ExtensionServer.js installs '__keyCode' on some events.
    const keyCode = keyboardEvent.keyCode || keyboardEvent['__keyCode'];
    return KeyboardShortcut.makeKeyFromCodeAndModifiers(keyCode, modifiers);
  }

  static makeKeyFromEventIgnoringModifiers(keyboardEvent: KeyboardEvent): number {
    // @ts-ignore ExtensionServer.js installs '__keyCode' on some events.
    const keyCode = keyboardEvent.keyCode || keyboardEvent['__keyCode'];
    return KeyboardShortcut.makeKeyFromCodeAndModifiers(keyCode, Modifiers.None);
  }

  // This checks if a "control equivalent" key is pressed. For non-mac platforms this means checking
  // if control is pressed but not meta. On mac, we instead check if meta is pressed but not control.
  static eventHasCtrlEquivalentKey(event: KeyboardEvent|MouseEvent): boolean {
    return Host.Platform.isMac() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  }

  static eventHasEitherCtrlOrMeta(event: KeyboardEvent|MouseEvent): boolean {
    return event.metaKey || event.ctrlKey;
  }

  static hasNoModifiers(event: Event): boolean {
    const keyboardEvent = (event as KeyboardEvent);
    return !keyboardEvent.ctrlKey && !keyboardEvent.shiftKey && !keyboardEvent.altKey && !keyboardEvent.metaKey;
  }

  static hasAtLeastOneModifier(event: Event): boolean {
    return KeyboardShortcut.hasNoModifiers(event) === false;
  }

  static makeDescriptor(key: string|Key, modifiers?: number): Descriptor {
    return {
      key: KeyboardShortcut.makeKey(typeof key === 'string' ? key : key.code, modifiers),
      name: KeyboardShortcut.shortcutToString(key, modifiers),
    };
  }

  static makeDescriptorFromBindingShortcut(shortcut: string): Descriptor {
    const [keyString, ...modifierStrings] = shortcut.split(/\+(?!$)/).reverse();
    let modifiers = 0;
    for (const modifierString of modifierStrings) {
      const modifier = Modifiers[modifierString];
      console.assert(
          typeof modifier !== 'undefined', `Only one key other than modifier is allowed in shortcut <${shortcut}>`);
      modifiers |= modifier;
    }
    console.assert(keyString.length > 0, `Modifiers-only shortcuts are not allowed (encountered <${shortcut}>)`);

    const key = Keys[keyString] || KeyBindings[keyString];
    if (key && 'shiftKey' in key && key.shiftKey) {
      modifiers |= Modifiers.Shift;
    }
    return KeyboardShortcut.makeDescriptor(key ? key : keyString, modifiers);
  }

  static shortcutToString(key: string|Key, modifiers?: number): string {
    if (typeof key !== 'string' && KeyboardShortcut.isModifier(key.code)) {
      return KeyboardShortcut.modifiersToString(modifiers);
    }
    return KeyboardShortcut.modifiersToString(modifiers) + KeyboardShortcut.keyName(key);
  }

  private static keyName(key: string|Key): string {
    if (typeof key === 'string') {
      return key.toUpperCase();
    }
    if (typeof key.name === 'string') {
      return key.name;
    }
    return key.name[Host.Platform.platform()] || key.name.other || '';
  }

  private static makeKeyFromCodeAndModifiers(keyCode: number, modifiers: number|null): number {
    return (keyCode & 255) | ((modifiers || 0) << 8);
  }

  static keyCodeAndModifiersFromKey(key: number): {
    keyCode: number,
    modifiers: number,
  } {
    return {keyCode: key & 255, modifiers: key >> 8};
  }

  static isModifier(key: number): boolean {
    const {keyCode} = KeyboardShortcut.keyCodeAndModifiersFromKey(key);
    return keyCode === Keys.Shift.code || keyCode === Keys.Ctrl.code || keyCode === Keys.Alt.code ||
        keyCode === Keys.Meta.code;
  }

  private static modifiersToString(modifiers: number|undefined): string {
    const isMac = Host.Platform.isMac();
    const m = Modifiers;
    const modifierNames = new Map([
      [m.Ctrl, isMac ? 'Ctrl\u2004' : 'Ctrl\u200A+\u200A'],
      [m.Alt, isMac ? '\u2325\u2004' : 'Alt\u200A+\u200A'],
      [m.Shift, isMac ? '\u21e7\u2004' : 'Shift\u200A+\u200A'],
      [m.Meta, isMac ? '\u2318\u2004' : 'Win\u200A+\u200A'],
    ]);
    return [m.Meta, m.Ctrl, m.Alt, m.Shift].map(mapModifiers).join('');

    function mapModifiers(m: number): string {
      return (modifiers || 0) & m ? /** @type {string} */ modifierNames.get(m) as string : '';
    }
  }
}

/**
 * Constants for encoding modifier key set as a bit mask.
 * see #makeKeyFromCodeAndModifiers
 */
export const Modifiers: {
  [x: string]: number,
} = {
  None: 0,
  Shift: 1,
  Ctrl: 2,
  Alt: 4,
  Meta: 8,
  // "default" command/ctrl key for platform, Command on Mac, Ctrl on other platforms
  CtrlOrMeta: Host.Platform.isMac() ? 8 /* Meta */ : 2 /* Ctrl */,
  // Option on Mac, Shift on other platforms
  ShiftOrOption: Host.Platform.isMac() ? 4 /* Alt */ : 1 /* Shift */,
};

const leftKey = {
  code: 37,
  name: '←',
};
const upKey = {
  code: 38,
  name: '↑',
};
const rightKey = {
  code: 39,
  name: '→',
};
const downKey = {
  code: 40,
  name: '↓',
};
const ctrlKey = {
  code: 17,
  name: 'Ctrl',
};
const escKey = {
  code: 27,
  name: 'Esc',
};
const spaceKey = {
  code: 32,
  name: 'Space',
};
const plusKey = {
  code: 187,
  name: '+',
};
const backquoteKey = {
  code: 192,
  name: '`',
};
const quoteKey = {
  code: 222,
  name: '\'',
};
const metaKey = {
  code: 91,
  name: 'Meta',
};

export const Keys: {
  [x: string]: Key,
} = {
  Backspace: {code: 8, name: '\u21a4'},
  Tab: {code: 9, name: {mac: '\u21e5', other: 'Tab'}},
  Enter: {code: 13, name: {mac: '\u21a9', other: 'Enter'}},
  Shift: {code: 16, name: {mac: '\u21e7', other: 'Shift'}},
  Ctrl: ctrlKey,
  Control: ctrlKey,
  Alt: {code: 18, name: 'Alt'},
  Esc: escKey,
  Escape: escKey,
  Space: spaceKey,
  ' ': spaceKey,
  PageUp: {code: 33, name: {mac: '\u21de', other: 'PageUp'}},      // also NUM_NORTH_EAST
  PageDown: {code: 34, name: {mac: '\u21df', other: 'PageDown'}},  // also NUM_SOUTH_EAST
  End: {code: 35, name: {mac: '\u2197', other: 'End'}},            // also NUM_SOUTH_WEST
  Home: {code: 36, name: {mac: '\u2196', other: 'Home'}},          // also NUM_NORTH_WEST
  Left: leftKey,                                                   // also NUM_WEST
  Up: upKey,                                                       // also NUM_NORTH
  Right: rightKey,                                                 // also NUM_EAST
  Down: downKey,                                                   // also NUM_SOUTH
  ArrowLeft: leftKey,
  ArrowUp: upKey,
  ArrowRight: rightKey,
  ArrowDown: downKey,
  Delete: {code: 46, name: 'Del'},
  Zero: {code: 48, name: '0'},
  H: {code: 72, name: 'H'},
  N: {code: 78, name: 'N'},
  P: {code: 80, name: 'P'},
  Meta: metaKey,
  F1: {code: 112, name: 'F1'},
  F2: {code: 113, name: 'F2'},
  F3: {code: 114, name: 'F3'},
  F4: {code: 115, name: 'F4'},
  F5: {code: 116, name: 'F5'},
  F6: {code: 117, name: 'F6'},
  F7: {code: 118, name: 'F7'},
  F8: {code: 119, name: 'F8'},
  F9: {code: 120, name: 'F9'},
  F10: {code: 121, name: 'F10'},
  F11: {code: 122, name: 'F11'},
  F12: {code: 123, name: 'F12'},
  Semicolon: {code: 186, name: ';'},
  NumpadPlus: {code: 107, name: 'Numpad +'},
  NumpadMinus: {code: 109, name: 'Numpad -'},
  Numpad0: {code: 96, name: 'Numpad 0'},
  Plus: plusKey,
  Equal: plusKey,
  Comma: {code: 188, name: ','},
  Minus: {code: 189, name: '-'},
  Period: {code: 190, name: '.'},
  Slash: {code: 191, name: '/'},
  QuestionMark: {code: 191, name: '?'},
  Apostrophe: backquoteKey,
  Tilde: {code: 192, name: 'Tilde'},
  Backquote: backquoteKey,
  IntlBackslash: backquoteKey,
  LeftSquareBracket: {code: 219, name: '['},
  RightSquareBracket: {code: 221, name: ']'},
  Backslash: {code: 220, name: '\\'},
  SingleQuote: quoteKey,
  Quote: quoteKey,
  // "default" command/ctrl key for platform, Command on Mac, Ctrl on other platforms
  CtrlOrMeta: Host.Platform.isMac() ? metaKey : ctrlKey,
};

export const enum Type {
  USER_SHORTCUT = 'UserShortcut',
  DEFAULT_SHORTCUT = 'DefaultShortcut',
  DISABLED_DEFAULT = 'DisabledDefault',
  UNSET_SHORTCUT = 'UnsetShortcut',
  KEYBIND_SET_SHORTCUT = 'KeybindSetShortcut',
}

export const KeyBindings: {
  [x: string]: Key,
} = {};

(function(): void {
for (const key in Keys) {
  const descriptor = Keys[key];
  if (typeof descriptor === 'object' && descriptor['code']) {
    const name = typeof descriptor['name'] === 'string' ? descriptor['name'] : key;
    KeyBindings[name] = descriptor;
  }
}
})();
export interface Key {
  code: number;
  name: string|{
    [x: string]: string,
  };
  shiftKey?: boolean;
}
export interface Descriptor {
  key: number;
  name: string;
}
