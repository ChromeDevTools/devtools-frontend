// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../front_end/common/common.js';

const ResourceType = Common.ResourceType.ResourceType;
const ResourceCategory = Common.ResourceType.ResourceCategory;
const resourceTypes = Common.ResourceType.resourceTypes;

describe('ResourceCategory class', () => {
  it('is able to be instantiated successfully', () => {
    const resourceCategory = new ResourceCategory('Test Title', 'Test Short Title');
    assert.strictEqual(resourceCategory.title, 'Test Title', 'title is not correct');
    assert.strictEqual(resourceCategory.shortTitle, 'Test Short Title', 'short title is not correct');
  });
});

describe('ResourceType class', () => {
  it('is able to be instantiated successfully', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('Type Test Name', 'Type Test Title', testResourceCategory, true);
    assert.strictEqual(resourceType.name(), 'Type Test Name', 'name was not set correctly');
    assert.strictEqual(resourceType.title(), 'Type Test Title', 'title was not set correctly');
    assert.strictEqual(resourceType.category().title, 'Category Test Title', 'category title was not set correctly');
    assert.strictEqual(
        resourceType.category().shortTitle, 'Category Test Short Title', 'category short title was not set correctly');
    assert.strictEqual(resourceType.isTextType(), true, 'isTextType was not set correctly');
  });

  it('is able to return a document resource from the string "text/html"', () => {
    const result = ResourceType.fromMimeType('text/html');
    assert.instanceOf(result, ResourceType, 'result type is incorrect');
    assert.strictEqual(result.name(), 'document', 'name was not set correctly');
    assert.strictEqual(result.title(), 'Document', 'title was not set correctly');
    assert.strictEqual(result.category().title, 'Documents', 'category title was not set correctly');
    assert.strictEqual(result.category().shortTitle, 'Doc', 'category short title was not set correctly');
    assert.isTrue(result.isTextType(), 'isTextType was not set correctly');
  });

  it('is able to return a stylesheet resource from the string "text/css"', () => {
    const result = ResourceType.fromMimeType('text/css');
    assert.instanceOf(result, ResourceType, 'result type is incorrect');
    assert.strictEqual(result.name(), 'stylesheet', 'name was not set correctly');
    assert.strictEqual(result.title(), 'Stylesheet', 'title was not set correctly');
    assert.strictEqual(result.category().title, 'Stylesheets', 'category title was not set correctly');
    assert.strictEqual(result.category().shortTitle, 'CSS', 'category short title was not set correctly');
    assert.isTrue(result.isTextType(), 'isTextType was not set correctly');
  });

  it('is able to return an image resource from the string "image/"', () => {
    const result = ResourceType.fromMimeType('image/');
    assert.instanceOf(result, ResourceType, 'result type is incorrect');
    assert.strictEqual(result.name(), 'image', 'name was not set correctly');
    assert.strictEqual(result.title(), 'Image', 'title was not set correctly');
    assert.strictEqual(result.category().title, 'Images', 'category title was not set correctly');
    assert.strictEqual(result.category().shortTitle, 'Img', 'category short title was not set correctly');
    assert.isFalse(result.isTextType(), 'isTextType was not set correctly');
  });

  it('is able to return a script resource from the string "text/"', () => {
    const result = ResourceType.fromMimeType('text/');
    assert.instanceOf(result, ResourceType, 'result type is incorrect');
    assert.strictEqual(result.name(), 'script', 'name was not set correctly');
    assert.strictEqual(result.title(), 'Script', 'title was not set correctly');
    assert.strictEqual(result.category().title, 'Scripts', 'category title was not set correctly');
    assert.strictEqual(result.category().shortTitle, 'JS', 'category short title was not set correctly');
    assert.isTrue(result.isTextType(), 'isTextType was not set correctly');
  });

  it('is able to return a font resource from the string "font"', () => {
    const result = ResourceType.fromMimeType('font');
    assert.instanceOf(result, ResourceType, 'result type is incorrect');
    assert.strictEqual(result.name(), 'font', 'name was not set correctly');
    assert.strictEqual(result.title(), 'Font', 'title was not set correctly');
    assert.strictEqual(result.category().title, 'Fonts', 'category title was not set correctly');
    assert.strictEqual(result.category().shortTitle, 'Font', 'category short title was not set correctly');
    assert.isFalse(result.isTextType(), 'isTextType was not set correctly');
  });

  it('is able to return a script resource from the string "script"', () => {
    const result = ResourceType.fromMimeType('script');
    assert.instanceOf(result, ResourceType, 'result type is incorrect');
    assert.strictEqual(result.name(), 'script', 'name was not set correctly');
    assert.strictEqual(result.title(), 'Script', 'title was not set correctly');
    assert.strictEqual(result.category().title, 'Scripts', 'category title was not set correctly');
    assert.strictEqual(result.category().shortTitle, 'JS', 'category short title was not set correctly');
    assert.isTrue(result.isTextType(), 'isTextType was not set correctly');
  });

  it('is able to return an octet resource from the string "octet"', () => {
    const result = ResourceType.fromMimeType('octet');
    assert.instanceOf(result, ResourceType, 'result type is incorrect');
    assert.strictEqual(result.name(), 'other', 'name was not set correctly');
    assert.strictEqual(result.title(), 'Other', 'title was not set correctly');
    assert.strictEqual(result.category().title, 'Other', 'category title was not set correctly');
    assert.strictEqual(result.category().shortTitle, 'Other', 'category short title was not set correctly');
    assert.isFalse(result.isTextType(), 'isTextType was not set correctly');
  });

  it('is able to return an application resource from the string "application"', () => {
    const result = ResourceType.fromMimeType('application');
    assert.instanceOf(result, ResourceType, 'result type is incorrect');
    assert.strictEqual(result.name(), 'script', 'name was not set correctly');
    assert.strictEqual(result.title(), 'Script', 'title was not set correctly');
    assert.strictEqual(result.category().title, 'Scripts', 'category title was not set correctly');
    assert.strictEqual(result.category().shortTitle, 'JS', 'category short title was not set correctly');
    assert.isTrue(result.isTextType(), 'isTextType was not set correctly');
  });

  it('is able to return a resource of type other from the string "test/resource"', () => {
    const result = ResourceType.fromMimeType('test/resource');
    assert.instanceOf(result, ResourceType, 'result type is incorrect');
    assert.strictEqual(result.name(), 'other', 'name was not set correctly');
    assert.strictEqual(result.title(), 'Other', 'title was not set correctly');
    assert.strictEqual(result.category().title, 'Other', 'category title was not set correctly');
    assert.strictEqual(result.category().shortTitle, 'Other', 'category short title was not set correctly');
    assert.isFalse(result.isTextType(), 'isTextType was not set correctly');
  });

  it('is able to return a resource type from a URL that contains a mapped extension', () => {
    const result = ResourceType.fromURL('http://www.example.com/test/testFile.js')!;
    assert.instanceOf(result, ResourceType, 'result type is incorrect');
    assert.strictEqual(result.name(), 'script', 'name was not set correctly');
    assert.strictEqual(result.title(), 'Script', 'title was not set correctly');
    assert.strictEqual(result.category().title, 'Scripts', 'category title was not set correctly');
    assert.strictEqual(result.category().shortTitle, 'JS', 'category short title was not set correctly');
    assert.isTrue(result.isTextType(), 'isTextType was not set correctly');
  });

  it('is able to return null from a URL that contains an unmapped extension', () => {
    const result = ResourceType.fromURL('http://www.example.com/test/testFile.testExt');
    assert.isNull(result, 'result is not null');
  });

  it('is able to return a resource type from a mapped name', () => {
    const result = ResourceType.fromName('script')!;
    assert.instanceOf(result, ResourceType, 'result type is incorrect');
    assert.strictEqual(result.name(), 'script', 'name was not set correctly');
    assert.strictEqual(result.title(), 'Script', 'title was not set correctly');
    assert.strictEqual(result.category().title, 'Scripts', 'category title was not set correctly');
    assert.strictEqual(result.category().shortTitle, 'JS', 'category short title was not set correctly');
    assert.isTrue(result.isTextType(), 'isTextType was not set correctly');
  });

  it('is able to return null from an unmapped name', () => {
    const result = ResourceType.fromName('testName');
    assert.isNull(result, 'result is not null');
  });

  it('is able to return a mime from URL that contains a mapped extension', () => {
    const result = ResourceType.mimeFromURL('http://www.example.com/test/path.html');
    assert.strictEqual(result, 'text/html', 'mime returned was not correct');
  });

  it('is able to return a mime from URL that contains an unmapped extension', () => {
    const result = ResourceType.mimeFromURL('http://www.example.com/test/path.testExt');
    assert.isUndefined(result, 'mime returned was not correct');
  });

  it('is able to return a mime from URL that contains a mapped name', () => {
    const result = ResourceType.mimeFromURL('http://www.example.com/test/Cakefile');
    assert.strictEqual(result, 'text/x-coffeescript', 'mime returned was not correct');
  });

  it('is able to return a mime from a mapped extension', () => {
    const result = ResourceType.mimeFromExtension('html');
    assert.strictEqual(result, 'text/html', 'mime returned was not correct');
  });

  it('is able to return a mime from an unmapped extension', () => {
    const result = ResourceType.mimeFromExtension('testExt');
    assert.isUndefined(result, 'mime returned was not correct');
  });

  it('is able to return its title successfully', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('Type Test Name', 'Type Test Title', testResourceCategory, true);
    assert.strictEqual(resourceType.title(), 'Type Test Title', 'title was not returned correctly');
  });

  it('is able to return its isTextType value successfully', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('Type Test Name', 'Type Test Title', testResourceCategory, true);
    assert.isTrue(resourceType.isTextType(), 'isTextType was not returned correctly');
  });

  it('is able to return whether or not its a script if its name equals the value "script"', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('script', 'Type Test Title', testResourceCategory, true);
    assert.isTrue(resourceType.isScript(), 'the resource should be considered as a script');
  });

  it('is able to return whether or not its a script if its name equals the value "sm-script"', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('sm-script', 'Type Test Title', testResourceCategory, true);
    assert.isTrue(resourceType.isScript(), 'the resource should be considered as a script');
  });

  it('is able to return whether or not its a script if its name is not equal to the values "script" or "sm-script"',
     () => {
       const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
       const resourceType = new ResourceType('Type Test Name', 'Type Test Title', testResourceCategory, true);
       assert.isFalse(resourceType.isScript(), 'the resource should not be considered as a script');
     });

  it('is able to return whether or not its a document if its name equals the value "document"', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('document', 'Type Test Title', testResourceCategory, true);
    assert.isTrue(resourceType.isDocument(), 'the resource should be considered as a document');
  });

  it('is able to return whether or not its a document if its name does not equal the value "document"', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('Type Test Name', 'Type Test Title', testResourceCategory, true);
    assert.isFalse(resourceType.isDocument(), 'the resource should not be considered as a document');
  });

  it('is able to determine if a resource has scripts if it is a script', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('script', 'Type Test Title', testResourceCategory, true);
    assert.isTrue(resourceType.hasScripts(), 'the resource should be considered as a having scripts');
  });

  it('is able to determine if a resource has scripts if it is a document', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('document', 'Type Test Title', testResourceCategory, true);
    assert.isTrue(resourceType.hasScripts(), 'the resource should be considered as a having scripts');
  });

  it('is able to determine if a resource has scripts if it is not a script or a document', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('Type Test Name', 'Type Test Title', testResourceCategory, true);
    assert.isFalse(resourceType.hasScripts(), 'the resource should not be considered as a having scripts');
  });

  it('is able to return whether or not its a stylesheet if its name equals the value "stylesheet"', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('stylesheet', 'Type Test Title', testResourceCategory, true);
    assert.isTrue(resourceType.isStyleSheet(), 'the resource should be considered as a stylesheet');
  });

  it('is able to return whether or not its a stylesheet if its name equals the value "sm-stylesheet"', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('sm-stylesheet', 'Type Test Title', testResourceCategory, true);
    assert.isTrue(resourceType.isStyleSheet(), 'the resource should be considered as a stylesheet');
  });

  it('is able to return whether or not its a stylesheet if its name is not equal to the values "stylesheet" or "sm-stylesheet"',
     () => {
       const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
       const resourceType = new ResourceType('Type Test Name', 'Type Test Title', testResourceCategory, true);
       assert.isFalse(resourceType.isStyleSheet(), 'the resource should not be considered as a stylesheet');
     });

  it('is able to return whether it is a document, a script or a stylesheet if it was a document', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('document', 'Type Test Title', testResourceCategory, true);
    assert.isTrue(resourceType.isDocumentOrScriptOrStyleSheet(), 'the resource should be considered as a document');
  });

  it('is able to return whether it is a document, a script or a stylesheet if it was a script', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('script', 'Type Test Title', testResourceCategory, true);
    assert.isTrue(resourceType.isDocumentOrScriptOrStyleSheet(), 'the resource should be considered as a script');
  });

  it('is able to return whether it is a document, a script or a stylesheet if it was a stylesheet', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('stylesheet', 'Type Test Title', testResourceCategory, true);
    assert.isTrue(resourceType.isDocumentOrScriptOrStyleSheet(), 'the resource should be considered as a stylesheet');
  });

  it('is able to return whether it is a document, a script or a stylesheet if it was none of those things', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('Type Test Name', 'Type Test Title', testResourceCategory, true);
    assert.isFalse(
        resourceType.isDocumentOrScriptOrStyleSheet(),
        'the resource should be considered as a doucment, a script or a stylesheet');
  });

  it('is able to determine if it is from source map if it began with "sm-"', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('sm-Type Test Name', 'Type Test Title', testResourceCategory, true);
    assert.isTrue(resourceType.isFromSourceMap(), 'the resource should be considered to be from source map');
  });

  it('is able to determine if it is from source map if it did not begin with "sm-"', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('Type Test Name', 'Type Test Title', testResourceCategory, true);
    assert.isFalse(resourceType.isFromSourceMap(), 'the resource should not be considered to be from source map');
  });

  it('is able to be converted to a string by returning its name', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('Type Test Name', 'Type Test Title', testResourceCategory, true);
    assert.strictEqual(
        resourceType.toString(), 'Type Test Name', 'the resource type was not converted to a string correctly');
  });

  it('is able to return the canonical mime type of a document', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('document', 'Type Test Title', testResourceCategory, true);
    assert.strictEqual(
        resourceType.canonicalMimeType(), 'text/html', 'the canonical mime type was not returned correctly');
  });

  it('is able to return the canonical mime type of a script', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('script', 'Type Test Title', testResourceCategory, true);
    assert.strictEqual(
        resourceType.canonicalMimeType(), 'text/javascript', 'the canonical mime type was not returned correctly');
  });

  it('is able to return the canonical mime type of a stylesheet', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('stylesheet', 'Type Test Title', testResourceCategory, true);
    assert.strictEqual(
        resourceType.canonicalMimeType(), 'text/css', 'the canonical mime type was not returned correctly');
  });

  it('returns an empty string as a canonical mime type if it was not a document, a script or a stylesheet', () => {
    const testResourceCategory = new ResourceCategory('Category Test Title', 'Category Test Short Title');
    const resourceType = new ResourceType('Type Test Name', 'Type Test Title', testResourceCategory, true);
    assert.strictEqual(resourceType.canonicalMimeType(), '', 'the canonical mime type was not returned correctly');
  });

  it('treats a Ping as Other', () => {
    const resourceType = resourceTypes.Ping;
    assert.strictEqual(resourceType.isTextType(), false, 'A ping is not a text type');
    assert.strictEqual(resourceType.canonicalMimeType(), '', 'A ping does not have an associated mime type');
  });

  it('treats a CSPViolationsReport as Other', () => {
    const resourceType = resourceTypes.CSPViolationReport;
    assert.strictEqual(resourceType.isTextType(), false, 'A ping is not a text type');
    assert.strictEqual(resourceType.canonicalMimeType(), '', 'A ping does not have an associated mime type');
  });
});
