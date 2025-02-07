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
    webgazer.params.faceFeedbackBoxRatio = 0.8; // Adjust this value to make face box smaller
    
    webgazer.showVideoPreview(true)
        .showPredictionPoints(true)
        .applyKalmanFilter(true); // Enable Kalman filter for additional smoothing

    // Function to adjust face overlay box size
    function adjustFaceOverlay() {
        const videoElement = document.getElementById('webgazerVideoFeed');
        if (videoElement) {
            // Set video size relative to viewport
            const maxWidth = Math.min(320, window.innerWidth * 0.3);
            const aspectRatio = videoConstraints.height.ideal / videoConstraints.width.ideal;
            const width = maxWidth;
            const height = width * aspectRatio;

            videoElement.style.width = width + 'px';
            videoElement.style.height = height + 'px';

            // Adjust face overlay - make it significantly smaller than the video stream
            const overlay = document.querySelector('.faceFeedbackBox');
            if (overlay) {
                const boxSize = Math.min(width, height) * 0.45; // Reduced to 45% of the smaller video dimension
                overlay.style.width = boxSize + 'px';
                overlay.style.height = boxSize + 'px';
                
                // Center the overlay
                const topOffset = (height - boxSize) / 2;
                const leftOffset = (width - boxSize) / 2;
                overlay.style.top = topOffset + 'px';
                overlay.style.left = leftOffset + 'px';
            }
        }
    }

    // Initial setup
    var setup = function() {

        //Set up the main canvas. The main canvas is used to calibrate the webgazer.
        var canvas = document.getElementById("plotting_canvas");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.position = 'fixed';
        
        // Adjust face overlay after setup
        setTimeout(adjustFaceOverlay, 1000);
    };
    
    setup();

    // Adjust face overlay on window resize
    window.addEventListener('resize', adjustFaceOverlay);
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
