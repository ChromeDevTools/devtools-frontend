// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

console.log('OTR Test Extension content script injected!');
window.otrExtensionInjected = true;

// Create a highly visible banner
const div = document.createElement('div');
div.id = 'otr-test-extension-marker';
div.textContent = 'EXTENSION INJECTED!';
div.style.position = 'fixed';
div.style.top = '50%';
div.style.left = '50%';
div.style.transform = 'translate(-50%, -50%)';
div.style.padding = '30px';
div.style.background = 'red';
div.style.color = 'white';
div.style.fontSize = '32px';
div.style.fontWeight = 'bold';
div.style.border = '5px solid black';
div.style.zIndex = '99999';
div.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';

if (document.body) {
  document.body.appendChild(div);
} else {
  document.documentElement.appendChild(div);
}
