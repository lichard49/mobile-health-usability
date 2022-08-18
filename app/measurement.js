
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



//this array averages the calculated BPM (when finger is in the oval)
var hrArray = [];
const heartRate = document.getElementById('heartRate');

let averagedReddestLocation = []; // x, y Coordinates
const redWindowLength = 90; // # frames
let redWindow = [];

function copyImageToCanvas(x, y){
  //draws finerprint icon, x & y parameters are the location of the user's finger
  var image = document.getElementById("finger");
  var canvas = document.querySelector("canvas");

  var ctx = canvas.getContext("2d");
  ctx.drawImage(
    image, x, y, 80, 110
  );
}


var xFinger = 0;
var yFinger = 0;
//// DEBUG: location is [x, y]
function debugTrackingVisual(location) {
   //measurementContext.fillStyle = "#00FF00";
   // measurementContext.fillRect(location[0], location[1], 15, 15);
   xFinger = location[0];
   yFinger = location[1];

   // only show fingerprint and check if in oval when the finger is detected
   // to be on the camera lens
   let isFingerOn = isFingerOnCamera(measurementContext.getImageData(0, 0,
     measurementCanvas.width, measurementCanvas.height).data)
   console.log("isFingerOn " + isFingerOn)

   //console.log("x-coord = " + location[0] + " y-coord = " + location[1]);
   //document.getElementById("yCoord").innerHTML = yFinger.toString();
   if(isFingerOn){
     copyImageToCanvas(location[0], location[1]);
     isFingerInOval(xFinger, yFinger)
   }

}

function getAverageCoordinate(coordinates, coordinateIndex) {
  let total = 0;
  for(let i = 0; i < coordinates.length; i++){
    total += coordinates[i][coordinateIndex];
  }
  let avg = total/coordinates.length;
  return avg;
}

// returns an array of length 2 with x, y coordinates respectively
// takes an array from ImageData.data, call this with the parameter:
// measurementContext.getImageData(0, 0, measurementCanvas.width, measurementCanvas.height).data
function getFingerLocation(fullImage) {
  const reddestRed = [255, 0, 0] //red, blue, green of target red
  let reddestPixel = [0, 0]; // x,y coordinates of closest pixel to reddestRed in color
  let minRedDistance = 1000; // distance from reddestRed to the closest pixel in color

  // look through all pixels for the reddest one
  for (let i = 0; i < fullImage.length; i+=4) {
    const thisRed = fullImage[i + 0];
    const thisGreen = fullImage[i + 1];
    const thisBlue = fullImage [i + 2];

    // distance in color from this pixel to reddestRed
    const thisRedDistance = Math.sqrt(Math.pow((reddestRed[0] - thisRed),2) +
      Math.pow((reddestRed[1] - thisGreen),2) + Math.pow((reddestRed[2] - thisBlue),2));

    // if this pixel is closer in color, it becomes reddest pixel
    if(thisRedDistance < minRedDistance){
      reddestPixel[0] = (i/4) % measurementCanvas.width; //calculate x of this pixel
      reddestPixel[1] = Math.floor((i / 4) / measurementCanvas.width); //calculate y of this pixel
      minRedDistance = thisRedDistance;
    }
  }

  // Sliding window average of last redWindowLength frames x and y location
  redWindow.push(reddestPixel);
  while (redWindow.length > redWindowLength){
    redWindow.shift();
  }
  averagedReddestLocation[0] = getAverageCoordinate(redWindow, 0);
  averagedReddestLocation[1] = getAverageCoordinate(redWindow, 1);

  //// For debugging
  debugTrackingVisual(averagedReddestLocation);

  return averagedReddestLocation;
}

var fingerInOval = false;
var fingerPlaced = null;

