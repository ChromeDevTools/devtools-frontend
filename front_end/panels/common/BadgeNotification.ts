// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Badges from '../../models/badges/badges.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import badgeNotificationStyles from './badgeNotification.css.js';
import * as GdpSignUpDialog from './GdpSignUpDialog.js';

const {html, render} = Lit;

const UIStrings = {
  /**
   * @description Title for close button
   */
  dismiss: 'Dismiss',
  /**
   * @description Activity based badge award notification text
   * @example {Badge Title} PH1
   */
  activityBasedBadgeAwardMessage: 'You earned the {PH1} badge! It has been added to your Developer Profile.',
  /**
   * @description Action title for navigating to the badge settings in Google Developer Profile section
   */
  badgeSettings: 'Badge settings',
  /**
   * @description Action title for opening the Google Developer Program profile page of the user in a new tab
   */
  viewProfile: 'View profile',
  /**
   * @description Starter badge award notification text when the user has a Google Developer Program profile but did not enable receiving badges in DevTools yet
   * @example {Badge Title} PH1
   * @example {Google Developer Program link} PH2
   */
  starterBadgeAwardMessageSettingDisabled: 'You earned the {PH1} badge for the {PH2}! Turn on badges to claim it.',
  /**
   * @description Starter badge award notification text when the user does not have a Google Developer Program profile.
   * @example {Badge Title} PH1
   * @example {Google Developer Program link} PH2
   */
  starterBadgeAwardMessageNoGdpProfile:
      'You earned the {PH1} badge for the {PH2}! Create a profile to claim your badge.',
  /**
   * @description Action title for snoozing the starter badge.
   */
  remindMeLater: 'Remind me later',
  /**
   * @description Action title for enabling the "Receive badges" setting
   */
  receiveBadges: 'Receive badges',
  /**
   * @description Action title for creating a Google Developer Program profle
   */
  createProfile: 'Create profile',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/common/BadgeNotification.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nFormatString = i18n.i18n.getFormatLocalizedString.bind(undefined, str_);
const lockedString = i18n.i18n.lockedString;

export interface BadgeNotificationAction {
  label: string;
  jslogContext?: string;
  title?: string;
  onClick: () => void;
}

export interface BadgeNotificationProperties {
  message: HTMLElement|string;
  imageUri: string;
  actions: BadgeNotificationAction[];
}

export interface ViewInput extends BadgeNotificationProperties {
  onCloseClick: () => void;
}

// clang-format off
const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  const actionButtons = input.actions.map(property => {
    return html`<devtools-button
        class="notification-button"
        @click=${() => property.onClick()}
        jslog=${VisualLogging.action(property.jslogContext).track({click: true})}
        .variant=${Buttons.Button.Variant.TEXT}
        .title=${property.title ?? ''}
        .inverseColorTheme=${true}
    >${property.label}</devtools-button>`;
  });

  const crossButton = html`<devtools-button
        class="dismiss notification-button"
        @click=${input.onCloseClick}
        jslog=${VisualLogging.action('badge-notification.dismiss').track({click: true})}
        aria-label=${i18nString(UIStrings.dismiss)}
        .iconName=${'cross'}
        .variant=${Buttons.Button.Variant.ICON}
        .title=${i18nString(UIStrings.dismiss)}
        .inverseColorTheme=${true}
    ></devtools-button>`;

  render(html`
    <style>${badgeNotificationStyles}</style>
    <div class="container">
      <div class="badge-container">
        <img class="badge-image" src=${input.imageUri}>
      </div>
      <div class="action-and-text-container">
        <div class="label-container">
            <div class="message">${input.message}</div>
            ${crossButton}
        </div>
        <div class="long-action-container">${actionButtons}</div>
      </div>
    </div>
  `, target);
};
// clang-format on

type View = typeof DEFAULT_VIEW;

export class BadgeNotification extends UI.Widget.Widget {
  message: HTMLElement|string = '';
  imageUri = '';
  actions: BadgeNotificationAction[] = [];

  #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  async present(badge: Badges.Badge): Promise<void> {
    if (badge.isStarterBadge) {
      await this.#presentStarterBadge(badge);
    } else {
      this.#presentActivityBasedBadge(badge);
    }
  }

  #show(properties: BadgeNotificationProperties): void {
    this.message = properties.message;
    this.imageUri = properties.imageUri;
    this.actions = properties.actions;
    this.requestUpdate();
    this.show(UI.InspectorView.InspectorView.instance().element);
  }

  async #presentStarterBadge(badge: Badges.Badge): Promise<void> {
    const gdpProfile = await Host.GdpClient.GdpClient.instance().getProfile();
    const receiveBadgesSettingEnabled = Badges.UserBadges.instance().isReceiveBadgesSettingEnabled();
    const googleDeveloperProgramLink = UI.XLink.XLink.create(
        'https://developers.google.com/program', lockedString('Google Developer Program'), 'badge-link', undefined,
        'gdp.program-link');

    // If the user already has a GDP profile and the receive badges setting enabled,
    // starter badge behaves as if it's an activity based badge.
    if (gdpProfile && receiveBadgesSettingEnabled) {
      this.#presentActivityBasedBadge(badge);
      return;
    }

    // If the user already has a GDP profile and the receive badges setting disabled,
    // starter badge behaves as a nudge for opting into receiving badges.
    if (gdpProfile && !receiveBadgesSettingEnabled) {
      this.#show({
        message: i18nFormatString(
            UIStrings.starterBadgeAwardMessageSettingDisabled, {PH1: badge.title, PH2: googleDeveloperProgramLink}),
        actions: [
          {
            label: i18nString(UIStrings.remindMeLater),
            onClick: () => {/* To implement */},
          },
          {label: i18nString(UIStrings.receiveBadges), onClick: () => { /* To implement */ }}
        ],
        imageUri: badge.imageUri,
      });
      return;
    }

    // The user does not have a GDP profile, starter badge acts as a nudge for creating a GDP profile.
    this.#show({
      message: i18nFormatString(
          UIStrings.starterBadgeAwardMessageNoGdpProfile, {PH1: badge.title, PH2: googleDeveloperProgramLink}),
      actions: [
        {
          label: i18nString(UIStrings.remindMeLater),
          onClick: () => {/* TODO(ergunsh): Implement */},
        },
        {
          label: i18nString(UIStrings.createProfile),
          onClick: () => {
            this.#close();
            GdpSignUpDialog.GdpSignUpDialog.show();
          }
        }
      ],
      imageUri: badge.imageUri,
    });
  }

  #presentActivityBasedBadge(badge: Badges.Badge): void {
    this.#show({
      message: i18nString(UIStrings.activityBasedBadgeAwardMessage, {PH1: badge.title}),
      actions: [
        {
          label: i18nString(UIStrings.badgeSettings),
          onClick: () => {/* TODO(ergunsh): Implement */},
        },
        {
          label: i18nString(UIStrings.viewProfile),
          onClick: () => {
            UI.UIUtils.openInNewTab(Host.GdpClient.GOOGLE_DEVELOPER_PROGRAM_PROFILE_LINK);
          }
        }
      ],
      imageUri: badge.imageUri,
    });
  }

  #close = (): void => {
    this.detach();
  };

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    const viewInput: ViewInput = {
      message: this.message,
      imageUri: this.imageUri,
      actions: this.actions,
      onCloseClick: this.#close,
    };
    this.#view(viewInput, undefined, this.contentElement);
  }
}
