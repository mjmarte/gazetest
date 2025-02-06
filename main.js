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
    window.webgazerReady = false;
    PointCalibrate = 0;
    CalibrationPoints = {};

    // Add click handlers for recording buttons
    document.getElementById('start-recording').onclick = startRecording;
    document.getElementById('stop-recording').onclick = stopRecording;
    
    // Hide recording controls initially
    document.getElementById('recording-controls').style.display = 'none';
    document.getElementById('start-recording').style.display = 'none';
    document.getElementById('stop-recording').style.display = 'none';

    try {
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
            
        // Wait for WebGazer to fully initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        window.webgazerReady = true;
        console.log('WebGazer initialization complete'); // Debug log
    } catch (error) {
        console.error('Error initializing WebGazer:', error);
        document.getElementById('status').innerHTML = 
            '<p>Error initializing eye tracking. Please refresh the page and try again.</p>';
    }

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
    if (!window.webgazerReady) {
        console.log('WebGazer not ready, ignoring click'); // Debug log
        return;
    }

    const id = node.id;
    console.log('Clicked point:', id, 'Current PointCalibrate:', PointCalibrate); // Debug log
    
    if (!CalibrationPoints[id]) {
        CalibrationPoints[id] = 0;
    }
    CalibrationPoints[id]++;
    console.log('Clicks for point', id + ':', CalibrationPoints[id]); // Debug log

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
        console.log('Point complete. Total points calibrated:', PointCalibrate); // Debug log
        
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
        console.log('All points calibrated. Starting accuracy calculation...'); // Debug log
        // Update status
        document.getElementById('status').innerHTML = 
            '<p>Calibration complete! Calculating accuracy...</p>';
        
        // Wait a moment for WebGazer to stabilize
        setTimeout(async () => {
            try {
                // Calculate accuracy
                await calculateAccuracy();
            } catch (error) {
                console.error('Error during accuracy calculation:', error);
                document.getElementById('status').innerHTML = 
                    '<p>Error during accuracy calculation: ' + error.message + '. Please try again.</p>';
            }
        }, 1000);
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

// Show middle point for accuracy test
function showMiddlePoint() {
    const canvas = document.getElementById("plotting_canvas");
    const context = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Clear any existing points
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw red point
    context.beginPath();
    context.arc(centerX, centerY, 10, 0, 2 * Math.PI);
    context.fillStyle = "red";
    context.fill();
    context.stroke();
}

// Clear the canvas
function clearMiddlePoint() {
    const canvas = document.getElementById("plotting_canvas");
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
}

// Function to show accuracy calculation circle
async function showAccuracyCircle() {
    console.log('Creating accuracy circle...'); // Debug log
    return new Promise((resolve) => {
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
        circle.style.zIndex = '9999';
        document.body.appendChild(circle);
        console.log('Accuracy circle created and appended to body'); // Debug log
        
        // Give the circle time to render
        setTimeout(() => {
            console.log('Accuracy circle render timeout complete'); // Debug log
            resolve();
        }, 100);
    });
}

// Function to remove accuracy calculation circle
function removeAccuracyCircle() {
    const circle = document.getElementById('accuracy-circle');
    if (circle) {
        circle.remove();
    }
}

// Calculate precision from prediction points
function calculatePrecision(past50Array) {
    var windowHeight = window.innerHeight;
    var windowWidth = window.innerWidth;

    // Retrieve the last 50 gaze prediction points
    var x50 = past50Array[0];
    var y50 = past50Array[1];

    // Calculate the position of the point the user is staring at
    var staringPointX = windowWidth / 2;
    var staringPointY = windowHeight / 2;

    var precisionPercentages = new Array(50);
    calculatePrecisionPercentages(precisionPercentages, windowHeight, x50, y50, staringPointX, staringPointY);
    var precision = calculateAverage(precisionPercentages);

    // Return the precision measurement as a rounded percentage
    return Math.round(precision);
}

/*
 * Calculate percentage accuracy for each prediction based on distance of
 * the prediction point from the centre point (uses the window height as
 * lower threshold 0%)
 */
function calculatePrecisionPercentages(precisionPercentages, windowHeight, x50, y50, staringPointX, staringPointY) {
    for (var x = 0; x < 50; x++) {
        // Calculate distance between each prediction and staring point
        var xDiff = staringPointX - x50[x];
        var yDiff = staringPointY - y50[x];
        var distance = Math.sqrt((xDiff * xDiff) + (yDiff * yDiff));

        // Calculate precision percentage
        var halfWindowHeight = windowHeight / 2;
        var precision = 0;
        if (distance <= halfWindowHeight && distance > -1) {
            precision = 100 - (distance / halfWindowHeight * 100);
        } else if (distance > halfWindowHeight) {
            precision = 0;
        } else if (distance > -1) {
            precision = 100;
        }

        // Store the precision
        precisionPercentages[x] = precision;
    }
}

/*
 * Calculates the average of all precision percentages calculated
 */
