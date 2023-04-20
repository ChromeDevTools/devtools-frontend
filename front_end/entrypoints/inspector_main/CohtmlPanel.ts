/*
  This file is part of Cohtml, Gameface and Prysm - modern user interface technologies.

  Copyright (c) 2012-2023 Coherent Labs AD and/or its licensors. All
  rights reserved in all media.

  The coded instructions, statements, computer programs, and/or related
  material (collectively the "Data") in these files contain confidential
  and unpublished information proprietary Coherent Labs and/or its
  licensors, which is protected by United States of America federal
  copyright law and by international treaties.

  This software or source code is supplied under the terms of a license
  agreement and nondisclosure agreement with Coherent Labs AD and may
  not be copied, disclosed, or exploited except in accordance with the
  terms of that agreement. The Data may not be disclosed or distributed to
  third parties, in whole or in part, without the prior written consent of
  Coherent Labs AD.

  COHERENT LABS MAKES NO REPRESENTATION ABOUT THE SUITABILITY OF THIS
  SOURCE CODE FOR ANY PURPOSE. THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT
  HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
  INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
  MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER, ITS AFFILIATES,
  PARENT COMPANIES, LICENSORS, SUPPLIERS, OR CONTRIBUTORS BE LIABLE FOR
  ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
  DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
  HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
  STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
  ANY WAY OUT OF THE USE OR PERFORMANCE OF THIS SOFTWARE OR SOURCE CODE,
  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import { Size } from '../../ui/legacy/Geometry.js';

const clamp = (num:number, min:number, max:number) => Math.min(Math.max(num, min), max);

const UIStrings = {

  paintFlashing: 'Paint flashing',

  highlightsAreasOfThePageGreen:
      'Highlights areas of the page (green) that need to be repainted. May not be suitable for people prone to photosensitive epilepsy.',

  redrawFlashing: 'Redraw flashing',

  highlightsAreasOfThePageRed:
      'Highlights elements of the page (red) that need to be repainted. This highlights every element that is repainted during the frame.',

  dumpDomTitle: 'Dump DOM Tree',

  dumpDomDesc: 'Serialize the dom tree to a text file (debug_dom_tree.log)',

  dumpStackingContextTitle: 'Dump Stacking Context tree',

  dumpStackingContextDesc: 'Serialize the stacking context tree to a text file (debug_stacking_contexts.json)',

  dumpUsedImagesTitle: 'Dump Used Images',

  dumpUsedImagesDesc: 'Serialize the used images in the view to a text file (UsedImages.txt)',

  toggleMetaDataTitle: 'Emit Rendering Metadata',

  toggleMetaDataDesc: 'Emit metadata for the genrated rendering commands. The metadata can be seen in tools like RenderDoc',

  toggleContinuousRepaintTitle: 'Continuous Repaint',

  toggleContinuousRepaintDesc: 'Redraw the entire view every frame regardless of what the dirty regions are',

  captureBackendTitle: 'Capture Backend Buffer',

  captureBackendDesc: 'Seriazlie the generated backend commands for a single frame to a binary file (CohtmlBackendBuffer.buff)',

  captureRendTitle: 'Capture Rend File',

  captureRendDesc: 'Seriazlie the generated rendering commands for a signel frame to a binary file (CohtmlRendCapture.rend)',

  capturePageTitle: 'Capture Full Page',

  capturePageDesc: 'Serialize the state of the whole view to a binary file (PageCapture.pcap)',

  clearCachedUnusedImagesTitle: 'Clear Cached Unused Images',

  clearCachedUnusedImagesDesc: 'Removes all unused images (raster and svg) from internal caches.',

  getSystemCacheTitle: 'Get System Cache Stats',

  getSystemCacheDesc: 'Get statistics for the system-wide caches',

  currentCapacityCountStr : 'Current Capacity Count: ',

  currentCapacityBytesStr : 'Current Capacity Memory: ',

  updateCacheStr : 'Update Cache',

  capacityStr : 'Capacity',

};
const str_ = i18n.i18n.registerUIStrings('entrypoints/inspector_main/CohtmlPanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

function SizeString(sizeinBytes : number) : string
{
  if (isNaN(sizeinBytes))
  {
    return "";
  }

  if (sizeinBytes < 1024) {
    return sizeinBytes + ' Bytes';
  } else if (sizeinBytes < 1024*1024) {
    return (sizeinBytes/1024).toFixed(2) + ' KBs';
  } else {
    return (sizeinBytes/(1024*1024)).toFixed(2) + ' MBs';
  }
}

let cohtmlPanelViewInstance: CohtmlPanelView;


class RenoirCacheUIEntry {
  currentCountSpanElement : HTMLElement|null;
  currentBytesSpanElement : HTMLElement|null;

  constructor() {
    this.currentBytesSpanElement = null;
    this.currentCountSpanElement = null;
  }

};

export class CohtmlPanelView extends UI.Widget.VBox implements SDK.TargetManager.SDKModelObserver<SDK.CohtmlDebugModel.CohtmlDebugModel>{

  private drawMetaDataSetting: Common.Settings.Setting<any>;

  private continuousRepaintSetting: Common.Settings.Setting<any>;

  private cohtmlDebugModel?: SDK.CohtmlDebugModel.CohtmlDebugModel|null;

  private contentPanel: HTMLElement;

  private renoirCachesWrapper: HTMLElement;

  // The "frontend" state of the renior renoir caches. In the entries we keep the two HTML element which display the current capacity
  // count and bytes. The map maps from a cache type (scratchTextures, scratchLayers) to the entry with HTML elements (RenoirCacheUIEntry).
  private renoirCachesUIState : Map<number, RenoirCacheUIEntry>;

  private constructor() {
    super(true);
    this.registerRequiredCSS('entrypoints/inspector_main/renderingOptions.css');

    SDK.TargetManager.TargetManager.instance().observeModels(SDK.CohtmlDebugModel.CohtmlDebugModel, this);

    let mainTarget = SDK.TargetManager.TargetManager.instance().mainTarget();
    if (mainTarget)
    {
      this.cohtmlDebugModel = mainTarget.model(SDK.CohtmlDebugModel.CohtmlDebugModel);
    }

    this.renoirCachesUIState = new Map<number, RenoirCacheUIEntry>();

    this.drawMetaDataSetting = Common.Settings.Settings.instance().moduleSetting('drawMetaData');
    this.continuousRepaintSetting = Common.Settings.Settings.instance().moduleSetting('continuousRepaint');

    this.contentElement.classList.add('cohtml-panel-base');

    const controlsPanel = this.contentElement.createChild('div');
    controlsPanel.classList.add('controls-panel');

    this.contentPanel = this.contentElement.createChild('div');
    this.contentPanel.classList.add('content-panel');

    controlsPanel.createChild('h4').innerText = 'Toggle settings';

    this.appendCheckbox(
      i18nString(UIStrings.paintFlashing), i18nString(UIStrings.highlightsAreasOfThePageGreen),
      Common.Settings.Settings.instance().moduleSetting('showPaintRects'),
      controlsPanel
    );

    this.appendCheckbox(
      i18nString(UIStrings.redrawFlashing), i18nString(UIStrings.highlightsAreasOfThePageRed),
      Common.Settings.Settings.instance().moduleSetting('showRedrawRects'),
      controlsPanel
    );

    controlsPanel.createChild('div').classList.add('panel-section-separator');

    this.appendCheckbox(
      UIStrings.toggleMetaDataTitle, UIStrings.toggleMetaDataDesc,
      Common.Settings.Settings.instance().moduleSetting('drawMetaData'),
      controlsPanel
    );

    this.appendCheckbox(
      UIStrings.toggleContinuousRepaintTitle, UIStrings.toggleContinuousRepaintDesc,
      Common.Settings.Settings.instance().moduleSetting('continuousRepaint'),
      controlsPanel
    );

    controlsPanel.createChild('div').classList.add('panel-section-separator');

    controlsPanel.createChild('h4').innerText = 'Actions'

    this.createSimpleButton(UIStrings.dumpDomTitle, UIStrings.dumpDomDesc, 'dumpDOM', controlsPanel);
    this.createSimpleButton(UIStrings.dumpStackingContextTitle, UIStrings.dumpStackingContextDesc, 'dumpStackingContext', controlsPanel);
    this.createSimpleButton(UIStrings.dumpUsedImagesTitle, UIStrings.dumpUsedImagesDesc, 'dumpUsedImages', controlsPanel);
    this.createSimpleButton(UIStrings.captureBackendTitle, UIStrings.captureBackendDesc, 'captureBackend', controlsPanel);
    this.createSimpleButton(UIStrings.captureRendTitle, UIStrings.captureRendDesc, 'captureRend', controlsPanel);
    this.createSimpleButton(UIStrings.capturePageTitle, UIStrings.capturePageDesc, 'capturePage', controlsPanel);

    controlsPanel.createChild('div').classList.add('panel-section-separator');

    controlsPanel.createChild('h4').innerText = 'Cache controls'

    this.createSimpleButton(UIStrings.clearCachedUnusedImagesTitle, UIStrings.clearCachedUnusedImagesDesc, 'clearCachedUnusedImages', controlsPanel);

    this.createButton(UIStrings.getSystemCacheTitle, UIStrings.getSystemCacheDesc, controlsPanel, () => {
      if (this.cohtmlDebugModel)
      {
        const cacheStats = this.cohtmlDebugModel.getSystemCacheStats();
        cacheStats?.then((obj) => {
          if (obj)
          {
            this.displayImagesInContentPanel(obj);
          }
        });
      }
    });

    controlsPanel.createChild('div').classList.add('panel-section-separator');

    // The panel which controls the renoir caches. We will create an entry for each cache type.
    controlsPanel.createChild('h4').innerText = 'Rendering Caches';
    this.renoirCachesWrapper = controlsPanel.createChild('div');

    controlsPanel.createChild('div').classList.add('panel-section-separator');
  }

  private onModelUpdated() {
    // once we have a valid cohtml model, we'll query the renoir caches states

    let cachesResult = this.cohtmlDebugModel?.getAvailableRenoirCahces();
    cachesResult?.then(caches => {
      this.renoirCachesWrapper.removeChildren();
      caches?.forEach(cache => {
        this.createCacheEntryForRenoirCache(cache.type, cache.title ? cache.title : '<unknown>', this.renoirCachesWrapper);
      });
      this.fetchCacheStates();
    });
  }

  private fetchCacheStates() {
    const cacheStats = this.cohtmlDebugModel?.getRenoirCahcesState();
    cacheStats?.then((stats) => {
      // update the HTML elements displaying the currenet capacity count and bytes
      this.updateReniorCachesUI(stats);
    });
  }

  private updateCacheUI(state: Protocol.CohtmlDebug.RenoirCache|undefined) {
    if (!state) {
      return;
    }

    if (!this.renoirCachesUIState.has(state.type)) {
      return;
    }

    let uiCacheState = this.renoirCachesUIState.get(state.type);
    if (!uiCacheState
       || uiCacheState.currentBytesSpanElement == null
       || uiCacheState.currentCountSpanElement == null) {
      return;
    }

    uiCacheState.currentBytesSpanElement.innerText = UIStrings.currentCapacityBytesStr + SizeString(state.capacityBytes ? state.capacityBytes : 0);
    uiCacheState.currentCountSpanElement.innerText = UIStrings.currentCapacityCountStr + state.capacityCount;
  }

  private updateReniorCachesUI(cachesState: Protocol.CohtmlDebug.RenoirCachesState|null) {
    cachesState?.caches.forEach(cache => {
      this.updateCacheUI(cache);
    });
  }

  private createCacheEntryForRenoirCache(id: number, title: string, parent: HTMLElement) {
    let cachePanel = parent.createChild('div', 'cache-entry');

    let cacheName = cachePanel.createChild('span', 'cache-title');
    cacheName.innerHTML = title;

    let newCacheUIEntry = new RenoirCacheUIEntry();

    let firstRow = cachePanel.createChild('div', '');
    {
      let entryName = firstRow.createChild('span', 'info-span');
      entryName.innerText = UIStrings.capacityStr;

      // input field where the user enters the desired cache size
      let entryInput = firstRow.createChild('input');
      entryInput.setAttribute('type', 'number');

      // unit for the enered number (label + select element)
      let unit = firstRow.createChild('span', 'info-span');
      unit.innerText = 'Unit:';
      let types:string[] = ["Count", "Bytes", "KBs", "MBs"];
      let unitSelect = this.appendSelect("Type", types, firstRow);

      // button for updating the corresponding cache.
      let entryButton = firstRow.createChild('span', 'button-link');
      entryButton.innerText = UIStrings.updateCacheStr;

      entryButton.onclick = () => {
        let inputElement = (entryInput as HTMLInputElement);
        if (inputElement.value.length == 0) {
          return;
        }
        let newSize = Number(inputElement.value);
        if (!isNaN(newSize)) {

          // JSON specifies only 32-bit integers so we can't send a bigger
          // number than 2^32 bytes (~ 2147 MBs; this should be enough for all caches)
          const MAX_32BIT_INTEGER = 2147483647;
          newSize = clamp(newSize, 0, MAX_32BIT_INTEGER);

          switch (unitSelect.value) {
            case "Count": break;
            case "Bytes": break;
            case "KBs": newSize *= 1024; break;
            case "MBs": newSize *= 1024*1024; break;
          }

          let setCount = unitSelect.value == "Count";

          // create the object that will be send to the backend
          let state: Protocol.CohtmlDebug.RenoirCache = {
            type: id,
            capacityBytes: !setCount ? newSize : -1,
            capacityCount: setCount ? newSize : -1
          };

          // send the data to the backend (the C++ code)
          this.cohtmlDebugModel?.setRenoirCacheState(state);

          // Cohtml does not update the caches immediatly but rather on the
          // next frame. Hence we can't request the new cache state immediatly but
          // have to "wait a little bit". 100ms is plenty of time but still keeps the
          // updating feeling interactive
          setTimeout(() => {
            this.fetchCacheStates();
          }, 100);
        }
      };
    }

    // create a couple of span elements to display the currenet capacity bytes and count
    // of the cache
    let secondRow = cachePanel.createChild('div', '');
    {
      let currentCapacityCount = secondRow.createChild('span', 'info-span');
      currentCapacityCount.innerText = UIStrings.currentCapacityCountStr;

      let currentCapacityBytes = secondRow.createChild('span', 'info-span');
      currentCapacityBytes.innerText = UIStrings.currentCapacityBytesStr;

      // save the span elements for later so that we can update them when we have to
      newCacheUIEntry.currentBytesSpanElement = currentCapacityBytes;
      newCacheUIEntry.currentCountSpanElement = currentCapacityCount;
    }

    // create the entry in the frontend map for the caches state
    this.renoirCachesUIState.set(id, newCacheUIEntry);
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): CohtmlPanelView {
    const {forceNew} = opts;
    if (!cohtmlPanelViewInstance || forceNew) {
      cohtmlPanelViewInstance = new CohtmlPanelView();
    }

    return cohtmlPanelViewInstance;
  }

  private displayImagesInContentPanel(imagesList: Protocol.CohtmlDebug.GetSystemCacheStatsResponse) {
    this.contentPanel.innerHTML = '';
    this.contentPanel.createChild('h4').innerText = 'Used images';

    this.contentPanel.createChild('span', 'info-span').innerText = 'Alive Images Count: ' + imagesList.stats.aliveImagesCount;
    this.contentPanel.createChild('br');
    this.contentPanel.createChild('span', 'info-span').innerText = 'Alive Images Total Memory: ' + SizeString(imagesList.stats.aliveTotalBytesUsed);
    this.contentPanel.createChild('br');
    this.contentPanel.createChild('span', 'info-span').innerText = 'Orphaned Images Count: ' + imagesList.stats.orphanedImagesCount;
    this.contentPanel.createChild('br');
    this.contentPanel.createChild('span', 'info-span').innerText = 'Orphaned Images Total Memory: ' + SizeString(imagesList.stats.orphanedBytesUsed);

    function displayImagesAsUl(images: Protocol.CohtmlDebug.ImageData[], parent:HTMLElement) {
      const imagesListElement = parent.createChild('ul', 'image-list');
      images.forEach((img) => {
        const li = imagesListElement.createChild('li');
        li.createChild('span', 'image-name').innerText = img.name;
        li.createChild('br');
        li.createChild('span', 'image-size').innerText = '[ ' + SizeString(img.sizeBytes) + ']';
      });
    }

    this.contentPanel.createChild('h3').innerText = 'Alive Images List';
    displayImagesAsUl(imagesList.stats.aliveImages, this.contentPanel);
    this.contentPanel.createChild('h3').innerText = 'Orphen Images List';
    displayImagesAsUl(imagesList.stats.orphanedImages, this.contentPanel);
  }

  private createSimpleButton(title: string, description: string, method: any, parent: HTMLElement ) {
    this.createButton(title, description, parent, () => {
      if (this.cohtmlDebugModel && this.cohtmlDebugModel[method]) {
        this.cohtmlDebugModel[method]();
      }
    });
  }

  private appendSelect(name: string, options: string[], element: HTMLElement): HTMLSelectElement {
    const select = element.createChild('select');
    select.classList.add('chrome-select');
    for (let index = 0; index < options.length; ++index) {
      const option = (select.createChild('option') as HTMLOptionElement);
      option.value = options[index];
      option.textContent = options[index];
    }
    return select as HTMLSelectElement;
}

  private createButton(label: string, desc: string, parent: HTMLElement , click : () => void) {
    const newButtonBlock = parent.createChild('div');
    newButtonBlock.classList.add('button-block');

    const buttonItem = newButtonBlock.createChild('span');
    buttonItem.classList.add('button-link');
    buttonItem.innerText = label;
    buttonItem.onclick = click;

    const descItem = newButtonBlock.createChild('span');
    descItem.classList.add('button-desc');
    descItem.innerText = desc;

    newButtonBlock.appendChild(buttonItem);
    newButtonBlock.appendChild(descItem);
  }

  private createCheckbox(label: string, subtitle: string, setting: Common.Settings.Setting<boolean>):
      UI.UIUtils.CheckboxLabel {
    const checkboxLabel = UI.UIUtils.CheckboxLabel.create(label, false, subtitle);
    UI.SettingsUI.bindCheckbox(checkboxLabel.checkboxElement, setting);
    return checkboxLabel;
  }

  private appendCheckbox(label: string, subtitle: string, setting: Common.Settings.Setting<boolean>, parent: HTMLElement):
      UI.UIUtils.CheckboxLabel {
    const checkbox = this.createCheckbox(label, subtitle, setting);
    parent.appendChild(checkbox);
    return checkbox;
  }

  modelAdded(cohtmlModel: SDK.CohtmlDebugModel.CohtmlDebugModel): void {
    this.cohtmlDebugModel = cohtmlModel;
    this.onModelUpdated();
  }

  modelRemoved(cohtmlModel: SDK.CohtmlDebugModel.CohtmlDebugModel): void {
    this.cohtmlDebugModel = null;
  }

}
