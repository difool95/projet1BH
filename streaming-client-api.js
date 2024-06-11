//FOR IDLE VIDEO https://docs.d-id.com/reference/tts-microsoft#-fully-silent-idle-video-example
//FOR IDLE VIDEO https://www.youtube.com/watch?v=nz_ur8x6dJY
'use strict';
// const host = 'http://localhost:3000';
const host = 'https://projet1bh.onrender.com';
let messages = [];
let context = "tu es oussama, tu es un developeur de jeux video et d'experience immersives, tu aimes jouer au jeux video et tu aimer faire des programmes informatiques";

async function fetchOpenAIResponse(userMessage, systemContent, reset) {
  const OPENAI_API_KEY = await getOpenAIKey();
  if (reset) messages = [];
  const newMessage = { role: "user", content: userMessage }
  messages.push(newMessage);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemContent }, ...messages
      ],
      temperature: 0.7,
      max_tokens: 100
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API request failed with status ${response.status}`);
  }
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

//same  - No edits from Github example for this whole section
const RTCPeerConnection = (
  window.RTCPeerConnection ||
  window.webkitRTCPeerConnection ||
  window.mozRTCPeerConnection
).bind(window);

let peerConnection;
let streamId;
let sessionId;
let sessionClientAnswer;

let statsIntervalId;
let videoIsPlaying;
let lastBytesReceived;

const talkVideo = document.getElementById('talk-video');
talkVideo.setAttribute('playsinline', '');

Connect();
async function Connect() {
  if (peerConnection && peerConnection.connectionState === 'connected') {
    return;
  }

  stopAllStreams();
  closePC();
  const DIDKEY = await getDIDKey();

  const sessionResponse = await fetch(`https://api.d-id.com/talks/streams`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${DIDKEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // source_url: "https://mouvmnt.com/d-id/bilel.jpg",
      source_url: "https://mouvmnt.com/d-id/oussemacroped.jpeg",
    }),
  });

  const { id: newStreamId, offer, ice_servers: iceServers, session_id: newSessionId } = await sessionResponse.json()
  streamId = newStreamId;
  sessionId = newSessionId;

  try {
    sessionClientAnswer = await createPeerConnection(offer, iceServers);
  } catch (e) {
    console.log('error during streaming setup', e);
    stopAllStreams();
    closePC();
    return;
  }
  const sdpResponse = await fetch(`https://api.d-id.com/talks/streams/${streamId}/sdp`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${DIDKEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: sessionClientAnswer, session_id: sessionId })
    });
}

// This is changed to accept the ChatGPT response as Text input to D-ID #138 responseFromOpenAI 
const talkButton = document.getElementById('talk-button');
talkButton.onclick = async () => {
  if (peerConnection?.signalingState === 'stable' || peerConnection?.iceConnectionState === 'connected') {
    startSpeechRecognition();

    // New from Jim 10/23 -- Get the user input from the text input field get ChatGPT Response
    // const userInput = document.getElementById('user-input-field').value;

  }
};

