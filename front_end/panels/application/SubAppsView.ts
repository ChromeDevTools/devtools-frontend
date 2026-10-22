// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/kit/kit.js';
import '../../ui/legacy/components/data_grid/data_grid.js';

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import subAppsViewStyles from './subAppsView.css.js';

const {html} = Lit;

const UIStrings = {
  /**
   * @description Heading label for Sub Apps view
   */
  subApps: 'Sub apps',
  /**
   * @description Heading label for Sibling Sub Apps view
   */
  siblingSubApps: 'Sibling sub apps',
  /**
   * @description Column header for the sub-app name
   */
  name: 'Name',
  /**
   * @description Column header for the sub-app scope
   */
  scope: 'Scope',
  /**
   * @description Column header when Manifest ID and Start URL are identical across all sub-apps
   */
  manifestIdAndStartUrl: 'Manifest ID / Start URL',
  /**
   * @description Column header for Manifest ID
   */
  manifestId: 'Manifest ID',
  /**
   * @description Column header for Start URL
   */
  startUrl: 'Start URL',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/application/SubAppsView.ts', UIStrings);
export const i18nString: i18n.LocalizeString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface SubAppEntry {
  name: string;
  scope: string;
  manifestId: string;
  startUrl: string;
}

export interface SubAppsViewInput {
  subApps: SubAppEntry[];
  isSiblingSubApps?: boolean;
}

/**
 * Sub apps always share the parent app's origin, so, like the manifest's
 * Start URL field, only the path (plus any query or fragment) is shown. The
 * full URL is kept in the cell's tooltip. Falls back to the original string if
 * it is not a valid absolute URL.
 */
function stripOrigin(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return url;
  }
}

type View = (input: SubAppsViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target) => {
  const hasDistinctManifestId =
      input.subApps.some(subApp => subApp.manifestId && subApp.startUrl && subApp.manifestId !== subApp.startUrl);
  const headingText = input.isSiblingSubApps ? i18nString(UIStrings.siblingSubApps) : i18nString(UIStrings.subApps);

  // clang-format off
  Lit.render(html`
    <style>${subAppsViewStyles}</style>
    <style>${UI.inspectorCommonStyles}</style>
    <div jslog=${VisualLogging.pane('sub-apps')}>
      <span class="heading">${headingText}</span>
      <devtools-data-grid striped inline role="grid" aria-label=${headingText}>
        <table>
          <tr>
            <th id="name" weight="10" sortable>${i18nString(UIStrings.name)}</th>
            <th id="scope" weight="10" sortable>${i18nString(UIStrings.scope)}</th>
            ${hasDistinctManifestId ? html`
              <th id="manifest-id" weight="10" sortable>${i18nString(UIStrings.manifestId)}</th>
              <th id="start-url" weight="10" sortable>${i18nString(UIStrings.startUrl)}</th>
            ` : html`
              <th id="manifest-id-start-url" weight="10" sortable>${i18nString(UIStrings.manifestIdAndStartUrl)}</th>
            `}
          </tr>
          ${input.subApps.map(subApp => html`
            <tr>
              <td>${subApp.name}</td>
              <td title=${subApp.scope}>${stripOrigin(subApp.scope)}</td>
              ${hasDistinctManifestId ? html`
                <td title=${subApp.manifestId}>${stripOrigin(subApp.manifestId)}</td>
                <td title=${subApp.startUrl}>${stripOrigin(subApp.startUrl)}</td>
              ` : html`
                <td title=${subApp.manifestId || subApp.startUrl}>${stripOrigin(subApp.manifestId || subApp.startUrl)}</td>
              `}
            </tr>
          `)}
        </table>
      </devtools-data-grid>
    </div>
  `, target);
  // clang-format on
};

export class SubAppsView extends UI.Widget.VBox {
  #subApps: SubAppEntry[] = [];
  #isSiblingSubApps = false;
  #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  get subApps(): SubAppEntry[] {
    return this.#subApps;
  }

  set subApps(subApps: SubAppEntry[]) {
    if (subApps === this.#subApps) {
      return;
    }
    this.#subApps = subApps;
    this.requestUpdate();
  }

  get isSiblingSubApps(): boolean {
    return this.#isSiblingSubApps;
  }

  set isSiblingSubApps(isSiblingSubApps: boolean) {
    if (isSiblingSubApps === this.#isSiblingSubApps) {
      return;
    }
    this.#isSiblingSubApps = isSiblingSubApps;
    this.requestUpdate();
  }

  override async performUpdate(): Promise<void> {
    this.#view({subApps: this.#subApps, isSiblingSubApps: this.#isSiblingSubApps}, undefined, this.contentElement);
  }
}
