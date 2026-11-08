const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
let phones = {};
io.on('connection', (socket) => {
  socket.on('register-phone', (data) => {
    phones[data.code] = { socketId: socket.id, password: data.password };
    socket.emit('registered', { ok: true });
  });
  socket.on('join-pc', (data) => {
    let phone = phones[data.code];
    if (!phone) { socket.emit('error', { msg: 'الكود ما كاينش!' }); return; }
    if (phone.password !== data.password) { socket.emit('error', { msg: 'كلمة السر غالطة!' }); return; }
    socket.join('room-' + data.code);
    io.to(phone.socketId).emit('pc-connected');
    socket.emit('joined', { ok: true });
  });
  socket.on('photos-list', (data) => {
    io.to('room-' + data.code).emit('photos-list', data);
  });
  socket.on('request-photo', (data) => {
    let phone = phones[data.code];
    if (phone) io.to(phone.socketId).emit('request-photo', data);
  });
  socket.on('photo-data', (data) => {
    io.to('room-' + data.code).emit('photo-data', data);
  });
  socket.on('disconnect', () => {
    for (let code in phones) {
      if (phones[code].socketId === socket.id) delete phones[code];
    }
  });
});
app.get('/', (req, res) => { res.send('SOGTANA Cloud خدامة!'); });
server.listen(process.env.PORT || 10000, () => console.log('Server خدام!'));
