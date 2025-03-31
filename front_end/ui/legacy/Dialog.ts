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

/* eslint-disable rulesdir/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import * as ARIAUtils from './ARIAUtils.js';
import dialogStyles from './dialog.css.js';
import {GlassPane, PointerEventsBehavior} from './GlassPane.js';
import {InspectorView} from './InspectorView.js';
import {KeyboardShortcut, Keys} from './KeyboardShortcut.js';
import type {SplitWidget} from './SplitWidget.js';
import {WidgetFocusRestorer} from './Widget.js';

export class Dialog extends Common.ObjectWrapper.eventMixin<EventTypes, typeof GlassPane>(GlassPane) {
  private tabIndexBehavior = OutsideTabIndexBehavior.DISABLE_ALL_OUTSIDE_TAB_INDEX;
  private tabIndexMap = new Map<HTMLElement, number>();
  private focusRestorer: WidgetFocusRestorer|null = null;
  private closeOnEscape = true;
  private targetDocument: Document|null = null;
  private readonly targetDocumentKeyDownHandler: (event: Event) => void;
  private escapeKeyCallback: ((arg0: Event) => void)|null = null;

  constructor(jslogContext?: string) {
    super();
    this.registerRequiredCSS(dialogStyles);
    this.contentElement.tabIndex = 0;
    this.contentElement.addEventListener('focus', () => this.widget().focus(), false);
    if (jslogContext) {
      this.contentElement.setAttribute(
          'jslog', `${VisualLogging.dialog(jslogContext).track({resize: true, keydown: 'Escape'})}`);
    }
    this.widget().setDefaultFocusedElement(this.contentElement);
    this.setPointerEventsBehavior(PointerEventsBehavior.BLOCKED_BY_GLASS_PANE);
    this.setOutsideClickCallback(event => {
      this.hide();
      event.consume(true);
    });
    ARIAUtils.markAsModalDialog(this.contentElement);
    this.targetDocumentKeyDownHandler = this.onKeyDown.bind(this);
  }

  static hasInstance(): boolean {
    return Boolean(Dialog.instance);
  }

  static getInstance(): Dialog|null {
    return Dialog.instance;
  }

  override show(where?: Document|Element): void {
    const document = (where instanceof Document ? where : (where || InspectorView.instance().element).ownerDocument);
    this.targetDocument = document;
    this.targetDocument.addEventListener('keydown', this.targetDocumentKeyDownHandler, true);

    if (Dialog.instance) {
      Dialog.instance.hide();
    }
    Dialog.instance = this;
    this.disableTabIndexOnElements(document);
    super.show(document);
    this.focusRestorer = new WidgetFocusRestorer(this.widget());
  }

  override hide(): void {
    if (this.focusRestorer) {
      this.focusRestorer.restore();
    }
    super.hide();

    if (this.targetDocument) {
      this.targetDocument.removeEventListener('keydown', this.targetDocumentKeyDownHandler, true);
    }
    this.restoreTabIndexOnElements();
    this.dispatchEventToListeners(Events.HIDDEN);
    Dialog.instance = null;
  }

  setAriaLabel(label: string): void {
    ARIAUtils.setLabel(this.contentElement, label);
  }

  setCloseOnEscape(close: boolean): void {
    this.closeOnEscape = close;
  }

  setEscapeKeyCallback(callback: (arg0: Event) => void): void {
    this.escapeKeyCallback = callback;
  }

  addCloseButton(): void {
    const closeButton = this.contentElement.createChild('dt-close-button', 'dialog-close-button');
    closeButton.addEventListener('click', this.hide.bind(this), false);
  }

  setOutsideTabIndexBehavior(tabIndexBehavior: OutsideTabIndexBehavior): void {
    this.tabIndexBehavior = tabIndexBehavior;
  }

  private disableTabIndexOnElements(document: Document): void {
    if (this.tabIndexBehavior === OutsideTabIndexBehavior.PRESERVE_TAB_INDEX) {
      return;
    }

    let exclusionSet: Set<HTMLElement>|(Set<HTMLElement>| null) = (null as Set<HTMLElement>| null);
    if (this.tabIndexBehavior === OutsideTabIndexBehavior.PRESERVE_MAIN_VIEW_TAB_INDEX) {
      exclusionSet = this.getMainWidgetTabIndexElements(InspectorView.instance().ownerSplit());
    }

    this.tabIndexMap.clear();
    let node: (Node|null)|Document = document;
    for (; node; node = node.traverseNextNode(document)) {
      if (node instanceof HTMLElement) {
        const element = (node);
        const tabIndex = element.tabIndex;
        if (!exclusionSet?.has(element)) {
          if (tabIndex >= 0) {
            this.tabIndexMap.set(element, tabIndex);
            element.tabIndex = -1;
          } else if (element.hasAttribute('contenteditable')) {
            this.tabIndexMap.set(element, element.hasAttribute('tabindex') ? tabIndex : 0);
            element.tabIndex = -1;
          }
        }
      }
    }
  }

  private getMainWidgetTabIndexElements(splitWidget: SplitWidget|null): Set<HTMLElement> {
    const elementSet = new Set<HTMLElement>();
    if (!splitWidget) {
      return elementSet;
    }

    const mainWidget = splitWidget.mainWidget();
    if (!mainWidget?.element) {
      return elementSet;
    }

    let node: Node|null = mainWidget.element;
    for (; node; node = node.traverseNextNode(mainWidget.element)) {
      if (!(node instanceof HTMLElement)) {
        continue;
      }

      const element = (node);
      const tabIndex = element.tabIndex;
      if (tabIndex < 0) {
        continue;
      }

      elementSet.add(element);
    }

    return elementSet;
  }

  private restoreTabIndexOnElements(): void {
    for (const element of this.tabIndexMap.keys()) {
      element.tabIndex = (this.tabIndexMap.get(element) as number);
    }
    this.tabIndexMap.clear();
  }

  private onKeyDown(event: Event): void {
    const keyboardEvent = (event as KeyboardEvent);
    if (keyboardEvent.keyCode === Keys.Esc.code && KeyboardShortcut.hasNoModifiers(event)) {
      if (this.escapeKeyCallback) {
        this.escapeKeyCallback(event);
      }

      if (event.handled) {
        return;
      }

      if (this.closeOnEscape) {
        event.consume(true);
        this.hide();
      }
    }
  }

  private static instance: Dialog|null = null;
}

export const enum Events {
  HIDDEN = 'hidden',
}

export interface EventTypes {
  [Events.HIDDEN]: void;
}

export const enum OutsideTabIndexBehavior {
  DISABLE_ALL_OUTSIDE_TAB_INDEX = 'DisableAllTabIndex',
  PRESERVE_MAIN_VIEW_TAB_INDEX = 'PreserveMainViewTabIndex',
  PRESERVE_TAB_INDEX = 'PreserveTabIndex',
}
