# Freestyler Evaluation

This directory contains scripts for the prompt iteration & evaluation process for Freestyler.

Mainly, `auto_freestyler.js` script takes example URLs, runs the examples and outputs the results to the `data/` directory. Then, the HTML page in `eval/` folder
takes these results and presents them in a UI for evaluation.

## Running auto freestyler
**Prerequisites**
* You need to have at least Node v20 to run Auto Freestyler.
* You need to have a version of Chrome that contains the Freestyler feature. (i.e. you also need to be logged in & have sync enabled)

**Steps**
1. Run a Freestyler enabled Chrome executable with `--remote-debugging-port 9222` and `--auto-open-devtools-for-tabs` targeting `about:blank`. For example:
```
/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary --remote-debugging-port=9222 --auto-open-devtools-for-tabs about:blank
```

2. Make sure you use en-US locale in DevTools.

3. Close the DevTools window for the initial `about:blank` page but keep the tab open.

4. Run the following command
```
node scripts/freestyler/auto_freestyler.js --example-urls <example-url-1> <example-url-2>
```

At the end of these steps, the examples in the urls `<example-url-1>` and `<example-url-2>` should be run and the results must be saved to the `data/` folder.

Tip: You can add a `--label <label>` argument to the run to label the dataset. For example:
```
node scripts/freestyler/auto_freestyler.js --label title-change --example-urls <example-url-1> <example-url-2>
```

## Evaluating the results
**Steps**
1. Serve the `scripts/freestyler` folder by using a simple file server. For example:
```
python3 -m http.server
```
2. Visit http://localhost:8000/eval URL to see the UI.
3. Select the dataset you want to evaluate in the UI. (`Dataset:` selector)
4. Evaluate the examples one by one.

Tip: You can navigate the questions with `Tab` key and move between examples with `ArrowLeft` and `ArrowRight`.