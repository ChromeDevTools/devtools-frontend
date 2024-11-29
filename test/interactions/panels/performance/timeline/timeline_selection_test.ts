// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as Trace from '../../../../../front_end/models/trace/trace.js';
import type * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import {getBrowserAndPages, waitFor, waitForMany} from '../../../../shared/helper.js';
import {loadComponentDocExample} from '../../../helpers/shared.js';

describe('FlameChart', function() {
  ('performance_panel/basic.html');
  // TODO(crbug.com/1472155): Improve perf panel trace load speed to prevent timeout bump.
  if (this.timeout() !== 0) {
    this.timeout(20_000);
  }
  async function getCoordinatesForEntryWithTitleAndTs(
      title: string, tsMicroSecs: number): Promise<{x: number, y: number}> {
    const {frontend} = getBrowserAndPages();
    return await frontend.evaluate((title: string, ts: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const panel = (window as any).UI.panels.timeline as Timeline.TimelinePanel.TimelinePanel;
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
      const entryGroup = panel.getFlameChart().getMainDataProvider().groupForEvent(matchedIndex);
      const groupIndex = entryGroup && data.groups.indexOf(entryGroup);
      if (groupIndex === null || groupIndex < 0) {
        throw new Error('groupIndex was not found');
      }
      // Ensure the entry's track is expanded
      if (!entryGroup?.expanded) {
        mainFlameChart.toggleGroupExpand(groupIndex);
      }

      const eventCoordinates = mainFlameChart.entryIndexToCoordinates(matchedIndex);
      if (!eventCoordinates) {
        throw new Error('Coordinates were not found');
      }
      const {x, y} = eventCoordinates;
      return {x, y};
    }, title, tsMicroSecs);
  }

  async function setWindowTimes(startMs: number, endMs: number): Promise<void> {
    const {frontend} = getBrowserAndPages();
    await frontend.evaluate((start: number, end: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const panel = (window as any).UI.panels.timeline as Timeline.TimelinePanel.TimelinePanel;
      const mainFlameChart = panel.getFlameChart().getMainFlameChart();
      mainFlameChart.setWindowTimes(start, end, false);
      mainFlameChart.update();
    }, startMs, endMs);
  }
  async function getOffsetForGroupWithName(title: string): Promise<number> {
    const {frontend} = getBrowserAndPages();
    return await frontend.evaluate((title: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const panel = (window as any).UI.panels.timeline as Timeline.TimelinePanel.TimelinePanel;
      const mainFlameChart = panel.getFlameChart().getMainFlameChart();
      const data = mainFlameChart.timelineData();
      if (!data) {
        throw new Error('Timeline data was not found');
      }
      const groupIndex = data.groups.findIndex(group => group.name === title);
      if (groupIndex < 0) {
        throw new Error('Group not found');
      }
      return mainFlameChart.groupIndexToOffsetForTest(groupIndex) + mainFlameChart.getCanvasOffset().y;
    }, title);
  }
  async function createTimelineBreadcrumb(
      startTime: Trace.Types.Timing.MilliSeconds, endTime: Trace.Types.Timing.MilliSeconds): Promise<void> {
    const {frontend} = getBrowserAndPages();
    await frontend.evaluate((startTime: Trace.Types.Timing.MilliSeconds, endTime: Trace.Types.Timing.MilliSeconds) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const timelinePanel = (window as any).UI.panels.timeline as Timeline.TimelinePanel.TimelinePanel;
      timelinePanel.getMinimap().addBreadcrumb({startTime, endTime});
    }, startTime, endTime);
  }

  it('shows the details of an entry when selected on the timeline', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=simple-js-program');
    await waitFor('.timeline-flamechart');
    const {frontend} = getBrowserAndPages();

    // Add some margin to the coordinates so that we don't click right
    // in the entry's border.
    const margin = 3;

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
    assert.isTrue(piechartTitle.includes('Aggregated time'));

    // Ensure details are still visible after some time.
    await new Promise(res => setTimeout(res, 200));
    const mainEntryTitles2 = await waitForMany('.timeline-details-chip-title', 2);
    mainEntryNameHandle = mainEntryTitles2[0];
    mainEntryName = await mainEntryNameHandle.evaluate(element => element.innerHTML);
    assert.isTrue(mainEntryName.includes('Task'));
  });

  it('reveals an event\'s initiator in the flamechart', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=async-js-calls');
    await waitFor('.timeline-flamechart');
    const {frontend} = getBrowserAndPages();

    // Add some margin to the coordinates so that we don't click right
    // in the entry's border.
    const margin = 3;

    // Click on an entry that has an initiator and click the initiator link.
    const queryForFunctionCall = 'Function call';
    const timeStampForFunctionCall = 131719500206;
    const {x: timerFireEntryX, y: timerFireEntryY} =
        await getCoordinatesForEntryWithTitleAndTs(queryForFunctionCall, timeStampForFunctionCall);
    await frontend.mouse.click(timerFireEntryX + margin, timerFireEntryY + margin);

    const functionCallHandle = await waitFor('.timeline-details-chip-title');
    const functionCallTitle = await functionCallHandle.evaluate(element => element.innerHTML);
    assert.isTrue(functionCallTitle.includes(queryForFunctionCall));
    const initiatorLink = await waitFor('[data-row-title="Initiated by"] .timeline-details-view-row-value');
    await initiatorLink.click();

    // Make sure the highlighting element is on the initiator, with some
    // margin error.
    const queryForRAF = 'requestAnimationFrame';
    const timeStampForRaf = 131719499377;
    const {x: rAFEntryX, y: rAFEntryY} = await getCoordinatesForEntryWithTitleAndTs(queryForRAF, timeStampForRaf);

    const highlightElement = await waitFor('.overlay-type-ENTRY_SELECTED');

    const {x: highlightX, y: highlightY} = await highlightElement.evaluate(element => {
      const {x, y} = element.getBoundingClientRect();
      return {x, y};
    });

    assert.isTrue(highlightX <= rAFEntryX + margin && highlightX >= rAFEntryX - margin);
    assert.isTrue(highlightY <= rAFEntryY + margin && highlightY >= rAFEntryY - margin);

    // Make sure the initiator details are visible.
    const installTimerHandle = await waitFor('.timeline-details-chip-title');
    const installTimerTitle = await installTimerHandle.evaluate(element => element.innerHTML);
    assert.isTrue(installTimerTitle.includes(queryForRAF));
  });

  it('navigates to the initiated event in the flamechart from its initiator\'s details', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=async-js-calls');
    await waitFor('.timeline-flamechart');
    await setWindowTimes(131719487.460, 131719515.377);
    const {frontend} = getBrowserAndPages();

    // Add some margin to the coordinates so that we don't click right
    // in the entry's border.
    const margin = 3;

    const queryForRAF = 'requestAnimationFrame';
    const timeStampForRaf = 131719499377;
    const {x: rAFEntryX, y: rAFEntryY} = await getCoordinatesForEntryWithTitleAndTs(queryForRAF, timeStampForRaf);

    await frontend.mouse.click(rAFEntryX, rAFEntryY + margin);

    const functionCallHandle = await waitFor('.timeline-details-chip-title');
    const functionCallTitle = await functionCallHandle.evaluate(element => element.innerHTML);
    assert.isTrue(functionCallTitle.includes(queryForRAF));

    const initiatorLink = await waitFor('[data-row-title="Initiator for"] .timeline-details-view-row-value');
    await initiatorLink.click();

    // Make sure the initiated event details are visible.
    const installTimerHandle = await waitFor('.timeline-details-chip-title');
    const installTimerTitle = await installTimerHandle.evaluate(element => element.innerHTML);
    assert.isTrue(installTimerTitle.includes('Function call'));
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
       const queryForStyleRecalc = 'Recalculate style';
       const timeStampForTimerFire = 1020035005603;
       const {x: timerFireEntryX, y: timerFireEntryY} =
           await getCoordinatesForEntryWithTitleAndTs(queryForStyleRecalc, timeStampForTimerFire);
       await frontend.mouse.click(timerFireEntryX + margin, timerFireEntryY + margin);

       const styleRecalcHandle = await waitFor('.timeline-details-chip-title');
       const styleRecalcTitle = await styleRecalcHandle.evaluate(element => element.innerHTML);
       assert.isTrue(styleRecalcTitle.includes(queryForStyleRecalc));
       let initiatorLink = await waitFor('[data-row-title="Initiated by"] .timeline-details-view-row-value');

       // Before a breadcrumb is created, the link to the entry initiator is activated. Check it by getting the 'role' attribute and ckecking if it is 'link'.
       let initiatorLinkRole =
           await initiatorLink.evaluate(element => element.querySelector('span')?.getAttribute('role'));
       assert.strictEqual(initiatorLinkRole, 'link');
       // When the initiator link is active, its' text is the name of an entry it is linking to.
       let initiatorLinkText = await initiatorLink.evaluate(element => element.textContent);
       assert.strictEqual(initiatorLinkText, 'Schedule style recalculation');

       // Create a breadcrumb that is outside of the entry the displayed link is linking to.
       const breadcrumbStart = 1020034993.608 as Trace.Types.Timing.MilliSeconds;
       const breadcrumbEnd = 1020035017.841 as Trace.Types.Timing.MilliSeconds;
       await createTimelineBreadcrumb(breadcrumbStart, breadcrumbEnd);

       // The link to the initiator is now deactivated and the name is followed by 'outside of the breadcrumb range'
       initiatorLink = await waitFor('[data-row-title="Initiated by"] .timeline-details-view-row-value');
       initiatorLinkText = await initiatorLink.evaluate(element => element.textContent);
       assert.strictEqual(initiatorLinkText, 'Schedule style recalculation (outside of the breadcrumb range)');

       // The link to the entry should not be active.
       initiatorLinkRole = await initiatorLink.evaluate(element => element.querySelector('span')?.getAttribute('role'));
       assert.notEqual(initiatorLinkRole, 'link');
     });
  it('shows a tooltip describing an extension track when its header is hovered', async () => {
    await loadComponentDocExample(
        'performance_panel/basic.html?trace=extension-tracks-and-marks&disable-auto-performance-sidebar-reveal');
    await waitFor('.timeline-flamechart');
    const {frontend} = getBrowserAndPages();
    const margin = 3;
    const trackName = 'A track group — Custom track';
    const groupOffset = await getOffsetForGroupWithName(trackName);
    await frontend.mouse.move(margin, groupOffset);
    const popoverHandle = await waitFor('.timeline-entry-tooltip-element');
    const timingTitle = await popoverHandle.evaluate(element => (element as HTMLElement).innerText);
    assert.strictEqual(timingTitle, 'This is a custom track added by a third party.');
  });
});
