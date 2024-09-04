// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {
  type DataDisplayDelegate,
  Events as ProfileHeaderEvents,
  type ProfileHeader,
  type StatusUpdate,
} from './ProfileHeader.js';

const UIStrings = {
  /**
   *@description Tooltip for the 3-dots menu in the Memory panel profiles list.
   */
  profileOptions: 'Profile options',
};
const str_ = i18n.i18n.registerUIStrings('panels/profiler/ProfileSidebarTreeElement.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ProfileSidebarTreeElement extends UI.TreeOutline.TreeElement {
  readonly iconElement: HTMLDivElement;
  readonly titlesElement: HTMLDivElement;
  readonly menuElement: Buttons.Button.Button;
  titleContainer: HTMLElement;
  override titleElement: HTMLElement;
  subtitleElement: HTMLElement;
  readonly className: string;
  small: boolean;
  readonly dataDisplayDelegate: DataDisplayDelegate;
  profile: ProfileHeader;
  saveLinkElement?: HTMLElement;
  editing?: UI.InplaceEditor.Controller|null;
  constructor(dataDisplayDelegate: DataDisplayDelegate, profile: ProfileHeader, className: string) {
    super('', false);
    this.iconElement = document.createElement('div');
    this.iconElement.classList.add('icon');
    this.titlesElement = document.createElement('div');
    this.titlesElement.classList.add('titles');
    this.titlesElement.classList.add('no-subtitle');
    this.titlesElement.setAttribute('jslog', `${VisualLogging.value('title').track({dblclick: true, change: true})}`);
    this.titleContainer = this.titlesElement.createChild('span', 'title-container');
    this.titleElement = this.titleContainer.createChild('span', 'title');
    this.subtitleElement = this.titlesElement.createChild('span', 'subtitle');

    this.menuElement = new Buttons.Button.Button();
    this.menuElement.data = {
      variant: Buttons.Button.Variant.ICON,
      iconName: 'dots-vertical',
      title: i18nString(UIStrings.profileOptions),
    };
    this.menuElement.tabIndex = -1;
    this.menuElement.addEventListener('click', this.handleContextMenuEvent.bind(this));
    this.menuElement.setAttribute('jslog', `${VisualLogging.dropDown('profile-options').track({click: true})}`);
    UI.Tooltip.Tooltip.install(this.menuElement, i18nString(UIStrings.profileOptions));

    this.titleElement.textContent = profile.title;
    this.className = className;
    this.small = false;
    this.dataDisplayDelegate = dataDisplayDelegate;
    this.profile = profile;
    profile.addEventListener(ProfileHeaderEvents.UPDATE_STATUS, this.updateStatus, this);
  }

  updateStatus(event: Common.EventTarget.EventTargetEvent<StatusUpdate>): void {
    const statusUpdate = event.data;
    if (statusUpdate.subtitle !== null) {
      this.subtitleElement.textContent = statusUpdate.subtitle.length > 0 ? `(${statusUpdate.subtitle})` : '';
      this.titlesElement.classList.toggle('no-subtitle', !statusUpdate.subtitle);
      UI.ARIAUtils.setLabel(this.listItemElement, `${this.profile.title}, ${statusUpdate.subtitle}`);
    }
    if (typeof statusUpdate.wait === 'boolean' && this.listItemElement) {
      this.iconElement.classList.toggle('spinner', statusUpdate.wait);
      this.listItemElement.classList.toggle('wait', statusUpdate.wait);
    }
  }

  override ondblclick(event: Event): boolean {
    if (!this.editing) {
      this.startEditing((event.target as Element));
    }
    return false;
  }

  startEditing(eventTarget: Element): void {
    const container = eventTarget.enclosingNodeOrSelfWithClass('title');
    if (!container) {
      return;
    }
    const config = new UI.InplaceEditor.Config(this.editingCommitted.bind(this), this.editingCancelled.bind(this));
    this.editing = UI.InplaceEditor.InplaceEditor.startEditing(container, config);
  }

  editingCommitted(container: Element, newTitle: string): void {
    delete this.editing;
    this.profile.setTitle(newTitle);
  }

  editingCancelled(): void {
    delete this.editing;
  }

  dispose(): void {
    this.profile.removeEventListener(ProfileHeaderEvents.UPDATE_STATUS, this.updateStatus, this);
  }

  override onselect(): boolean {
    this.dataDisplayDelegate.showProfile(this.profile);
    return true;
  }

  override ondelete(): boolean {
    this.profile.profileType().removeProfile(this.profile);
    return true;
  }

  override onattach(): void {
    if (this.className) {
      this.listItemElement.classList.add(this.className);
    }
    if (this.small) {
      this.listItemElement.classList.add('small');
    }
    this.listItemElement.append(this.iconElement, this.titlesElement, this.menuElement);
    this.listItemElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), true);

    UI.ARIAUtils.setDescription(this.listItemElement, this.profile.profileType().name);
  }

  handleContextMenuEvent(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendItemsAtLocation('profilerMenu');
    void contextMenu.show();
  }

  setSmall(small: boolean): void {
    this.small = small;
    if (this.listItemElement) {
      this.listItemElement.classList.toggle('small', this.small);
    }
  }

  setMainTitle(title: string): void {
    this.titleElement.textContent = title;
  }
}
