var PointCalibrate = 0;
var CalibrationPoints = {};
var isRecording = false;
var recordingStartTime = null;
var recordingData = [];
var recordingInterval = null;

// Initialize webgazer
window.onload = async function() {
    console.log('Initializing WebGazer...'); // Debug log
    
    // Initialize variables
    window.isRecording = false;
    window.recordingStartTime = null;
    window.recordingData = [];
    window.recordingInterval = null;
    window.sessionId = null;

    // Add click handlers for recording buttons
    document.getElementById('start-recording').onclick = startRecording;
    document.getElementById('stop-recording').onclick = stopRecording;
    
    // Hide recording controls initially
    document.getElementById('recording-controls').style.display = 'none';
    document.getElementById('start-recording').style.display = 'none';
    document.getElementById('stop-recording').style.display = 'none';

    // Initialize webgazer with gaze listener
    await webgazer.setRegression('ridge')
        .setTracker('TFFacemesh')
        .setGazeListener(function(data, elapsedTime) {
            if (data == null) return;
            
            document.getElementById('gaze-x').textContent = Math.round(data.x);
            document.getElementById('gaze-y').textContent = Math.round(data.y);
            
            if (window.isRecording) {
                console.log('Recording point:', data.x, data.y); // Debug log
                recordGazeData(data.x, data.y);
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

    // Set up window close handler
    window.onbeforeunload = onbeforeunload;
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

// Function to show accuracy calculation circle
function showAccuracyCircle() {
    const circle = document.createElement('div');
    circle.id = 'accuracy-circle';
    circle.style.position = 'fixed';
    circle.style.width = '20px';
    circle.style.height = '20px';
    circle.style.borderRadius = '50%';
    circle.style.backgroundColor = 'red';
    circle.style.left = '50%';
    circle.style.top = '50%';
    circle.style.transform = 'translate(-50%, -50%)';
    circle.style.zIndex = '1000';
    document.body.appendChild(circle);
}

// Function to remove accuracy calculation circle
function removeAccuracyCircle() {
    const circle = document.getElementById('accuracy-circle');
    if (circle) {
        circle.remove();
    }
}

// Calculate accuracy after calibration
async function calculateAccuracy() {
    var accuracyPromise = await webgazer.checkEyesInVideo(); // Check if eyes are detected

    if (!accuracyPromise) {
        alert("Unable to detect the users eyes! Please try again with better lighting or camera positioning.");
        return;
    }

    await showAccuracyCircle();
    
    var accuracyValue = await new Promise(resolve => {
        var totalTime = 0;
        var totalPoints = 0;
        var accuracySum = 0;
        
        var checkInterval = setInterval(async function() {
            totalTime += 50;
            var prediction = await webgazer.getCurrentPrediction();
            
            if (prediction) {
                var accuracyCircle = document.getElementById('accuracy-circle');
                var rect = accuracyCircle.getBoundingClientRect();
                var centerX = rect.left + rect.width / 2;
                var centerY = rect.top + rect.height / 2;
                
                var distance = Math.sqrt(
                    Math.pow(prediction.x - centerX, 2) + 
                    Math.pow(prediction.y - centerY, 2)
                );
                
                accuracySum += (1 - Math.min(distance / 200, 1));
                totalPoints++;
            }
            
            if (totalTime >= 2000) {  // Check for 2 seconds
                clearInterval(checkInterval);
                resolve(totalPoints > 0 ? (accuracySum / totalPoints * 100) : 0);
            }
        }, 50);
    });
    
    removeAccuracyCircle();
    
    // Update accuracy display
    var accuracyElement = document.getElementById('accuracy-value');
    accuracyElement.textContent = accuracyValue.toFixed(1) + '%';
    
    // Show recording controls after calibration
    document.getElementById('recording-controls').style.removeProperty('display');
    document.getElementById('start-recording').style.removeProperty('display');
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

// Record gaze data
function recordGazeData(x, y) {
    if (!window.isRecording) return;
    
    const timestamp = new Date();
    const elapsedMs = timestamp - window.recordingStartTime;
    
    console.log('Adding data point:', x, y); // Debug log
    
    window.recordingData.push({
        timestamp: formatDate(timestamp),
        elapsed_ms: elapsedMs,
        x: Math.round(x),
        y: Math.round(y)
    });
}

// Stop recording
function stopRecording() {
    console.log('Stop recording called, data points:', window.recordingData.length); // Debug log
    
    if (!window.isRecording) {
        console.log('Not recording, returning early'); // Debug log
        return;
    }
    
    window.isRecording = false;
    clearInterval(window.recordingInterval);
    
    if (window.recordingData.length === 0) {
        console.log('No data points recorded!'); // Debug log
        return;
    }
    
    // Create CSV content
    const csvContent = ['timestamp,elapsed_ms,x,y'];
    window.recordingData.forEach(data => {
        csvContent.push(`${data.timestamp},${data.elapsed_ms},${data.x},${data.y}`);
    });
    
    console.log('Creating CSV with', csvContent.length, 'lines'); // Debug log
    
    try {
        // Create and trigger download
        const blob = new Blob([csvContent.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', `gaze_data_${window.sessionId}.csv`);
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('CSV download triggered'); // Debug log
    } catch (error) {
        console.error('Error creating CSV:', error); // Debug log
    }
    
    // Reset UI
    document.getElementById('stop-recording').style.display = 'none';
    document.getElementById('start-recording').style.removeProperty('display');
    document.getElementById('recording-controls').style.removeProperty('display');
    document.getElementById('recording-time').textContent = '00:00';
    document.getElementById('session-id').textContent = '';
    window.recordingData = [];
}

// Start recording
function startRecording() {
    console.log('Start recording called'); // Debug log
    window.isRecording = true;
    window.recordingStartTime = new Date();
    window.sessionId = formatDate(window.recordingStartTime);
    window.recordingData = [];
    
    // Update UI
    document.getElementById('start-recording').style.display = 'none';
    document.getElementById('stop-recording').style.removeProperty('display');
    document.getElementById('recording-controls').style.removeProperty('display');
    document.getElementById('session-id').textContent = window.sessionId;
    
    // Start recording time display
    window.recordingInterval = setInterval(() => {
        const elapsed = new Date() - window.recordingStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        document.getElementById('recording-time').textContent = 
            minutes.toString().padStart(2, '0') + ':' + 
            seconds.toString().padStart(2, '0');
    }, 1000);
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
function onbeforeunload() {
    if (window.isRecording) {
        stopRecording();
    }
    webgazer.end();
};
