// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Trace from '../../models/trace/trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {dispatchClickEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
  registerNoopActions,
} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Timeline from './timeline.js';

async function contentDataToFile(contentData: TextUtils.ContentData.ContentData): Promise<Trace.Types.File.TraceFile> {
  if (contentData.isTextContent) {
    return JSON.parse(contentData.text) as Trace.Types.File.TraceFile;
  }

  const decoded = Common.Base64.decode(contentData.base64);
  const text = await Common.Gzip.arrayBufferToString(decoded.buffer);
  return JSON.parse(text) as Trace.Types.File.TraceFile;
}

describeWithEnvironment('TimelinePanel', function() {
  let timeline: Timeline.TimelinePanel.TimelinePanel;
  let traceModel: Trace.TraceModel.Model;
  beforeEach(() => {
    registerNoopActions(
        ['timeline.toggle-recording', 'timeline.record-reload', 'timeline.show-history', 'components.collect-garbage']);
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(
        SDK.TargetManager.TargetManager.instance(),
        Workspace.Workspace.WorkspaceImpl.instance(),
    );
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager: SDK.TargetManager.TargetManager.instance(),
      ignoreListManager,
    });
    Timeline.ModificationsManager.ModificationsManager.reset();
    traceModel = Trace.TraceModel.Model.createWithAllHandlers();
    timeline = Timeline.TimelinePanel.TimelinePanel.instance({forceNew: true, isNode: false, traceModel});
    renderElementIntoDOM(timeline);
  });

  afterEach(() => {
    timeline.detach();
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.removeInstance();
    Workspace.IgnoreListManager.IgnoreListManager.removeInstance();
  });

  it('should keep other tracks when the custom tracks setting is toggled', async function() {
    const events =
        await TraceLoader.rawEvents(this, 'extension-tracks-and-marks.json.gz') as Trace.Types.Events.Event[];
    await timeline.loadingComplete(events, null, null);
    const tracksBeforeDisablingSetting = timeline.getFlameChart().getMainDataProvider().timelineData().groups;
    const parsedTrace = traceModel.parsedTrace();
    const extensionTracksInTrace = parsedTrace?.ExtensionTraceData.extensionTrackData;
    const extensionTrackInTraceNames = extensionTracksInTrace?.flatMap(
        track => track.isTrackGroup ? [...Object.keys(track.entriesByTrack), track.name] : track.name);

    assert.exists(extensionTrackInTraceNames);

    // Test that extension tracks from the trace model are rendered in
    // the flamechart data.
    const extensionTracksInFlamechartBeforeDisabling =
        tracksBeforeDisablingSetting
            .filter(
                track => track.jslogContext === Timeline.CompatibilityTracksAppender.VisualLoggingTrackName.EXTENSION)
            .map(track => track.name.split(' — Custom track')[0]);
    const nonExtensionTrackNames =
        tracksBeforeDisablingSetting
            .filter(
                track => track.jslogContext !== Timeline.CompatibilityTracksAppender.VisualLoggingTrackName.EXTENSION)
            .map(track => track.name);

    assert.includeMembers(extensionTracksInFlamechartBeforeDisabling, extensionTrackInTraceNames.map(track => track));
    assert.lengthOf(extensionTracksInFlamechartBeforeDisabling, extensionTrackInTraceNames.length);

    // Disable setting
    const customTracksSetting = Timeline.TimelinePanel.TimelinePanel.extensionDataVisibilitySetting();
    customTracksSetting.set(false);

    // Test that extension tracks are not rendered in the flamechart,
    // but other tracks are.
    const tracksAfterDisablingSetting = timeline.getFlameChart().getMainDataProvider().timelineData().groups;
    const extensionTracksAfterDisabling = tracksAfterDisablingSetting.filter(
        track => track.jslogContext === Timeline.CompatibilityTracksAppender.VisualLoggingTrackName.EXTENSION);
    const trackNamesAfterDisablingSetting =
        tracksAfterDisablingSetting.map(track => track.name.split(' — Custom track')[0]);
    assert.lengthOf(extensionTracksAfterDisabling, 0);
    assert.deepEqual(trackNamesAfterDisablingSetting, nonExtensionTrackNames);

    // Enable setting again
    customTracksSetting.set(true);

    const tracksAfterEnablingSetting = timeline.getFlameChart().getMainDataProvider().timelineData().groups;
    assert.deepEqual(tracksBeforeDisablingSetting, tracksAfterEnablingSetting);
  });

  it('should keep marker overlays when the custom tracks setting is toggled', async function() {
    const events = await TraceLoader.rawEvents(this, 'web-dev.json.gz') as Trace.Types.Events.Event[];
    await timeline.loadingComplete(events, null, null);
    const overlaysBeforeDisablingSetting = timeline.getFlameChart().overlays().allOverlays();

    // Test that overlays are rendered in the timeline
    assert.isAbove(overlaysBeforeDisablingSetting.length, 0);

    // Disable setting
    const customTracksSetting = Timeline.TimelinePanel.TimelinePanel.extensionDataVisibilitySetting();
    customTracksSetting.set(false);

    // Test that overlays remain untouched
    const overlaysAfterDisablingSetting = timeline.getFlameChart().overlays().allOverlays();
    assert.deepEqual(overlaysBeforeDisablingSetting, overlaysAfterDisablingSetting);

    // Enable setting again
    customTracksSetting.set(true);

    const overlaysAfterEnablingSetting = timeline.getFlameChart().overlays().allOverlays();
    assert.deepEqual(overlaysBeforeDisablingSetting, overlaysAfterEnablingSetting);
  });

  it('keeps entries set to be dimmed as so after toggling the custom tracks setting', async function() {
    const events = await TraceLoader.rawEvents(this, 'web-dev.json.gz') as Trace.Types.Events.Event[];
    await timeline.loadingComplete(events, null, null);
    const thirdPartyDimSetting = Common.Settings.Settings.instance().createSetting('timeline-dim-third-parties', false);

    // Dim 3P entries.
    thirdPartyDimSetting.set(true);
    const dimIndicesBeforeToggle = timeline.getFlameChart().getMainFlameChart().getDimIndices();
    assert.exists(dimIndicesBeforeToggle);
    assert.isAbove(dimIndicesBeforeToggle.length, 0);

    // Toggle the custom track setting and verify 3P entries remain dimmed.
    Timeline.TimelinePanel.TimelinePanel.extensionDataVisibilitySetting().set(true);
    const dimIndicesAfterToggle = timeline.getFlameChart().getMainFlameChart().getDimIndices();
    assert.exists(dimIndicesAfterToggle);
    assert.isAbove(dimIndicesAfterToggle.length, 0);
  });

  it('keeps annotations after toggling the custom tracks setting and does not aria alert the user twice',
     async function() {
       const events = await TraceLoader.rawEvents(this, 'web-dev.json.gz') as Trace.Types.Events.Event[];
       await timeline.loadingComplete(events, null, null);
       const parsedTrace = traceModel.parsedTrace();
       assert.isOk(parsedTrace?.Meta.traceBounds.min);
       const modificationsManager = Timeline.ModificationsManager.ModificationsManager.activeManager();
       assert.isOk(modificationsManager);
       const ariaAlertStub = sinon.spy(UI.ARIAUtils.LiveAnnouncer, 'alert');
       // Add an annotation
       modificationsManager.createAnnotation(
           {
             bounds: Trace.Helpers.Timing.traceWindowFromMicroSeconds(
                 parsedTrace.Meta.traceBounds.min, parsedTrace.Meta.traceBounds.max),
             type: 'TIME_RANGE',
             label: '',
           },
           {loadedFromFile: false, muteAriaNotifications: false});

       sinon.assert.calledOnceWithExactly(ariaAlertStub, 'The time range annotation has been added');

       const annotationsBeforeToggle =
           timeline.getFlameChart().overlays().allOverlays().filter(e => e.type === 'TIME_RANGE');
       assert.exists(annotationsBeforeToggle);
       assert.lengthOf(annotationsBeforeToggle, 1);

       // Toggle the custom track setting and verify annotations remain.
       Timeline.TimelinePanel.TimelinePanel.extensionDataVisibilitySetting().set(true);
       const annotationsAfterToggle =
           timeline.getFlameChart().overlays().allOverlays().filter(e => e.type === 'TIME_RANGE');
       assert.exists(annotationsAfterToggle);
       assert.isAbove(annotationsAfterToggle.length, 0);

       // Ensure the alert wasn't fired again after the custom tracks setting
       // was toggled.
       sinon.assert.calledOnce(ariaAlertStub);
     });

  it('clears out AI related contexts when the user presses "Clear"', async () => {
    const context = UI.Context.Context.instance();
    const {AIContext, AICallTree} = Timeline.Utils;

    const callTree = sinon.createStubInstance(AICallTree.AICallTree);
    context.setFlavor(AIContext.AgentFocus, AIContext.AgentFocus.fromCallTree(callTree));

    const clearButton = timeline.element.querySelector('[aria-label="Clear"]');
    assert.isOk(clearButton);
    dispatchClickEvent(clearButton);

    assert.isNull(context.flavor(AIContext.AgentFocus));
  });

  it('includes the trace metadata when saving to a file', async function() {
    const events = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz') as Trace.Types.Events.Event[];
    const metadata = await TraceLoader.metadata(this, 'web-dev-with-commit.json.gz');
    await timeline.loadingComplete(events, null, metadata);
    const fileManager = Workspace.FileManager.FileManager.instance();
    const saveSpy = sinon.stub(fileManager, 'save').callsFake((): Promise<Workspace.FileManager.SaveCallbackParam> => {
      return Promise.resolve({});
    });
    sinon.stub(fileManager, 'close');

    await timeline.saveToFile({
      includeScriptContent: false,
      includeSourceMaps: false,
      addModifications: false,
    });

    sinon.assert.calledOnce(saveSpy);

    const [, contentData] = saveSpy.getCall(0).args;

    // Assert that each value in the metadata of the JSON matches the metadata in memory.
    // We can't do a simple deepEqual() on the two objects as the in-memory
    // contains values that are `undefined` which do not exist in the JSON
    // version.
    const file = await contentDataToFile(contentData);
    for (const k in file) {
      const key = k as keyof Trace.Types.File.MetaData;
      assert.deepEqual(file.metadata[key], metadata[key]);
    }
  });

  describe('handleExternalRecordRequest', () => {
    it('returns information on the insights found in the recording', async function() {
      const uiView = UI.ViewManager.ViewManager.instance({forceNew: true});
      sinon.stub(uiView, 'showView');

      const events = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz') as Trace.Types.Events.Event[];
      await timeline.loadingComplete(events, null, null);

      sinon.stub(timeline, 'recordReload').callsFake(() => {
        timeline.dispatchEventToListeners(Timeline.TimelinePanel.Events.RECORDING_COMPLETED, {traceIndex: 0});
      });

      const generator = Timeline.TimelinePanel.TimelinePanel.handleExternalRecordRequest();
      let externalRequestResponse = await generator.next();
      while (!externalRequestResponse.done) {
        externalRequestResponse = await generator.next();
      }
      const {message} = externalRequestResponse.value;
      assert.include(message, '# Trace recording results');
      const EXPECTED_INSIGHT_TITLES = [
        'LCP breakdown',
        'LCP request discovery',
        'Render blocking requests',
        'Document request latency',
      ];
      for (const title of EXPECTED_INSIGHT_TITLES) {
        assert.include(message, `### Insight Title: ${title}`);
      }

      assert.include(message, `- Time to first byte: 7.94 ms (6.1% of total LCP time)
- Resource load delay: 33.16 ms (25.7% of total LCP time)
- Resource load duration: 14.70 ms (11.4% of total LCP time)
- Element render delay: 73.41 ms (56.8% of total LCP time)`);
    });

    it('includes information on passing insights under a separate heading', async function() {
      const uiView = UI.ViewManager.ViewManager.instance({forceNew: true});
      sinon.stub(uiView, 'showView');

      const events = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz') as Trace.Types.Events.Event[];
      await timeline.loadingComplete(events, null, null);

      sinon.stub(timeline, 'recordReload').callsFake(() => {
        timeline.dispatchEventToListeners(Timeline.TimelinePanel.Events.RECORDING_COMPLETED, {traceIndex: 0});
      });

      const generator = Timeline.TimelinePanel.TimelinePanel.handleExternalRecordRequest();
      let externalRequestResponse = await generator.next();
      while (!externalRequestResponse.done) {
        externalRequestResponse = await generator.next();
      }
      const {message} = externalRequestResponse.value;
      assert.include(message, '# Trace recording results');

      assert.include(message, '## Non-passing insights:');
      const EXPECTED_INSIGHT_TITLES = [
        'INP breakdown',
        'Layout shift culprits',
      ];
      for (const title of EXPECTED_INSIGHT_TITLES) {
        assert.include(message, `### Insight Title: ${title}`);
      }
    });
  });

  describe('saveToFile', function() {
    let fileManager: Workspace.FileManager.FileManager;
    let saveSpy: sinon.SinonStub;
    let closeSpy: sinon.SinonStub;

    beforeEach(() => {
      fileManager = Workspace.FileManager.FileManager.instance();
      saveSpy = sinon.stub(fileManager, 'save').callsFake((): Promise<Workspace.FileManager.SaveCallbackParam> => {
        return Promise.resolve({});
      });
      closeSpy = sinon.stub(fileManager, 'close');
    });

    describe('with gz', function() {
      this.beforeAll(() => {
        Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.TIMELINE_SAVE_AS_GZ);
      });

      this.afterAll(() => {
        Root.Runtime.experiments.disableForTest(Root.Runtime.ExperimentName.TIMELINE_SAVE_AS_GZ);
      });

      it('saves a regular trace file', async function() {
        const {traceEvents, metadata} = await TraceLoader.traceFile(this, 'web-dev.json.gz');
        await timeline.innerSaveToFile(traceEvents, metadata, {
          includeScriptContent: false,
          includeSourceMaps: false,
          addModifications: false,
        });

        sinon.assert.calledOnce(saveSpy);
        sinon.assert.calledOnce(closeSpy);

        const [fileName, contentData] = saveSpy.getCall(0).args;
        assert.match(fileName, /Trace-[\d|T]+\.json.gz$/);

        const file = await contentDataToFile(contentData);
        assert.isUndefined(file.metadata.enhancedTraceVersion);
        assert.deepEqual(file.traceEvents, traceEvents);

        // All `StubScriptCatchup` should have durations
        for (const event of file.traceEvents) {
          if (event.name === 'StubScriptCatchup') {
            assert.isDefined(event.dur);
          }
        }
      });

      it('saves a CPU profile trace file', async function() {
        const profile = await TraceLoader.rawCPUProfile(this, 'node-fibonacci-website.cpuprofile.gz');
        const file = Trace.Helpers.SamplesIntegrator.SamplesIntegrator.createFakeTraceFromCpuProfile(
            profile, Trace.Types.Events.ThreadID(1));
        const {traceEvents, metadata} = file;

        await timeline.innerSaveToFile(traceEvents, metadata, {
          includeScriptContent: false,
          includeSourceMaps: false,
          addModifications: false,
        });

        sinon.assert.calledOnce(saveSpy);
        sinon.assert.calledOnce(closeSpy);

        const [fileName, contentData] = saveSpy.getCall(0).args;
        assert.match(fileName, /CPU-[\d|T]+\.cpuprofile.gz$/);

        const traceFile = await contentDataToFile(contentData);
        const cpuFile = traceFile as unknown as Protocol.Profiler.Profile;
        const profile2 = Trace.Helpers.SamplesIntegrator.SamplesIntegrator.extractCpuProfileFromFakeTrace(traceEvents);
        assert.deepEqual(cpuFile, profile2);
      });

      it('saves an enhanced trace file without sourcemaps', async function() {
        const {traceEvents, metadata} = await TraceLoader.traceFile(this, 'enhanced-traces.json.gz');
        await timeline.innerSaveToFile(traceEvents, metadata, {
          includeScriptContent: true,
          includeSourceMaps: false,
          addModifications: false,
        });

        sinon.assert.calledOnce(saveSpy);
        sinon.assert.calledOnce(closeSpy);

        const [fileName, contentData] = saveSpy.getCall(0).args;
        assert.match(fileName, /EnhancedTrace-[\d|T]+\.json\.gz$/);

        const file = await contentDataToFile(contentData);
        assert.isDefined(file.metadata.enhancedTraceVersion);
        assert.isUndefined(file.metadata.sourceMaps);
      });

      it('saves an enhanced trace file with sourcemaps', async function() {
        const {traceEvents, metadata} = await TraceLoader.traceFile(this, 'dupe-js-inline-maps.json.gz');
        await timeline.innerSaveToFile(traceEvents, metadata, {
          includeScriptContent: true,
          includeSourceMaps: true,
          addModifications: false,
        });

        sinon.assert.calledOnce(saveSpy);
        sinon.assert.calledOnce(closeSpy);

        const [fileName, contentData] = saveSpy.getCall(0).args;
        assert.match(fileName, /EnhancedTrace-[\d|T]+\.json\.gz$/);

        const file = await contentDataToFile(contentData);
        assert.isDefined(file.metadata.enhancedTraceVersion);
        assert.isDefined(file.metadata.sourceMaps);
      });

      it('saves a trace file with modifications', async function() {
        const {traceEvents, metadata} = await TraceLoader.traceFile(this, 'web-dev.json.gz');
        // Load to initialize modification manager
        await timeline.loadingComplete(traceEvents as Trace.Types.Events.Event[], null, metadata);
        const modificationsManager = Timeline.ModificationsManager.ModificationsManager.activeManager();
        assert.isOk(modificationsManager);

        modificationsManager.createAnnotation(
            {
              bounds: Trace.Helpers.Timing.traceWindowFromMicroSeconds(
                  Trace.Types.Timing.Micro(1), Trace.Types.Timing.Micro(2)),
              type: 'TIME_RANGE',
              label: 'Test Annotation',
            },
            {loadedFromFile: false, muteAriaNotifications: false});

        await timeline.saveToFile({
          includeScriptContent: false,
          includeSourceMaps: false,
          addModifications: true,
        });

        sinon.assert.calledOnce(saveSpy);
        sinon.assert.calledOnce(closeSpy);

        const [, contentData] = saveSpy.getCall(0).args;
        const file = await contentDataToFile(contentData);
        assert.isDefined(file.metadata.modifications);
        assert.lengthOf(file.metadata.modifications.annotations.labelledTimeRanges, 1);
        assert.strictEqual(file.metadata.modifications.annotations.labelledTimeRanges[0].label, 'Test Annotation');
      });
    });
    describe('without gz', function() {
      it('saves a regular trace file', async function() {
        const {traceEvents, metadata} = await TraceLoader.traceFile(this, 'web-dev.json.gz');
        await timeline.innerSaveToFile(traceEvents, metadata, {
          includeScriptContent: false,
          includeSourceMaps: false,
          addModifications: false,
        });

        sinon.assert.calledOnce(saveSpy);
        sinon.assert.calledOnce(closeSpy);

        const [fileName, contentData] = saveSpy.getCall(0).args;
        assert.match(fileName, /Trace-[\d|T]+\.json$/);

        const file = await contentDataToFile(contentData);
        assert.isUndefined(file.metadata.enhancedTraceVersion);
        assert.deepEqual(file.traceEvents, traceEvents);
      });
    });

    describe('removes chrome-extensions content', function() {
      it('from trace events when saving a trace with "Include script content" on', async function() {
        const {traceEvents, metadata} =
            await TraceLoader.traceFile(this, 'chrome-ext-sourcemap-script-content.json.gz');
        await timeline.loadingComplete(traceEvents as Trace.Types.Events.Event[], null, metadata);

        // 7192505913775043000.8 matches a chrome-extension script in the trace
        let extensionTracesWithContent = traceEvents.filter(value => {
          return value.cat === 'disabled-by-default-devtools.v8-source-rundown-sources' &&
              `${(value as Trace.Types.Events.V8SourceRundownSourcesScriptCatchupEvent).args.data.isolate}.${
                  (value as Trace.Types.Events.V8SourceRundownSourcesScriptCatchupEvent).args.data.scriptId}` ===
              '7192505913775043000.8';
        });

        // loading the trace and verifying the chrome extension script has associated source text
        let castedEvent =
            (extensionTracesWithContent[0] as Trace.Types.Events.V8SourceRundownSourcesScriptCatchupEvent);
        assert.lengthOf(extensionTracesWithContent, 1);
        assert.isDefined(castedEvent.args.data.sourceText);

        await timeline.saveToFile({
          includeScriptContent: true,
          includeSourceMaps: false,
          addModifications: false,
        });

        sinon.assert.calledOnce(saveSpy);
        sinon.assert.calledOnce(closeSpy);

        const [fileName, contentData] = saveSpy.getCall(0).args;
        assert.match(fileName, /EnhancedTrace-[\d|T]+\.json$/);

        const file = await contentDataToFile(contentData);
        assert.isDefined(file.metadata.enhancedTraceVersion);

        // getting the same trace as before, but this time after saving has happened.
        extensionTracesWithContent = file.traceEvents?.filter(value => {
          return value.cat === 'disabled-by-default-devtools.v8-source-rundown-sources' &&
              `${(value as Trace.Types.Events.V8SourceRundownSourcesScriptCatchupEvent).args.data.isolate}.${
                  (value as Trace.Types.Events.V8SourceRundownSourcesScriptCatchupEvent).args.data.scriptId}` ===
              '7192505913775043000.8';
        });

        // the associated source text is now undefined from the chrome-extension script
        castedEvent = (extensionTracesWithContent[0] as Trace.Types.Events.V8SourceRundownSourcesScriptCatchupEvent);
        assert.lengthOf(extensionTracesWithContent, 1);
        assert.isUndefined(castedEvent.args.data.sourceText);

        // non-extension script content is still present (7192505913775043000.10)
        extensionTracesWithContent = file.traceEvents?.filter(value => {
          return value.cat === 'disabled-by-default-devtools.v8-source-rundown-sources' &&
              `${(value as Trace.Types.Events.V8SourceRundownSourcesScriptCatchupEvent).args.data.isolate}.${
                  (value as Trace.Types.Events.V8SourceRundownSourcesScriptCatchupEvent).args.data.scriptId}` ===
              '7192505913775043000.10';
        });
        castedEvent = (extensionTracesWithContent[0] as Trace.Types.Events.V8SourceRundownSourcesScriptCatchupEvent);
        assert.lengthOf(extensionTracesWithContent, 1);
        assert.isDefined(castedEvent.args.data.sourceText);
      });

      it('from trace sourcemaps when saving a trace with "Include source map" on', async function() {
        const {traceEvents, metadata} =
            await TraceLoader.traceFile(this, 'chrome-ext-sourcemap-script-content.json.gz');

        await timeline.innerSaveToFile(traceEvents, metadata, {
          includeScriptContent: true,
          includeSourceMaps: true,
          addModifications: false,
        });

        sinon.assert.calledOnce(saveSpy);
        sinon.assert.calledOnce(closeSpy);

        const [fileName, contentData] = saveSpy.getCall(0).args;
        assert.match(fileName, /EnhancedTrace-[\d|T]+\.json$/);

        const file = await contentDataToFile(contentData);
        assert.isDefined(file.metadata.enhancedTraceVersion);

        const totalSourceMapsWithChromExtensionProtocol = file.metadata.sourceMaps?.filter(value => {
          value.url.startsWith('chrome-extension:');
        });
        assert.isNotNull(totalSourceMapsWithChromExtensionProtocol);
        assert.strictEqual(totalSourceMapsWithChromExtensionProtocol?.length, 0);
      });
    });
  });
});
