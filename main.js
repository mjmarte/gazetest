var PointCalibrate = 0;
var CalibrationPoints = {};

// Initialize webgazer
window.onload = function() {
    webgazer.setRegression('ridge')
        .setTracker('TFFacemesh')
        .setGazeListener(function(data, clock) {
            if (data == null) return;
            
            // Update gaze coordinates display
            var xprediction = data.x;
            var yprediction = data.y;
            document.getElementById('gaze-x').textContent = Math.round(xprediction);
            document.getElementById('gaze-y').textContent = Math.round(yprediction);
        })
        .begin();

    // Set up video feed position and size
    webgazer.params.showVideo = true;
    webgazer.params.showFaceOverlay = true;
    webgazer.params.showFaceFeedbackBox = true;
    webgazer.params.showPredictionPoints = true;

    // Add click handlers to calibration points
    document.querySelectorAll('.Calibration').forEach(function(btn) {
        btn.onclick = function() {
            calPointClick(this);
        };
    });

    // Initially hide the middle point
    document.getElementById('Pt5').style.display = 'none';
};

// Handle calibration point click
function calPointClick(node) {
    const id = node.id;
    console.log('Clicked point:', id); // Debug log

    if (!CalibrationPoints[id]) {
        CalibrationPoints[id] = 0;
    }
    CalibrationPoints[id]++;

    // Update opacity based on clicks
    var opacity = 0.2 * CalibrationPoints[id] + 0.2;
    node.style.opacity = opacity;

    // Update status
    document.getElementById('status').innerHTML = 
        '<p>Point ' + id.replace('Pt', '') + ': ' + 
        (5 - CalibrationPoints[id]) + ' clicks remaining</p>';

    // If point is complete
    if (CalibrationPoints[id] == 5) {
        node.style.backgroundColor = 'yellow';
        node.disabled = true;
        PointCalibrate++;
    }

    // Show middle point after 8 points are done
    if (PointCalibrate == 8) {
        document.getElementById('Pt5').style.display = 'block';
    }

    // Update progress bar
    updateProgress();

    // If calibration is complete
    if (PointCalibrate >= 9) {
        // Calculate accuracy
        calculateAccuracy();
    }
}

// Update progress bar
function updateProgress() {
    const totalPossibleClicks = 9 * 5; // 9 points, 5 clicks each
    let totalClicks = 0;
    
    Object.values(CalibrationPoints).forEach(clicks => {
        totalClicks += clicks;
    });
    
    const progressPercent = (totalClicks / totalPossibleClicks) * 100;
    document.querySelector('.progress-bar').style.width = progressPercent + '%';
}

// Calculate accuracy
function calculateAccuracy() {
    // Store points for 5 seconds
    const startTime = performance.now();
    const points = [];
    
    const gazeListener = function(data, clock) {
        if (data == null) return;
        points.push({x: data.x, y: data.y});
    };
    
    webgazer.setGazeListener(gazeListener);
    
    setTimeout(function() {
        webgazer.setGazeListener(null);
        
        // Calculate precision (variance of predictions)
        let sumX = 0, sumY = 0;
        points.forEach(p => {
            sumX += p.x;
            sumY += p.y;
        });
        
        const avgX = sumX / points.length;
        const avgY = sumY / points.length;
        
        let variance = 0;
        points.forEach(p => {
            variance += Math.sqrt(
                Math.pow(p.x - avgX, 2) + 
                Math.pow(p.y - avgY, 2)
            );
        });
        
        const precision = 100 - (variance / points.length / 10);
        document.getElementById('accuracy-value').textContent = 
            Math.round(precision) + '%';
        
        // Hide calibration points except middle one
        document.querySelectorAll('.Calibration').forEach(point => {
            if (point.id !== 'Pt5') {
                point.style.display = 'none';
            }
        });
    }, 5000);
}

// Restart calibration
function Restart() {
    document.querySelectorAll('.Calibration').forEach(point => {
        point.style.backgroundColor = 'red';
        point.style.opacity = '0.2';
        point.disabled = false;
        if (point.id !== 'Pt5') {
            point.style.display = 'block';
        }
    });
    document.getElementById('Pt5').style.display = 'none';
    
    CalibrationPoints = {};
    PointCalibrate = 0;
    
    document.getElementById('accuracy-value').textContent = 'Not Calibrated';
    document.getElementById('status').innerHTML = 
        '<p>Click on each point 5 times to calibrate</p>';
    document.querySelector('.progress-bar').style.width = '0%';
}

// Cleanup on window close
window.onbeforeunload = function() {
    webgazer.end();
};
