const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

function onResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  // Only overwrite existing pixels.
  canvasCtx.globalCompositeOperation = 'source-in';
  canvasCtx.fillStyle = '#00FF00';
  canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

  // Only overwrite missing pixels.
  canvasCtx.globalCompositeOperation = 'destination-atop';
  canvasCtx.drawImage(
      results.image, 0, 0, canvasElement.width, canvasElement.height);

  canvasCtx.globalCompositeOperation = 'source-over';

  if (typeof results.poseLandmarks !== 'undefined') {
    canvasCtx.lineWidth = '4';
    canvasCtx.strokeStyle = 'white';
    canvasCtx.setLineDash([5, 5]);

    if (results.poseLandmarks.length >= 11) {
      const left = results.poseLandmarks[8].x - 0.05;
      const top = Math.min(results.poseLandmarks[1].y,
          results.poseLandmarks[2].y,
          results.poseLandmarks[3].y,
          results.poseLandmarks[4].y,
          results.poseLandmarks[5].y,
          results.poseLandmarks[6].y) - 0.1;
      const width = results.poseLandmarks[7].x - left + 0.1;
      const height = Math.max(results.poseLandmarks[9].y,
          results.poseLandmarks[10].y) - top + 0.1;

      canvasCtx.beginPath();
      canvasCtx.rect(left * canvasElement.width,
          top * canvasElement.height,
          width * canvasElement.width,
          height * canvasElement.height);
      canvasCtx.stroke();
    }

    if (results.poseLandmarks.length >= 13) {
      const left = results.poseLandmarks[12].x;
      const top = Math.min(results.poseLandmarks[11].y,
          results.poseLandmarks[12].y);
      const width = results.poseLandmarks[11].x - results.poseLandmarks[12].x;
      const height = 0.1;

      canvasCtx.beginPath();
      canvasCtx.rect(left * canvasElement.width,
          top * canvasElement.height,
          width * canvasElement.width,
          height * canvasElement.height);
      canvasCtx.stroke();
    }
  }

  canvasCtx.restore();
}

const pose = new Pose({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
}});
pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  smoothSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
pose.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({image: videoElement});
  },
  width: 1280,
  height: 720
});
camera.start();