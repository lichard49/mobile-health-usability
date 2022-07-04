const measurementVideo = document.getElementById('measurementVideo');
const measurementCanvas = document.getElementById('measurementCanvas');
const measurementContext = measurementCanvas.getContext('2d');

function drawCameraFrame() {
  measurementCanvas.width = measurementVideo.videoWidth;
  measurementCanvas.height = measurementVideo.videoHeight;
  measurementContext.drawImage(measurementVideo, 0, 0);
}

const signal = [];

function drawSignal() {
  // set appearance of drawn signal
  measurementContext.strokeStyle = 'white';
  measurementContext.lineWidth = 3;

  // calculate drawing area
  const yMiddle = measurementCanvas.height;
  const xMin = 100;
  const xMax = measurementCanvas.width - 100;
  const windowSize = xMax - xMin;

  // draw signal
  measurementContext.beginPath();
  const startIndex = Math.max(0, signal.length - windowSize);
  for (let index = 0; index < signal.length; index++) {
    const value = signal[index + startIndex];
    const scaledValue = (value - 0.6) * 5;
    measurementContext.lineTo(xMin + index, yMiddle - 200 * scaledValue);
  }
  measurementContext.stroke();
}

function processCameraFrame() {
  const pixel = measurementContext.getImageData(
    measurementCanvas.width/2,
    measurementCanvas.height/2, 1, 1).data;
  const r = pixel[0];
  const g = pixel[1];
  signal.push((0.67 * r + 0.33 * g) / 255);
}

if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
  navigator.mediaDevices.getUserMedia({ video: {
    facingMode: 'environment'
  }}).then((videoStream) => {
    // get video
    measurementVideo.srcObject = videoStream;

    // turn on flash
    const track = videoStream.getVideoTracks()[0];
    track.applyConstraints({
      advanced: [{torch: true}]
    });

    // draw frames from the camera
    setInterval(() => {
      drawCameraFrame();
      processCameraFrame();
      drawSignal();
    }, 10);
  });
}