// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

var sassSourceMapFactory = null;

SASSTestRunner.sassSourceMapFactory = function() {
  if (!sassSourceMapFactory)
    sassSourceMapFactory = new Sass.SASSSourceMapFactory();

  return sassSourceMapFactory;
};

SASSTestRunner.parseSCSS = function(url, text) {
  return Sass.SASSSupport.parseSCSS(url, text);
};

SASSTestRunner.parseCSS = SASSTestRunner.parseSCSS;

SASSTestRunner.loadASTMapping = function(header, callback) {
  var sourceMapManager = header.cssModel().sourceMapManager();
  var sourceMap = sourceMapManager.sourceMapForClient(header);

  if (sourceMap) {
    callback((sourceMap.editable() ? sourceMap : null));
    return;
  }

  sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapAttached, onAttached);

  function onAttached(event) {
    if (event.data.client !== header)
      return;

    sourceMapManager.removeEventListener(SDK.SourceMapManager.Events.SourceMapAttached, onAttached);
    var sourceMap = event.data.sourceMap;
    callback((sourceMap.editable() ? sourceMap : null));
  }
};

SASSTestRunner.dumpAST = function(ast) {
  var lines = [String.sprintf('=== AST === %s', ast.document.url)];

  for (var i = 0; i < ast.rules.length; ++i) {
    var rule = ast.rules[i];
    lines.push(String.sprintf('rule %d', i));
    var ruleLines = dumpRule(rule);
    lines = lines.concat(indent(ruleLines));
  }

  lines.push('======');
  TestRunner.addResult(lines.join('\n'));
  return ast;

  function dumpRule(rule) {
    var lines = [];

    for (var i = 0; i < rule.selectors.length; ++i) {
      var selector = rule.selectors[i];
      lines.push(`selector ${i}: "${selector.text}"`);
      var selectorLines = dumpTextNode(selector);
      lines = lines.concat(indent(selectorLines));
    }

    for (var i = 0; i < rule.properties.length; ++i) {
      var property = rule.properties[i];
      lines.push('property ' + i);
      var propertyLines = dumpProperty(property);
      lines = lines.concat(indent(propertyLines));
    }

    return lines;
  }

  function dumpProperty(property) {
    var lines = [];
    lines.push(String.sprintf('name: "%s"', property.name.text));
    lines = lines.concat(indent(dumpTextNode(property.name)));
    lines.push(String.sprintf('value: "%s"', property.value.text));
    lines = lines.concat(indent(dumpTextNode(property.value)));
    lines.push(String.sprintf('range: %s', property.range.toString()));
    lines.push(String.sprintf('disabled: %s', property.disabled));
    return lines;
  }

  function dumpTextNode(textNode) {
    return [String.sprintf('range: %s', textNode.range.toString())];
  }
};

function indent(lines) {
  return lines.map(line => '    ' + line);
}

SASSTestRunner.dumpASTDiff = function(diff) {
  TestRunner.addResult('=== Diff ===');
  var changesPerRule = new Map();

  for (var change of diff.changes) {
    var oldRule = change.oldRule;
    var ruleChanges = changesPerRule.get(oldRule);

    if (!ruleChanges) {
      ruleChanges = [];
      changesPerRule.set(oldRule, ruleChanges);
    }

    ruleChanges.push(change);
  }

  var T = Sass.SASSSupport.PropertyChangeType;

  for (var rule of changesPerRule.keys()) {
    var changes = changesPerRule.get(rule);
    var names = [];
    var values = [];

    for (var property of rule.properties) {
      names.push(str(property.name, '    '));
      values.push(str(property.value));
    }

    for (var i = changes.length - 1; i >= 0; --i) {
      var change = changes[i];
      var newProperty = change.newRule.properties[change.newPropertyIndex];
      var oldProperty = change.oldRule.properties[change.oldPropertyIndex];

      switch (change.type) {
        case T.PropertyAdded:
          names.splice(change.oldPropertyIndex, 0, str(newProperty.name, '[+] '));
          values.splice(change.oldPropertyIndex, 0, str(newProperty.value));
          break;
        case T.PropertyRemoved:
          names[change.oldPropertyIndex] = str(oldProperty.name, '[-] ');
          break;
        case T.PropertyToggled:
          names[change.oldPropertyIndex] = str(oldProperty.name, '[T] ');
          break;
        case T.NameChanged:
          names[change.oldPropertyIndex] = str(oldProperty.name, '[M] ');
          break;
        case T.ValueChanged:
          values[change.oldPropertyIndex] = str(oldProperty.value, '[M] ');
          break;
      }
    }

    var selectorText = rule.selectors.map(selector => selector.text).join(',');
    TestRunner.addResult('Changes for rule: ' + selectorText);
    names = indent(names);

    for (var i = 0; i < names.length; ++i)
      TestRunner.addResult(names[i] + ': ' + values[i]);
  }

  function str(node, prefix) {
    prefix = prefix || '';
    return prefix + node.text.trim();
  }
};

