var PointCalibrate = 0;
var CalibrationPoints = {};
var isRecording = false;
var recordingStartTime = null;
var recordingData = [];
var recordingInterval = null;

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

            // Record data if recording is active
            if (isRecording && data) {
                recordingData.push({
                    timestamp: new Date().getTime(),
                    x: data.x,
                    y: data.y
                });
            }
        })
        .begin();

    // Set up video feed position and size
    webgazer.params.showVideo = true;
    webgazer.params.showFaceOverlay = true;
    webgazer.params.showFaceFeedbackBox = true;
    webgazer.params.showPredictionPoints = true;

    // Initialize points
    document.querySelectorAll('.Calibration').forEach(point => {
        point.style.backgroundColor = 'red';
        point.style.opacity = '0.2';
        point.onclick = () => calPointClick(point);
        CalibrationPoints[point.id] = 0;
        if (!point.style.display || point.style.display === 'none') {
            point.style.display = 'block';
        }
    });

    // Set up recording controls
    document.getElementById('start-recording').onclick = startRecording;
    document.getElementById('stop-recording').onclick = stopRecording;

    // Start with first point highlighted
    document.getElementById('Pt1').classList.add('next-point');
    document.querySelector('.next-point-text').textContent = 'Start with point 1';
};

// Find next uncalibrated point
function findNextPoint() {
    for (let i = 1; i <= 9; i++) {
        const point = document.getElementById('Pt' + i);
        if (!point.disabled) {
            return point;
        }
    }
    return null;
}

// Handle calibration point click
function calPointClick(node) {
    const id = node.id;
    console.log('Clicked point:', id);
    
    if (!CalibrationPoints[id]) {
        CalibrationPoints[id] = 0;
    }
    CalibrationPoints[id]++;

    // Update opacity based on clicks
    var opacity = 0.2 * CalibrationPoints[id] + 0.2;
    node.style.opacity = opacity;

    // Update status
    const remainingClicks = 5 - CalibrationPoints[id];
    document.getElementById('status').innerHTML = 
        '<p>Point ' + id.replace('Pt', '') + ': ' + 
        remainingClicks + ' clicks remaining</p>';

    // If point is complete
    if (CalibrationPoints[id] == 5) {
        node.style.backgroundColor = 'yellow';
        node.disabled = true;
        PointCalibrate++;
        
        // Find and highlight next point
        const nextPoint = findNextPoint();
        if (nextPoint) {
            document.querySelectorAll('.Calibration').forEach(p => p.classList.remove('next-point'));
            nextPoint.classList.add('next-point');
            document.querySelector('.next-point-text').textContent = 
                'Move to point ' + nextPoint.id.replace('Pt', '');
        }
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
        const accuracyScore = Math.round(precision);
        document.getElementById('accuracy-value').textContent = accuracyScore + '%';
        
        // Hide calibration points except middle one
        document.querySelectorAll('.Calibration').forEach(point => {
            if (point.id !== 'Pt5') {
                point.style.display = 'none';
            }
        });

        // Show recording controls if accuracy is good enough
        if (accuracyScore >= 50) {
            document.getElementById('recording-controls').style.display = 'block';
            document.getElementById('status').innerHTML = 
                '<p>Calibration complete! You can now start recording.</p>';
        } else {
            document.getElementById('status').innerHTML = 
                '<p>Calibration accuracy too low. Please recalibrate.</p>';
            setTimeout(Restart, 3000);
        }
    }, 5000);
}

// Start recording
function startRecording() {
    isRecording = true;
    recordingStartTime = new Date().getTime();
    recordingData = [];
    document.getElementById('start-recording').style.display = 'none';
    document.getElementById('stop-recording').style.display = 'inline-block';
    document.getElementById('session-id').textContent = new Date().toISOString();
    
    // Update recording time
    recordingInterval = setInterval(() => {
        const elapsed = new Date().getTime() - recordingStartTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        document.getElementById('recording-time').textContent = 
            `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }, 1000);
}

// Stop recording
function stopRecording() {
    isRecording = false;
    clearInterval(recordingInterval);
    document.getElementById('start-recording').style.display = 'inline-block';
    document.getElementById('stop-recording').style.display = 'none';
    
    // Prepare CSV content
    const csvContent = ['timestamp,x,y'];
    recordingData.forEach(point => {
        csvContent.push(`${point.timestamp},${point.x},${point.y}`);
    });
    
    // Create and download file
    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `gaze_data_${new Date().toISOString()}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Restart calibration
function Restart() {
    document.querySelectorAll('.Calibration').forEach(point => {
        point.style.backgroundColor = 'red';
        point.style.opacity = '0.2';
        point.disabled = false;
        point.classList.remove('next-point');
        point.style.display = 'block';
    });
    
    CalibrationPoints = {};
    PointCalibrate = 0;
    
    document.getElementById('accuracy-value').textContent = 'Not Calibrated';
    document.getElementById('status').innerHTML = 
        '<p>Click on each point 5 times to calibrate</p>';
    document.querySelector('.progress-bar').style.width = '0%';
    document.getElementById('recording-controls').style.display = 'none';
    document.querySelector('.next-point-text').textContent = '';
    
    // Highlight first point
    document.getElementById('Pt1').classList.add('next-point');
    document.querySelector('.next-point-text').textContent = 'Start with point 1';
}

// Cleanup on window close
window.onbeforeunload = function() {
    if (isRecording) {
        stopRecording();
    }
    webgazer.end();
};
