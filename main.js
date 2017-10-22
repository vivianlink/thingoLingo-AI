var GOOGLE_VISION_API_KEY = "AIzaSyDsrEnDMhouDfmFHEUHYKZTk2JjvSGcVP0";
var BING_SPEECH_API_KEY = "0025f47a1c084e208f9e6c3ed415f6f1";
var width = 800;
var height = 1200;

var recognizedWords = [];

var recognizedPhrase = "";

var languages = {
    "ru": "ru-RU",
    "es": "es-ES",
    "zh": "zh-CN",
    "ja": "ja-JP",
    "pt": "pt-BR"
};

var canvas = document.createElement('canvas');
var video = document.getElementById('video');

video.setAttribute('playsinline', '');
video.setAttribute('autoplay', '');
video.setAttribute('muted', '');
video.style.width = width + 'px';
video.style.width = height + 'px';

/* Setting up the constraint */
var facingMode = "user";
var constraints = {
    audio: false,
    video: {
        facingMode: facingMode
    }
};

/* Stream it to video element */
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.mediaDevices.getUserMedia;
navigator.mediaDevices.getUserMedia(constraints).then(function success(stream) {
    video.srcObject = stream;
});

$(".js-take-picture").click(function() {
    getCurrentItems(function(words) {
        recognizedWords = words;
    });

    Setup();

    recognizedPhrase = "";
    RecognizerStart(SDK, recognizer);
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

function translateLanguage(sourceLanguage, sourceText, callback){
    var data = {
        'q': sourceText,
        'source' : sourceLanguage,
        'target': 'en'
    };
    $.ajax("https://translation.googleapis.com/language/translate/v2?key=" + GOOGLE_VISION_API_KEY, {
        method: "POST",
        data: JSON.stringify(data),
        contentType: "application/json",
        success: function(response) {
            // console.log(response);

            callback(response.data.translations[0].translatedText);
        },
        error: function(response) {
            console.log("ajax error");
            console.log(response.responseText);
        }
    });
}

function checkAnswer(spokenString, actualAnswerArray){
    for (var i = 0; i < actualAnswerArray.length; i++){
            if (spokenString.toLowerCase().includes(actualAnswerArray[i].toLowerCase())){
            return swal(
                'Good job!',
                actualAnswerArray[i] + ' is correct',
                'success'
            );

        }
    }
    swal(
        'Oops' ,  spokenString + ' is wrong!' ,  'error'
    );
}

function getCurrentItems(callback) {
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
            var words = [];
            // console.log("ajax response");
            // console.log(response);
            var labels = response.responses[0].labelAnnotations;

            for (var i = 0; i < labels.length; i++) {
                words.push(labels[i].description);
            }

            callback(words);
        },
        error: function(response) {
            console.log("ajax error");
            console.log(response.responseText);
        }
    });
}


// BING SPEECH API USAGE
// On document load resolve the SDK dependency
function Initialize(onComplete) {
    require(["Speech.Browser.Sdk"], function(SDK) {
        onComplete(SDK);
    });
}

// Setup the recognizer
function RecognizerSetup(SDK, recognitionMode, language, format, subscriptionKey) {

    switch (recognitionMode) {
        case "Interactive" :
            recognitionMode = SDK.RecognitionMode.Interactive;
            break;
        case "Conversation" :
            recognitionMode = SDK.RecognitionMode.Conversation;
            break;
        case "Dictation" :
            recognitionMode = SDK.RecognitionMode.Dictation;
            break;
        default:
            recognitionMode = SDK.RecognitionMode.Interactive;
    }

    var recognizerConfig = new SDK.RecognizerConfig(
        new SDK.SpeechConfig(
            new SDK.Context(
                new SDK.OS(navigator.userAgent, "Browser", null),
                new SDK.Device("SpeechSample", "SpeechSample", "1.0.00000"))),
        recognitionMode,
        language, // Supported languages are specific to each recognition mode. Refer to docs.
        format); // SDK.SpeechResultFormat.Simple (Options - Simple/Detailed)

    // Alternatively use SDK.CognitiveTokenAuthentication(fetchCallback, fetchOnExpiryCallback) for token auth
    var authentication = new SDK.CognitiveSubscriptionKeyAuthentication(subscriptionKey);

    return SDK.CreateRecognizer(recognizerConfig, authentication);
}

