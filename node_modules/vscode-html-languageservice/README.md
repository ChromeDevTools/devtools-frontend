# vscode-html-languageservice
HTML language service extracted from VSCode to be reused, e.g in the Monaco editor.

[![npm Package](https://img.shields.io/npm/v/vscode-html-languageservice.svg?style=flat-square)](https://www.npmjs.org/package/vscode-html-languageservice)
[![NPM Downloads](https://img.shields.io/npm/dm/vscode-html-languageservice.svg)](https://npmjs.org/package/vscode-html-languageservice)
[![Azure DevOps Build Status](https://img.shields.io/azure-devops/build/vscode/4c3636fe-3a50-40b9-b8b4-f820ca92886f/22.svg?label=Azure%20DevOps)](https://dev.azure.com/vscode/vscode-html-languageservice/_build?definitionId=22)
[![Travis Build Status](https://travis-ci.org/Microsoft/vscode-html-languageservice.svg?branch=master)](https://travis-ci.org/Microsoft/vscode-html-languageservice)


Why?
----

The _vscode-html-languageservice_ contains the language smarts behind the HTML editing experience of Visual Studio Code
and the Monaco editor.

 - *findDocumentHighlights* provides the highlighted symbols for a given position.
 - *doComplete* provides completion proposals for a given location.
 - *setCompletionParticipants* allows participant to provide suggestions for specific tokens.
 - *doHover* provides hover information at a given location.
 - *format* formats the code at the given range.
 - *findDocumentLinks* finds all links in the document.
 - *findDocumentSymbols* finds all the symbols in the document.
 - *getFoldingRanges* return folding ranges for the given document.
 - *getSelectionRanges* return the selection ranges for the given document.

Installation
------------

    npm install --save vscode-html-languageservice

License
-------

(MIT License)

Copyright 2016-2019, Microsoft

With the exceptions of `data/*.json`, which is built upon content from [Mozilla Developer Network](https://developer.mozilla.org/en-US/docs/Web)
and distributed under CC BY-SA 2.5.
