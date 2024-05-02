// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as Types from '../../../../../front_end/models/trace/types/types.js';
import type * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import type * as LegacyUI from '../../../../../front_end/ui/legacy/legacy.js';
import {getBrowserAndPages, waitFor, waitForMany} from '../../../../shared/helper.js';
import {describe, it} from '../../../../shared/mocha-extensions.js';
import {loadComponentDocExample, preloadForCodeCoverage} from '../../../helpers/shared.js';

describe('FlameChart', function() {
  preloadForCodeCoverage('performance_panel/basic.html');
  // TODO(crbug.com/1472155): Improve perf panel trace load speed to prevent timeout bump.
  if (this.timeout() !== 0) {
    this.timeout(20_000);
  }
  async function getCoordinatesForEntryWithTitleAndTs(
      title: string, tsMicroSecs: number): Promise<{x: number, y: number}> {
    const perfPanel = await waitFor('.vbox.panel.timeline');
    return await perfPanel.evaluate((element: Element, title: string, ts: number) => {
      const panelWidget = element as LegacyUI.Widget.WidgetElement;
      const panel = panelWidget.__widget as Timeline.TimelinePanel.TimelinePanel;
      const mainFlameChart = panel.getFlameChart().getMainFlameChart();
      const data = mainFlameChart.timelineData();
      if (!data) {
        throw new Error('Timeline data was not found');
      }
      const entryIndices =
          data?.entryStartTimes.map((_time, i) => i).filter(index => data.entryStartTimes[index] === (ts / 1000));
      const matchedIndex = entryIndices.find(index => mainFlameChart.entryTitle(index) === title);
      if (!matchedIndex) {
        throw new Error('Match was not found');
      }
      const eventCoordinates = mainFlameChart.entryIndexToCoordinates(matchedIndex);
      if (!eventCoordinates) {
        throw new Error('Coordinates were not found');
      }
      const {x, y} = eventCoordinates;
      return {x, y};
    }, title, tsMicroSecs);
  }

  async function createTimelineBreadcrumb(
      startTime: Types.Timing.MilliSeconds, endTime: Types.Timing.MilliSeconds): Promise<void> {
    const perfPanel = await waitFor('.vbox.panel.timeline');
    await perfPanel.evaluate(
        (element: Element, startTime: Types.Timing.MilliSeconds, endTime: Types.Timing.MilliSeconds) => {
          const panelWidget = element as LegacyUI.Widget.WidgetElement;
          const timelinePanel = panelWidget.__widget as Timeline.TimelinePanel.TimelinePanel;
          timelinePanel.getMinimap().addBreadcrumb({startTime, endTime});
        },
        startTime, endTime);
  }

  it('shows the details of an entry when selected on the timeline', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=simple-js-program');
    await waitFor('.timeline-flamechart');
    const {frontend} = getBrowserAndPages();

    // Add some margin to the coordinates so that we don't click right
    // in the entry's border.
    const margin = 3;

    // Click on an entry on the timings track first.
    const titleForTimingEntry = 'label1';
    const timeStampForTimingEntry = 251126671072;
    const {x: timingEntryX, y: timingEntryY} =
        await getCoordinatesForEntryWithTitleAndTs(titleForTimingEntry, timeStampForTimingEntry);
    await frontend.mouse.click(timingEntryX + margin, timingEntryY + margin);
    const timingTitleHandle = await waitFor('.timeline-details-chip-title');
    const timingTitle = await timingTitleHandle.evaluate(element => element.innerHTML);
    assert.isTrue(timingTitle.includes('label1'));

    // Now click on an entry on the main thread track and ensure details
    // are visible.
    const titleForMainEntry = 'Task';
    const timeStampForMainEntry = 251126679497;
    const {x: mainEntryX, y: mainEntryY} =
        await getCoordinatesForEntryWithTitleAndTs(titleForMainEntry, timeStampForMainEntry);
    await frontend.mouse.click(mainEntryX + margin, mainEntryY + margin);
    const mainEntryTitles1 = await waitForMany('.timeline-details-chip-title', 2);
    let mainEntryNameHandle = mainEntryTitles1[0];
    let mainEntryName = await mainEntryNameHandle.evaluate(element => element.innerHTML);
    assert.isTrue(mainEntryName.includes('Task'));

    const piechartTitleHandle = mainEntryTitles1[1];
    const piechartTitle = await piechartTitleHandle.evaluate(element => element.innerHTML);
    assert.isTrue(piechartTitle.includes('Aggregated Time'));

    // Ensure details are still visible after some time.
    await new Promise(res => setTimeout(res, 200));
    const mainEntryTitles2 = await waitForMany('.timeline-details-chip-title', 2);
    mainEntryNameHandle = mainEntryTitles2[0];
    mainEntryName = await mainEntryNameHandle.evaluate(element => element.innerHTML);
    assert.isTrue(mainEntryName.includes('Task'));
  });

  it('reveals an event\'s initiator in the flamechart', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=web-dev');
    await waitFor('.timeline-flamechart');
    const {frontend} = getBrowserAndPages();

    // Add some margin to the coordinates so that we don't click right
    // in the entry's border.
    const margin = 3;

    // Click on an entry that has an initiator and click the initiator link.
    const titleForTimerFire = 'Timer Fired';
    const timeStampForTimerFire = 1020035170393;
    const {x: timerFireEntryX, y: timerFireEntryY} =
        await getCoordinatesForEntryWithTitleAndTs(titleForTimerFire, timeStampForTimerFire);
    await frontend.mouse.click(timerFireEntryX + margin, timerFireEntryY + margin);

    const timerFireHandle = await waitFor('.timeline-details-chip-title');
    const timerFireTitle = await timerFireHandle.evaluate(element => element.innerHTML);
    assert.isTrue(timerFireTitle.includes('Timer Fired'));
    const initiatorLink = await waitFor('[data-row-title="Initiated by"] .timeline-details-view-row-value');
    await initiatorLink.click();

    // Make sure the highlighting element is on the initiator, with some
    // margin error.
    const titleForTimerInstall = 'Install Timer';
    const timeStampForTimerInstall = 1020035169385;
    const {x: timerInstallEntryX, y: timerInstallEntryY} =
        await getCoordinatesForEntryWithTitleAndTs(titleForTimerInstall, timeStampForTimerInstall);

    const highlightElement = await waitFor('.flame-chart-selected-element');

    const {x: highlightX, y: highlightY} = await highlightElement.evaluate(element => {
      const {x, y} = element.getBoundingClientRect();
      return {x, y};
    });

    assert.isTrue(highlightX <= timerInstallEntryX + margin && highlightX >= timerInstallEntryX - margin);
    assert.isTrue(highlightY <= timerInstallEntryY + margin && highlightY >= timerInstallEntryY - margin);

    // Make sure the initiator details are visible.
    const installTimerHandle = await waitFor('.timeline-details-chip-title');
    const installTimerTitle = await installTimerHandle.evaluate(element => element.innerHTML);
    assert.isTrue(installTimerTitle.includes('Install Timer'));
  });

  it('navigates to the event\'s initiator and back to the initiated event in the flamechart ', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=web-dev');
    await waitFor('.timeline-flamechart');
    const {frontend} = getBrowserAndPages();

    // Add some margin to the coordinates so that we don't click right
    // in the entry's border.
    const margin = 3;

    // Click on an entry that has an initiator and click the initiator link.
    const titleForTimerFire = 'Timer Fired';
    const timeStampForTimerFire = 1020035170393;
    const {x: timerFireEntryX, y: timerFireEntryY} =
        await getCoordinatesForEntryWithTitleAndTs(titleForTimerFire, timeStampForTimerFire);
    await frontend.mouse.click(timerFireEntryX + margin, timerFireEntryY + margin);

    let timerFireHandle = await waitFor('.timeline-details-chip-title');
    let timerFireTitle = await timerFireHandle.evaluate(element => element.innerHTML);
    assert.isTrue(timerFireTitle.includes('Timer Fired'));
    let initiatorLink = await waitFor('[data-row-title="Initiated by"] .timeline-details-view-row-value');
    await initiatorLink.click();

    // Make sure that the summary now contains the initiator info
    const installTimerHandle = await waitFor('.timeline-details-chip-title');
    const installTimerTitle = await installTimerHandle.evaluate(element => element.innerHTML);
    assert.isTrue(installTimerTitle.includes('Install Timer'));

    // Find the field that has a link this event initiated and click it.
    timerFireHandle = await waitFor('.timeline-details-chip-title');
    timerFireTitle = await timerFireHandle.evaluate(element => element.innerHTML);
    assert.isTrue(timerFireTitle.includes('Install Timer'));
    initiatorLink = await waitFor('[data-row-title="Initiator for"] .timeline-details-view-row-value');

    await initiatorLink.click();
    // Make sure the details contain the initial event name
    timerFireHandle = await waitFor('.timeline-details-chip-title');
    timerFireTitle = await timerFireHandle.evaluate(element => element.innerHTML);
    assert.isTrue(timerFireTitle.includes('Timer Fired'));
  });

  it('the initiator link changes to text if the link is for an entry that is outside of the current breadcrumb',
     async () => {
       await loadComponentDocExample('performance_panel/basic.html?trace=web-dev');
       await waitFor('.timeline-flamechart');
       const {frontend} = getBrowserAndPages();

       // Add some margin to the coordinates so that we don't click right
       // in the entry's border.
       const margin = 3;

       // Click on an entry that has an initiator.
       const titleForTimerFire = 'Timer Fired';
       const timeStampForTimerFire = 1020035170393;
       const {x: timerFireEntryX, y: timerFireEntryY} =
           await getCoordinatesForEntryWithTitleAndTs(titleForTimerFire, timeStampForTimerFire);
       await frontend.mouse.click(timerFireEntryX + margin, timerFireEntryY + margin);

       let timerFireHandle = await waitFor('.timeline-details-chip-title');
       let timerFireTitle = await timerFireHandle.evaluate(element => element.innerHTML);
       assert.isTrue(timerFireTitle.includes('Timer Fired'));
       let initiatorLink = await waitFor('[data-row-title="Initiated by"] .timeline-details-view-row-value');

       // Before a breadcrumb is created, the link to the entry initiator is activated. Check it by getting the 'role' attribute and ckecking if it is 'link'.
       let initiatorLinkRole =
           await initiatorLink.evaluate(element => element.querySelector('span')?.getAttribute('role'));
       assert.strictEqual(initiatorLinkRole, 'link');
       // When the initiator link is active, its' text is the name of an entry it is linking to.
       let initiatorLinkText = await initiatorLink.evaluate(element => element.textContent);
       assert.strictEqual(initiatorLinkText, 'Install Timer');

       // Create a breadcrumb that is outside of the entry the displayed link is linking to.
       const breadcrumbStart = 1020034823 as Types.Timing.MilliSeconds;
       const breadcrumbEnd = 1020034830 as Types.Timing.MilliSeconds;
       await createTimelineBreadcrumb(breadcrumbStart, breadcrumbEnd);

       timerFireHandle = await waitFor('.timeline-details-chip-title');
       timerFireTitle = await timerFireHandle.evaluate(element => element.innerHTML);
       assert.isTrue(timerFireTitle.includes('Timer Fired'));
       // The link to the initiator is now deactivated and the name is followed by 'outside of the breadcrumb range'
       initiatorLink = await waitFor('[data-row-title="Initiated by"] .timeline-details-view-row-value');
       initiatorLinkText = await initiatorLink.evaluate(element => element.textContent);
       assert.strictEqual(initiatorLinkText, 'Install Timer (outside of the breadcrumb range)');

       // The link to the entry should not be active.
       initiatorLinkRole = await initiatorLink.evaluate(element => element.querySelector('span')?.getAttribute('role'));
       assert.notEqual(initiatorLinkRole, 'link');
     });
});
