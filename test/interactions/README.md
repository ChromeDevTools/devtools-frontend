# Interaction Testing

Interaction tests are used to test individual pieces of DevTools in isolation - whether that be a single UI component, or an entire panel, or something inbetween. They load up the page in the browser and use Puppeteer to query it.

Interaction tests are run against examples on the [Components Server](../../scripts/component_server/README.md), so your first step to writing an Interaction test is to create the required examples you want to test against.

When writing an interactions test, you should use the `loadComponentDocExample()` helper to instruct the test to navigate to a particular example within the component server.

```ts
describe('Example test', () => {
  it('does something', async () => {
    await loadComponentDocExample('performance_panel/basic.html?trace=basic');
    // Assertions go here
  });
});
```

## Screenshot tests

> Ensure you are a member of the g/devtools-dev group, otherwise the `update_goldens_v2.py` tool will not work.

Interaction tests also have the ability to store a screenshot of an element and in future tests ensure that the screenshot has not changed. These should be used sparingly - our usage so far has found that you should prefer HTML assertions if possible - but they are useful particularly for `<canvas>` based UI.

To create a screenshot test, query for an element and call the `assertElementScreenshotUnchanged` function, passing in the element and the file name:

```ts
itScreenshot('loads a trace file and renders it in the timeline', async () => {
  await loadComponentDocExample('performance_panel/basic.html?trace=basic');
  const flamechart = await waitFor('.timeline-flamechart');
  await assertElementScreenshotUnchanged(flamechart, 'performance/example-test.png');
});
```

The first time this test runs, it will create a new stored image in `test/interactions/goldens`. On any future runs, it will compare the generated screenshot against that golden, and fail if there is a difference.

We store and assert golden screenshots from Linux. Mac and Windows are deliberately excluded as web content rarely changes has platform-specific bugs. Developers can update screenshots locally or use screenshots generated from the CQ bots (see below).

### Updating screenshots locally

When you need to update a screenshot because you have purposefully changed the UI:

```sh
npm run test -- $TESTPATH --on-diff=update
```

This tells the test runner to update any screenshots that fail. Once you've done this, the process is identical to when you add a new screenshot:

1. Commit the changes for your platform locally.
2. Trigger a CQ run and wait for it to finish using `git cl try`.
3. Fetch the new screenshots from the bots by using `./scripts/tools/update_goldens_v2.py`.

Note that if you do this step on Linux, you shouldn't need to then get the updates from the bot, because the bots also test and run on Linux.

### Generating and/or updating screenshots via CQ bots

Once you have generated your screenshot locally on your platform, you should upload your CL and trigger a dry-run. This will fail due to missing screenshots, but once it is complete we can then fetch the screenshots from the server.

First, authenticate (using your Google corp credentials):

```
# Run this in the devtools-frontend repository
./third_party/depot_tools/gsutil.py config
```

And then call the script to update the golden screenshots:

```
./scripts/tools/update_goldens_v2.py
```

This will fetch any relevant screenshots locally. You can then commit these and update your CL. Please manually check the screenshots to ensure they are as expected on all platforms!
