//Line 111 --> Turns off going to the Results page when done

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


//Hana's additions
function toggleHelpPopup(){
  document.getElementById("popup-1").classList.toggle("active");
}

var personInFrame = true; 
var personInBoxes = true;
var timer = 0;
var finalRR = 14; //this value will be displayed to the user on the results page

//Changes messages based on User's actions
setInterval(() => {
if(personInFrame && personInBoxes){
  timer = 0;
  inRightLocation();
  if(testComplete){
    //hides certain messages and goes to the results page
    document.getElementById('detectingMsg').style.display = "none";
    document.getElementById('doneMsg').style.display = "block";
    localStorage.setItem("rrFinal", finalRR);
    // go to results page
    window.location.replace("rrResults.html");
  }
}else if(personInFrame && !personInBoxes && timer > 60){
  displayHelpMsgs();
}else {
  timer++;
  notInSpotAndWaiting(); //displays proper messages 
}
}, 600); //milliseconds; 60 seconds; waits before displaying help message


//hides messages based on if the user is in the frame, box, etc
function inRightLocation(){
  document.getElementById('number').style.display = "block";
  document.getElementById('rectangle').style.display = "none";
  document.getElementById('positionMsg').style.display = "none";
  document.getElementById('doneMsg').style.display = "none";
  document.getElementById('helpMsg').style.display = "none";
  document.getElementById('yllwQMark').style.display = "none";
  document.getElementById('detectingMsg').style.display = "block";
  //starting progressbar
  document.getElementById('innerId').style.display = "block";
  document.getElementById('outerId').style.display = "block";
  document.getElementById('circleFiller').style.animation = "anim 30s linear forwards";
}

function displayHelpMsgs(){
  document.getElementById('rectangle').style.display = "block";
  document.getElementById('positionMsg').style.display = "none";
  document.getElementById('doneMsg').style.display = "none";
  document.getElementById('helpMsg').style.display = "block";
  document.getElementById('yllwQMark').style.display = "block";
  document.getElementById('detectingMsg').style.display = "none";
  document.getElementById('innerId').style.display = "none";
  document.getElementById('outerId').style.display = "none";
  document.getElementById('circleFiller').style.animation = "null";
  document.getElementById('number').style.display = "none";
}

function notInSpotAndWaiting(){
  document.getElementById('rectangle').style.display = "none";
  document.getElementById('positionMsg').style.display = "block";
  document.getElementById('doneMsg').style.display = "none";
  document.getElementById('helpMsg').style.display = "none";
  document.getElementById('yllwQMark').style.display = "none";
  document.getElementById('detectingMsg').style.display = "none";
  document.getElementById('innerId').style.display = "block";
  document.getElementById('outerId').style.display = "block";
  document.getElementById('circleFiller').style.animation = "none";
  document.getElementById('number').style.display = "block";
}