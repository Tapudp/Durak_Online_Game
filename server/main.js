// const http = require('http').createServer();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;
console.log('creating server');
app.use(express.static('public'));
const server = app.listen(PORT, () => {
  console.log(`Connected to port ${PORT}`);
});
const io = (module.exports = require('socket.io')(server));
const socketHandler = require('./socketHandler');
io.on('connection', socketHandler);
