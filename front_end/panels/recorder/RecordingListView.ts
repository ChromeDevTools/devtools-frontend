// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/kit/kit.js';

import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as Models from './models/models.js';
import * as Actions from './recorder-actions/recorder-actions.js';
import recordingListViewStyles from './recordingListView.css.js';

const {html} = Lit;

const UIStrings = {
  /**
   * @description The title of the page that contains a list of saved recordings.
   */
  savedRecordings: 'Saved recordings',
  /**
   * @description The title of the button that leads to the page for creating a new recording.
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
   * @description The title of the row corresponding to a recording. By clicking on the row, the user opens the recording for editing.
   */
  openRecording: 'Open recording',
} as const;
const str_ = i18n.i18n.registerUIStrings(
    'panels/recorder/RecordingListView.ts',
    UIStrings,
);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface Recording {
  storageName: string;
  name: string;
}

interface ViewInput {
  recordings: readonly Recording[];
  replayAllowed: boolean;
  onCreateClick: () => void;
  onDeleteClick: (storageName: string, event: Event) => void;
  onOpenClick: (storageName: string, event: Event) => void;
  onPlayRecordingClick: (storageName: string, event: Event) => void;
  onKeyDown: (storageName: string, event: Event) => void;
}

export type ViewOutput = object;

export const DEFAULT_VIEW = (input: ViewInput, _output: ViewOutput, target: HTMLElement): void => {
  const {
    recordings,
    replayAllowed,
    onCreateClick,
    onDeleteClick,
    onOpenClick,
    onPlayRecordingClick,
    onKeyDown,
  } = input;
  // clang-format off
  Lit.render(
    html`
      <style>${recordingListViewStyles}</style>
      <div class="wrapper">
        <div class="header">
          <h1>${i18nString(UIStrings.savedRecordings)}</h1>
          <devtools-button
            .variant=${Buttons.Button.Variant.PRIMARY}
            @click=${onCreateClick}
            title=${Models.Tooltip.getTooltipForActions(
              i18nString(UIStrings.createRecording),
              Actions.RecorderActions.CREATE_RECORDING,
            )}
            .jslogContext=${'create-recording'}
          >
            ${i18nString(UIStrings.createRecording)}
          </devtools-button>
        </div>
        <div class="table">
          ${recordings.map(recording => {
            return html`
                <div
                  role="button"
                  tabindex="0"
                  aria-label=${i18nString(UIStrings.openRecording)}
                  class="row"
                  @keydown=${(event: Event) => onKeyDown(recording.storageName, event)}
                  @click=${(event: Event) => onOpenClick(recording.storageName, event)}
                  jslog=${VisualLogging.item()
                    .track({ click: true, resize: true })
                    .context('recording')}>
                  <div class="icon">
                    <devtools-icon name="flow">
                    </devtools-icon>
                  </div>
                  <div class="title">${recording.name}</div>
                  <div class="actions">
                    ${
                      replayAllowed
                        ? html`
                              <devtools-button
                                title=${i18nString(UIStrings.playRecording)}
                                .data=${
                                  {
                                    variant: Buttons.Button.Variant.ICON,
                                    iconName: 'play',
                                     jslogContext: 'play-recording',
                                  } as Buttons.Button.ButtonData
                                }
                                @click=${(event: Event) => onPlayRecordingClick(recording.storageName, event)}
                                @keydown=${(event: Event) => event.stopPropagation()}
                              ></devtools-button>
                              <div class="divider"></div>`
                        : ''
                    }
                    <devtools-button
                      class="delete-recording-button"
                      title=${i18nString(UIStrings.deleteRecording)}
                      .data=${
                        {
                          variant: Buttons.Button.Variant.ICON,
                          iconName: 'bin',
                          jslogContext: 'delete-recording',
                        } as Buttons.Button.ButtonData
                      }
                      @click=${(event: Event) => onDeleteClick(recording.storageName, event)}
                      @keydown=${(event: Event) => event.stopPropagation()}
                    ></devtools-button>
                  </div>
                </div>
              `;
          })}
        </div>
      </div>
    `,
    target,
  );
  // clang-format on
};

export class RecordingListView extends UI.Widget.Widget {
  #recordings: readonly Recording[] = [];
  #replayAllowed = true;
  #view: typeof DEFAULT_VIEW;
  onCreateRecording?: () => void;
  onDeleteRecording?: (storageName: string) => void;
  onOpenRecording?: (storageName: string) => void;
  onPlayRecording?: (storageName: string) => void;

  constructor(element?: HTMLElement, view?: typeof DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view || DEFAULT_VIEW;
  }

  set recordings(recordings: readonly Recording[]) {
    this.#recordings = recordings;
    this.performUpdate();
  }

  set replayAllowed(value: boolean) {
    this.#replayAllowed = value;
    this.performUpdate();
  }

  #onCreateClick(): void {
    this.onCreateRecording?.();
  }

  #onDeleteClick(storageName: string, event: Event): void {
    event.stopPropagation();
    this.onDeleteRecording?.(storageName);
  }

  #onOpenClick(storageName: string, event: Event): void {
    event.stopPropagation();
    this.onOpenRecording?.(storageName);
  }

  #onPlayRecordingClick(storageName: string, event: Event): void {
    event.stopPropagation();
    this.onPlayRecording?.(storageName);
  }

  #onKeyDown(storageName: string, event: Event): void {
    if ((event as KeyboardEvent).key !== 'Enter') {
      return;
    }
    this.#onOpenClick(storageName, event);
  }

  override performUpdate(): void {
    this.#view({
      recordings: this.#recordings,
      replayAllowed: this.#replayAllowed,
      onCreateClick: this.#onCreateClick.bind(this),
      onDeleteClick: this.#onDeleteClick.bind(this),
      onOpenClick: this.#onOpenClick.bind(this),
      onPlayRecordingClick: this.#onPlayRecordingClick.bind(this),
      onKeyDown: this.#onKeyDown.bind(this),
    },
               {}, this.contentElement);
  }

  override wasShown(): void {
    super.wasShown();
    this.performUpdate();
  }
}
