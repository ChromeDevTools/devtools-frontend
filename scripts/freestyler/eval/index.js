// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const FREESTYLER_SERVER_URL = 'http://localhost:8000';
const Utils = {
  jsonToAsciiTable(data) {
    const exampleIdEvaluations = {};
    let numberOfMostAnswers = 0;
    for (const {exampleId, evaluation} of data) {
      if (!exampleIdEvaluations[exampleId]) {
        exampleIdEvaluations[exampleId] = {
          answers: [],
          final: undefined,
        };
      }

      if (evaluation === 'Correct' || evaluation === 'Wrong') {
        exampleIdEvaluations[exampleId].final = evaluation;
      } else {
        exampleIdEvaluations[exampleId].answers.push(evaluation);
      }

      const newLength = exampleIdEvaluations[exampleId].answers.length;
      numberOfMostAnswers = Math.max(newLength, numberOfMostAnswers);
    }

    const numberOfColumns = numberOfMostAnswers;
    const columnNames = ['exampleId', ...[...new Array(numberOfColumns)].map((_, i) => 'evaluation')];
    const rowData = Object.keys(exampleIdEvaluations).map(key => {
      const answers = exampleIdEvaluations[key].answers;
      const final = exampleIdEvaluations[key].final;
      const exampleName = final === 'Correct' ? `+ ${key}` : final === 'Wrong' ? `- ${key}` : `? ${key}`;
      const valuesArr = [exampleName, ...answers];

      if (valuesArr.length < numberOfColumns) {
        valuesArr.push(...[...new Array(numberOfColumns - valuesArr.length + 1)].map(() => ''));
      }

      return valuesArr;
    });

    // Function to determine the maximum width of a column
    const getColumnWidth = (colName, index) => {
      const columnLengths = rowData.map(singleRow => singleRow[index]?.length || 0);
      return Math.max(
          colName.length,
          ...columnLengths,
      );
    };

    // Calculate the column widths
    const columnWidths = columnNames.map((name, index) => getColumnWidth(name, index));

    // Function to create a table row
    const createRow = (values, separator = '-') =>
        `|${values.map((val, i) => ` ${String(val !== undefined ? val : '').padEnd(columnWidths[i])} `).join('|')}|`;

    // Create the header separator row
    const headerSeparator = createRow(columnNames.map((_, i) => ''.padEnd(columnWidths[i], '-')), '+');

    const rows = [];
    for (const singleRowData of rowData) {
      rows.push(createRow(singleRowData));
    }

    // Build the table string
    const table = [
      headerSeparator,
      createRow(columnNames),
      headerSeparator,
      ...rows,
      headerSeparator,
    ].join('\n');

    return table;
  },
  toCsv(data) {
    const escapeCell = val => `"${(String(val)).replaceAll('"', '""')}"`;

    data.sort((datum1, datum2) => {
      if (datum1.exampleId === datum2.exampleId) {
        return 0;
      }

      if (datum1.exampleId > datum2.exampleId) {
        return 1;
      }

      return -1;
    });

    const evaluationToRate = evaluation => {
      const regex = /\((.*)\)/;
      const result = regex.exec(evaluation);
      return result?.[1] || '';
    };

    const evaluationToFinalRate = evaluation => {
      if (evaluation !== 'Correct' && evaluation !== 'Wrong') {
        return '';
      }

      return evaluation === 'Correct' ? 1 : -1;
    };

    let csv = 'exampleId, evaluation, rate, finalRate';
    const evalDataByExampleId = {};
    for (let i = 0; i < data.length; i++) {
      const datum = data[i];
      const isFinalRating = datum.evaluation === 'Correct' || datum.evaluation === 'Wrong';
      if (!evalDataByExampleId[datum.exampleId]) {
        evalDataByExampleId[datum.exampleId] = {exampleId: datum.exampleId, evals: [], finalRate: undefined};
      }

      if (isFinalRating) {
        evalDataByExampleId[datum.exampleId].finalRate = datum.evaluation;
      } else {
        evalDataByExampleId[datum.exampleId].evals.push(datum.evaluation);
      }
    }

    for (const key of Object.keys(evalDataByExampleId)) {
      const evalData = evalDataByExampleId[key];
      for (let i = 0; i < evalData.evals.length; i++) {
        const evaluation = evalData.evals[i];
        csv += `\n${escapeCell(evalData.exampleId)}, ${escapeCell(evaluation)}, ${
            escapeCell(evaluationToRate(evaluation))},`;
        if (i + 1 === evalData.evals.length) {
          csv += ` ${escapeCell(evaluationToFinalRate(evalData.finalRate))}`;
        }
      }
    }
    return csv;
  }
};

