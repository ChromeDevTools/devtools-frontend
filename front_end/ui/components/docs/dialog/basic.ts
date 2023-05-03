// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Dialogs from '../../../../ui/components/dialogs/dialogs.js';

const showConnectors = [true, false];
const verticalPositions = [Dialogs.Dialog.DialogVerticalPosition.TOP, Dialogs.Dialog.DialogVerticalPosition.BOTTOM];
const horizontalAlignments = [
  Dialogs.Dialog.DialogHorizontalAlignment.AUTO,
  Dialogs.Dialog.DialogHorizontalAlignment.LEFT,
  Dialogs.Dialog.DialogHorizontalAlignment.CENTER,
  Dialogs.Dialog.DialogHorizontalAlignment.RIGHT,
  Dialogs.Dialog.DialogHorizontalAlignment.AUTO,
];

const root = document.getElementById('root') as HTMLElement;

let i = 0;
for (const showConnector of showConnectors) {
  for (const verticalPosition of verticalPositions) {
    const row = document.createElement('div');
    row.classList.add('row');
    root.appendChild(row);
    for (const horizontalAlignment of horizontalAlignments) {
      const dialog = new Dialogs.Dialog.Dialog();

      const container = document.createElement('div');
      container.classList.add('container');
      container.id = `container-${i}`;

      const host = document.createElement('div');
      host.classList.add('dialog-host');
      host.id = `host-${i}`;
      host.textContent = 'Hover me';

      container.appendChild(host);
      row.appendChild(container);

      dialog.position = verticalPosition;
      dialog.horizontalAlignment = horizontalAlignment;
      dialog.showConnector = showConnector;
      dialog.origin = host;
      dialog.id = `dialog-${i}`;

      host.addEventListener('mouseover', () => {
        void dialog.setDialogVisible(true);
      });
      dialog.addEventListener('clickoutsidedialog', () => {
        void dialog.setDialogVisible(false);
      });

      const div = document.createElement('div');
      div.classList.add('dialog-content');
      div.style.padding = '0 1em';
      div.innerHTML = `Hello, World<br/>Show connector: ${showConnector}<br/>Vertical position: ${
          verticalPosition}<br/>Horizontal alignment: ${horizontalAlignment}`;
      dialog.appendChild(div);
      root.appendChild(dialog);
      i++;
    }
  }
}

for (const verticalPosition of verticalPositions) {
  const row = document.createElement('div');
  row.classList.add('row');
  root.appendChild(row);
  for (const horizontalAlignment of horizontalAlignments) {
    const dialog = new Dialogs.Dialog.Dialog();

    const container = document.createElement('div');
    container.classList.add('container');
    container.id = `container-${i}`;

    const host = document.createElement('div');
    host.classList.add('dialog-host-narrow');
    host.id = `host-${i}`;
    host.textContent = 'H';

    container.appendChild(host);
    row.appendChild(container);

    dialog.position = verticalPosition;
    dialog.horizontalAlignment = horizontalAlignment;
    dialog.showConnector = true;
    dialog.origin = host;
    dialog.id = `dialog-${i}`;

    host.addEventListener('mouseover', () => {
      void dialog.setDialogVisible(true);
    });
    dialog.addEventListener('clickoutsidedialog', () => {
      void dialog.setDialogVisible(false);
    });

    const div = document.createElement('div');
    div.classList.add('dialog-content');
    div.style.padding = '0 1em';
    div.innerHTML = `Hello, World<br/>Show connector: true<br/>Vertical position: ${
        verticalPosition}<br/>Horizontal alignment: ${horizontalAlignment}`;
    dialog.appendChild(div);
    root.appendChild(dialog);
    i++;
  }
}
