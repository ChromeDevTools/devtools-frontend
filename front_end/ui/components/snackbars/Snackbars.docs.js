// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { Snackbar } from './snackbars.js';
export async function render(container) {
    const onActionClick = () => {
        // eslint-disable-next-line no-console
        console.log('Action button clicked!');
    };
    const showButton1 = document.createElement('button');
    showButton1.textContent = 'Show Long Action Snackbar';
    showButton1.addEventListener('click', () => {
        Snackbar.Snackbar.show({
            message: 'This is a snackbar demonstrating a long action and closable state.',
            closable: true,
            actionProperties: {
                label: 'This is a long action button',
                title: 'Click here to perform the designated action',
                onClick: onActionClick,
            },
        }, container);
    });
    container.appendChild(showButton1);
    const showButton2 = document.createElement('button');
    showButton2.textContent = 'Show Action Snackbar';
    showButton2.addEventListener('click', () => {
        Snackbar.Snackbar.show({
            message: 'This is a snackbar demonstrating an action and closable state.',
            closable: true,
            actionProperties: {
                label: 'Action',
                title: 'Click here to perform the designated action',
                onClick: onActionClick,
            },
        }, container);
    });
    container.appendChild(showButton2);
}
//# sourceMappingURL=Snackbars.docs.js.map