const examplesMapCache = {};
const API = {
  fetchDatasets: async () => {
    const datasetNamesHtml = await (await fetch(`${FREESTYLER_SERVER_URL}/data`)).text();
    const parser = new DOMParser();
    const document = parser.parseFromString(datasetNamesHtml, 'text/html');
    const links = document.querySelectorAll('a');
    const reverseLinks = [...links].reverse();
    return reverseLinks.filter(link => link.textContent.endsWith('.json')).map(link => ({title: link.textContent}));
  },
  getExamplesMap: async ({title}) => {
    if (examplesMapCache[title]) {
      return examplesMapCache[title];
    }

    const {examples, metadata} = await (await fetch(`${FREESTYLER_SERVER_URL}/data/${title}`)).json();
    examples.sort((ex1, ex2) => ex1.exampleId > ex2.exampleId ? 1 : ex1.exampleId < ex2.exampleId ? -1 : 0);
    const examplesMap = {};
    for (const example of examples) {
      const exampleId = example.exampleId;
      const request = example.request.input;
      const response = example.response;
      if (!examplesMap[exampleId]) {
        examplesMap[exampleId] = [];
      }

      examplesMap[exampleId].push({
        exampleId,
        request: {input: request},
        response,
      });
    }

    examplesMapCache[title] = {examplesMap, metadata};
    return examplesMapCache[title];
  },
};

const viewState = {
  dataIds: [],
  dataId: null,
  compareWithDataId: null,
  selectedExampleIndex: 0
};

const evaluationStateTextFromStorage = localStorage.getItem('evaluationState');
const evaluationState = evaluationStateTextFromStorage ? JSON.parse(evaluationStateTextFromStorage) : {};
function createPointRadios({onChange, id, points, titleText, noBorder}) {
  const container = document.createElement('div');
  container.setAttribute('style', `
    display: flex;
    gap: 4px;
    flex-direction: column;
  `);
  const title = document.createElement('div');
  title.setAttribute('style', `
    font-weight: bold;
    ${!noBorder ? 'border-top: 1px solid rgb(0 0 0 / 20%)' : ''};
    padding-top: 8px;
    padding-bottom: 4px;
  `);
  title.textContent = titleText;
  container.append(title);
  for (const point of points) {
    const radioContainer = document.createElement('div');
    radioContainer.setAttribute('style', 'display: inline-flex; gap: 8px;');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `points-${id}`;
    radio.value = `${point}-${id}`;
    radio.id = `${point}-${id}`;
    radio.checked = evaluationState[id] === point;
    radio.addEventListener('change', ev => {
      onChange(point);
    });

    const label = document.createElement('label');
    label.setAttribute('for', `${point}-${id}`);
    label.textContent = point;
    radioContainer.append(radio);
    radioContainer.append(label);
    container.append(radioContainer);
  }
  return container;
}

function createChatBubble({text, evaluationId, onEvaluationChange}) {
  const points =
      ['Fully helpful (1)', 'Very helpful (0.75)', 'Somewhat helpful (0.5)', 'Not helpful (0.25)', 'Harmful (0)'];
  const el = document.createElement('div');
  el.setAttribute('style', `
    display: block;
    font-family: monospace;
    white-space: pre;
    text-wrap: wrap;
    overflow-wrap: break-word;
    margin: 1em 0px;
    padding: 24px 12px;
    border-radius: 12px;
    font-size: 14px;
    background: color(srgb 0.952941 0.96549 0.987137);
  `);
  el.textContent = text;

  const pointsContainer = document.createElement('div');
  pointsContainer.setAttribute('style', 'margin-top: 12px;');
  pointsContainer.append(createPointRadios({
    points,
    titleText: 'Evaluation',
    id: evaluationId,
    onChange: point => {
      onEvaluationChange(point);
    }
  }));
  el.append(pointsContainer);
  return el;
}

function renderExample(container, sourceMap, {onEvaluationChange}) {
  const exampleIds = Object.keys(viewState.examplesMap);
  const exampleId = exampleIds[viewState.selectedExampleIndex];
  const requestResponses = sourceMap[exampleId];
  container.innerHTML = '';

  let i = 0;
  for (const requestResponse of requestResponses) {
    const text = `${requestResponse.request.input}\n\n${requestResponse.response}`;
    const evaluationId = JSON.stringify({
      datasetTitle: viewState.dataId,
      exampleId,
      requestResponseIndex: i,
    });
    container.append(createChatBubble({
      text,
      evaluationId,
      onEvaluationChange: point => {
        evaluationState[evaluationId] = point;
        localStorage.setItem('evaluationState', JSON.stringify(evaluationState));
        onEvaluationChange();
      }
    }));
    i++;
  }

  const finalResponseRatingContainer = document.createElement('div');
  finalResponseRatingContainer.setAttribute('style', `
    background: hsl(0 100% 95% / 1);
    padding: 4px 12px 12px;
    border-radius: 12px;
  `);
  const finalEvaluationId = JSON.stringify({datasetTitle: viewState.dataId, exampleId});
  finalResponseRatingContainer.append(createPointRadios({
    points: ['Correct', 'Wrong'],
    titleText: 'The final answer is:',
    noBorder: true,
    id: finalEvaluationId,
    onChange: point => {
      evaluationState[finalEvaluationId] = point;
      localStorage.setItem('evaluationState', JSON.stringify(evaluationState));
      onEvaluationChange();
    }
  }));
  container.append(finalResponseRatingContainer);
}

