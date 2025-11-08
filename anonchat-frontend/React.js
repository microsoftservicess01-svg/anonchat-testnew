function connectById() {
  const myId = prompt("Enter your ID");
  const friendId = prompt("Enter your friend's ID");
  socket.emit("register", myId);
  socket.emit("connect-user", friendId);
}
