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
    document.getElementById('start-recording').addEventListener('click', startRecording);
    document.getElementById('stop-recording').addEventListener('click', stopRecording);
    
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
function calculateAccuracy() {
    showAccuracyCircle();
    
    // Store points for 5 seconds
    const points = {x: [], y: []};
    let startTime = performance.now();
    
    function collectPoints(data) {
        if (!data) return;
        points.x.push(data.x);
        points.y.push(data.y);
        
        // After 5 seconds, calculate accuracy
        if (performance.now() - startTime > 5000) {
            webgazer.clearGazeListener();
            
            // Calculate precision using WebGazer's method
            const windowHeight = window.innerHeight;
            const windowWidth = window.innerWidth;
            
            // Calculate the position of the point the user is staring at (center)
            const staringPointX = windowWidth / 2;
            const staringPointY = windowHeight / 2;
            
            // Calculate precision for each point
            const precisionPercentages = [];
            for (let i = 0; i < points.x.length; i++) {
                // Calculate distance between each prediction and staring point
                const xDiff = staringPointX - points.x[i];
                const yDiff = staringPointY - points.y[i];
                const distance = Math.sqrt((xDiff * xDiff) + (yDiff * yDiff));
                
                // Calculate precision percentage
                const halfWindowHeight = windowHeight / 2;
                let precision = 0;
                if (distance <= halfWindowHeight && distance > -1) {
                    precision = 100 - (distance / halfWindowHeight * 100);
                } else if (distance > halfWindowHeight) {
                    precision = 0;
                } else if (distance > -1) {
                    precision = 100;
                }
                precisionPercentages.push(precision);
            }
            
            // Calculate average precision
            const accuracyScore = Math.round(
                precisionPercentages.reduce((sum, p) => sum + p, 0) / precisionPercentages.length
            );
            
            // Update accuracy display
            document.getElementById('accuracy-value').textContent = accuracyScore + '%';
            
            // Only show recording controls if accuracy is good enough
            if (accuracyScore >= 50) {
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
            removeAccuracyCircle();
        }
    }
    
    // Show status during collection
    document.getElementById('status').innerHTML = 
        '<p>Please stare at the center of the screen for 5 seconds...</p>';
    
    // Set up temporary gaze listener
    webgazer.setGazeListener(collectPoints);
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