// Start the recognition
function RecognizerStart(SDK, recognizer) {
    recognizer.Recognize((event) => {
        /*
         Alternative syntax for typescript devs.
         if (event instanceof SDK.RecognitionTriggeredEvent)
         */
        switch (event.Name) {
    case "RecognitionTriggeredEvent" :
        UpdateStatus("Initializing");
        break;
    case "ListeningStartedEvent" :
        UpdateStatus("Listening");
        break;
    case "RecognitionStartedEvent" :
        UpdateStatus("Listening_Recognizing");
        break;
    case "SpeechStartDetectedEvent" :
        UpdateStatus("Listening_DetectedSpeech_Recognizing");
        console.log(JSON.stringify(event.Result)); // check console for other information in result
        break;
    case "SpeechHypothesisEvent" :
        UpdateRecognizedHypothesis(event.Result.Text, false);
        console.log(JSON.stringify(event.Result)); // check console for other information in result
        break;
    case "SpeechFragmentEvent" :
        UpdateRecognizedHypothesis(event.Result.Text, true);
        console.log(JSON.stringify(event.Result)); // check console for other information in result
        break;
    case "SpeechEndDetectedEvent" :
        OnSpeechEndDetected();
        UpdateStatus("Processing_Adding_Final_Touches");
        console.log(JSON.stringify(event.Result)); // check console for other information in result
        break;
    case "SpeechSimplePhraseEvent" :
        UpdateRecognizedPhrase(JSON.stringify(event.Result, null, 3));
        break;
    case "SpeechDetailedPhraseEvent" :
        UpdateRecognizedPhrase(JSON.stringify(event.Result, null, 3));
        break;
    case "RecognitionEndedEvent" :
        OnComplete();
        UpdateStatus("Idle");
        console.log(JSON.stringify(event)); // Debug information
        break;
    default:
        console.log(JSON.stringify(event)); // Debug information
    }
})
.On(() => {
        // The request succeeded. Nothing to do here.
    },
        (error) => {
        console.error(error);
    });
}

// Stop the Recognition.
function RecognizerStop(SDK, recognizer) {
    // recognizer.AudioSource.Detach(audioNodeId) can be also used here. (audioNodeId is part of ListeningStartedEvent)
    recognizer.AudioSource.TurnOff();
}

var SDK;
var recognizer;

document.addEventListener("DOMContentLoaded", function () {
    Initialize(function (speechSdk) {
        console.log("initialized");
        SDK = speechSdk;
    });
});

function Setup() {
    recognizer = RecognizerSetup(SDK, "Interactive", languages[document.getElementById("FromLanguage").value], SDK.SpeechResultFormat.Simple, BING_SPEECH_API_KEY);
}

function UpdateStatus(status) {
}

function UpdateRecognizedHypothesis(text, append) {
}

function OnSpeechEndDetected() {
}

function UpdateRecognizedPhrase(json) {
    try {
        recognizedPhrase = JSON.parse(json).DisplayText;
    } catch (e) {
        recognizedPhrase = "";
    }

    console.log(recognizedPhrase);
}

function OnComplete() {
    var fromLanguage = document.getElementById("FromLanguage").value;

    translateLanguage(fromLanguage, recognizedPhrase, function(translated) {
        console.log("Recognized Words:");
        console.log(recognizedWords);
        console.log("");
        console.log("Recognized Phrase:");
        console.log(recognizedPhrase);
        console.log("");
        console.log("Translated Phrase:");
        console.log(translated);
        console.log("");
        checkAnswer(translated, recognizedWords);
    });
}