async function startSpeechRecognition() {
  try {
    // Request permission for microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Initialize SpeechRecognition object
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'fr-FR'; // Set language to English
    recognition.continuous = false; // Recognize single phrases
    recognition.interimResults = false; // Get final result only
    recognition.maxAlternatives = 1; // Get only one recognition result

    // Start recognition
    recognition.start();

    // Stop recognition after 6 seconds
    setTimeout(() => {
      recognition.stop();
    }, 6000);

    // Event listener for recognition result
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Recognized text:', transcript);
      const responseFromOpenAI = await fetchOpenAIResponse(transcript, context, false);
      //
      // Print the openAIResponse to the console
      console.log("OpenAI Response:", responseFromOpenAI);
      //
      const DIDKEY = await getDIDKey();

      const talkResponse = await fetch(`https://api.d-id.com/talks/streams/${streamId}`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${DIDKEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          script: {
            type: 'text',
            subtitles: 'false',
            provider: { type: 'microsoft', voice_id: 'fr-FR-YvesNeural' },
            ssml: false,
            input: responseFromOpenAI  //send the openAIResponse to D-id
          },
          config: {
            fluent: true,
            pad_audio: 0,
            driver_expressions: {
              expressions: [{ expression: 'neutral', start_frame: 0, intensity: 0 }],
              transition_frames: 0
            },
            align_driver: true,
            align_expand_factor: 0,
            auto_match: true,
            motion_factor: 0,
            normalization_factor: 0,
            sharpen: true,
            stitch: true,
            result_format: 'mp4'
          },
          'driver_url': 'bank://lively/',
          'config': {
            'stitch': true,
          },
          'session_id': sessionId
        })
      });
    };

    // Event listener for recognition error
    recognition.onerror = (event) => {
      console.error('Recognition error:', event.error);
    };

    // Stop microphone stream when recognition ends
    recognition.onend = () => {
      stream.getTracks().forEach(track => track.stop());
    };
  } catch (error) {
    console.error('Error accessing microphone:', error);
  }
}


function onIceGatheringStateChange() {
  // iceGatheringStatusLabel.innerText = peerConnection.iceGatheringState;
  // iceGatheringStatusLabel.className = 'iceGatheringState-' + peerConnection.iceGatheringState;
}
async function onIceCandidate(event) {
  console.log('onIceCandidate', event);
  if (event.candidate) {
    const { candidate, sdpMid, sdpMLineIndex } = event.candidate;
    const DIDKEY = await getDIDKey();

    fetch(`https://api.d-id.com/talks/streams/${streamId}/ice`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${DIDKEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidate,
        sdpMid,
        sdpMLineIndex,
        session_id: sessionId,
      }),
    });
  }
}
function onIceConnectionStateChange() {
  // iceStatusLabel.innerText = peerConnection.iceConnectionState;
  // iceStatusLabel.className = 'iceConnectionState-' + peerConnection.iceConnectionState;
  if (peerConnection.iceConnectionState === 'failed' || peerConnection.iceConnectionState === 'closed') {
    stopAllStreams();
    closePC();
  }
}
function onConnectionStateChange() {
  // not supported in firefox
  if (peerConnection.connectionState == "connected") {
    //Activate button talk micro
  }
  // peerStatusLabel.innerText = peerConnection.connectionState;
  // peerStatusLabel.className = 'peerConnectionState-' + peerConnection.connectionState;
}
function onSignalingStateChange() {
  // signalingStatusLabel.innerText = peerConnection.signalingState;
  // signalingStatusLabel.className = 'signalingState-' + peerConnection.signalingState;
}

function onVideoStatusChange(videoIsPlaying, stream) {
  let status;
  if (videoIsPlaying) {
    status = 'streaming';
    const remoteStream = stream;
    setVideoElement(remoteStream);
  } else {
    status = 'empty';
    playIdleVideo();
  }
  // streamingStatusLabel.innerText = status;
  // streamingStatusLabel.className = 'streamingState-' + status;
}

function onTrack(event) {
  /**
   * The following code is designed to provide information about wether currently there is data
   * that's being streamed - It does so by periodically looking for changes in total stream data size
   *
   * This information in our case is used in order to show idle video while no talk is streaming.
   * To create this idle video use the POST https://api.d-id.com/talks endpoint with a silent audio file or a text script with only ssml breaks 
   * https://docs.aws.amazon.com/polly/latest/dg/supportedtags.html#break-tag
   * for seamless results use `config.fluent: true` and provide the same configuration as the streaming video
   */

  if (!event.track) return;

  statsIntervalId = setInterval(async () => {
    const stats = await peerConnection.getStats(event.track);
    stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
        const videoStatusChanged = videoIsPlaying !== report.bytesReceived > lastBytesReceived;

        if (videoStatusChanged) {
          videoIsPlaying = report.bytesReceived > lastBytesReceived;
          onVideoStatusChange(videoIsPlaying, event.streams[0]);
        }
        lastBytesReceived = report.bytesReceived;
      }
    });
  }, 500);
}

