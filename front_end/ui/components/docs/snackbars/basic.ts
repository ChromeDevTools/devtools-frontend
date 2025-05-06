// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as ComponentHelpers from '../../helpers/helpers.js';
import * as Snackbars from '../../snackbars/snackbars.js';

await FrontendHelpers.initializeGlobalVars();
await ComponentHelpers.ComponentServerSetup.setup();
const container = document.getElementById('container');

if (!container) {
  throw new Error('No component container found.');
}

const onActionClick = (): void => {
  // eslint-disable-next-line no-console
  console.log('Action button clicked!');
};

const showButton1 = document.createElement('button');
showButton1.textContent = 'Show Long Action Snackbar';
showButton1.addEventListener('click', () => {
  Snackbars.Snackbar.Snackbar.show({
    message: 'This is a snackbar demonstrating a long action and closable state.',
    closable: true,
    actionProperties: {
      label: 'This is a long action button',
      title: 'Click here to perform the designated action',
      onClick: onActionClick,
    }
  });
});
container.appendChild(showButton1);

const showButton2 = document.createElement('button');
showButton2.textContent = 'Show Action Snackbar';
showButton2.addEventListener('click', () => {
  Snackbars.Snackbar.Snackbar.show({
    message: 'This is a snackbar demonstrating an action and closable state.',
    closable: true,
    actionProperties: {
      label: 'Action',
      title: 'Click here to perform the designated action',
      onClick: onActionClick,
    }
  });
});
container.appendChild(showButton2);