SASSTestRunner.validateASTRanges = function(ast) {
  var invalidNodes = [];

  for (var rule of ast.rules) {
    for (var property of rule.properties) {
      validate(property.name);
      validate(property.value);
    }
  }

  if (invalidNodes.length) {
    TestRunner.addResult('Bad ranges: ' + invalidNodes.length);

    for (var node of invalidNodes)
      TestRunner.addResult(String.sprintf('  - range: %s text: %s', node.range.toString(), node.text));
  } else {
    TestRunner.addResult('Ranges OK.');
  }

  return ast;

  function validate(textNode) {
    if (textNode.document.text.extract(textNode.range) !== textNode.text)
      invalidNodes.push(textNode);
  }
};

SASSTestRunner.validateMapping = function(mapping) {
  TestRunner.addResult('Mapped CSS: ' + mapping._compiledToSource.size);
  TestRunner.addResult('Mapped SCSS: ' + mapping._sourceToCompiled.size);
  var cssNodes = mapping._compiledToSource.keysArray();
  var staleCSS = 0;
  var staleSASS = 0;

  for (var i = 0; i < cssNodes.length; ++i) {
    var cssNode = cssNodes[i];
    staleCSS += (cssNode.document !== mapping.compiledModel().document ? 1 : 0);
    var sassNode = mapping.toSourceNode(cssNode);
    var sassAST = mapping.sourceModels().get(sassNode.document.url);
    staleSASS += (sassNode.document !== sassAST.document ? 1 : 0);
  }

  if (staleCSS || staleSASS) {
    TestRunner.addResult('ERROR: found stale entries');
    TestRunner.addResult('   -stale CSS: ' + staleCSS);
    TestRunner.addResult('   -stale SASS: ' + staleSASS);
  } else {
    TestRunner.addResult('No stale entries found.');
  }
};

SASSTestRunner.updateCSSText = function(url, newText) {
  var styleSheetIds = TestRunner.cssModel.styleSheetIdsForURL(url);
  var promises = styleSheetIds.map(id => TestRunner.cssModel.setStyleSheetText(id, newText, true));
  return Promise.all(promises);
};

SASSTestRunner.updateSASSText = function(url, newText) {
  var uiSourceCode = Workspace.workspace.uiSourceCodeForURL(url);
  uiSourceCode.addRevision(newText);
};

SASSTestRunner.runCSSEditTests = function(header, tests) {
  var astSourceMap;
  SASSTestRunner.loadASTMapping(header, onMapping);

  function onMapping(map) {
    astSourceMap = map;
    TestRunner.addResult('INITIAL MODELS');
    logASTText(map.compiledModel(), true);

    for (var ast of map.sourceModels().values())
      logASTText(ast, true);

    runTests();
  }

  function runTests() {
    if (!tests.length) {
      TestRunner.completeTest();
      return;
    }

    var test = tests.shift();
    logTestName(test.name);
    var text = astSourceMap.compiledModel().document.text.value();
    var edits = test(text);
    logSourceEdits(text, edits);
    var ranges = edits.map(edit => edit.oldRange);
    var texts = edits.map(edit => edit.newText);
    astSourceMap.editCompiled(ranges, texts).then(onEditsDone);
  }

  function onEditsDone(result) {
    if (!result.map) {
      TestRunner.addResult('SASSProcessor failed to process edits.');
      runTests();
      return;
    }

    logASTText(result.map.compiledModel());

    for (var sassURL of result.newSources.keys()) {
      var ast = result.map.sourceModels().get(sassURL);
      logASTText(ast);
    }

    runTests();
  }

  function logASTText(ast, avoidIndent, customTitle) {
    customTitle = customTitle || ast.document.url.split('/').pop();
    TestRunner.addResult('===== ' + customTitle + ' =====');
    var text = ast.document.text.value().replace(/ /g, '.');
    var lines = text.split('\n');

    if (!avoidIndent)
      lines = indent(lines);

    TestRunner.addResult(lines.join('\n'));
  }

  function logTestName(testName) {
    var titleText = ' TEST: ' + testName + ' ';
    var totalLength = 80;
    var prefixLength = (totalLength - titleText.length) / 2 | 0;
    var suffixLength = totalLength - titleText.length - prefixLength;
    var prefix = new Array(prefixLength).join('-');
    var suffix = new Array(suffixLength).join('-');
    TestRunner.addResult('\n' + prefix + titleText + suffix + '\n');
  }

  function logSourceEdits(text, edits) {
    var lines = [];

    for (var i = 0; i < edits.length; ++i) {
      var edit = edits[i];
      var range = edit.oldRange;
      var line = String.sprintf('{%d, %d, %d, %d}', range.startLine, range.startColumn, range.endLine, range.endColumn);
      line += String.sprintf(' \'%s\' => \'%s\'', new TextUtils.Text(text).extract(range), edit.newText);
      lines.push(line);
    }

    lines = indent(lines);
    lines.unshift('Edits:');
    TestRunner.addResult(lines.join('\n'));
  }
};

SASSTestRunner.createEdit = function(source, pattern, newText, matchNumber) {
  matchNumber = matchNumber || 0;
  var re = new RegExp(pattern.escapeForRegExp(), 'g');
  var match;

  while ((match = re.exec(source)) !== null && matchNumber)
    --matchNumber;


  if (!match)
    return null;

  var sourceRange = new TextUtils.SourceRange(match.index, match[0].length);
  var textRange = new TextUtils.Text(source).toTextRange(sourceRange);
  return new TextUtils.SourceEdit('', textRange, newText);
};
