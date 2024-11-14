// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/markdown_view/markdown_view.js';

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Marked from '../../third_party/marked/marked.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import type * as MarkdownView from '../../ui/components/markdown_view/markdown_view.js';
import * as Coordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {getReleaseNote} from './ReleaseNoteText.js';
import releaseNoteViewStyles from './releaseNoteView.css.js';
import {releaseNoteViewId} from './WhatsNewImpl.js';

const {html} = LitHtml;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const UIStrings = {
  /**
   *@description Text that is usually a hyperlink to more documentation
   */
  learnMore: 'Learn more',
  /**
   *@description Text to close something
   */
  close: 'Close',
};
const str_ = i18n.i18n.registerUIStrings('panels/whats_new/ReleaseNoteView.ts', UIStrings);

const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let releaseNoteViewInstance: ReleaseNoteViewWrapper;

export class ReleaseNoteViewWrapper extends UI.Widget.VBox {
  releaseNoteElement: ReleaseNoteView;
  constructor() {
    super(true);
    this.element.setAttribute('jslog', `${VisualLogging.panel().context('whats-new')}`);
    this.releaseNoteElement = new ReleaseNoteView();
    this.contentElement.appendChild(this.releaseNoteElement);
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): ReleaseNoteViewWrapper {
    const {forceNew} = opts;
    if (!releaseNoteViewInstance || forceNew) {
      releaseNoteViewInstance = new ReleaseNoteViewWrapper();
    }
    return releaseNoteViewInstance;
  }
}

export class ReleaseNoteView extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [
      releaseNoteViewStyles,
    ];
    this.#render();
  }

  static async getFileContent(): Promise<string> {
    const url = new URL('./resources/WNDT.md', import.meta.url);
    try {
      const response = await fetch(url.toString());
      return response.text();
    } catch (error) {
      throw new Error(`Markdown file ${
          url.toString()} not found. Make sure it is correctly listed in the relevant BUILD.gn files.`);
    }
  }

  async #renderHighlights(): Promise<LitHtml.TemplateResult> {
    const markdown = await ReleaseNoteView.getFileContent();
    const markdownAst = Marked.Marked.lexer(markdown);

    // clang-format off
    return html`<devtools-markdown-view .data=${{tokens: markdownAst} as MarkdownView.MarkdownView.MarkdownViewData}>
      </devtools-markdown-view>
    `;
    // clang-format on
  }

  #render(): void {
    const releaseNote = getReleaseNote();
    void coordinator.write(() => {
      // clang-format off
      const tmpl = html`
      <div class="release-note-top-section">
        ${getReleaseNote().header}
      </div>
      <div class="hbox">
        <div class="release-note-container" jslog=${VisualLogging.section().context('release-notes')}>
         <ul aria-label=${releaseNote.header}>
            ${LitHtml.Directives.until(this.#renderHighlights())}
          </ul>
          <div>
            <devtools-button
              .data=${{
                variant: Buttons.Button.Variant.OUTLINED,
              } as Buttons.Button.ButtonData}
              .jslogContext=${'learn-more'}
              @click=${(event: MouseEvent): void => {
                event.consume(true);
                  Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(releaseNote.link as Platform.DevToolsPath.UrlString);
                }}
            >${i18nString(UIStrings.learnMore)}
            </devtools-button>
            <devtools-button
              .data=${{
                variant: Buttons.Button.Variant.OUTLINED,
              } as Buttons.Button.ButtonData}
              .jslogContext=${'close'}
              @click=${(event: MouseEvent): void => {
                event.consume(true);
                UI.InspectorView.InspectorView.instance().closeDrawerTab(releaseNoteViewId, true);
                }}
            >
            ${i18nString(UIStrings.close)}
            </devtools-button>
          </div>
        </div>
        <x-link
          href=${releaseNote.link}
          class="devtools-link release-note-image"
          jslog=${VisualLogging.link().track({click: true}).context('learn-more')}
        >
          <img src=${new URL('./resources/whatsnew.avif', import.meta.url).toString()}>
        </x-link>
      </div>
      `;
      // clang-format on
      LitHtml.render(tmpl, this.#shadow, {host: this});
      const releaseNoteImage = this.#shadow.querySelector('img');
      if (releaseNoteImage) {
        UI.Tooltip.Tooltip.install(releaseNoteImage, getReleaseNote().header);
      }
    });
  }
}

customElements.define('devtools-release-note-view', ReleaseNoteView);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-release-note-view': ReleaseNoteView;
  }
}
