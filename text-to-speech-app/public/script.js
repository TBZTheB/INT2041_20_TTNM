const inputText = document.getElementById('inputText');
const fileInput = document.getElementById('fileInput');
const audioPlayer = document.getElementById('audioPlayer');
const outputText = document.getElementById('outputText');

async function textToSpeech() {
    const text = inputText.value.trim();
    if (text === '') return;

    const response = await fetch('/text-to-speech', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
    });

    const audioBlob = await response.blob();
    const audioURL = URL.createObjectURL(audioBlob);
    audioPlayer.src = audioURL;
}

async function speechToText() {
    const audioFile = fileInput.files[0];
    if (!audioFile) return;

    const formData = new FormData();
    formData.append('audio', audioFile);

    const response = await fetch('/speech-to-text', {
        method: 'POST',
        body: formData
    });

    const result = await response.json();
    outputText.innerText = result.text;
}