function renderExampleSelector(container, {onChange}) {
  container.innerHTML = '';
  const exampleIds = Object.keys(viewState.examplesMap);
  const label = document.createElement('label');
  label.textContent = 'Example: ';
  const select = document.createElement('select');
  for (const exampleId of exampleIds) {
    const option = document.createElement('option');
    option.selected = exampleId === exampleIds[viewState.selectedExampleIndex];
    option.textContent = exampleId;
    option.name = exampleId;
    select.append(option);
  }

  select.selectedIndex = viewState.selectedExampleIndex;
  select.addEventListener('change', ev => {
    onChange(ev.target.selectedIndex);
  });
  container.append(label);
  container.append(select);
}

function createDataSetSelector(label, selectedId, onChange) {
  const dataSelectorContainer = document.createElement('div');
  const dataSelect = document.createElement('select');
  viewState.dataIds.forEach(dataId => {
    const option = document.createElement('option');
    option.name = dataId;
    option.textContent = dataId;
    dataSelect.append(option);
  });
  dataSelect.selectedIndex = viewState.dataIds.findIndex(dataId => selectedId === dataId);
  dataSelect.addEventListener('change', ev => {
    onChange(ev);
    document.startViewTransition(() => {
      renderMainPage();
    });
  });
  const dataSelectSpan = document.createElement('span');
  dataSelectSpan.textContent = label;
  dataSelectorContainer.append(dataSelectSpan);
  dataSelectorContainer.append(dataSelect);
  return dataSelectorContainer;
}

