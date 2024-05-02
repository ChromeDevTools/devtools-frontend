// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as Models from '../models/models.js';
import * as Actions from '../recorder-actions/recorder-actions.js';

import recordingListViewStyles from './recordingListView.css.js';

const UIStrings = {
  /**
   *@description The title of the page that contains a list of saved recordings that the user has..
   */
  savedRecordings: 'Saved recordings',
  /**
   * @description The title of the button that leads to create a new recording page.
   */
  createRecording: 'Create a new recording',
  /**
   * @description The title of the button that is shown next to each of the recordings and that triggers playing of the recording.
   */
  playRecording: 'Play recording',
  /**
   * @description The title of the button that is shown next to each of the recordings and that triggers deletion of the recording.
   */
  deleteRecording: 'Delete recording',
  /**
   * @description The title of the row corresponding to a recording. By clicking on the row, the user open the recording for editing.
   */
  openRecording: 'Open recording',
};
const str_ = i18n.i18n.registerUIStrings(
    'panels/recorder/components/RecordingListView.ts',
    UIStrings,
);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-recording-list-view': RecordingListView;
  }

  interface HTMLElementEventMap {
    openrecording: OpenRecordingEvent;
    deleterecording: DeleteRecordingEvent;
  }
}

export class CreateRecordingEvent extends Event {
  static readonly eventName = 'createrecording';
  constructor() {
    super(CreateRecordingEvent.eventName);
  }
}

export class DeleteRecordingEvent extends Event {
  static readonly eventName = 'deleterecording';
  constructor(public storageName: string) {
    super(DeleteRecordingEvent.eventName);
  }
}

export class OpenRecordingEvent extends Event {
  static readonly eventName = 'openrecording';
  constructor(public storageName: string) {
    super(OpenRecordingEvent.eventName);
  }
}

export class PlayRecordingEvent extends Event {
  static readonly eventName = 'playrecording';
  constructor(public storageName: string) {
    super(PlayRecordingEvent.eventName);
  }
}

interface Recording {
  storageName: string;
  name: string;
}

export class RecordingListView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-recording-list-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #props: {recordings: Recording[], replayAllowed: boolean} = {
    recordings: [],
    replayAllowed: true,
  };

  constructor() {
    super();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [recordingListViewStyles];
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  set recordings(recordings: Recording[]) {
    this.#props.recordings = recordings;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  set replayAllowed(value: boolean) {
    this.#props.replayAllowed = value;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #onCreateClick(): void {
    this.dispatchEvent(new CreateRecordingEvent());
  }

  #onDeleteClick(storageName: string, event: Event): void {
    event.stopPropagation();
    this.dispatchEvent(new DeleteRecordingEvent(storageName));
  }

  #onOpenClick(storageName: string, event: Event): void {
    event.stopPropagation();
    this.dispatchEvent(new OpenRecordingEvent(storageName));
  }

  #onPlayRecordingClick(storageName: string, event: Event): void {
    event.stopPropagation();
    this.dispatchEvent(new PlayRecordingEvent(storageName));
  }

  #onKeyDown(storageName: string, event: Event): void {
    if ((event as KeyboardEvent).key !== 'Enter') {
      return;
    }
    this.#onOpenClick(storageName, event);
  }

  #stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  #render = (): void => {
    // clang-format off
    LitHtml.render(
      LitHtml.html`
        <div class="wrapper">
          <div class="header">
            <h1>${i18nString(UIStrings.savedRecordings)}</h1>
            <${Buttons.Button.Button.litTagName}
              .variant=${Buttons.Button.Variant.PRIMARY}
              @click=${this.#onCreateClick}
              title=${Models.Tooltip.getTooltipForActions(
                i18nString(UIStrings.createRecording),
                Actions.RecorderActions.CreateRecording,
              )}
              .jslogContext=${'create-recording'}
            >
              ${i18nString(UIStrings.createRecording)}
            </${Buttons.Button.Button.litTagName}>
          </div>
          <div class="table">
            ${this.#props.recordings.map(recording => {
              return LitHtml.html`
                  <div
                    role="button"
                    tabindex="0"
                    aria-label=${i18nString(UIStrings.openRecording)}
                    class="row"
                    @keydown=${this.#onKeyDown.bind(
                      this,
                      recording.storageName,
                    )}
                    @click=${this.#onOpenClick.bind(
                      this,
                      recording.storageName,
                    )}
                    jslog=${VisualLogging.item()
                      .track({ click: true })
                      .context('recording')}>
                    <div class="icon">
                      <${IconButton.Icon.Icon.litTagName} name="flow">
                      </${IconButton.Icon.Icon.litTagName}>
                    </div>
                    <div class="title">${recording.name}</div>
                    <div class="actions">
                      ${
                        this.#props.replayAllowed
                          ? LitHtml.html`
                              <${Buttons.Button.Button.litTagName}
                                title=${i18nString(UIStrings.playRecording)}
                                .data=${
                                  {
                                    variant: Buttons.Button.Variant.ROUND,
                                    iconName: 'play',
                                     jslogContext: 'play-recording',
                                  } as Buttons.Button.ButtonData
                                }
                                @click=${this.#onPlayRecordingClick.bind(
                                  this,
                                  recording.storageName,
                                )}
                                @keydown=${this.#stopPropagation}
                              ></${Buttons.Button.Button.litTagName}>
                              <div class="divider"></div>`
                          : ''
                      }
                      <${Buttons.Button.Button.litTagName}
                        class="delete-recording-button"
                        title=${i18nString(UIStrings.deleteRecording)}
                        .data=${
                          {
                            variant: Buttons.Button.Variant.ROUND,
                            iconName: 'bin',
                            jslogContext: 'delete-recording',
                          } as Buttons.Button.ButtonData
                        }
                        @click=${this.#onDeleteClick.bind(
                          this,
                          recording.storageName,
                        )}
                        @keydown=${this.#stopPropagation}
                      ></${Buttons.Button.Button.litTagName}>
                    </div>
                  </div>
                `;
            })}
          </div>
        </div>
      `,
      this.#shadow,
      { host: this },
    );
    // clang-format on
  };
}

customElements.define(
    'devtools-recording-list-view',
    RecordingListView,
);
