// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

const UIStrings = {
  /**
   *@description Text in Indexed DBViews of the Application panel
   */
  version: 'Version',
  /**
   *@description Table heading for Service Workers update information. Update is a noun.
   */
  updateActivity: 'Update Activity',
  /**
   *@description Title for the timeline tab.
   */
  timeline: 'Timeline',
  /**
   *@description Text in Service Workers Update Life Cycle
   *@example {2} PH1
   */
  startTimeS: 'Start time: {PH1}',
  /**
   *@description Text for end time of an event
   *@example {2} PH1
   */
  endTimeS: 'End time: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/ServiceWorkerUpdateCycleView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ServiceWorkerUpdateCycleView {
  private registration: SDK.ServiceWorkerManager.ServiceWorkerRegistration;
  private rows: Array<HTMLTableRowElement>;
  private selectedRowIndex: number;
  tableElement: HTMLElement;
  constructor(registration: SDK.ServiceWorkerManager.ServiceWorkerRegistration) {
    this.registration = registration;
    this.rows = [];
    this.selectedRowIndex = -1;
    this.tableElement = document.createElement('table');
    this.createTimingTable();
  }

  calculateServiceWorkerUpdateRanges(): Array<ServiceWorkerUpdateRange> {
    function addRange(ranges: Array<ServiceWorkerUpdateRange>, range: ServiceWorkerUpdateRange): void {
      if (range.start < Number.MAX_VALUE && range.start <= range.end) {
        ranges.push(range);
      }
    }

    /**
     * Add ranges representing Install, Wait or Activate of a sw version represented by id.
     */
    function addNormalizedRanges(
        ranges: Array<ServiceWorkerUpdateRange>, id: string, startInstallTime: number, endInstallTime: number,
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

    function rangesForVersion(version: SDK.ServiceWorkerManager.ServiceWorkerVersion): Array<ServiceWorkerUpdateRange> {
      let state: SDK.ServiceWorkerManager.ServiceWorkerVersionState|null = version.currentState;
      let endActivateTime: number = 0;
      let beginActivateTime: number = 0;
      let endInstallTime: number = 0;
      let beginInstallTime: number = 0;
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
      const ranges: Array<ServiceWorkerUpdateRange> = [];
      addNormalizedRanges(
          ranges, version.id, beginInstallTime, endInstallTime, beginActivateTime, endActivateTime, currentStatus);
      return ranges;
    }

    const versions = this.registration.versionsByMode();
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

  private createTimingTable(): void {
    this.tableElement.classList.add('service-worker-update-timing-table');
    this.tableElement.setAttribute('jslog', `${VisualLogging.tree('update-timing-table')}`);
    const timeRanges = this.calculateServiceWorkerUpdateRanges();
    this.updateTimingTable(timeRanges);
  }

  private createTimingTableHead(): void {
    const serverHeader = this.tableElement.createChild('tr', 'service-worker-update-timing-table-header');
    UI.UIUtils.createTextChild(serverHeader.createChild('td'), i18nString(UIStrings.version));
    UI.UIUtils.createTextChild(serverHeader.createChild('td'), i18nString(UIStrings.updateActivity));
    UI.UIUtils.createTextChild(serverHeader.createChild('td'), i18nString(UIStrings.timeline));
  }

  private removeRows(): void {
    const rows = this.tableElement.getElementsByTagName('tr');
    while (rows[0]) {
      if (rows[0].parentNode) {
        rows[0].parentNode.removeChild(rows[0]);
      }
    }
    this.rows = [];
  }

  private updateTimingTable(timeRanges: Array<ServiceWorkerUpdateRange>): void {
    this.selectedRowIndex = -1;
    this.removeRows();
    this.createTimingTableHead();
    const timeRangeArray = timeRanges;
    if (timeRangeArray.length === 0) {
      return;
    }

    const startTimes = timeRangeArray.map(r => r.start);
    const endTimes = timeRangeArray.map(r => r.end);
    const startTime = startTimes.reduce((a, b) => Math.min(a, b));
    const endTime = endTimes.reduce((a, b) => Math.max(a, b));
    const scale = 100 / (endTime - startTime);

    for (const range of timeRangeArray) {
      const phaseName = range.phase;

      const left = (scale * (range.start - startTime));
      const right = (scale * (endTime - range.end));

      const tr = this.tableElement.createChild('tr', 'service-worker-update-timeline');
      tr.setAttribute('jslog', `${VisualLogging.treeItem('update-timeline').track({
                        click: true,
                        keydown: 'ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Enter|Space',
                      })}`);
      this.rows.push(tr as HTMLTableRowElement);
      const timingBarVersionElement = tr.createChild('td');
      UI.UIUtils.createTextChild(timingBarVersionElement, '#' + range.id);
      timingBarVersionElement.classList.add('service-worker-update-timing-bar-clickable');
      timingBarVersionElement.setAttribute('tabindex', '0');
      timingBarVersionElement.setAttribute('role', 'switch');
      timingBarVersionElement.addEventListener('focus', (event: Event) => {
        this.onFocus(event);
      });
      timingBarVersionElement.setAttribute('jslog', `${VisualLogging.expand('timing-info').track({click: true})}`);
      UI.ARIAUtils.setChecked(timingBarVersionElement, false);
      const timingBarTitleElement = tr.createChild('td');
      UI.UIUtils.createTextChild(timingBarTitleElement, phaseName);
      const barContainer = tr.createChild('td').createChild('div', 'service-worker-update-timing-row');

      const bar = barContainer.createChild('span', 'service-worker-update-timing-bar ' + phaseName.toLowerCase());

      bar.style.left = left + '%';
      bar.style.right = right + '%';
      bar.textContent = '\u200B';  // Important for 0-time items to have 0 width.

      this.constructUpdateDetails(tr, range);
    }
  }

  /**
   * Detailed information about an update phase. Currently starting and ending time.
   */
  private constructUpdateDetails(tr: HTMLElement, range: ServiceWorkerUpdateRange): void {
    const startRow = this.tableElement.createChild('tr', 'service-worker-update-timing-bar-details');
    startRow.classList.add('service-worker-update-timing-bar-details-collapsed');
    const startTimeItem = startRow.createChild('td') as HTMLTableCellElement;
    startTimeItem.colSpan = 3;
    const startTime = (new Date(range.start)).toISOString();
    UI.UIUtils.createTextChild(startTimeItem.createChild('span'), i18nString(UIStrings.startTimeS, {PH1: startTime}));
    startRow.tabIndex = 0;

    const endRow = this.tableElement.createChild('tr', 'service-worker-update-timing-bar-details');
    endRow.classList.add('service-worker-update-timing-bar-details-collapsed');
    const endTimeItem = endRow.createChild('td') as HTMLTableCellElement;
    endTimeItem.colSpan = 3;
    const endTime = (new Date(range.end)).toISOString();
    UI.UIUtils.createTextChild(endTimeItem.createChild('span'), i18nString(UIStrings.endTimeS, {PH1: endTime}));
    endRow.tabIndex = 0;

    tr.addEventListener('keydown', (event: Event) => {
      this.onKeydown(event, startRow, endRow);
    });

    tr.addEventListener('click', (event: Event) => {
      this.onClick(event, startRow, endRow);
    });
  }

  private toggle(startRow: Element, endRow: Element, target: Element, expanded: boolean): void {
    if (target.classList.contains('service-worker-update-timing-bar-clickable')) {
      startRow.classList.toggle('service-worker-update-timing-bar-details-collapsed');
      startRow.classList.toggle('service-worker-update-timing-bar-details-expanded');
      endRow.classList.toggle('service-worker-update-timing-bar-details-collapsed');
      endRow.classList.toggle('service-worker-update-timing-bar-details-expanded');
      UI.ARIAUtils.setChecked(target, !expanded);
    }
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

  private onKeydown(event: Event, startRow: HTMLElement, endRow: HTMLElement): void {
    if (!event.target) {
      return;
    }
    const target: HTMLElement = event.target as HTMLElement;
    const keyboardEvent = event as KeyboardEvent;
    const expanded = target.getAttribute('aria-checked') === 'true';

    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
      this.toggle(startRow, endRow, target, expanded);
      event.preventDefault();
      return;
    }
    if ((!expanded && keyboardEvent.key === 'ArrowRight') || (expanded && keyboardEvent.key === 'ArrowLeft')) {
      this.toggle(startRow, endRow, target, expanded);
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

  private onClick(event: Event, startRow: Element, endRow: Element): void {
    const tr = event.target as Element;
    if (!tr) {
      return;
    }

    const expanded = tr.getAttribute('aria-checked') === 'true';
    this.toggle(startRow, endRow, tr, expanded);
    event.preventDefault();
  }

  refresh(): void {
    const timeRanges = this.calculateServiceWorkerUpdateRanges();
    this.updateTimingTable(timeRanges);
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