async function renderMainPage() {
  const container = document.querySelector('#container');
  container.innerHTML = '';
  container.setAttribute('style', 'padding-bottom: 24px;');
  const {examplesMap, metadata} = await API.getExamplesMap({title: viewState.dataId});
  viewState.examplesMap = examplesMap;
  if (viewState.compareWithDataId) {
    const {examplesMap} = await API.getExamplesMap({title: viewState.compareWithDataId});
    viewState.compareWithExamplesMap = examplesMap;
  }
  viewState.metadata = metadata;
  viewState.selectedExampleIndex = 0;

  const header = document.createElement('div');
  header.setAttribute('style', `
    position: sticky;
    top: 0;
    background: white;
    padding-bottom: 12px;
  `);
  const heading = document.createElement('h1');
  heading.textContent = 'Freestyler Eval Tool';

  const dataSelectorContainer = createDataSetSelector('Dataset: ', viewState.dataId, ev => {
    viewState.dataId = viewState.dataIds[ev.target.selectedIndex];
    viewState.selectedExampleIndex = 0;
  });
  const compareWithDataSelectorContainer = createDataSetSelector('Compare with: ', viewState.compareWithDataId, ev => {
    viewState.compareWithDataId = viewState.dataIds[ev.target.selectedIndex];
  });
  const exampleSelectorContainer = document.createElement('div');

  const exportContainer = document.createElement('div');
  exportContainer.setAttribute('style', `
    padding-top: 12px;
  `);
  function renderResultsTable() {
    const isOpen = exportContainer.querySelector('details')?.open;
    const datasetId = viewState.dataId;
    exportContainer.innerHTML = '';
    const dialogContainer = document.createElement('div');
    exportContainer.append(dialogContainer);

    const evaluationIds = (Object.keys(evaluationState)).map(key => JSON.parse(key));
    const evaluationIdsForDataset = evaluationIds.filter(evaluationIdObj => evaluationIdObj.datasetTitle === datasetId);
    const evaluationsForDataset = evaluationIdsForDataset.map((evaluationIdObj, i) => {
      const key = JSON.stringify(evaluationIdObj);
      const evaluation = {exampleId: evaluationIdObj.exampleId, evaluation: evaluationState[key]};
      return evaluation;
    });

    const result = evaluationIdsForDataset.length > 0 ? Utils.jsonToAsciiTable(evaluationsForDataset) : '';
    const resultsContainer = document.createElement('details');
    if (isOpen) {
      resultsContainer.setAttribute('open', 'true');
    }
    const resultsText = document.createElement('pre');
    const resultsSummary = document.createElement('summary');
    resultsSummary.innerHTML = `Expand to see evaluation table for <strong>${viewState.dataId}</strong>`;
    resultsText.textContent = result;

    const exportButton = document.createElement('button');
    exportButton.setAttribute('style', `
      margin-top: 12px;
    `);
    exportButton.textContent = 'Export as CSV';
    exportButton.addEventListener('click', async () => {
      exportButton.textContent = 'Copied (or check console)';
      setTimeout(() => {
        exportButton.textContent = 'Export as CSV';
      }, 3000);

      const csvText = Utils.toCsv(evaluationsForDataset);

      const blob = new Blob([csvText], {type: 'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${viewState.dataId}-eval.csv`);
      link.click();

      console.log('Paste the below CSV text to a sheet, then click Data > Split text to columns');
      console.log(csvText);
      await navigator.clipboard.writeText(csvText);
    });

    resultsContainer.append(resultsSummary);
    resultsContainer.append(resultsText);
    exportContainer.append(resultsContainer);
    exportContainer.append(exportButton);
  }

  const exampleDescriptionContainer = document.createElement('div');
  function renderExampleDescription() {
    const exampleIds = Object.keys(viewState.examplesMap);
    const exampleId = exampleIds[viewState.selectedExampleIndex];

    exampleDescriptionContainer.innerHTML = '';
    const exampleHeading = document.createElement('h2');
    exampleHeading.textContent = exampleId;
    exampleDescriptionContainer.append(exampleHeading);
    const explanationContainer = document.createElement('div');
    const explanation = metadata.find(data => data.exampleId === exampleId)?.explanation;
    explanationContainer.innerHTML = explanation ? `Evaluation tip: <strong>${explanation}</strong>` : '';
    exampleDescriptionContainer.append(explanationContainer);
  }

  header.append(heading);
  header.append(dataSelectorContainer);
  header.append(compareWithDataSelectorContainer);
  header.append(exampleSelectorContainer);
  header.append(exportContainer);
  header.append(exampleDescriptionContainer);
  container.append(header);

  const gridContainer = document.createElement('div');
  gridContainer.style = `
    display: flex;
    flex-direction: row;
  `;
  container.append(gridContainer);

  const exampleContainer = document.createElement('div');
  gridContainer.append(exampleContainer);

  const compareWithExampleContainer = document.createElement('div');
  gridContainer.append(compareWithExampleContainer);

  viewState.handleExampleChange = () => {
    document.startViewTransition(() => {
      renderExample(exampleContainer, viewState.examplesMap, {onEvaluationChange: () => renderResultsTable()});
      if (viewState.compareWithDataId) {
        renderExample(
            compareWithExampleContainer, viewState.compareWithExamplesMap,
            {onEvaluationChange: () => renderResultsTable()});
      }
      renderExampleDescription();
      renderExampleSelector(exampleSelectorContainer, {
        onChange: selectedExampleIndex => {
          viewState.selectedExampleIndex = selectedExampleIndex;
          viewState.handleExampleChange();
        }
      });
    });
  };

  renderResultsTable();
  renderExample(exampleContainer, viewState.examplesMap, {onEvaluationChange: () => renderResultsTable()});
  if (viewState.compareWithDataId) {
    renderExample(
        compareWithExampleContainer, viewState.compareWithExamplesMap,
        {onEvaluationChange: () => renderResultsTable()});
  }
  renderExampleDescription();
  renderExampleSelector(exampleSelectorContainer, {
    onChange: selectedExampleIndex => {
      viewState.selectedExampleIndex = selectedExampleIndex;
      viewState.handleExampleChange();
    }
  });

  if (!viewState.addedEventListener) {
    viewState.addedEventListener = true;
    window.addEventListener('keydown', ev => {
      if (ev.code !== 'ArrowRight' && ev.code !== 'ArrowLeft') {
        return;
      }

      ev.preventDefault();
      const exampleIdsLength = Object.keys(viewState.examplesMap).length;
      const previousIndex = viewState.selectedExampleIndex;
      viewState.selectedExampleIndex = ev.code === 'ArrowRight' ?
          Math.min(viewState.selectedExampleIndex + 1, exampleIdsLength - 1) :
          Math.max(viewState.selectedExampleIndex - 1, 0);
      if (previousIndex !== viewState.selectedExampleIndex) {
        document.scrollingElement.scrollTop = 0;
        viewState.handleExampleChange();
      }
    }, {capture: true});
  }
}

async function initMainPage() {
  document.querySelector('#container').textContent = 'Loading...';
  const datasets = await API.fetchDatasets();
  viewState.dataIds = datasets.map(dataset => dataset.title);
  viewState.dataId = datasets[0].title;
}

async function main() {
  await initMainPage();
  renderMainPage();
}

main();
