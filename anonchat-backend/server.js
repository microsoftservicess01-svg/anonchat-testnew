import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

let waitingUser = null;

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  if (waitingUser) {
    const partnerId = waitingUser;
    io.to(socket.id).emit("partner-found", partnerId);
    io.to(partnerId).emit("partner-found", socket.id);
    waitingUser = null;
  } else {
    waitingUser = socket.id;
    socket.emit("waiting", "Looking for a partner...");
  }

  socket.on("offer", (data) => io.to(data.to).emit("offer", data));
  socket.on("answer", (data) => io.to(data.to).emit("answer", data));
  socket.on("ice-candidate", (data) => io.to(data.to).emit("ice-candidate", data));

  socket.on("disconnect", () => {
    if (waitingUser === socket.id) waitingUser = null;
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
