
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


var hrArray = [];
const heartRate = document.getElementById('heartRate');

//returns a Boolean and takes an array from ImageData.data
// call this with the parameter measurementContext.getImageData(0, 0, measurementCanvas.width, measurementCanvas.height).data
function isFingerOnCamera(fullImage) {
  // DEBUG:
  //heartRate.innerHTML = "isFingerOnCamera " + false;

  let redPixels = 0;
  const redThreshold = 120000; //approximately 1/3rd of the screen
  for (let i = 0; i < fullImage.length; i++) {
    const red = fullImage[i + 0];
    const green = fullImage[i + 1];
    const blue = fullImage[i + 2];

    // if pixel is red enough. Probably need to tweak this value.
    // based on list of reds and pinks here: https://htmlcolorcodes.com/colors/shades-of-red/
    // Other ranges to try: (red >= 200 && blue <= 160 && green <= 160)
    //   if ((red-blue) > 100 && (red-green) > 100){
    if(red > 100 && green < 100 && blue < 100){
      redPixels++;
      if (redPixels >= redThreshold) {
        // DEBUG:
        // heartRate.innerHTML = "isFingerOnCamera " + true;
        return true;
      }
    }
  }
  return false;
}


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

  let peaks = 0;
  for (let index = 10; index < filteredSignal.length - 10; index++) {
    if (filteredSignal[index - 1] < filteredSignal[index] && filteredSignal[index] > filteredSignal[index + 1]) {
      if (filteredSignal[index] - filteredSignal[index - 10] > 0.0005 && filteredSignal[index] - filteredSignal[index + 10] > 0.0005) {
        peaks++;
      }
    }
  }

  const heartRateBpm = peaks * 60 / (windowSize / sampleRate) / 2;
  hrArray.push(heartRateBpm);

  heartRate.innerText = Math.round(heartRateBpm);
}


let isFlashlightOn = false;
var flashCounter = 0;

function toggleFlashlight() {
  if (flashCounter % 2 == 0){
    document.getElementById("circleFlash").src = "flashOn.png";
    flashCounter++;
  }else{
    document.getElementById("circleFlash").src = "flashOff.png";
    flashCounter++;
  }

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


var fingerPlaced = null;


//Coordinates of Oval
let ovalEl = document.getElementById("oval");
var oTopCoord = window.scrollY + ovalEl.getBoundingClientRect().top// top
var oBottCoord = window.scrollX + ovalEl.getBoundingClientRect().bottom// bottom
var oLeftCoord = window.scrollX + ovalEl.getBoundingClientRect().left// left
var oRightCoord = window.scrollX + ovalEl.getBoundingClientRect().right// right
console.log("Oval = top: " + oTopCoord + " bottCoord: " + oBottCoord + " leftCoord: " + oLeftCoord + " rightCoord: " + oRightCoord);
//Temporary Starting Coordiantes --> Oval = top: 315 bottCoord: 485 leftCoord: 138 rightCoord: 238

//Starting Coordinates of Fingerprint
let fingerEl = document.getElementById("finger");
var fTopCoord = window.scrollY + fingerEl.getBoundingClientRect().top// top
var fBottCoord = window.scrollX + fingerEl.getBoundingClientRect().bottom// bottom
var fLeftCoord = window.scrollX + fingerEl.getBoundingClientRect().left// left
var fRightCoord = window.scrollX + fingerEl.getBoundingClientRect().right// right
console.log("Finger = top: " + fTopCoord + " bottCoord: " + fBottCoord + " leftCoord: " + fLeftCoord + " rightCoord: " + fRightCoord);

//testing if fingerprint is within the Oval:

var timer = 0;
fingerPlaced = false;
let counter = 0;
setInterval(() => {
  document.getElementById('rectangle').style.display = "none";

 //later make the #s in the bool statements the varaibles instead
  if(oTopCoord < fTopCoord && fBottCoord < oBottCoord && oLeftCoord < fLeftCoord && fRightCoord < oRightCoord){ 

    fingerPlaced = true;
    fingerIn();
    timer = 0;
  } else if(timer > 60) {
    fingerPlaced = false;
    fingerOut();
    timer++;
  }else{
    document.getElementById('oval').src = "dashed_oval.png";
    timer++;
  }
}, 600); //miliseconds, waits 1 minute before displaying "help" menu if user's finger is not properly placed

//if time: go in and fix how messages are hiding, use the hide/show method/function
function fingerOut(){
  document.getElementById('oval').src = "dashed_oval.png";
  //move bar out
  document.getElementById('innerId').style.marginLeft = "-500px";
  document.getElementById('outerId').style.marginLeft = "-500px";
  //make animation = null
  document.getElementById('circleFiller').style.animation = "null";
  //move help image in
  document.getElementById('yllwQMark').style.marginLeft = "10px";
  //change background
  document.getElementById('rectangle').style.display = "block";
  //display proper message
  document.getElementById("secondMessage").style.marginLeft = "-500px";
  document.getElementById("thirdMessage").style.marginLeft = "-500px";
  document.getElementById("firstMessage").style.marginLeft = "-500px";
  document.getElementById("fourthMessage").style.marginLeft = "-75px";

}

var bpmAvg;
var hrAverage;
function fingerIn(){
  bpmAvg = 0;
  hrAverage = 0;
  document.getElementById('rectangle').style.display = "none";

  document.getElementById('oval').src = "green_oval.png";

  //move help image out
  document.getElementById('yllwQMark').style.marginLeft = "-500px";
  //move progress bar in
  document.getElementById('innerId').style.marginLeft = "20px";
  document.getElementById('outerId').style.marginLeft = "26px";
  //add animation
  document.getElementById('circleFiller').style.animation = "anim 30s linear forwards";

  //change display message
  document.getElementById("firstMessage").style.marginLeft = "-500px";
  document.getElementById("secondMessage").style.marginLeft = "5px";

  if(testComplete){
    document.getElementById("secondMessage").style.marginLeft = "-500px";
    document.getElementById("thirdMessage").style.marginLeft = "5px";

    hrAverage = hrAvg();
    hrAverage = Math.round(hrAverage);
    //go to results page 
    localStorage.setItem("bpmFinal", hrAverage);
    window.location.replace("hrResults.html");    
  }
}

function hrAvg(){
  const arLength = hrArray.length;
  for(let i = 0; i < arLength; i++){
    bpmAvg += hrArray[i];
  }
  bpmAvg = bpmAvg / arLength;
  return bpmAvg;
}

