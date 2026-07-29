// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as ObjectUI from './object_ui.js';

describe('CSSStyleSanitizer', () => {
  describe('sanitizeStyle', () => {
    it('allows allow-listed styles', () => {
      const styles = new Map();

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'border-top-style:solid');
      assert.deepEqual(styles.get('border-top-style'), {value: 'solid', priority: ''});

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'color:red');
      assert.deepEqual(styles.get('color'), {value: 'red', priority: ''});

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'font-family:serif');
      assert.deepEqual(styles.get('font-family'), {value: 'serif', priority: ''});

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'font: 1em Helvetica');
      assert.isTrue(styles.has('font-size'));
      assert.isTrue(styles.has('font-family'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'line-height:100%');
      assert.deepEqual(styles.get('line-height'), {value: '100%', priority: ''});

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'margin-top:30px');
      assert.deepEqual(styles.get('margin-top'), {value: '30px', priority: ''});

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'padding-top : 20px');
      assert.deepEqual(styles.get('padding-top'), {value: '20px', priority: ''});

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'text-align : center');
      assert.deepEqual(styles.get('text-align'), {value: 'center', priority: ''});

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'text-decoration: none');
      assert.isTrue(styles.has('text-decoration-line') || styles.has('text-decoration'));
    });

    it('handles multiple styles', () => {
      const styles = new Map();

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'font-size:14px; color:red');
      assert.deepEqual(styles.get('color'), {value: 'red', priority: ''});
      assert.deepEqual(styles.get('font-size'), {value: '14px', priority: ''});

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'border: 1px solid red; margin: 20px; padding: 10px;');
      assert.isTrue(styles.has('border-top-color'));
      assert.isTrue(styles.has('margin-top'));
      assert.isTrue(styles.has('padding-top'));
    });

    it('resets styles', () => {
      const styles = new Map();

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'font-size:14px; color:red');
      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'color:red');
      assert.isFalse(styles.has('font-size'));
    });

    it('blocks styles outside of allow-list', () => {
      const styles = new Map();

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'visibility:hidden');
      assert.isFalse(styles.has('visibility'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'width:100px');
      assert.isFalse(styles.has('width'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'box-sizing:border-box');
      assert.isFalse(styles.has('box-sizing'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'display:none');
      assert.isFalse(styles.has('display'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'position:absolute');
      assert.isFalse(styles.has('position'));
    });

    it('blocks block-listed url schemes in values', () => {
      const styles = new Map();

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'background-image:url(http://localhost/a.png)');
      assert.isFalse(styles.has('background-image'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'background-image:url(https://localhost/a.png)');
      assert.isFalse(styles.has('background-image'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'background-image:url(resource://localhost/a.png)');
      assert.isFalse(styles.has('background-image'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'background-image:url(app://com.foo.bar/index.html)');
      assert.isFalse(styles.has('background-image'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'background-image:url(chrome://a/b.png)');
      assert.isFalse(styles.has('background-image'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'background-image:url(about:flags)');
      assert.isFalse(styles.has('background-image'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'background-image:url(ftp://localhost/a.png)');
      assert.isFalse(styles.has('background-image'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'background-image:url(file://c/a.txt)');
      assert.isFalse(styles.has('background-image'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'border-image-source:url(file://c/a.txt)');
      assert.isFalse(styles.has('border-image-source'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'background-image:url(httpS://localhost/a.png)');
      assert.isFalse(styles.has('background-image'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'border-image-source:url(fIle://c/a.txt)');
      assert.isFalse(styles.has('border-image-source'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'background-image:url(https\\0009://localhost/a.png)');
      assert.isFalse(styles.has('background-image'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'background-image:url("file://c/a.txt")');
      assert.isFalse(styles.has('background-image'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'background-image:url(\'http://localhost/a.png\')');
      assert.isFalse(styles.has('background-image'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(
          styles,
          'background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAAAAABzHgM7AAAAF0lEQVR42mM4Awb/wYCBYg6EgghRzAEAWDWBGQVyKPMAAAAASUVORK5CYII=), url(http://localhost/a.png)');
      assert.isFalse(styles.has('background-image'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(
          styles, 'background-image:if(supports():"url(data:";else:url(http://localhost/a.png))');
      assert.isFalse(styles.has('background-image'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'background-image:if(else:urL(http://localhost/a.png))');
      assert.isFalse(styles.has('background-image'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'background-image:if(else:ur\\6c (http://localhost/a.png))');
      assert.isFalse(styles.has('background-image'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, 'background-image:if(else:\\u\\r\\l(http://localhost/a.png))');
      assert.isFalse(styles.has('background-image'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(
          styles, 'background-image:if(else:image\\-set("data:" 1x, "http://localhost/a.png" 2x))');
      assert.isFalse(styles.has('background-image'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(
          styles, 'background-image:if(else:image-se\\74 ("data:" 1x, "http://localhost/a.png" 2x))');
      assert.isFalse(styles.has('background-image'));

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles,
                                               'background-image:image-set("data:" 1x, "http://localhost/a.png" 2x)');
      assert.isFalse(styles.has('background-image'));
    });

    it('allows data urls in values', () => {
      const dataUrl =
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAAAAABzHgM7AAAAF0lEQVR42mM4Awb/wYCBYg6EgghRzAEAWDWBGQVyKPMAAAAASUVORK5CYII=';

      const styles = new Map();

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, `background-image:url(${dataUrl})`);
      assert.include(styles.get('background-image').value, 'data:image/png;base64');

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(styles, `border-image-source:url(${dataUrl})`);
      assert.include(styles.get('border-image-source').value, 'data:image/png;base64');

      ObjectUI.CSSStyleSanitizer.sanitizeStyle(
          styles, `background-image:image-set( "${dataUrl}" 1.5x , url("${dataUrl}") type( "image/png" ) )`);
      assert.include(styles.get('background-image').value, 'data:image/png;base64');
    });
  });
});
