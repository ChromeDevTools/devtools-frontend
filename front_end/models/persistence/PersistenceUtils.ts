// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Workspace from '../workspace/workspace.js';

import {FileSystemWorkspaceBinding} from './FileSystemWorkspaceBinding.js';
import {HEADERS_FILENAME, NetworkPersistenceManager} from './NetworkPersistenceManager.js';

import {Events, PersistenceImpl, type PersistenceBinding} from './PersistenceImpl.js';

const UIStrings = {
  /**
   *@description Text in Persistence Utils of the Workspace settings in Settings
   *@example {example.url} PH1
   */
  linkedToSourceMapS: 'Linked to source map: {PH1}',
  /**
   *@description Text to show something is linked to another
   *@example {example.url} PH1
   */
  linkedToS: 'Linked to {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('models/persistence/PersistenceUtils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class PersistenceUtils {
  static tooltipForUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    const binding = PersistenceImpl.instance().binding(uiSourceCode);
    if (!binding) {
      return '';
    }
    if (uiSourceCode === binding.network) {
      return FileSystemWorkspaceBinding.tooltipForUISourceCode(binding.fileSystem);
    }
    if (binding.network.contentType().isFromSourceMap()) {
      return i18nString(
          UIStrings.linkedToSourceMapS, {PH1: Platform.StringUtilities.trimMiddle(binding.network.url(), 150)});
    }
    return i18nString(UIStrings.linkedToS, {PH1: Platform.StringUtilities.trimMiddle(binding.network.url(), 150)});
  }

  static iconForUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Icon.Icon|null {
    const binding = PersistenceImpl.instance().binding(uiSourceCode);
    if (binding) {
      if (!binding.fileSystem.url().startsWith('file://')) {
        return null;
      }
      const icon = UI.Icon.Icon.create('mediumicon-file-sync');
      UI.Tooltip.Tooltip.install(icon, PersistenceUtils.tooltipForUISourceCode(binding.network));
      if (NetworkPersistenceManager.instance().project() === binding.fileSystem.project()) {
        icon.classList.add('purple-dot');
      }
      return icon;
    }
    if (uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.FileSystem ||
        !uiSourceCode.url().startsWith('file://')) {
      return null;
    }

    if (uiSourceCode.url().endsWith(HEADERS_FILENAME)) {
      if (NetworkPersistenceManager.instance().hasMatchingNetworkUISourceCodeForHeaderOverridesFile(uiSourceCode)) {
        return UI.Icon.Icon.create('mediumicon-file-sync', 'purple-dot');
      }
    }

    const icon = UI.Icon.Icon.create('mediumicon-file');
    UI.Tooltip.Tooltip.install(icon, PersistenceUtils.tooltipForUISourceCode(uiSourceCode));
    return icon;
  }
}

export class LinkDecorator extends Common.ObjectWrapper.ObjectWrapper<Components.Linkifier.LinkDecorator.EventTypes>
    implements Components.Linkifier.LinkDecorator {
  constructor(persistence: PersistenceImpl) {
    super();
    persistence.addEventListener(Events.BindingCreated, this.bindingChanged, this);
    persistence.addEventListener(Events.BindingRemoved, this.bindingChanged, this);
  }

  private bindingChanged(event: Common.EventTarget.EventTargetEvent<PersistenceBinding>): void {
    const binding = event.data;
    this.dispatchEventToListeners(Components.Linkifier.LinkDecorator.Events.LinkIconChanged, binding.network);
  }

  linkIcon(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Icon.Icon|null {
    return PersistenceUtils.iconForUISourceCode(uiSourceCode);
  }
}
