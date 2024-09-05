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

function drawPoint(ctx, x, y, color = '#FF0000', radius = 5) {
  ctx.beginPath();
  ctx.arc(x * out5.width, y * out5.height, radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.closePath();
}

function drawText(ctx, text, x, y, color = '#FF0000') {
  ctx.font = '14px Arial';
  ctx.fillStyle = color;
  ctx.fillText(text, x * out5.width, y * out5.height);
}

function distanceBetweenPoints(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2) + Math.pow(p2.z - p1.z, 2));
}

function pointToLineDistance(point, lineStart, lineEnd) {
  const lineDir = { x: lineEnd.x - lineStart.x, y: lineEnd.y - lineStart.y, z: lineEnd.z - lineStart.z };
  const pointDir = { x: point.x - lineStart.x, y: point.y - lineStart.y, z: point.z - lineStart.z };

  const lineLengthSquared = distanceBetweenPoints(lineStart, lineEnd) ** 2;
  const t = Math.max(0, Math.min(1, ((pointDir.x * lineDir.x + pointDir.y * lineDir.y + pointDir.z * lineDir.z) / lineLengthSquared)));

  const projection = { x: lineStart.x + t * lineDir.x, y: lineStart.y + t * lineDir.y, z: lineStart.z + t * lineDir.z };

  return distanceBetweenPoints(point, projection);
}

function calculateHeadTilt(landmarks) {
  if (landmarks.length < 13) {
    console.warn('Not enough landmarks to calculate head tilt.');
    return { pitch: null, roll: null, yaw: null };
  }

  const head = landmarks[0];
  const neck = landmarks[2];
  const headToNeck = {
    x: head.x - neck.x,
    y: head.y - neck.y,
    z: head.z - neck.z
  };

  const pitch = Math.atan2(headToNeck.y, headToNeck.z);
  const roll = Math.atan2(headToNeck.x, Math.sqrt(headToNeck.y ** 2 + headToNeck.z ** 2));
  const yaw = Math.atan2(headToNeck.y, headToNeck.x);

  console.log(`Head Tilt (pitch, roll, yaw in radians):`, pitch, roll, yaw);
  console.log(`Head Tilt (pitch, roll, yaw in degrees):`,
    (180.0 * (pitch / Math.PI)).toFixed(2),
    (180.0 * (roll / Math.PI)).toFixed(2),
    (180.0 * (yaw / Math.PI)).toFixed(2));

  return { pitch, roll, yaw };
}

function onResultsPose(results) {
  document.body.classList.add('loaded');
  fpsControl.tick();

  canvasCtx5.save();
  canvasCtx5.clearRect(0, 0, out5.width, out5.height);
  canvasCtx5.drawImage(results.image, 0, 0, out5.width, out5.height);

  if (results.poseLandmarks && results.poseLandmarks.length >= 13) {
    const rightHandLandmarks = results.poseLandmarks.slice(0, 13);

    drawConnectors(
      canvasCtx5,
      results.poseLandmarks,
      [
        [0, 2],
        [0, 5],
        [2, 7],
        [5, 8],
        [9, 10],
        [11, 12],
      ],
      { color: zColor }
    );

    drawLandmarks(
      canvasCtx5,
      rightHandLandmarks,
      { color: zColor, fillColor: '#00FF00' }
    );

    const landmark0 = results.poseLandmarks[0];
    const landmark11 = results.poseLandmarks[11];
    const landmark12 = results.poseLandmarks[12];

    if (landmark0 && landmark11 && landmark12) {
      const distance = pointToLineDistance(landmark0, landmark11, landmark12);
      console.log(`Distance from point 0 to line 11-12: ${distance.toFixed(2)}`);

      const midpoint = {
        x: (landmark11.x + landmark12.x) / 2,
        y: (landmark11.y + landmark12.y) / 2,
        z: (landmark11.z + landmark12.z) / 2,
      };

      drawPoint(canvasCtx5, midpoint.x, midpoint.y, '#FF0000', 5);
      drawText(canvasCtx5, `Midpoint Z: ${midpoint.z.toFixed(2)}`, midpoint.x, midpoint.y + 0.02);
      drawText(canvasCtx5, `Distance: ${distance.toFixed(2)}`, 0.05, 0.95);

      const { pitch, roll, yaw } = calculateHeadTilt(results.poseLandmarks);

      if (pitch !== null && roll !== null && yaw !== null) {
        drawText(canvasCtx5, `Head Tilt: ${((180.0 * (pitch / Math.PI)).toFixed(2))}°`, 0.05, 0.90);
        drawText(canvasCtx5, `Head Roll: ${((180.0 * (roll / Math.PI)).toFixed(2))}°`, 0.05, 0.85);
        drawText(canvasCtx5, `Head Yaw: ${((180.0 * (yaw / Math.PI)).toFixed(2))}°`, 0.05, 0.80);
      }
    } else {
      console.warn('Landmarks 0, 11, or 12 are not available.');
    }
  } else {
    console.warn('Pose landmarks are not available or not enough landmarks.');
  }

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
