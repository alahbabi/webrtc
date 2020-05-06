const peerConnections = {};
function getParams() {
  return {
    iceServers: [
      {
        urls: [
          "stun:108.177.15.127:19302"
        ]
      },
      {
        urls: [
          "turn:[2a00:1450:400b:c03::7f]:19305?transport=udp"
        ],
        username: "CKCYzfUFEgatnWOsiHYYqvGggqMKIICjBQ",
        credential: "uX6BNqvoeKNTJG5XwqPj51Msuq4=",
        maxRateKbps: "8000"
      }
    ],
    iceTransportPolicy: "all",
  };
}

const socket = io.connect(window.location.origin);

// Recevoir l'offre
socket.on("studentSendOffre", (id, description) => {
  // enregistrer l'offre du Peer
  peerConnections[id].setRemoteDescription(description);
});

socket.on("studentWatcher", (id) => {
  const peerConnection = new RTCPeerConnection(getParams());
  peerConnections[id] = peerConnection;
  let stream = videoElement.srcObject;
  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

  // Générer l'offre
  peerConnection
    .createOffer()
    .then((sdp) => peerConnection.setLocalDescription(sdp))
    .then(() => {
      // Transmettre l'offre avec les informations du stream
      socket.emit("teacherSendOffer", id, peerConnection.localDescription);
    });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        // Envoyer la candidature pour le Peer
      socket.emit("teacherCandidate", event.candidate);
    }
  };
});

socket.on("studentCandidate", (id, candidate) => {
  // Recevoir la candidature du Peer et l'enregistrer
  peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("disconnectPeer", (id) => {
  //peerConnections[id].close();
  delete peerConnections[id];
});

window.onunload = window.onbeforeunload = () => {
  socket.close();
};

// Get camera and microphone
const videoElement = document.querySelector("#teacherVideo");

function getStream() {
  if (window.stream) {
    window.stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
  const constraints = {audio: true, video: true};

  return navigator.mediaDevices
    .getUserMedia(constraints)
    .then(gotStream)
    .catch(handleError);
}

function gotStream(stream) {
  window.stream = stream;
  videoElement.srcObject = stream;
  socket.emit("teacherStartCall");
}

function handleError(error) {
  console.error("Error: ", error);
}




let peerConnection;
const video = document.querySelector("#studentVideo");


socket.on("teacherSendOffer", (id, description) => {
  // Generer une nouvelle Offre
  peerConnection = new RTCPeerConnection(getParams());
  // enregistrer l'offre du Peer
  peerConnection
    .setRemoteDescription(description)
    // setLocalDescription() creates an answer, which becomes the new local description.
    .then(() => peerConnection.createAnswer())
    .then(sdp => peerConnection.setLocalDescription(sdp))
    .then(() => {
      // envoyer la réponse
      socket.emit("studentSendOffre", id, peerConnection.localDescription);
    });
  peerConnection.ontrack = event => {
    video.srcObject = event.streams[0];
  };
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("studentCandidate", id, event.candidate);
    }
  };
});

socket.on("teacherCandidate", (id, candidate) => {
  // Recevoir la candidature du Peer et l'enregistrer
  peerConnection
    .addIceCandidate(new RTCIceCandidate(candidate))
    .catch(e => console.error(e));
});

socket.on("connect", () => {
  socket.emit("studentWatcher");
});

// Exemple Si le Peer est connecter alors que Broacaster s'est deconnecté et reconnecté / s'est connecté
socket.on("teacherStartCall", () => {
  socket.emit("studentWatcher");
});

socket.on("disconnectPeer", () => {
  peerConnection.close();
});

window.onunload = window.onbeforeunload = () => {
  socket.close();
};