function calculateAverage(precisionPercentages) {
    var precision = 0;
    for (var x = 0; x < 50; x++) {
        precision += precisionPercentages[x];
    }
    precision = precision / 50;
    return precision;
}

// Show calibration points
function ShowCalibrationPoint() {
    // Clear the canvas before showing points
    clearCanvas();
    
    // Show all calibration points
    document.querySelectorAll('.Calibration').forEach(btn => {
        btn.style.removeProperty('display');
    });
}

// Calculate accuracy after calibration
async function calculateAccuracy() {
    try {
        console.log('Starting accuracy calculation...'); // Debug log
        
        // Show the middle point
        showMiddlePoint();
        
        // Show modal for accuracy calculation
        await swal({
            title: "Calculating measurement",
            text: "Please don't move your mouse & stare at the red dot in the middle for the next 5 seconds. This will allow us to calculate the accuracy of our predictions.",
            closeOnEsc: false,
            allowOutsideClick: false,
            closeModal: true
        });

        // Collect points for 5 seconds
        const points = { x: [], y: [] };
        const originalListener = webgazer.getGazeListener();
        
        await new Promise((resolve) => {
            webgazer.setGazeListener((data, elapsedTime) => {
                if (data == null) return;
                points.x.push(data.x);
                points.y.push(data.y);
                if (originalListener) originalListener(data, elapsedTime);
            });
            
            setTimeout(() => {
                // Restore original listener
                webgazer.setGazeListener(originalListener);
                // Clear the middle point
                clearMiddlePoint();
                resolve();
            }, 5000);
        });
        
        // Take only the last 50 points if we have more
        if (points.x.length > 50) {
            points.x = points.x.slice(-50);
            points.y = points.y.slice(-50);
        }
        
        // Calculate precision using the collected points
        var precision_measurement = calculatePrecision([points.x, points.y]);
        var accuracyLabel = "<a>Accuracy | "+precision_measurement+"%</a>";
        document.getElementById("Accuracy").innerHTML = accuracyLabel;
        
        // Show the results
        const result = await swal({
            title: "Your accuracy measure is " + precision_measurement + "%",
            allowOutsideClick: false,
            buttons: {
                cancel: "Recalibrate",
                confirm: true,
            }
        });
        
        if (result) {
            // User clicked confirm
            clearCanvas();
            // Show recording controls after successful calibration
            document.getElementById('recording-controls').style.removeProperty('display');
            document.getElementById('start-recording').style.removeProperty('display');
        } else {
            // User clicked Recalibrate
            document.getElementById("Accuracy").innerHTML = "<a>Not yet Calibrated</a>";
            webgazer.clearData();
            clearCanvas();
            ShowCalibrationPoint();
        }
        
    } catch (error) {
        console.error('Error in calculateAccuracy:', error);
        document.getElementById('status').innerHTML = 
            '<p>Error during accuracy calculation: ' + error.message + '. Please try again.</p>';
        document.getElementById('accuracy-value').textContent = 'Not Calibrated';
        throw error;
    }
}

// Clear the canvas and hide calibration points
function clearCanvas() {
    clearMiddlePoint();
    document.querySelectorAll('.Calibration').forEach(btn => {
        btn.style.display = 'none';
    });
}

// Recording variables
let isRecording = false;
let recordingStartTime = null;
let gazeData = [];
let recordingInterval = null;

// Start recording gaze data
function startRecording() {
    if (isRecording) return;
    
    isRecording = true;
    recordingStartTime = Date.now();
    gazeData = [];
    
    // Update UI
    document.getElementById('start-recording').style.display = 'none';
    document.getElementById('stop-recording').style.removeProperty('display');
    document.getElementById('session-id').textContent = new Date().toISOString();
    
    // Start recording time display
    recordingInterval = setInterval(() => {
        const elapsed = Date.now() - recordingStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        document.getElementById('recording-time').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
    
    // Set up gaze listener
    webgazer.setGazeListener((data, elapsedTime) => {
        if (data == null || !isRecording) return;
        
        gazeData.push({
            timestamp: Date.now(),
            x: data.x,
            y: data.y,
            elapsedTime: elapsedTime
        });
    });
}

// Stop recording and save data
function stopRecording() {
    if (!isRecording) return;
    
    isRecording = false;
    clearInterval(recordingInterval);
    
    // Update UI
    document.getElementById('stop-recording').style.display = 'none';
    document.getElementById('start-recording').style.removeProperty('display');
    
    // Save data to CSV
    const csvContent = "data:text/csv;charset=utf-8," + 
        "timestamp,x,y,elapsedTime\n" +
        gazeData.map(row => 
            `${row.timestamp},${row.x},${row.y},${row.elapsedTime}`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gaze_data_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// sleep function because java doesn't have one, sourced from http://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
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

// Set up event listeners for recording controls
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-recording').addEventListener('click', startRecording);
    document.getElementById('stop-recording').addEventListener('click', stopRecording);
});
