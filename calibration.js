var PointCalibrate = 0;
var CalibrationPoints = {};

// Initialize webgazer
window.onload = async function() {
    try {
        // Initialize webgazer
        await webgazer.setRegression('ridge')
            .setTracker('TFFacemesh')
            .begin();
            
        // Wait for WebGazer to fully initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        webgazer.showVideoPreview(true)
            .showPredictionPoints(true)
            .applyKalmanFilter(true);

        webgazer.params.showFaceOverlay = true;
        webgazer.params.showFaceFeedbackBox = true;
        webgazer.params.showPredictionPoints = true;

        // Set up calibration points
        document.querySelectorAll('.Calibration').forEach(point => {
            point.style.setProperty('display', 'block', 'important');
            point.style.setProperty('visibility', 'visible', 'important');
            point.style.backgroundColor = 'red';
            point.style.setProperty('opacity', '0.2', 'important');
            CalibrationPoints[point.id] = 0;
        });

        // Add click handlers
        document.querySelectorAll('.Calibration').forEach(point => {
            point.addEventListener('click', () => calPointClick(point));
        });

        // Start with first point highlighted
        document.getElementById('Pt1').classList.add('next-point');
        document.querySelector('.next-point-text').textContent = 'Start with point 1';

        // Hide recording controls initially
        document.getElementById('recording-controls').style.display = 'none';
        document.getElementById('start-recording').style.display = 'none';
        document.getElementById('stop-recording').style.display = 'none';

    } catch (error) {
        console.error('Error initializing WebGazer:', error);
        document.getElementById('status').innerHTML = 
            '<p>Error initializing eye tracking. Please refresh the page and try again.</p>';
    }
};

/**
 * Clear the canvas and the calibration button.
 */
function ClearCanvas(){
    document.querySelectorAll('.Calibration').forEach((i) => {
        i.style.setProperty('display', 'none');
    });
    var canvas = document.getElementById("plotting_canvas");
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

/**
* This function clears the calibration buttons memory
*/
function ClearCalibration(){
    // Clear data from WebGazer
    document.querySelectorAll('.Calibration').forEach((i) => {
        i.style.setProperty('background-color', 'red');
        i.style.setProperty('opacity', '0.2');
        i.removeAttribute('disabled');
    });

    CalibrationPoints = {};
    PointCalibrate = 0;
}

/**
 * Show the Calibration Points
 */
function ShowCalibrationPoint() {
    document.querySelectorAll('.Calibration').forEach((i) => {
        i.style.removeProperty('display');
    });
    // initially hides the middle button
    document.getElementById('Pt5').style.setProperty('display', 'none');
}

/**
 * This function handles the click event on the calibration points
 */
function calPointClick(node) {
    const id = node.id;
    console.log('Clicked point:', id); // Debug log

    if (!CalibrationPoints[id]){ // initialises if not done
        CalibrationPoints[id]=0;
    }
    CalibrationPoints[id]++; // increments values
    console.log('Clicks on point', id + ':', CalibrationPoints[id]); // Debug log

    if (CalibrationPoints[id]==5){ //only turn to yellow after 5 clicks
        node.style.setProperty('background-color', 'yellow');
        node.setAttribute('disabled', 'disabled');
        PointCalibrate++;
        console.log('Point calibrated. Total points:', PointCalibrate); // Debug log
    }else if (CalibrationPoints[id]<5){
        //Gradually increase the opacity of calibration points when click to give some indication to user.
        var opacity = 0.2*CalibrationPoints[id]+0.2;
        node.style.setProperty('opacity', opacity);
    }

    //Show the middle calibration point after all other points have been clicked.
    if (PointCalibrate == 8){
        document.getElementById('Pt5').style.removeProperty('display');
    }

    if (PointCalibrate >= 9){ // last point is calibrated
        // grab every element in Calibration class and hide them except the middle point.
        document.querySelectorAll('.Calibration').forEach((i) => {
            i.style.setProperty('display', 'none');
        });
        document.getElementById('Pt5').style.removeProperty('display');

        // Calculate the accuracy
        calculateAccuracy();
    }
}

// Restart calibration
function Restart() {
    document.getElementById("Accuracy").innerHTML = "<a>Not yet Calibrated</a>";
    webgazer.clearData();
    ClearCalibration();
    ClearCanvas();
    ShowCalibrationPoint();
}

// Cleanup on window close
window.onbeforeunload = function() {
    webgazer.end();
};
