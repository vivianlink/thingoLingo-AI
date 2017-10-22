var GOOGLE_VISION_API_KEY = "AIzaSyDsrEnDMhouDfmFHEUHYKZTk2JjvSGcVP0";
var width = 800;
var height = 800;

var canvas = document.createElement('canvas');
var video = document.createElement('video');
video.setAttribute('playsinline', '');
video.setAttribute('autoplay', '');
video.setAttribute('muted', '');
video.style.width = width + 'px';
video.style.width = height + 'px';

document.body.appendChild(video);

/* Setting up the constraint */
var facingMode = "user"; // Can be 'user' or 'environment' to access back or front camera (NEAT!)
var constraints = {
    audio: false,
    video: {
        facingMode: facingMode
    }
};

/* Stream it to video element */
navigator.mediaDevices.getUserMedia(constraints).then(function success(stream) {
    video.srcObject = stream;
});

$(".js-take-picture").click(function() {
    getCurrentItem();
});

function getCurrentFrame() {
    var context = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);

    var data = canvas.toDataURL();

    data = data.replace("data:image/png;base64,", ""); // make it pure base64

    return data;
}

function getCurrentItem() {
    var data = {
        requests: [
            {
                image: {
                    content: getCurrentFrame()
                },
                features: [
                    {
                        type: "LABEL_DETECTION",
                        maxResults: 100
                    }
                ]
            }
        ]
    };

    $.ajax("https://vision.googleapis.com/v1/images:annotate?key=" + GOOGLE_VISION_API_KEY, {
        method: "POST",
        data: JSON.stringify(data),
        contentType: "application/json",
        success: function(response) {
            console.log("ajax response");
            console.log(response);
        },
        error: function(response) {
            console.log("ajax error");
            console.log(response.responseText);
        }
    });
}