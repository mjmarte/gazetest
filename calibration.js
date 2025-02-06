var PointCalibrate = 0;
var CalibrationPoints = {};

/**
 * Clear the canvas and the calibration button.
 */
function ClearCanvas(){
    document.querySelectorAll('.Calibration').forEach((i) => {
        i.style.setProperty('display', 'none');
    });
    var canvas = document.getElementById("plotting_canvas");
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

/**
* This function clears the calibration buttons memory
*/
function ClearCalibration(){
    // Clear data from WebGazer
    document.querySelectorAll('.Calibration').forEach((i) => {
        i.style.setProperty('background-color', 'red');
        i.style.setProperty('opacity', '0.2');
        i.removeAttribute('disabled');
    });

    CalibrationPoints = {};
    PointCalibrate = 0;
}

/**
 * Show the Calibration Points
 */
function ShowCalibrationPoint() {
    document.querySelectorAll('.Calibration').forEach((i) => {
        i.style.removeProperty('display');
    });
    // initially hides the middle button
    document.getElementById('Pt5').style.setProperty('display', 'none');
}

function calPointClick(node) {
    const id = node.id;

    if (!CalibrationPoints[id]){ // initialises if not done
        CalibrationPoints[id]=0;
    }
    CalibrationPoints[id]++; // increments values

    if (CalibrationPoints[id]==5){ //only turn to yellow after 5 clicks
        node.style.setProperty('background-color', 'yellow');
        node.setAttribute('disabled', 'disabled');
        PointCalibrate++;
    }else if (CalibrationPoints[id]<5){
        //Gradually increase the opacity of calibration points when click to give some indication to user.
        var opacity = 0.2*CalibrationPoints[id]+0.2;
        node.style.setProperty('opacity', opacity);
    }

    //Show the middle calibration point after all other points have been clicked.
    if (PointCalibrate == 8){
        document.getElementById('Pt5').style.removeProperty('display');
    }

    if (PointCalibrate >= 9){ // last point is calibrated
        // grab every element in Calibration class and hide them except the middle point.
        document.querySelectorAll('.Calibration').forEach((i) => {
            i.style.setProperty('display', 'none');
        });
        document.getElementById('Pt5').style.removeProperty('display');

        // clears the canvas
        var canvas = document.getElementById("plotting_canvas");
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        // Calculate the accuracy
        calculateAccuracy();
    }
}

// Restart calibration
function Restart() {
    document.getElementById("Accuracy").innerHTML = "<a>Not yet Calibrated</a>";
    webgazer.clearData();
    ClearCalibration();
    ClearCanvas();
    ShowCalibrationPoint();
}

/**
 * Load this function when the index page starts.
* This function listens for button clicks on the html page
* checks that all buttons have been clicked 5 times each, and then goes on to measuring the precision
*/
function docLoad() {
    ClearCanvas();
    
    // click event on the calibration buttons
    document.querySelectorAll('.Calibration').forEach((i) => {
        i.addEventListener('click', () => {
            calPointClick(i);
        })
    })
};

window.addEventListener('load', docLoad);
