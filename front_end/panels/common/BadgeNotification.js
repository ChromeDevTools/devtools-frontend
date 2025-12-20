// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Badges from '../../models/badges/badges.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UIHelpers from '../../ui/helpers/helpers.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import badgeNotificationStyles from './badgeNotification.css.js';
import * as GdpSignUpDialog from './GdpSignUpDialog.js';
const { html, render } = Lit;
const UIStrings = {
    /**
     * @description Title for close button
     */
    close: 'Close',
    /**
     * @description Activity based badge award notification text
     * @example {Badge Title} PH1
     */
    activityBasedBadgeAwardMessage: 'You earned the {PH1} badge! It’s been added to your Developer Profile.',
    /**
     * @description Action title for navigating to the badge settings in Google Developer Profile section
     */
    manageSettings: 'Manage settings',
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
    starterBadgeAwardMessageNoGdpProfile: 'You earned the {PH1} badge for the {PH2}! Create a profile to claim your badge.',
    /**
     * @description Action title for dismissing the badge notification.
     */
    noThanks: 'No thanks',
    /**
     * @description Action title for enabling the "Receive badges" setting
     */
    receiveBadges: 'Turn on badges',
    /**
     * @description Action title for creating a Google Developer Program profle
     */
    createProfile: 'Create profile',
};
const str_ = i18n.i18n.registerUIStrings('panels/common/BadgeNotification.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nFormatString = uiI18n.getFormatLocalizedString.bind(undefined, str_);
const lockedString = i18n.i18n.lockedString;
const LEFT_OFFSET = 5;
const BOTTOM_OFFSET = 5;
const AUTO_CLOSE_TIME_IN_MS = 30000;
// clang-format off
const DEFAULT_VIEW = (input, _output, target) => {
    const actionButtons = input.actions.map(property => {
        return html `<devtools-button
        class="notification-button"
        @click=${() => property.onClick()}
        jslog=${VisualLogging.action(property.jslogContext).track({ click: true })}
        .variant=${"text" /* Buttons.Button.Variant.TEXT */}
        .title=${property.title ?? ''}
        .inverseColorTheme=${true}
    >${property.label}</devtools-button>`;
    });
    const crossButton = html `<devtools-button
        class="dismiss notification-button"
        @click=${input.onDismissClick}
        jslog=${VisualLogging.action('badge-notification.dismiss').track({ click: true })}
        aria-label=${i18nString(UIStrings.close)}
        .iconName=${'cross'}
        .variant=${"icon" /* Buttons.Button.Variant.ICON */}
        .title=${i18nString(UIStrings.close)}
        .inverseColorTheme=${true}
    ></devtools-button>`;
    render(html `
    <style>${badgeNotificationStyles}</style>
    <div class="container" jslog=${VisualLogging.dialog('badge-notification')}>
      <div class="badge-container" jslog=${VisualLogging.item(input.jslogContext)}>
        <img class="badge-image" role="presentation" src=${input.imageUri}>
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
function revealBadgeSettings() {
    void Common.Revealer.reveal(Common.Settings.moduleSetting('receive-gdp-badges'));
}
export class BadgeNotification extends UI.Widget.Widget {
    jslogContext = '';
    message = '';
    imageUri = '';
    actions = [];
    isStarterBadge = false;
    #autoCloseTimeout;
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
        // eslint-disable-next-line
        this.contentElement.role = 'alert';
        this.markAsRoot();
    }
    async present(badge, reason) {
        switch (reason) {
            case "Award" /* Badges.BadgeTriggerReason.AWARD */:
                this.#presentActivityBasedBadge(badge);
                return;
            case "StarterBadgeSettingsNudge" /* Badges.BadgeTriggerReason.STARTER_BADGE_SETTINGS_NUDGE */:
                this.#presentStarterBadgeSettingsNudge(badge);
                return;
            case "StarterBadgeProfileNudge" /* Badges.BadgeTriggerReason.STARTER_BADGE_PROFILE_NUDGE */:
                this.#presentStarterBadgeProfileNudge(badge);
                return;
        }
    }
    #positionNotification() {
        const boundingRect = this.contentElement.getBoundingClientRect();
        const container = UI.UIUtils.getDevToolsBoundingElement();
        this.contentElement.positionAt(LEFT_OFFSET, container.clientHeight - boundingRect.height - BOTTOM_OFFSET, container);
    }
    #show(properties) {
        this.message = properties.message;
        this.imageUri = properties.imageUri;
        this.actions = properties.actions;
        this.isStarterBadge = properties.isStarterBadge;
        this.jslogContext = properties.jslogContext;
        this.requestUpdate();
        this.show(document.body);
        void this.updateComplete.then(() => {
            this.#positionNotification();
        });
        if (this.#autoCloseTimeout) {
            window.clearTimeout(this.#autoCloseTimeout);
        }
        this.#autoCloseTimeout = window.setTimeout(this.#onAutoClose, AUTO_CLOSE_TIME_IN_MS);
    }
    #presentStarterBadgeSettingsNudge(badge) {
        const googleDeveloperProgramLink = UI.XLink.XLink.create('https://developers.google.com/program', lockedString('Google Developer Program'), 'badge-link', undefined, 'program-link');
        this.#show({
            message: i18nFormatString(UIStrings.starterBadgeAwardMessageSettingDisabled, { PH1: badge.title, PH2: googleDeveloperProgramLink }),
            jslogContext: badge.jslogContext,
            actions: [
                {
                    label: i18nString(UIStrings.noThanks),
                    jslogContext: 'no-thanks',
                    onClick: () => {
                        this.#onDismissClick();
                    },
                },
                {
                    label: i18nString(UIStrings.receiveBadges),
                    jslogContext: 'receive-badges',
                    onClick: () => {
                        this.detach();
                        revealBadgeSettings();
                    }
                }
            ],
            imageUri: badge.imageUri,
            isStarterBadge: true,
        });
    }
    #presentStarterBadgeProfileNudge(badge) {
        const googleDeveloperProgramLink = UI.XLink.XLink.create('https://developers.google.com/program', lockedString('Google Developer Program'), 'badge-link', undefined, 'program-link');
        this.#show({
            message: i18nFormatString(UIStrings.starterBadgeAwardMessageNoGdpProfile, { PH1: badge.title, PH2: googleDeveloperProgramLink }),
            jslogContext: badge.jslogContext,
            actions: [
                {
                    label: i18nString(UIStrings.noThanks),
                    jslogContext: 'no-thanks',
                    onClick: () => {
                        this.#onDismissClick();
                    },
                },
                {
                    label: i18nString(UIStrings.createProfile),
                    jslogContext: 'create-profile',
                    onClick: () => {
                        this.detach();
                        GdpSignUpDialog.GdpSignUpDialog.show({
                            // We want to consider cancelling from the starter badge as a "snooze" for starter badge.
                            onCancel: () => Badges.UserBadges.instance().snoozeStarterBadge(),
                        });
                    }
                }
            ],
            imageUri: badge.imageUri,
            isStarterBadge: true,
        });
    }
    #presentActivityBasedBadge(badge) {
        this.#show({
            message: i18nString(UIStrings.activityBasedBadgeAwardMessage, { PH1: badge.title }),
            jslogContext: badge.jslogContext,
            actions: [
                {
                    label: i18nString(UIStrings.manageSettings),
                    jslogContext: 'manage-settings',
                    onClick: () => {
                        this.detach();
                        revealBadgeSettings();
                    },
                },
                {
                    label: i18nString(UIStrings.viewProfile),
                    jslogContext: 'view-profile',
                    onClick: () => {
                        UIHelpers.openInNewTab(Host.GdpClient.GOOGLE_DEVELOPER_PROGRAM_PROFILE_LINK);
                    }
                }
            ],
            imageUri: badge.imageUri,
            isStarterBadge: badge.isStarterBadge,
        });
    }
    onDetach() {
        window.clearTimeout(this.#autoCloseTimeout);
    }
    #onDismissClick = () => {
        this.detach();
        if (this.isStarterBadge) {
            Badges.UserBadges.instance().dismissStarterBadge();
        }
    };
    #onAutoClose = () => {
        this.detach();
        if (this.isStarterBadge) {
            Badges.UserBadges.instance().snoozeStarterBadge();
        }
    };
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    performUpdate() {
        const viewInput = {
            message: this.message,
            imageUri: this.imageUri,
            actions: this.actions,
            isStarterBadge: this.isStarterBadge,
            onDismissClick: this.#onDismissClick,
            jslogContext: this.jslogContext,
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
}
//# sourceMappingURL=BadgeNotification.js.map