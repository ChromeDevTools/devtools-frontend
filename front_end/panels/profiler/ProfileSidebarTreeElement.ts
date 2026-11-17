// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {
  type DataDisplayDelegate,
  Events as ProfileHeaderEvents,
  type ProfileHeader,
  type StatusUpdate,
} from './ProfileHeader.js';

const UIStrings = {
  /**
   * @description Tooltip for the 3-dots menu in the Memory panel profiles list.
   */
  profileOptions: 'Profile options',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/profiler/ProfileSidebarTreeElement.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {classMap, live} = Directives;

export interface ViewInput {
  title: string;
  subtitle: string|null;
  wait: boolean;
  editing: boolean;
  populateContextMenu: (contextMenu: UI.ContextMenu.ContextMenu) => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const title = input.editing ? (target.querySelector('.title')?.textContent ?? input.title) : input.title;
  // clang-format off
  render(html`
    <div class="icon ${classMap({spinner: input.wait})}"></div>
    <div class="titles ${classMap({'no-subtitle': !input.subtitle})}"
         jslog=${VisualLogging.value('title').track({dblclick: true, change: true})}>
      <span class="title-container"><span class="title" .textContent=${live(title)}></span></span>
      <span class="subtitle">${input.subtitle ? `(${input.subtitle})` : nothing}</span>
    </div>
    <devtools-menu-button
        .iconName=${'dots-vertical'}
        title=${i18nString(UIStrings.profileOptions)}
        tabindex="-1"
        jslog=${VisualLogging.dropDown('profile-options').track({click: true})}
        .populateMenuCall=${input.populateContextMenu}></devtools-menu-button>`, target);
  // clang-format on
};

export class ProfileSidebarTreeElement extends UI.TreeOutline.TreeElement {
  readonly #view: View;
  readonly #dataDisplayDelegate: DataDisplayDelegate;
  profile: ProfileHeader;
  #editing: UI.InplaceEditor.Controller|null = null;
  #title: string;
  #subtitle: string|null = null;
  #wait = false;
  #small = false;
  constructor(dataDisplayDelegate: DataDisplayDelegate, profile: ProfileHeader, className: string,
              view: View = DEFAULT_VIEW) {
    super('', false, 'profile-item');
    this.#view = view;
    this.#title = profile.title;
    this.#dataDisplayDelegate = dataDisplayDelegate;
    this.profile = profile;
    this.listItemElement.classList.add(className);
    this.listItemElement.addEventListener('contextmenu', this.#handleContextMenuEvent.bind(this), true);
    UI.ARIAUtils.setDescription(this.listItemElement, profile.profileType().name);
    profile.addEventListener(ProfileHeaderEvents.UPDATE_STATUS, this.#updateStatus, this);
    this.performUpdate();
  }

  performUpdate(): void {
    if (this.#subtitle !== null) {
      UI.ARIAUtils.setLabel(this.listItemElement, `${this.profile.title}, ${this.#subtitle}`);
    }
    this.listItemElement.classList.toggle('wait', this.#wait);
    this.listItemElement.classList.toggle('small', this.#small);
    const input: ViewInput = {
      title: this.#title,
      subtitle: this.#subtitle,
      wait: this.#wait,
      editing: Boolean(this.#editing),
      populateContextMenu: this.#populateContextMenu.bind(this),
    };
    this.#view(input, undefined, this.listItemElement);
  }

  #updateStatus(event: Common.EventTarget.EventTargetEvent<StatusUpdate>): void {
    const statusUpdate = event.data;
    if (statusUpdate.subtitle !== null) {
      this.#subtitle = statusUpdate.subtitle;
    }
    if (typeof statusUpdate.wait === 'boolean') {
      this.#wait = statusUpdate.wait;
    }
    this.performUpdate();
  }

  override ondblclick(event: Event): boolean {
    if (!this.#editing) {
      this.#startEditing((event.target as Element));
    }
    return false;
  }

  #startEditing(eventTarget: Element): void {
    const container = eventTarget.enclosingNodeOrSelfWithClass('title');
    if (!container) {
      return;
    }
    const config =
        new UI.InplaceEditor.Config(this.#editingCommitted.bind(this), this.#editingCancelled.bind(this), undefined);
    this.#editing = UI.InplaceEditor.InplaceEditor.startEditing(container, config);
  }

  #editingCommitted(_container: Element, newTitle: string): void {
    if (newTitle.trim().length === 0) {
      if (this.#editing) {
        this.#editing.cancel();
      }
    } else {
      this.#editing = null;
      this.#title = newTitle;
      this.profile.setTitle(newTitle);
      this.performUpdate();
    }
  }

  #editingCancelled(): void {
    this.#editing = null;
    this.performUpdate();
  }

  dispose(): void {
    this.profile.removeEventListener(ProfileHeaderEvents.UPDATE_STATUS, this.#updateStatus, this);
  }

  override onselect(): boolean {
    this.#dataDisplayDelegate.showProfile(this.profile);
    return true;
  }

  override ondelete(): boolean {
    this.profile.profileType().removeProfile(this.profile);
    return true;
  }

  #handleContextMenuEvent(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    this.#populateContextMenu(contextMenu);
    void contextMenu.show();
  }

  #populateContextMenu(contextMenu: UI.ContextMenu.ContextMenu): void {
    contextMenu.appendItemsAtLocation('profilerMenu');
  }

  setSmall(small: boolean): void {
    this.#small = small;
    this.performUpdate();
  }

  setMainTitle(title: string): void {
    this.#title = title;
    this.performUpdate();
  }
}
