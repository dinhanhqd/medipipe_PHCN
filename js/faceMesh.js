// Ensure OpenCV.js is loaded before running the code
function onOpenCvReady() {
  console.log('OpenCV.js is ready.');

  const video2 = document.getElementsByClassName('input_video2')[0];
  const out2 = document.getElementsByClassName('output2')[0];
  const controlsElement2 = document.getElementsByClassName('control2')[0];
  const canvasCtx = out2.getContext('2d');

  const fpsControl = new FPS();
  const spinner = document.querySelector('.loading');
  spinner.ontransitionend = () => {
    spinner.style.display = 'none';
  };

  function onResultsFaceMesh(results) {
    document.body.classList.add('loaded');
    fpsControl.tick();

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, out2.width, out2.height);
    canvasCtx.drawImage(results.image, 0, 0, out2.width, out2.height);

    if (results.multiFaceLandmarks) {
      for (const landmarks of results.multiFaceLandmarks) {
        const selectedLandmarks = [
          landmarks[1],    // Point 1
          landmarks[33],   // Point 33
          landmarks[263],  // Point 263
          landmarks[61],   // Point 61
          landmarks[291],  // Point 291
          landmarks[199],  // Point 199
        ];

        drawLandmarks(canvasCtx, selectedLandmarks, {
          color: 'red',
          radius: 5,
        });

        // Calculate pose
        let face_2d = [];
        const points = [1, 33, 263, 61, 291, 199];
        const pointsObj = [
          0, -1.126865, 7.475604, // Nose
          -4.445859, 2.663991, 3.173422, // Left eye corner
          4.445859, 2.663991, 3.173422, // Right eye corner
          -2.456206, -4.342621, 4.283884, // Left mouth corner
          2.456206, -4.342621, 4.283884, // Right mouth corner
          0, -9.403378, 4.264492 // Chin
        ];

        const width = results.image.width;
        const height = results.image.height;
        let roll = 0, pitch = 0, yaw = 0;

        const normalizedFocaleY = 1.28;
        const focalLength = height * normalizedFocaleY;
        const cx = width / 2;
        const cy = height / 2;

        const cam_matrix = cv.matFromArray(3, 3, cv.CV_64FC1, [
          focalLength, 0, cx,
          0, focalLength, cy,
          0, 0, 1
        ]);

        const k1 = 0.1318020374;
        const k2 = -0.1550007612;
        const p1 = -0.0071350401;
        const p2 = -0.0096747708;
        const dist_matrix = cv.matFromArray(4, 1, cv.CV_64FC1, [k1, k2, p1, p2]);

        points.forEach(point => {
          const point0 = landmarks[point];
          const x = point0.x * width;
          const y = point0.y * height;
          face_2d.push(x, y);
        });

        if (face_2d.length > 0) {
          const rvec = new cv.Mat();
          const tvec = new cv.Mat();
          const numRows = points.length;
          const imagePoints = cv.matFromArray(numRows, 2, cv.CV_64FC1, face_2d);
          const modelPointsObj = cv.matFromArray(6, 3, cv.CV_64FC1, pointsObj);

          const success = cv.solvePnP(
            modelPointsObj,
            imagePoints,
            cam_matrix,
            dist_matrix,
            rvec,
            tvec,
            false,
            cv.SOLVEPNP_ITERATIVE
          );

          if (success) {
            const rmat = cv.Mat.zeros(3, 3, cv.CV_64FC1);
            const jaco = new cv.Mat();

            cv.Rodrigues(rvec, rmat, jaco);

            const sy = Math.sqrt(rmat.data64F[0] * rmat.data64F[0] + rmat.data64F[3] * rmat.data64F[3]);
            const singular = sy < 1e-6;

            let x, y, z;
            if (!singular) {
              x = Math.atan(rmat.data64F[7], rmat.data64F[8]);
              y = Math.atan2(-rmat.data64F[6], sy);
              z = Math.atan2(rmat.data64F[3], rmat.data64F[0]);
            } else {
              x = Math.atan2(-rmat.data64F[5], rmat.data64F[4]);
              y = Math.atan2(-rmat.data64F[6], sy);
              z = 0;
            }

            roll = z;
            pitch = x;
            yaw = y;

            rvec.delete();
            tvec.delete();
            rmat.delete();
            jaco.delete();
          }

          canvasCtx.fillStyle = "black";
          canvasCtx.font = "bold 30px Arial";
          canvasCtx.fillText(
            "Nghiênggi: " + (180.0 * (roll / Math.PI)).toFixed(2),
            width * 0.8,
            50
          );
          canvasCtx.fillText(
            "Gập - Duỗi: " + (180.0 * (pitch / Math.PI)).toFixed(2),
            width * 0.8,
            100
          );
          canvasCtx.fillText(
            "Xoay: " + (180.0 * (yaw / Math.PI)).toFixed(2),
            width * 0.8,
            150
          );
        }
      }
    }

    canvasCtx.restore();
  }

  const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.1/${file}`
  });
  faceMesh.onResults(onResultsFaceMesh);

  const camera = new Camera(video2, {
    onFrame: async () => {
      await faceMesh.send({ image: video2 });
    },
    width: 480,
    height: 480
  });
  camera.start();

  new ControlPanel(controlsElement2, {
    selfieMode: true,
    maxNumFaces: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  })
    .add([
      new StaticText({ title: 'MediaPipe Face Mesh' }),
      fpsControl,
      new Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),
      new Slider({
        title: 'Max Number of Faces',
        field: 'maxNumFaces',
        range: [1, 4],
        step: 1
      }),
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
      })
    ])
    .on((settings) => {
      faceMesh.setOptions(settings);
    });
}

// Load OpenCV.js
document.addEventListener('DOMContentLoaded', function () {
  let interval = setInterval(() => {
    if (typeof cv !== 'undefined') {
      clearInterval(interval);
      onOpenCvReady();
    }
  }, 100);
});
