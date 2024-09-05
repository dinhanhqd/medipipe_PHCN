const video5 = document.getElementsByClassName('input_video5')[0];
const out5 = document.getElementsByClassName('output5')[0];
const controlsElement5 = document.getElementsByClassName('control5')[0];
const canvasCtx5 = out5.getContext('2d');

const fpsControl = new FPS();

const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
  spinner.style.display = 'none';
};

function zColor(data) {
  const z = clamp(data.from.z + 0.5, 0, 1);
  return `rgba(0, ${255 * z}, ${255 * (1 - z)}, 1)`;
}

function onResultsPose(results) {
  document.body.classList.add('loaded');
  fpsControl.tick();

  canvasCtx5.save();
  canvasCtx5.clearRect(0, 0, out5.width, out5.height);
  canvasCtx5.drawImage(
    results.image, 0, 0, out5.width, out5.height);

  // Lấy các điểm landmark của tay phải
  const rightHandLandmarks = [
    results.poseLandmarks[11], // Vai phải
    results.poseLandmarks[13], // Khuỷu tay phải
    results.poseLandmarks[15], // Cổ tay phải
    results.poseLandmarks[17], // Ngón cái phải
    results.poseLandmarks[19], // Ngón út phải
    results.poseLandmarks[21], // Ngón trỏ phải
  ];

  // Nối các điểm landmark của tay phải với nhau
  drawConnectors(
    canvasCtx5,
    results.poseLandmarks,
    [
      [11, 13], // Vai phải đến khuỷu tay phải
      [13, 15], // Khuỷu tay phải đến cổ tay phải
      [15, 17], // Cổ tay phải đến ngón cái phải
      [15, 19], // Cổ tay phải đến ngón út phải
      [15, 21], // Cổ tay phải đến ngón trỏ phải
    ],
    { color: zColor } // Màu sắc cho các kết nối
  );

  // Vẽ các điểm landmark của tay phải
  drawLandmarks(
    canvasCtx5,
    rightHandLandmarks,
    { color: zColor, fillColor: '#00FF00' } // Màu cho các điểm landmark
  );

  canvasCtx5.restore();
}


const pose = new Pose({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.2/${file}`;
  }
});
pose.onResults(onResultsPose);

const camera = new Camera(video5, {
  onFrame: async () => {
    await pose.send({ image: video5 });
  },
  width: 480,
  height: 480
});
camera.start();

new ControlPanel(controlsElement5, {
  selfieMode: true,
  upperBodyOnly: true,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
})
  .add([
    new StaticText({ title: 'MediaPipe Pose' }),
    fpsControl,
    new Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),
    new Toggle({ title: 'Upper-body Only', field: 'upperBodyOnly' }),
    new Toggle({ title: 'Smooth Landmarks', field: 'smoothLandmarks' }),
    new Slider({
      title: 'Min Detection Confidence',
      field: 'minDetectionConfidence',
      range: [0, 1],
      step: 0.01
    }),
    new Slider({
      title: 'Min Tracking Confidence',
      field: 'minTrackingConfidence',
      range: [0, 1],
      step: 0.01
    }),
  ])
  .on(options => {
    video5.classList.toggle('selfie', options.selfieMode);
    pose.setOptions(options);
  });