// returns a Boolean and takes an array from ImageData.data
// call this with the parameter measurementContext.getImageData(0, 0, measurementCanvas.width, measurementCanvas.height).data
function isFingerOnCamera(fullImage) {
  // DEBUG:
  // heartRate.innerHTML = "isFingerOnCamera " + false;

  let redPixels = 0;
  const redThreshold = 150000; //approximately 50% of the pixel 4 screen

  // look through all pixels until determine that the number of reddish pixels
  // is at least redThreshold
  for (let i = 0; i < fullImage.length; i+=4) {
    const red = fullImage[i + 0];
    const green = fullImage[i + 1];
    const blue = fullImage[i + 2];

    // if pixel is red enough. May need to tweak this value.
    if ((red-blue) > 50 && (red-green) > 50){
      redPixels++;
      if (redPixels >= redThreshold) {
        // DEBUG:
        // heartRate.innerHTML = "isFingerOnCamera " + true;
        fingerPlaced = true;
        //CALL FINGER TRACKING HERE AND NO WHERE ELSE
        return true;
      }
    }
  }
  document.getElementById("secondMessage").style.marginLeft = "-500px";
  //document.getElementById("firstMessage").style.marginLeft = "5px";
  return false;
}

var timeDelay = 0; //needs about 18 seconds before measures accurately

function processCameraFrame() {
  getFingerLocation(measurementContext.getImageData(
    0, 0, measurementCanvas.width,
    measurementCanvas.height).data);

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
  //needs about 18 seconds to calculate hr correctly when in the right place
  //currently just waiting 18 seconds then starting, to remove that function just delete all the timeDelay varaibles in this file
  if(fingerInOval && (timeDelay >= 18)){
    hrArray.push(heartRateBpm);
  }


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



/*
//You can delete this if there is no use
// This gets the Coordinates of Oval & Finger 
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
//oTopCoord > fTopCoord && fBottCoord < oBottCoord && oLeftCoord < fLeftCoord && fRightCoord < oRightCoord
if(yFinger > oTopCoord && yFinger < oBottCoord && xFinger > oLeftCoord && xFinger < oRightCoord){
  fingerInOval = true;

}*/


function isFingerInOval(x, y){
  //160 < x && x < 330 && 170 < y && y < 370 <-- Original bounds current ones are extended 
  if(100 < x && x < 390 && 110 < y && y < 420){
    fingerInOval = true;
  }else{
    fingerInOval = false;
  }
}


var timer = 0;
let counter = 0;
setInterval(() => {
  fingerPlaced = isFingerOnCamera(measurementContext.getImageData(0, 0, measurementCanvas.width, measurementCanvas.height).data);
  document.getElementById('rectangle').style.display = "none";
  timeDelay++;
  if(fingerInOval && fingerPlaced && timeDelay >= 18){
      //this means finger is in frame & in right location
      timer = 0;
      fingerIn();
  }else if( !fingerInOval && timer > 60){
    //finger is in frame but not in the right location and when the user hasn't gone to the right direction for a while
    fingerOut();
    timer++;
  }else if( !fingerInOval && timer <= 60){
    //finger is not in the oval and the finger is not placed on the screen and it's been less than 60 seconds
    document.getElementById('oval').src = "dashed_oval.png";
    document.getElementById('rectangle').style.display = "none";
    document.getElementById('circleFiller').style.animation = "null";
    document.getElementById("secondMessage").style.marginLeft = "-500px";
    document.getElementById("firstMessage").style.marginLeft = "5px";
    timer++;
  }else{
    document.getElementById("secondMessage").style.marginLeft = "-500px";
    document.getElementById("firstMessage").style.marginLeft = "5px";
  }

  }

, 600); //miliseconds, waits 1 minute before displaying "help" menu if user's finger is not properly placed

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
  document.getElementById("fourthMessage").style.marginLeft = "-500px";
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
    //calls to average heart rate, then stores the final hr locally to be accessed from the results page
    hrAverage = hrAvg();
    hrAverage = Math.round(hrAverage);

    // writes data to server
    fetch('https://homes.cs.washington.edu/~lichard/mobile_health_usability/log/?user=5881&data={heartRate:' + Math.round(hrAverage) + '}');

    //go to results page
    localStorage.setItem("bpmFinal", hrAverage);
    window.location.replace("hrResults.html");
  }
}

//averages the heart rates from the array 
function hrAvg(){
  const arLength = hrArray.length;
  for(let i = 0; i < arLength; i++){
    bpmAvg += hrArray[i];
  }
  bpmAvg = bpmAvg / arLength;
  return bpmAvg;
}
