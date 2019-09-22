const io = require('./main');
const EventEmitter = require('events');
const emitter = new EventEmitter();
emitter.setMaxListeners(100);
const DataHandler = require('./DataHandler');
const GameManager = require('./GameManager');
const textData = require('./typography');
DataHandler.addData('room', 'Lobby', {});

const socketHandler = socket => {
  socket.on('authenticate', (nickname, cb) => {
    const { error, message } = DataHandler.addData('user', nickname, socket.id);
    if (!error) {
      socket.join('Lobby');
      DataHandler.updateData('room', 'Lobby', nickname);
      DataHandler.updateData('user', nickname, 'Lobby');
      const userData = DataHandler.getData('users', nickname);
      cb({ error: false, userData, message: `` });
      io.sockets.to('Lobby').emit('displayPlayers', DataHandler.getData('users'));
      io.sockets.to('Lobby').emit('displayRooms', DataHandler.getData('rooms'));
      io.sockets.emit('syncMessages', DataHandler.getData('messages'));
    } else {
      cb({ error, message });
    }
  });

  socket.on('signOut', nickname => {
    const userData = DataHandler.getData('users', nickname);
    if (userData.room !== 'Lobby') {
      const PlayRoom = GameManager.getPlayRoom(userData.room);
      const player = PlayRoom.players.find(item => item.nickname === userData.name);
      const targetRoom = DataHandler.getData('rooms', userData.room);
      if (PlayRoom.gameInProgress && !player.active) {
        GameManager.deletePlayerFromRoom(userData);
      } else {
        GameManager.deletePlayerFromRoom(userData);
        PlayRoom.resetSettings();
        PlayRoom.lastPlayer = undefined;
        io.sockets.to(userData.room).emit('endGame');
        io.sockets.to(userData.room).emit('syncData', PlayRoom);
      }
      DataHandler.deleteData('user', nickname);
      if (targetRoom.users.length === 0) {
        DataHandler.deleteData('room', userData.room);
      }
      PlayRoom.checkVacantSpots();
    } else {
      DataHandler.deleteData('user', nickname);
    }
    socket.leave(userData.room);
    io.sockets.to('Lobby').emit('displayPlayers', DataHandler.getData('users'));
    io.sockets.to('Lobby').emit('displayRooms', DataHandler.getData('rooms'));
  });

  socket.on('sendMessage', ({ message, name }) => {
    DataHandler.addData('message', message, name);
    io.sockets.emit('syncMessages', DataHandler.getData('messages'));
  });

  socket.on('disconnect', () => {
    const userData = DataHandler.getData('users').find(item => item.id === socket.id);
    if (userData) {
      if (userData.room !== 'Lobby') {
        const PlayRoom = GameManager.getPlayRoom(userData.room);
        const Player = PlayRoom.players.find(item => item.nickname === userData.user);
        if (PlayRoom.gameInProgress && !Player.active) {
          GameManager.deletePlayerFromRoom(userData);
        } else {
          GameManager.deletePlayerFromRoom(userData);
          PlayRoom.resetSettings();
          PlayRoom.lastPlayer = undefined;
          io.sockets.to(userData.room).emit('endGame');
          io.sockets.to(userData.room).emit('syncData', PlayRoom);
        }
        PlayRoom.checkVacantSpots();
        DataHandler.deleteData('user', userData.user);
        if (PlayRoom.users.length === 0) {
          DataHandler.deleteData('room', userData.room);
        }
      } else {
        DataHandler.deleteData('user', userData.user);
      }
      socket.leave(userData.room);
      io.sockets.to('Lobby').emit('displayPlayers', DataHandler.getData('users'));
      io.sockets.to('Lobby').emit('displayRooms', DataHandler.getData('rooms'));
    }
  });

  socket.on('createRoom', ({ roomName, nickname, password, access, players, cards }) => {
    const userData = DataHandler.getData('users', nickname);
    socket.leave(userData.room);
    const room = DataHandler.getData('rooms', userData.room);
    room.users = room.users.filter(item => item !== nickname);
    socket.join(roomName);
    DataHandler.addData('room', roomName, { password, access, players, cards });
    DataHandler.updateData('room', roomName, nickname);
    DataHandler.updateData('user', nickname, roomName);
    GameManager.createGameRoom(Number(players), Number(cards), roomName);
    GameManager.getPlayRoom(roomName).addUser(nickname, socket.id);
    io.sockets.to('Lobby').emit('displayPlayers', DataHandler.getData('users'));
    io.sockets.to('Lobby').emit('displayRooms', DataHandler.getData('rooms'));
  });

  socket.on('joinRoom', (roomName, nickname) => {
    const userData = DataHandler.getData('users', nickname);
    socket.leave(userData.room);
    const room = DataHandler.getData('rooms', userData.room);
    room.users = room.users.filter(item => item !== nickname);
    socket.join(roomName);
    DataHandler.updateData('room', roomName, nickname);
    DataHandler.updateData('user', nickname, roomName);
    io.sockets.to('Lobby').emit('displayPlayers', DataHandler.getData('users'));
    io.sockets.to('Lobby').emit('displayRooms', DataHandler.getData('rooms'));
    const PlayRoom = GameManager.getPlayRoom(roomName);
    PlayRoom.addUser(nickname, socket.id);
    PlayRoom.checkVacantSpots();
    if (PlayRoom.isFull) {
      io.sockets.to(roomName).emit('readyStage', PlayRoom);
    }
  });

  socket.on('ready', nickname => {
    const userData = DataHandler.getData('users', nickname);
    const PlayRoom = GameManager.getPlayRoom(userData.room);
    PlayRoom.getUser(nickname).activateUser();
    PlayRoom.checkUsersReady();
    PlayRoom.checkVacantSpots();
    if (PlayRoom.usersReady && PlayRoom.isFull) {
      PlayRoom.dealCards();
      io.sockets.to(userData.room).emit('syncData', PlayRoom);
      io.sockets.to(userData.room).emit('defineMove');
    }
  });

  socket.on('initCard', (nickname, cardData) => {
    const userData = DataHandler.getData('users', nickname);
    GameManager.getPlayRoom(userData.room).getUser(nickname).curCard = cardData;
  });

  socket.on('makeOffenceMove', (nickname, placeIndex) => {
    const userData = DataHandler.getData('users', nickname);
    const PlayRoom = GameManager.getPlayRoom(userData.room);
    PlayRoom.placeIndex = placeIndex;
    PlayRoom.makeOffenceMove();
    io.sockets.to(userData.room).emit('syncData', PlayRoom);
    if (!PlayRoom.endGame.state) {
      io.sockets.to(userData.room).emit('defineMove');
    } else {
      io.sockets.to(userData.room).emit('endGame');
      setTimeout(() => {
        if (PlayRoom.users.length === PlayRoom.playersNumber) {
          PlayRoom.resetSettings();
          io.sockets.to(userData.room).emit('readyStage', PlayRoom);
        }
      }, 5000);
    }
  });

  socket.on('makeDefenceMove', (nickname, placeIndex) => {
    const userData = DataHandler.getData('users', nickname);
    const PlayRoom = GameManager.getPlayRoom(userData.room);
    PlayRoom.placeIndex = placeIndex;
    PlayRoom.makeDefenceMove();
    io.sockets.to(userData.room).emit('syncData', PlayRoom);
    if (!PlayRoom.endGame.state) {
      io.sockets.to(userData.room).emit('defineMove');
    } else {
      io.sockets.to(userData.room).emit('endGame');
      setTimeout(() => {
        if (PlayRoom.users.length === PlayRoom.playersNumber) {
          PlayRoom.resetSettings();
          io.sockets.to(userData.room).emit('readyStage', PlayRoom);
        }
      }, 5000);
    }
  });

  socket.on('takeOrDiscard', (nickname, value) => {
    const userData = DataHandler.getData('users', nickname);
    const PlayRoom = GameManager.getPlayRoom(userData.room);
    PlayRoom.takeCards(value);
    io.sockets.to(userData.room).emit('syncData', PlayRoom);
    io.sockets.to(userData.room).emit('defineMove');
  });

  socket.on('interPhase', nickname => {
    const userData = DataHandler.getData('users', nickname);
    const PlayRoom = GameManager.getPlayRoom(userData.room);
    PlayRoom.interPhase = true;
    PlayRoom.countCardsToTake();
    if (PlayRoom.curPlayer.active) {
      PlayRoom.defineMove(true, false, 'offence', 'defence');
      io.sockets.to(userData.room).emit('syncData', PlayRoom);
      io.sockets.to(userData.room).emit('defineMove');
      io.sockets.to(userData.room).emit('startTimer', PlayRoom.curPlayer);
      io.sockets.to(userData.room).emit('logMessages', PlayRoom.logMessages);
      setTimeout(() => {
        PlayRoom.takeCards(true);
        io.sockets.to(userData.room).emit('syncData', PlayRoom);
        io.sockets.to(userData.room).emit('defineMove');
      }, 5000);
    } else {
      PlayRoom.takeCards(true);
      io.sockets.to(userData.room).emit('syncData', PlayRoom);
      io.sockets.to(userData.room).emit('defineMove');
    }
  });

  socket.on('changeLanguage', (lng, cb) => {
    if (lng) {
      cb({ type: 'CHANGE_LANGUAGE', payload: textData.english });
    } else {
      cb({ type: 'CHANGE_LANGUAGE', payload: textData.russian });
    }
  });
};

module.exports = socketHandler;
