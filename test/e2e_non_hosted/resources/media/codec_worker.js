const defaultInit = {
  output: () => {},
  error: () => {},
}

const videoDecoder = new VideoDecoder(defaultInit);
const videoEncoder = new VideoEncoder(defaultInit);
const audioDecoder = new AudioDecoder(defaultInit);
const audioEncoder = new AudioEncoder(defaultInit);

videoDecoder.configure({
  codec: 'vp8',
  codedWidth: 1920,
  codedHeight: 1088,
  visibleRegion: {left: 0, top: 0, width: 1920, height: 1080},
  displayWidth: 1920,
  displayHeight: 1080
});
