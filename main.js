window.onload = async function() {

    // Set up video constraints for better face tracking
    const videoConstraints = {
        width: { min: 320, ideal: 640, max: 1920 },
        height: { min: 240, ideal: 480, max: 1080 },
        facingMode: "user"
    };

    //start the webgazer tracker
    await webgazer.setRegression('ridge') /* currently must set regression and tracker */
        .setTracker('clmtrackr')
        .setGazeListener(function(data, clock) {
            // Apply additional smoothing to the gaze data
            if (data) {
                if (!window.lastGaze) {
                    window.lastGaze = data;
                }
                // Implement exponential smoothing
                const smoothingFactor = 0.8; // Adjust this value between 0 and 1
                data.x = smoothingFactor * data.x + (1 - smoothingFactor) * window.lastGaze.x;
                data.y = smoothingFactor * data.y + (1 - smoothingFactor) * window.lastGaze.y;
                window.lastGaze = data;
            }
        })
        .saveDataAcrossSessions(true)
        .begin();

    // Customize video preview and tracking settings
    webgazer.params.showVideo = true;
    webgazer.params.showFaceOverlay = true;
    webgazer.params.showFaceFeedbackBox = true;
    
    webgazer.showVideoPreview(true)
        .showPredictionPoints(true)
        .applyKalmanFilter(true); // Enable Kalman filter for additional smoothing

    // Initial setup
    var setup = function() {

        //Set up the main canvas. The main canvas is used to calibrate the webgazer.
        var canvas = document.getElementById("plotting_canvas");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.position = 'fixed';
    };
    
    setup();

    // Adjust face overlay on window resize
    window.addEventListener('resize', function(){});
};

// Set to true if you want to save the data even if you reload the page.
window.saveDataAcrossSessions = true;

window.onbeforeunload = function() {
    webgazer.end();
}

/**
 * Restart the calibration process by clearing the local storage and reseting the calibration point
 */
function Restart(){
    document.getElementById("Accuracy").innerHTML = "<a>Not yet Calibrated</a>";
    webgazer.clearData();
    ClearCalibration();
    PopUpInstruction();
}
