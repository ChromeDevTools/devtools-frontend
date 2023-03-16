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

};
const str_ = i18n.i18n.registerUIStrings('entrypoints/inspector_main/CohtmlPanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

function SizeString(sizeinBytes : number) : string
{
  if (sizeinBytes < 1024) {
    return sizeinBytes + 'Bytes';
  } else if (sizeinBytes < 1024*1024) {
    return (sizeinBytes/1024).toFixed(2) + 'KBs';
  } else {
    return (sizeinBytes/(1024*1024)).toFixed(2) + 'MBs';
  }
}

let cohtmlPanelViewInstance: CohtmlPanelView;

export class CohtmlPanelView extends UI.Widget.VBox implements SDK.TargetManager.SDKModelObserver<SDK.CohtmlDebugModel.CohtmlDebugModel>{

  private drawMetaDataSetting: Common.Settings.Setting<any>;

  private continuousRepaintSetting: Common.Settings.Setting<any>;

  private cohtmlDebugModel?: SDK.CohtmlDebugModel.CohtmlDebugModel|null;

  private contentPanel: HTMLElement;

  private constructor() {
    super(true);
    this.registerRequiredCSS('entrypoints/inspector_main/renderingOptions.css');

    SDK.TargetManager.TargetManager.instance().observeModels(SDK.CohtmlDebugModel.CohtmlDebugModel, this);

    let mainTarget = SDK.TargetManager.TargetManager.instance().mainTarget();
    if (mainTarget)
    {
      this.cohtmlDebugModel = mainTarget.model(SDK.CohtmlDebugModel.CohtmlDebugModel);
    }

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

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private appendSelect(label: string, setting: Common.Settings.Setting<any>, ): void {
    const control = UI.SettingsUI.createControlForSetting(setting, label);
    if (control) {
      this.contentElement.appendChild(control);
    }
  }

  modelAdded(cohtmlModel: SDK.CohtmlDebugModel.CohtmlDebugModel): void {
    this.cohtmlDebugModel = cohtmlModel;
  }

  modelRemoved(cohtmlModel: SDK.CohtmlDebugModel.CohtmlDebugModel): void {
    this.cohtmlDebugModel = null;
  }

}
