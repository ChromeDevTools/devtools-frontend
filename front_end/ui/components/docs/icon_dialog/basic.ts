// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../../../front_end/ui/components/helpers/helpers.js';
import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';  // eslint-disable-line rulesdir/es_modules_import
import * as Dialogs from '../../../../ui/components/dialogs/dialogs.js';
import * as LitHtml from '../../../lit-html/lit-html.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

// Disabled until https://crbug.com/1079231 is fixed.
// clang-format off
const iconDialog = LitHtml.html`
Hello...

<${Dialogs.IconDialog.IconDialog.litTagName}
  .data=${{
    iconData: {
      iconName: 'info',
      color: 'var(--icon-default-hover)',
      width: '16px',
      height: '16px',
    },
    closeButton: true,
    position: Dialogs.Dialog.DialogVerticalPosition.AUTO,
    horizontalAlignment: Dialogs.Dialog.DialogHorizontalAlignment.AUTO,
    closeOnESC: true,
    closeOnScroll: false,
  } as Dialogs.IconDialog.IconDialogData}
>
  <div>
    <h2>Hello world!</h2>
    <div>
      This is a dialog describing some additional information.
    </div>
  </div>
</${Dialogs.IconDialog.IconDialog.litTagName}>
`;
// clang-format on

const container = document.getElementById('container') as HTMLElement;
LitHtml.render(iconDialog, container);
