addEventListener('message', async event => {
  event.source.postMessage('pong');
});
