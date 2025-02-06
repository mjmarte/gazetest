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
            ClearCanvas();
            // Show recording controls after successful calibration
            document.getElementById('recording-controls').style.removeProperty('display');
            document.getElementById('start-recording').style.removeProperty('display');
        } else {
            // User clicked Recalibrate
            document.getElementById("Accuracy").innerHTML = "<a>Not yet Calibrated</a>";
            webgazer.clearData();
            ClearCalibration();
            ClearCanvas();
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

// Clear the middle point
function clearMiddlePoint() {
    const canvas = document.getElementById("plotting_canvas");
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
}

// Set up event listeners for recording controls
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-recording').addEventListener('click', startRecording);
    document.getElementById('stop-recording').addEventListener('click', stopRecording);
});
