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
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as SDK from '../../core/sdk/sdk.js';

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';

const UIStrings = {

  paintFlashing: 'Paint flashing',

  highlightsAreasOfThePageGreen:
      'Highlights areas of the page (green) that need to be repainted. May not be suitable for people prone to photosensitive epilepsy.',

  redrawFlashing: 'Redraw flashing',

  highlightsAreasOfThePageRed:
      'Highlights elements of the page (red) that need to be repainted. This highlights every element that is repainted during the frame.',

  dumpDomTitle: 'Dump DOM Tree',

  dumpDomDesc: 'Serialize the stacking context tree to a text file (cohtml_stacking_context_dump.txt)',

  dumpStackingContextTitle: 'Dump Stacking Context tree',

  dumpStackingContextDesc: 'Dump Stacking Context tree',

  dumpUsedImagesTitle: 'Dump Used Images',

  dumpUsedImagesDesc: 'Dump Used Images',

  toggleMetaDataTitle: 'Toggle Draw Metadata Emit',

  toggleMetaDataDesc: 'Toggle Draw Metadata Emit',

  toggleContinuousRepaintTitle: 'Toggle Continuous Repaint',

  toggleContinuousRepaintDesc: 'Toggle Continuous Repaint',

  captureBackendTitle: 'Capture Backend Buffer',

  captureBackendDesc: 'Capture Backend Buffer',

  captureRendTitle: 'Capture Rend File',

  captureRendDesc: 'Capture Rend File',

  capturePageTitle: 'Capture Full Page',

  capturePageDesc: 'Capture Full Page',

};
const str_ = i18n.i18n.registerUIStrings('entrypoints/inspector_main/CohtmlPanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let cohtmlPanelViewInstance: CohtmlPanelView;

export class CohtmlPanelView extends UI.Widget.VBox implements SDK.TargetManager.SDKModelObserver<SDK.CohtmlDebugModel.CohtmlDebugModel>{

  private drawMetaDataSetting: Common.Settings.Setting<any>;

  private continuousRepaintSetting: Common.Settings.Setting<any>;

  private cohtmlDebugModel?: SDK.CohtmlDebugModel.CohtmlDebugModel|null;

  // overlayAgent: ProtocolProxyApi.OverlayApi;

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

    this.appendCheckbox(
        i18nString(UIStrings.paintFlashing), i18nString(UIStrings.highlightsAreasOfThePageGreen),
        Common.Settings.Settings.instance().moduleSetting('showPaintRects'));
    this.appendCheckbox(
        i18nString(UIStrings.redrawFlashing), i18nString(UIStrings.highlightsAreasOfThePageRed),
        Common.Settings.Settings.instance().moduleSetting('showRedrawRects'));

    this.contentElement.createChild('div').classList.add('panel-section-separator');

    this.appendCheckbox(UIStrings.toggleMetaDataTitle, UIStrings.toggleMetaDataDesc,
                        Common.Settings.Settings.instance().moduleSetting('drawMetaData'));

    this.appendCheckbox(UIStrings.toggleContinuousRepaintTitle, UIStrings.toggleContinuousRepaintDesc,
                        Common.Settings.Settings.instance().moduleSetting('continuousRepaint'));

    this.createButton(UIStrings.dumpDomTitle, UIStrings.dumpDomDesc, () => {
      if (this.cohtmlDebugModel)
      {
        this.cohtmlDebugModel.dumpDOM();
      }
    });

    this.createButton(UIStrings.dumpStackingContextTitle, UIStrings.dumpStackingContextDesc, () => {
      if (this.cohtmlDebugModel)
      {
        this.cohtmlDebugModel.dumpStackingContext();
      }
    });

    this.createButton(UIStrings.dumpUsedImagesTitle, UIStrings.dumpUsedImagesDesc, () => {
      if (this.cohtmlDebugModel)
      {
        this.cohtmlDebugModel.dumpUsedImages();
      }
    });

    this.createButton(UIStrings.captureBackendTitle, UIStrings.captureBackendDesc, () => {
      if (this.cohtmlDebugModel)
      {
        this.cohtmlDebugModel.captureBackend();
      }
    });

    this.createButton(UIStrings.captureRendTitle, UIStrings.captureRendDesc, () => {
      if (this.cohtmlDebugModel)
      {
        this.cohtmlDebugModel.captureRend();
      }
    });

    this.createButton(UIStrings.capturePageTitle, UIStrings.capturePageDesc, () => {
      if (this.cohtmlDebugModel)
      {
        this.cohtmlDebugModel.capturePage();
      }
    });

    this.contentElement.createChild('div').classList.add('panel-section-separator');
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

  private createButton(label: string, desc: string, click : () => void) {
    const button = new Buttons.Button.Button();
    button.data = { variant: Buttons.Button.Variant.PRIMARY, };
    button.innerText = label;
    button.onclick = click;

    const newButtonBlock = this.contentElement.createChild('div');
    newButtonBlock.classList.add('button-block');
    newButtonBlock.appendChild(button);
    newButtonBlock.createChild('span').innerText = desc;
  }


  private createCheckbox(label: string, subtitle: string, setting: Common.Settings.Setting<boolean>):
      UI.UIUtils.CheckboxLabel {
    const checkboxLabel = UI.UIUtils.CheckboxLabel.create(label, false, subtitle);
    UI.SettingsUI.bindCheckbox(checkboxLabel.checkboxElement, setting);
    return checkboxLabel;
  }

  private appendCheckbox(label: string, subtitle: string, setting: Common.Settings.Setting<boolean>):
      UI.UIUtils.CheckboxLabel {
    const checkbox = this.createCheckbox(label, subtitle, setting);
    this.contentElement.appendChild(checkbox);
    return checkbox;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private appendSelect(label: string, setting: Common.Settings.Setting<any>): void {
    const control = UI.SettingsUI.createControlForSetting(setting, label);
    if (control) {
      this.contentElement.appendChild(control);
    }
  }

  modelAdded(cohtmlModel: SDK.CohtmlDebugModel.CohtmlDebugModel): void {
    console.log('added!');
    this.cohtmlDebugModel = cohtmlModel;
  }

  modelRemoved(cohtmlModel: SDK.CohtmlDebugModel.CohtmlDebugModel): void {

  }

}
