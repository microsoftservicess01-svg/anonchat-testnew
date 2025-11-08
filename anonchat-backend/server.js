let users = {}; // userId -> socketId

io.on("connection", (socket) => {
  socket.on("register", (userId) => {
    users[userId] = socket.id;
    socket.emit("registered", { userId });
  });

  socket.on("connect-user", (targetId) => {
    const targetSocket = users[targetId];
    if (targetSocket) {
      io.to(targetSocket).emit("partner-found", socket.id);
      io.to(socket.id).emit("partner-found", targetSocket);
    } else {
      socket.emit("user-not-found");
    }
  });

  socket.on("disconnect", () => {
    for (const [id, sId] of Object.entries(users)) {
      if (sId === socket.id) delete users[id];
    }
  });
});
