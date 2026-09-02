// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import serviceWorkerUpdateCycleViewStyles from './serviceWorkerUpdateCycleView.css.js';

const UIStrings = {
  /**
   * @description Text in Indexed DBViews of the Application panel
   */
  version: 'Version',
  /**
   * @description Table heading for Service Workers update information. Update is a noun.
   */
  updateActivity: 'Update Activity',
  /**
   * @description Title for the timeline tab.
   */
  timeline: 'Timeline',
  /**
   * @description Text in Service Workers Update Life Cycle
   * @example {2} PH1
   */
  startTimeS: 'Start time: {PH1}',
  /**
   * @description Text for end time of an event
   * @example {2} PH1
   */
  endTimeS: 'End time: {PH1}',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/ServiceWorkerUpdateCycleView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export interface ViewInput {
  timeRanges: ServiceWorkerUpdateRange[];
  expandedRows: Set<string>;
  onFocus: (event: Event) => void;
  onKeydown: (event: Event, key: string) => void;
  onClick: (event: Event, key: string) => void;
}

export type View = (input: ViewInput, output: unknown, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  let tableRows: LitTemplate|typeof nothing = nothing;

  if (input.timeRanges.length > 0) {
    const startTimes = input.timeRanges.map(r => r.start);
    const endTimes = input.timeRanges.map(r => r.end);
    const startTime = startTimes.reduce((a, b) => Math.min(a, b));
    const endTime = endTimes.reduce((a, b) => Math.max(a, b));
    const scale = 100 / (endTime - startTime);

    tableRows = html`${input.timeRanges.map(range => {
      const phaseName = range.phase;
      const left = (scale * (range.start - startTime));
      const right = (scale * (endTime - range.end));
      const key = `${range.id}-${range.phase}`;
      const expanded = input.expandedRows.has(key);

      // clang-format off
      return html`
        <tr class="service-worker-update-timeline" jslog=${VisualLogging.treeItem('update-timeline').track({
                      click: true,
                      resize: true,
                      keydown: 'ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Enter|Space',
                    })}>
          <td class="service-worker-update-timing-bar-clickable" tabindex="0" role="switch"
              aria-checked=${expanded ? 'true' : 'false'}
              @focus=${input.onFocus}
              @keydown=${(e: Event) => input.onKeydown(e, key)}
              @click=${(e: Event) => input.onClick(e, key)}
              jslog=${VisualLogging.expand('timing-info').track({click: true})}>
            #${range.id}
          </td>
          <td>${phaseName}</td>
          <td>
            <div class="service-worker-update-timing-row">
              <span class="service-worker-update-timing-bar ${phaseName.toLowerCase()}"
                    style="left: ${left}%; right: ${right}%;">\u200B</span>
            </div>
          </td>
        </tr>
        <tr class="service-worker-update-timing-bar-details ${expanded ? 'service-worker-update-timing-bar-details-expanded' : 'service-worker-update-timing-bar-details-collapsed'}" tabindex="0">
          <td colspan="3"><span>${i18nString(UIStrings.startTimeS, {PH1: new Date(range.start).toISOString()})}</span></td>
        </tr>
        <tr class="service-worker-update-timing-bar-details ${expanded ? 'service-worker-update-timing-bar-details-expanded' : 'service-worker-update-timing-bar-details-collapsed'}" tabindex="0">
          <td colspan="3"><span>${i18nString(UIStrings.endTimeS, {PH1: new Date(range.end).toISOString()})}</span></td>
        </tr>
      `;
      // clang-format on
    })}`;
  }

  // clang-format off
  render(html`
    <style>${serviceWorkerUpdateCycleViewStyles}</style>
    <table class="service-worker-update-timing-table" jslog=${VisualLogging.tree('update-timing-table')}>
      <tr class="service-worker-update-timing-table-header">
        <td>${i18nString(UIStrings.version)}</td>
        <td>${i18nString(UIStrings.updateActivity)}</td>
        <td>${i18nString(UIStrings.timeline)}</td>
      </tr>
      ${tableRows}
    </table>
  `, target);
  // clang-format on
};

export class ServiceWorkerUpdateCycleView extends UI.Widget.Widget {
  #registration?: SDK.ServiceWorkerManager.ServiceWorkerRegistration;
  private rows: HTMLTableRowElement[];
  private selectedRowIndex: number;
  private expandedRows = new Set<string>();
  #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
    this.rows = [];
    this.selectedRowIndex = -1;
  }

  set registration(registration: SDK.ServiceWorkerManager.ServiceWorkerRegistration|undefined) {
    this.#registration = registration;
    this.requestUpdate();
  }

  get registration(): SDK.ServiceWorkerManager.ServiceWorkerRegistration|undefined {
    return this.#registration;
  }

  set registrationFingerprint(_fingerprint: symbol|undefined) {
    this.requestUpdate();
  }

  calculateServiceWorkerUpdateRanges(): ServiceWorkerUpdateRange[] {
    function addRange(ranges: ServiceWorkerUpdateRange[], range: ServiceWorkerUpdateRange): void {
      if (range.start < Number.MAX_VALUE && range.start <= range.end) {
        ranges.push(range);
      }
    }

    /**
     * Add ranges representing Install, Wait or Activate of a sw version represented by id.
     */
    function addNormalizedRanges(
        ranges: ServiceWorkerUpdateRange[], id: string, startInstallTime: number, endInstallTime: number,
        startActivateTime: number, endActivateTime: number,
        status: Protocol.ServiceWorker.ServiceWorkerVersionStatus): void {
      addRange(ranges, {id, phase: ServiceWorkerUpdateNames.INSTALL, start: startInstallTime, end: endInstallTime});
      if (status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activating ||
          status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activated ||
          status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.Redundant) {
        addRange(ranges, {
          id,
          phase: ServiceWorkerUpdateNames.WAIT,
          start: endInstallTime,
          end: startActivateTime,
        });
        addRange(
            ranges, {id, phase: ServiceWorkerUpdateNames.ACTIVATE, start: startActivateTime, end: endActivateTime});
      }
    }

    function rangesForVersion(version: SDK.ServiceWorkerManager.ServiceWorkerVersion): ServiceWorkerUpdateRange[] {
      let state: SDK.ServiceWorkerManager.ServiceWorkerVersionState|null = version.currentState;
      let endActivateTime = 0;
      let beginActivateTime = 0;
      let endInstallTime = 0;
      let beginInstallTime = 0;
      const currentStatus = state.status;
      if (currentStatus === Protocol.ServiceWorker.ServiceWorkerVersionStatus.New) {
        return [];
      }

      while (state) {
        // find the earliest timestamp of different stage on record.
        if (state.status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activated) {
          endActivateTime = state.lastUpdatedTimestamp;
        } else if (state.status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activating) {
          if (endActivateTime === 0) {
            endActivateTime = state.lastUpdatedTimestamp;
          }
          beginActivateTime = state.lastUpdatedTimestamp;
        } else if (state.status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.Installed) {
          endInstallTime = state.lastUpdatedTimestamp;
        } else if (state.status === Protocol.ServiceWorker.ServiceWorkerVersionStatus.Installing) {
          if (endInstallTime === 0) {
            endInstallTime = state.lastUpdatedTimestamp;
          }
          beginInstallTime = state.lastUpdatedTimestamp;
        }
        state = state.previousState;
      }
      const ranges: ServiceWorkerUpdateRange[] = [];
      addNormalizedRanges(
          ranges, version.id, beginInstallTime, endInstallTime, beginActivateTime, endActivateTime, currentStatus);
      return ranges;
    }

    if (!this.#registration) {
      return [];
    }
    const versions = this.#registration.versionsByMode();
    const modes = [
      SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.ACTIVE,
      SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.WAITING,
      SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.INSTALLING,
      SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.REDUNDANT,
    ];

    for (const mode of modes) {
      const version = versions.get(mode);
      if (version) {
        const ranges = rangesForVersion(version);
        return ranges;
      }
    }

    return [];
  }

  override performUpdate(): void {
    const timeRanges = this.calculateServiceWorkerUpdateRanges();

    const input: ViewInput = {
      timeRanges,
      expandedRows: this.expandedRows,
      onFocus: this.onFocus.bind(this),
      onKeydown: this.onKeydown.bind(this),
      onClick: this.onClick.bind(this),
    };

    this.#view(input, this, this.contentElement);
    this.rows =
        Array.from(this.contentElement.querySelectorAll<HTMLTableRowElement>('.service-worker-update-timeline'));
    if (this.selectedRowIndex >= this.rows.length) {
      this.selectedRowIndex = -1;
    }
  }

  private toggle(key: string, expanded: boolean): void {
    if (expanded) {
      this.expandedRows.delete(key);
    } else {
      this.expandedRows.add(key);
    }
    this.requestUpdate();
  }

  private onFocus(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }
    const tr = target.parentElement as HTMLTableRowElement | null;
    if (!tr) {
      return;
    }

    this.selectedRowIndex = this.rows.indexOf(tr);
  }

  private onKeydown(event: Event, key: string): void {
    if (!event.target) {
      return;
    }
    const keyboardEvent = event as KeyboardEvent;
    const expanded = this.expandedRows.has(key);

    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
      this.toggle(key, expanded);
      event.preventDefault();
      return;
    }
    if ((!expanded && keyboardEvent.key === 'ArrowRight') || (expanded && keyboardEvent.key === 'ArrowLeft')) {
      this.toggle(key, expanded);
      event.preventDefault();
      return;
    }
    if (keyboardEvent.key === 'ArrowDown') {
      if (this.selectedRowIndex >= 0) {
        this.selectNextRow();
      } else {
        this.selectFirstRow();
      }
      event.preventDefault();
    }
    if (keyboardEvent.key === 'ArrowUp') {
      if (this.selectedRowIndex >= 0) {
        this.selectPreviousRow();
      } else {
        this.selectLastRow();
      }
      event.preventDefault();
    }
  }

  private focusRow(row: HTMLTableRowElement): void {
    row.cells[0].focus();
  }

  private blurRow(row: HTMLTableRowElement): void {
    row.cells[0].blur();
  }

  private selectFirstRow(): void {
    if (this.rows.length === 0) {
      return;
    }
    this.selectedRowIndex = 0;
    this.focusRow(this.rows[0]);
  }

  private selectLastRow(): void {
    if (this.rows.length === 0) {
      return;
    }
    this.selectedRowIndex = this.rows.length - 1;
    this.focusRow(this.rows[this.selectedRowIndex]);
  }

  private selectNextRow(): void {
    if (this.rows.length === 0) {
      return;
    }
    const previousRowIndex = this.selectedRowIndex;
    this.selectedRowIndex++;
    if (this.selectedRowIndex >= this.rows.length) {
      this.selectedRowIndex = 0;
    }
    this.blurRow(this.rows[previousRowIndex]);
    this.focusRow(this.rows[this.selectedRowIndex]);
  }

  private selectPreviousRow(): void {
    if (this.rows.length === 0) {
      return;
    }
    const previousRowIndex = this.selectedRowIndex;
    this.selectedRowIndex--;
    if (this.selectedRowIndex < 0) {
      this.selectedRowIndex = this.rows.length - 1;
    }
    this.blurRow(this.rows[previousRowIndex]);
    this.focusRow(this.rows[this.selectedRowIndex]);
  }

  private onClick(event: Event, key: string): void {
    const expanded = this.expandedRows.has(key);
    this.toggle(key, expanded);
    event.preventDefault();
  }
}

export const enum ServiceWorkerUpdateNames {
  INSTALL = 'Install',
  WAIT = 'Wait',
  ACTIVATE = 'Activate',
}

export interface ServiceWorkerUpdateRange {
  id: string;
  phase: ServiceWorkerUpdateNames;
  start: number;
  end: number;
}
