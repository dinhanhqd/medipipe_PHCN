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

function drawText(ctx, text, x, y, color = '#00FF00') {
  ctx.font = 'bold 20px Arial';
  ctx.fillStyle = color;
  ctx.fillText(text, x * out5.width, y * out5.height);
}
// hiển thị thông tin 
function showSpecificLandmarkInfo(results, landmarkIndices, yOffset) {
  landmarkIndices.forEach((index, i) => {
    const landmark = results.poseLandmarks[index];
    if (landmark) {
      const x = (landmark.x * out5.width).toFixed(2);
      const y = (landmark.y * out5.height).toFixed(2);
      const z = landmark.z.toFixed(2);
      const visibility = (landmark.visibility !== undefined) ? landmark.visibility.toFixed(2) : 'N/A';

      drawText(canvasCtx5,
        `Landmark ${index}: X: ${x}, Y: ${y}, Z: ${z}, Visibility: ${visibility}`,
        0.09,
        yOffset + (i * 0.05),
        '#00FF00' // Màu sắc cho tất cả các điểm mốc
      );
    } else {
      drawText(canvasCtx5,
        `Landmark ${index}: Data unavailable`,
        0.09,
        yOffset + (i * 0.05),
        '#00FF00'
      );
    }
  });
}


function calculateAngle(a, b, c) {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };

  const dotProduct = ba.x * bc.x + ba.y * bc.y;

  const magnitudeBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
  const magnitudeBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);

  const cosineAngle = dotProduct / (magnitudeBA * magnitudeBC);

  const angleRad = Math.acos(Math.min(1, Math.max(-1, cosineAngle)));

  const angleDeg = angleRad * (180 / Math.PI);

  return angleDeg;
}

function onResultsPose(results) {
  document.body.classList.add('loaded');
  fpsControl.tick();

  canvasCtx5.save();
  canvasCtx5.clearRect(0, 0, out5.width, out5.height);
  canvasCtx5.drawImage(results.image, 0, 0, out5.width, out5.height);

  // Chỉ số landmarks tay phải
  const rightHandLandmarks = [
    results.poseLandmarks[11], // Vai phải
    results.poseLandmarks[13], // Khuỷu tay phải
    results.poseLandmarks[15], // Cổ tay phải
    results.poseLandmarks[17], // Ngón cái phải
    results.poseLandmarks[19], // Ngón út phải
    results.poseLandmarks[21], // Ngón trỏ phải
  ];

  // Chỉ số landmarks tay trái
  const leftHandLandmarks = [
    results.poseLandmarks[12], // Vai trái
    results.poseLandmarks[14], // Khuỷu tay trái
    results.poseLandmarks[16], // Cổ tay trái
    results.poseLandmarks[18], // Ngón cái trái
    results.poseLandmarks[20], // Ngón út trái
    results.poseLandmarks[22], // Ngón trỏ trái
  ];

  // Vẽ các landmarks và kết nối bên phải với màu hiện tại (zColor)
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
    { color: zColor }
  );

  drawLandmarks(canvasCtx5, rightHandLandmarks, { color: zColor, fillColor: '#00FF00' });

  // Vẽ các landmarks và kết nối bên trái với màu đỏ
  drawConnectors(
    canvasCtx5,
    results.poseLandmarks,
    [
      [12, 14], // Vai trái đến khuỷu tay trái
      [14, 16], // Khuỷu tay trái đến cổ tay trái
      [16, 18], // Cổ tay trái đến ngón cái trái
      [16, 20], // Cổ tay trái đến ngón út trái
      [16, 22], // Cổ tay trái đến ngón trỏ trái
    ],
    { color: '#FF0000' } // Màu đỏ
  );

  drawLandmarks(canvasCtx5, leftHandLandmarks, { color: zColor, fillColor: '#FF0000' });

  // Kiểm tra visibility của các landmarks trước khi tính toán góc tay phải
  const rightHandVisibility = rightHandLandmarks.every(landmark => landmark.visibility > 0.5);

  if (rightHandVisibility) {
    // Tính góc khuỷu tay phải
    const SHOULDER_RIGHT = 11;
    const ELBOW_RIGHT = 13;
    const WRIST_RIGHT = 15;

    const shoulderRight = results.poseLandmarks[SHOULDER_RIGHT];
    const elbowRight = results.poseLandmarks[ELBOW_RIGHT];
    const wristRight = results.poseLandmarks[WRIST_RIGHT];

    const angleRight = calculateAngle(
      { x: shoulderRight.x * out5.width, y: shoulderRight.y * out5.height },
      { x: elbowRight.x * out5.width, y: elbowRight.y * out5.height },
      { x: wristRight.x * out5.width, y: wristRight.y * out5.height }
    );

    // In góc khuỷu tay phải ra canvas
    drawText(canvasCtx5, `Góc khuỷu tay phải: ${angleRight.toFixed(2)} °`, 0.09, 0.1);
  } else {
    drawText(canvasCtx5, 'tay phải chưa được đưa vào khung hình', 0.09, 0.1);
  }

  // Kiểm tra visibility của các landmarks trước khi tính toán góc tay trái
  const leftHandVisibility = leftHandLandmarks.every(landmark => landmark.visibility > 0.5);

  if (leftHandVisibility) {
    // Tính góc khuỷu tay trái
    const SHOULDER_LEFT = 12;
    const ELBOW_LEFT = 14;
    const WRIST_LEFT = 16;

    const shoulderLeft = results.poseLandmarks[SHOULDER_LEFT];
    const elbowLeft = results.poseLandmarks[ELBOW_LEFT];
    const wristLeft = results.poseLandmarks[WRIST_LEFT];

    const angleLeft = calculateAngle(
      { x: shoulderLeft.x * out5.width, y: shoulderLeft.y * out5.height },
      { x: elbowLeft.x * out5.width, y: elbowLeft.y * out5.height },
      { x: wristLeft.x * out5.width, y: wristLeft.y * out5.height }
    );

    // In góc khuỷu tay trái ra canvas
    drawText(canvasCtx5, `Góc khuỷu tay trái: ${angleLeft.toFixed(2)} °`, 0.09, 0.15);
  } else {
    drawText(canvasCtx5, 'tay trái chưa được đưa vào khung hình', 0.09, 0.15);
  }
  // hiển thị thông tin điểm
  //const specificLandmarkIndices = [13];
  //showSpecificLandmarkInfo(results, specificLandmarkIndices, 0.2);

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
  width: 580,
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
