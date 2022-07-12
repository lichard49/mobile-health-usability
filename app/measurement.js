

const sampleRate = 100; // Hz
const samplePeriod = 1 / sampleRate * 1000; // ms

// instance of a filter coefficient calculator
const iirCalculator = new Fili.CalcCascades();

// calculate filter coefficients
const lowPassFilterCoeffs = iirCalculator.lowpass({
  order: 4, // cascade 3 biquad filters (max: 12)
  characteristic: 'butterworth',
  Fs: sampleRate, // sampling frequency
  Fc: 6, // cutoff frequency / center frequency for bandpass, bandstop, peak
  BW: 1, // bandwidth only for bandstop and bandpass filters - optional
  gain: 0, // gain for peak, lowshelf and highshelf
  preGain: false // adds one constant multiplication for highpass and lowpass
  // k = (1 + cos(omega)) * 0.5 / k = 1 with preGain == false
});

// create a filter instance from the calculated coeffs
const lowPassFilter = new Fili.IirFilter(lowPassFilterCoeffs);

// calculate filter coefficients
const highPassFilterCoeffs = iirCalculator.highpass({
  order: 4, // cascade 3 biquad filters (max: 12)
  characteristic: 'butterworth',
  Fs: sampleRate, // sampling frequency
  Fc: 0.5, // cutoff frequency / center frequency for bandpass, bandstop, peak
  BW: 1, // bandwidth only for bandstop and bandpass filters - optional
  gain: 0, // gain for peak, lowshelf and highshelf
  preGain: false // adds one constant multiplication for highpass and lowpass
  // k = (1 + cos(omega)) * 0.5 / k = 1 with preGain == false
});

// create a filter instance from the calculated coeffs
const highPassFilter = new Fili.IirFilter(highPassFilterCoeffs);

// FFT radix must be 2^n
const windowSize = 1024;
const fft = new Fili.Fft(windowSize);

const measurementVideo = document.getElementById('measurementVideo');
const measurementCanvas = document.getElementById('measurementCanvas');
const measurementContext = measurementCanvas.getContext('2d');

function drawCameraFrame() {
  measurementCanvas.width = measurementVideo.videoWidth;
  measurementCanvas.height = measurementVideo.videoHeight;
  measurementContext.drawImage(measurementVideo, 0, 0);
}

const totalSignal = [];
const windowedSignal = [];
let filteredSignal = [];

function drawSignal() {
  // set appearance of drawn signal
  measurementContext.strokeStyle = 'white';
  measurementContext.lineWidth = 3;

  // calculate drawing area
  const yMiddle = measurementCanvas.height;
  const xMin = 100;
  const xMax = measurementCanvas.width - 100;
  const drawnWindowSize = xMax - xMin;
  const xIncrementMultiplier = drawnWindowSize / windowSize;

  // draw signal
  measurementContext.beginPath();
  for (let index = 0; index < filteredSignal.length; index++) {
    const value = filteredSignal[index];
    const scaledValue = (value + 0.2) * 5;
    const x = xMin + index * xIncrementMultiplier;
    const y = yMiddle - 200 * scaledValue;
    measurementContext.lineTo(x, y);
  }
  measurementContext.stroke();
}

function argMax(array) {
  return array.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
}

const heartRate = document.getElementById('heartRate');

function processCameraFrame() {
  const pixel = measurementContext.getImageData(
    measurementCanvas.width/2,
    measurementCanvas.height/2, 1, 1).data;
  const r = pixel[0];
  const g = pixel[1];
  const rg = (0.67 * r + 0.33 * g) / 255;
  totalSignal.push(rg);

  windowedSignal.push(rg);
  while (windowedSignal.length > windowSize) {
    windowedSignal.shift();
  }

  filteredSignal = lowPassFilter.multiStep(windowedSignal);
  filteredSignal = highPassFilter.multiStep(filteredSignal);

  const fftResult = fft.forward(filteredSignal, 'none');
  const fftMagnitude = fft.magnitude(fftResult); // magnitude
  const fftMagnitudeDb = fft.magToDb(fftMagnitude); // magnitude in dB
  const fftMaxBin = argMax(fftMagnitudeDb);
  const fftMaxFrequency = fftMaxBin * sampleRate / windowSize; // Hz
  const heartRateBpm = fftMaxFrequency * 60; // BPM
  heartRate.innerText = heartRateBpm;
}

let isFlashlightOn = false;

function toggleFlashlight() {
    isFlashlightOn = !isFlashlightOn;
    const track = measurementVideo.srcObject.getVideoTracks()[0];
    track.applyConstraints({
      advanced: [{torch: isFlashlightOn}]
    });
}

if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
  navigator.mediaDevices.getUserMedia({ video: {
    facingMode: 'environment'
  }}).then((videoStream) => {
    // get video
    measurementVideo.srcObject = videoStream;

    // draw frames from the camera
    setInterval(() => {
      drawCameraFrame();
      processCameraFrame();
      drawSignal();
    }, samplePeriod);
  });
}

//Hana's additions: 
//Help toggle Menu
function toggleHelpPopup(){
  document.getElementById("popup-1").classList.toggle("active");
}