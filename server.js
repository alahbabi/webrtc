const express = require("express");
const app = express();

let broadcaster;
const port = 4001;

const http = require("http");
const server = http.createServer(app);

const io = require("socket.io")(server);
app.use(express.static(__dirname + "/public"));

io.sockets.on("error", e => console.log(e));
io.sockets.on("connection", socket => {
  // To broadcast, simply add a broadcast flag to emit and send method calls.
  // Broadcasting means sending a message to everyone else except for the socket that starts it.
  socket.on("teacherStartCall", () => {
    broadcaster = socket.id;
    // Exemple Si le Peer est connecter alors que Broacaster s'est deconnecté et reconnecté
    socket.broadcast.emit("teacherStartCall");
  });
  socket.on("studentWatcher", () => {
    socket.to(broadcaster).emit("studentWatcher", socket.id);
  });
  socket.on("teacherSendOffer", (id, message) => {
    socket.to(id).emit("teacherSendOffer", socket.id, message);
  });
  socket.on("studentSendOffre", (id, message) => {
    socket.to(id).emit("studentSendOffre", socket.id, message);
  });
  socket.on("studentCandidate", (id, message) => {
    socket.to(id).emit("studentCandidate", socket.id, message);
  });

  socket.on("teacherCandidate", (id, message) => {
    socket.to(id).emit("teacherCandidate", socket.id, message);
  });

  socket.on("disconnect", () => {
    socket.to(broadcaster).emit("disconnectPeer", socket.id);
  });
});
server.listen(port, () => console.log(`Server is running on port ${port}`));