async function createPeerConnection(offer, iceServers) {
  if (!peerConnection) {
    peerConnection = new RTCPeerConnection({ iceServers });
    peerConnection.addEventListener('icegatheringstatechange', onIceGatheringStateChange, true);
    peerConnection.addEventListener('icecandidate', onIceCandidate, true);
    peerConnection.addEventListener('iceconnectionstatechange', onIceConnectionStateChange, true);
    peerConnection.addEventListener('connectionstatechange', onConnectionStateChange, true);
    peerConnection.addEventListener('signalingstatechange', onSignalingStateChange, true);
    peerConnection.addEventListener('track', onTrack, true);
  }

  await peerConnection.setRemoteDescription(offer);
  // console.log('set remote sdp OK');

  const sessionClientAnswer = await peerConnection.createAnswer();
  // console.log('create local sdp OK');

  await peerConnection.setLocalDescription(sessionClientAnswer);
  // console.log('set local sdp OK');

  return sessionClientAnswer;
}

function setVideoElement(stream) {
  if (!stream) return;
  talkVideo.srcObject = stream;
  talkVideo.loop = false;

  // safari hotfix
  if (talkVideo.paused) {
    talkVideo
      .play()
      .then((_) => { })
      .catch((e) => { });
  }
}

function playIdleVideo() {
  console.log("playing idle video");
  talkVideo.srcObject = undefined;
  talkVideo.src = 'idleVideo2.mp4';
  // talkVideo.src = 'idleVideo.mp4';
  talkVideo.loop = true;
}

function stopAllStreams() {
  if (talkVideo.srcObject) {
    // console.log('stopping video streams');
    talkVideo.srcObject.getTracks().forEach((track) => track.stop());
    talkVideo.srcObject = null;
  }
}

function closePC(pc = peerConnection) {
  if (!pc) return;
  // console.log('stopping peer connection');
  pc.close();
  pc.removeEventListener('icegatheringstatechange', onIceGatheringStateChange, true);
  pc.removeEventListener('icecandidate', onIceCandidate, true);
  pc.removeEventListener('iceconnectionstatechange', onIceConnectionStateChange, true);
  pc.removeEventListener('connectionstatechange', onConnectionStateChange, true);
  pc.removeEventListener('signalingstatechange', onSignalingStateChange, true);
  pc.removeEventListener('track', onTrack, true);
  clearInterval(statsIntervalId);
  if (pc === peerConnection) {
    peerConnection = null;
  }
}

const maxRetryCount = 3;
const maxDelaySec = 4;
// Default of 1 moved to 5
async function fetchWithRetries(url, options, retries = 3) {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (retries <= maxRetryCount) {
      const delay = Math.min(Math.pow(2, retries) / 4 + Math.random(), maxDelaySec) * 1000;

      await new Promise((resolve) => setTimeout(resolve, delay));

      console.log(`Request failed, retrying ${retries}/${maxRetryCount}. Error ${err}`);
      return fetchWithRetries(url, options, retries + 1);
    } else {
      throw new Error(`Max retries exceeded. error: ${err}`);
    }
  }
}
getOpenAIKey();

// Get OpenAI key from backend
async function getOpenAIKey() {
  const response = await fetch(host + '/api/openai-key', {
    headers: {
      'x-api-key': 'serofesresyr2362873sherYQZUEYZUEY'
    }
  });
  const data = await response.json();
  return data.apiKey;
}

// Get D-ID key from backend
async function getDIDKey() {
  const response = await fetch(host + '/api/did-key', {
    headers: {
      'x-api-key': 'serofesresyr2362873sherYQZUEYZUEY'
    }
  });
  const data = await response.json();
  return data.apiKey;
}