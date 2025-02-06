var PointCalibrate = 0;
var CalibrationPoints = {};
var isRecording = false;
var recordingStartTime = null;
var recordingData = [];
var recordingInterval = null;

// Initialize webgazer
window.onload = async function() {
    // Hide recording controls initially
    document.getElementById('recording-controls').style.display = 'none';
    document.getElementById('start-recording').style.display = 'none';
    document.getElementById('stop-recording').style.display = 'none';

    webgazer.setRegression('ridge')
        .setTracker('TFFacemesh')
        .setGazeListener(function(data, elapsedTime) {
            if (data == null) return;
            
            var xprediction = data.x;
            var yprediction = data.y;
            
            document.getElementById('gaze-x').textContent = Math.round(xprediction);
            document.getElementById('gaze-y').textContent = Math.round(yprediction);
            
            if (isRecording) {
                recordGazeData(xprediction, yprediction);
            }
        })
        .begin();
        
    webgazer.showVideoPreview(true)
        .showPredictionPoints(true)
        .applyKalmanFilter(true);

    webgazer.params.showFaceOverlay = true;
    webgazer.params.showFaceFeedbackBox = true;
    webgazer.params.showPredictionPoints = true;

    // Initialize points with higher visibility
    document.querySelectorAll('.Calibration').forEach(point => {
        point.style.setProperty('display', 'block', 'important');
        point.style.setProperty('visibility', 'visible', 'important');
        point.style.backgroundColor = 'red';
        point.style.setProperty('opacity', '0.7', 'important'); // Make points more visible
        point.onclick = () => calPointClick(point);
        CalibrationPoints[point.id] = 0;
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
    var opacity = 0.7 * CalibrationPoints[id] / 5;
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

// Calculate accuracy after calibration
function calculateAccuracy() {
    // Get accuracy score from webgazer
    var accuracyScore = webgazer.getTracker().getEyePatches();
    var score = accuracyScore ? Math.round(accuracyScore * 100) : 50;
    document.getElementById('accuracy-value').textContent = score + '%';

    // Only show recording controls if accuracy is good enough
    if (score >= 50) {
        // Show recording controls
        document.getElementById('recording-controls').style.display = 'block';
        document.getElementById('start-recording').style.display = 'block';
        document.getElementById('stop-recording').style.display = 'none';
        
        // Update status
        document.getElementById('status').innerHTML = 
            '<p>Calibration complete! Click "Start Recording" to begin.</p>';
    } else {
        // Hide recording controls
        document.getElementById('recording-controls').style.display = 'none';
        document.getElementById('start-recording').style.display = 'none';
        document.getElementById('stop-recording').style.display = 'none';
        
        // Update status and restart
        document.getElementById('status').innerHTML = 
            '<p>Calibration accuracy too low. Please recalibrate.</p>';
        setTimeout(Restart, 3000);
    }
}

// Format date to YYYY-MM-DD HH:mm:ss.SSS
function formatDate(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    return date.getFullYear() + '-' +
           pad(date.getMonth() + 1) + '-' +
           pad(date.getDate()) + ' ' +
           pad(date.getHours()) + ':' +
           pad(date.getMinutes()) + ':' +
           pad(date.getSeconds()) + '.' +
           date.getMilliseconds().toString().padStart(3, '0');
}

// Start recording
function startRecording() {
    isRecording = true;
    recordingStartTime = new Date();
    sessionId = formatDate(recordingStartTime);
    recordingData = [];
    
    // Update UI
    document.getElementById('start-recording').style.display = 'none';
    document.getElementById('stop-recording').style.removeProperty('display');
    document.getElementById('session-id').textContent = sessionId;
    
    // Start recording time display
    recordingInterval = setInterval(() => {
        const elapsed = new Date() - recordingStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        document.getElementById('recording-time').textContent = 
            minutes.toString().padStart(2, '0') + ':' + 
            seconds.toString().padStart(2, '0');
    }, 1000);
}

// Record gaze data
function recordGazeData(x, y) {
    if (!isRecording) return;
    recordingData.push({
        timestamp: formatDate(new Date()),
        x: Math.round(x),
        y: Math.round(y)
    });
}

// Stop recording
function stopRecording() {
    if (!isRecording) return;
    
    isRecording = false;
    clearInterval(recordingInterval);
    
    // Create CSV content
    const csvContent = 'timestamp,x,y\n' + 
        recordingData.map(row => 
            `${row.timestamp},${row.x},${row.y}`
        ).join('\n');
    
    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `gaze_data_${sessionId.replace(/[: ]/g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Reset UI
    document.getElementById('stop-recording').style.display = 'none';
    document.getElementById('start-recording').style.removeProperty('display');
    document.getElementById('recording-time').textContent = '00:00';
}

// Restart calibration
function Restart() {
    // Hide recording controls
    document.getElementById('recording-controls').style.display = 'none';
    document.getElementById('start-recording').style.display = 'none';
    document.getElementById('stop-recording').style.display = 'none';
    
    document.querySelectorAll('.Calibration').forEach(point => {
        point.style.setProperty('display', 'block', 'important');
        point.style.setProperty('visibility', 'visible', 'important');
        point.style.backgroundColor = 'red';
        point.style.setProperty('opacity', '0.7', 'important');
        point.disabled = false;
        point.classList.remove('next-point');
    });
    
    CalibrationPoints = {};
    PointCalibrate = 0;
    
    document.getElementById('accuracy-value').textContent = 'Not Calibrated';
    document.getElementById('status').innerHTML = 
        '<p>Click on each point 5 times to calibrate</p>';
    document.querySelector('.progress-bar').style.width = '0%';
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
