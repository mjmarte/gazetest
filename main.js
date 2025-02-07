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

    // Try multiple approaches to set the face overlay size
    webgazer.params.showVideo = true;
    webgazer.params.showFaceOverlay = true;
    webgazer.params.showFaceFeedbackBox = true;
    webgazer.params.faceFeedbackBoxRatio = 0.4;
    
    // Enable video preview and prediction points
    webgazer.showVideoPreview(true)
        .showPredictionPoints(true)
        .applyKalmanFilter(true);

    // Function to adjust face overlay box size
    function adjustFaceOverlay() {
        const video = document.getElementById('webgazerVideoFeed');
        if (!video) return;

        // Get video dimensions
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const pw = parseInt(video.style.width);
        const ph = parseInt(video.style.height);

        // Find the size of the box
        const smaller = Math.min(vw, vh);
        const larger = Math.max(vw, vh);
        
        // Overall scalar
        const scalar = (vw == larger ? pw / vw : ph / vh);
        
        // Calculate box size - using 0.6 as the ratio for a smaller box
        const boxSize = Math.round((smaller * 0.6) * scalar);
        
        // Calculate position to center the box
        const topVal = Math.round((ph - boxSize) / 2);
        const leftVal = Math.round((pw - boxSize) / 2);

        // Apply to all possible overlay elements
        ['webgazerFaceFeedbackBox', 'webgazerFaceOverlay'].forEach(className => {
            const overlay = document.querySelector('.' + className);
            if (overlay) {
                overlay.style.width = boxSize + 'px';
                overlay.style.height = boxSize + 'px';
                overlay.style.top = topVal + 'px';
                overlay.style.left = leftVal + 'px';
            }
        });
    }

    // Call adjustFaceOverlay when video loads and periodically after
    const videoCheck = setInterval(() => {
        const video = document.getElementById('webgazerVideoFeed');
        if (video && video.videoWidth > 0) {
            adjustFaceOverlay();
            // Once video is loaded, reduce check frequency
            clearInterval(videoCheck);
            setInterval(adjustFaceOverlay, 1000);
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
