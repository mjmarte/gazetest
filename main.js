window.onload = async function() {

    // Set up video constraints for better face tracking
    const videoConstraints = {
        width: { min: 320, ideal: 640, max: 1920 },
        height: { min: 240, ideal: 480, max: 1080 },
        facingMode: "user"
    };

    //start the webgazer tracker
    await webgazer.setRegression('ridge') /* currently must set regression and tracker */
        .setTracker('TFFacemesh')
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

    // Configure WebGazer parameters
    webgazer.params.showVideo = true;
    webgazer.params.showFaceOverlay = true;
    webgazer.params.showFaceFeedbackBox = true;
    webgazer.params.faceFeedbackBoxRatio = 0.6; // Adjust this ratio to control box size
    
    // Enable video preview and prediction points
    webgazer.showVideoPreview(true)
        .showPredictionPoints(true)
        .applyKalmanFilter(true);

    // Function to adjust face overlay box size
    function adjustFaceOverlay() {
        const videoContainer = document.getElementById('webgazerVideoContainer');
        const video = document.getElementById('webgazerVideoFeed');
        const faceOverlay = document.getElementById('webgazerFaceFeedbackBox') || document.querySelector('.webgazerFaceFeedbackBox');
        
        if (!video || !faceOverlay || !videoContainer) return;

        // Set video container size
        videoContainer.style.width = '320px';
        videoContainer.style.height = '240px';

        // Set video size
        video.style.width = '320px';
        video.style.height = '240px';

        // Calculate box size - make it 60% of video height
        const boxSize = Math.round(240 * 0.6);
        
        // Position box in center of video container
        const topOffset = Math.round((240 - boxSize) / 2);
        const leftOffset = Math.round((320 - boxSize) / 2);

        // Apply styles to face overlay
        faceOverlay.style.width = boxSize + 'px';
        faceOverlay.style.height = boxSize + 'px';
        faceOverlay.style.top = topOffset + 'px';
        faceOverlay.style.left = leftOffset + 'px';
        faceOverlay.style.border = '3.3px solid #00ff00';  // Increased from 3px to 3.3px (10% thicker)
        faceOverlay.style.position = 'fixed';
        faceOverlay.style.zIndex = '1001';
        faceOverlay.style.boxSizing = 'border-box';  // Ensure border is included in size calculations
        faceOverlay.style.transform = 'translateX(0)';  // Reset any transforms
    }

    // Call immediately and set up an interval to keep checking
    const setupInterval = setInterval(() => {
        if (document.getElementById('webgazerVideoFeed')) {
            adjustFaceOverlay();
            // Keep adjusting periodically
            setInterval(adjustFaceOverlay, 1000);
            clearInterval(setupInterval);
        }
    }, 100);

    // Also adjust when window is resized
    window.addEventListener('resize', adjustFaceOverlay);

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
