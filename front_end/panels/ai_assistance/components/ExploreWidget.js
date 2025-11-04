// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { html, render } from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import exploreWidgetStyles from './exploreWidget.css.js';
/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
    /**
     * @description Text for the empty state of the AI assistance panel when there is no agent selected.
     */
    Explore: 'Explore AI assistance',
    /**
     * @description The footer disclaimer that links to more information about the AI feature.
     */
    learnAbout: 'Learn about AI in DevTools',
};
const lockedString = i18n.i18n.lockedString;
export const DEFAULT_VIEW = (input, _output, target) => {
    function renderFeatureCardContent(featureCard) {
        // TODO: Open should be part of the string and the button a placeholder
        // but locked strings don't support it.
        // clang-format off
        return html `Open
     <button
       class="link"
       role="link"
       jslog=${VisualLogging.link(featureCard.jslogContext).track({
            click: true,
        })}
       @click=${featureCard.onClick}
     >${featureCard.panelName}</button>
     ${featureCard.text}`;
        // clang-format on
    }
    // clang-format off
    render(html `
      <style>
        ${exploreWidgetStyles}
      </style>
      <div class="ai-assistance-explore-container">
        <div class="header">
          <div class="icon">
            <devtools-icon name="smart-assistant"></devtools-icon>
          </div>
          <h1>${lockedString(UIStringsNotTranslate.Explore)}</h1>
          <p>
            To chat about an item, right-click and select${' '}
            <strong>Ask AI</strong>.
            <button
              class="link"
              role="link"
              jslog=${VisualLogging.link('open-ai-settings').track({ click: true })}
              @click=${() => { void UI.ViewManager.ViewManager.instance().showView('chrome-ai'); }}
            >${lockedString(UIStringsNotTranslate.learnAbout)}
            </button>
          </p>
        </div>
        <div class="content">
          ${input.featureCards.map(featureCard => html `
              <div class="feature-card">
                <div class="feature-card-icon">
                  <devtools-icon name=${featureCard.icon}></devtools-icon>
                </div>
                <div class="feature-card-content">
                  <h3>${featureCard.heading}</h3>
                  <p>${renderFeatureCardContent(featureCard)}</p>
                </div>
              </div>
            `)}
        </div>
      </div>
    `, target);
    // clang-format on
};
export class ExploreWidget extends UI.Widget.Widget {
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    wasShown() {
        super.wasShown();
        void this.requestUpdate();
    }
    performUpdate() {
        const config = Root.Runtime.hostConfig;
        const featureCards = [];
        if (config.devToolsFreestyler?.enabled && UI.ViewManager.ViewManager.instance().hasView('elements')) {
            featureCards.push({
                icon: 'brush-2',
                heading: 'CSS styles',
                jslogContext: 'open-elements-panel',
                onClick: () => {
                    void UI.ViewManager.ViewManager.instance().showView('elements');
                },
                panelName: 'Elements',
                text: 'to ask about CSS styles'
            });
        }
        if (config.devToolsAiAssistanceNetworkAgent?.enabled && UI.ViewManager.ViewManager.instance().hasView('network')) {
            featureCards.push({
                icon: 'arrow-up-down',
                heading: 'Network',
                jslogContext: 'open-network-panel',
                onClick: () => {
                    void UI.ViewManager.ViewManager.instance().showView('network');
                },
                panelName: 'Network',
                text: 'to ask about a request\'s details'
            });
        }
        if (config.devToolsAiAssistanceFileAgent?.enabled && UI.ViewManager.ViewManager.instance().hasView('sources')) {
            featureCards.push({
                icon: 'document',
                heading: 'Files',
                jslogContext: 'open-sources-panel',
                onClick: () => {
                    void UI.ViewManager.ViewManager.instance().showView('sources');
                },
                panelName: 'Sources',
                text: 'to ask about a file\'s content'
            });
        }
        if (config.devToolsAiAssistancePerformanceAgent?.enabled &&
            UI.ViewManager.ViewManager.instance().hasView('timeline')) {
            featureCards.push({
                icon: 'performance',
                heading: 'Performance',
                jslogContext: 'open-performance-panel',
                onClick: () => {
                    void UI.ViewManager.ViewManager.instance().showView('timeline');
                },
                panelName: 'Performance',
                text: 'to ask about a trace item'
            });
        }
        this.#view({
            featureCards,
        }, {}, this.contentElement);
    }
}
//# sourceMappingURL=ExploreWidget.js.map