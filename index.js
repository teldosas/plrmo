const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const _ = require('underscore');

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + 'public/index.html');
});

io.on('connection', socket => {
  const numOfPlayers = Object.keys(io.sockets.sockets).length;
  console.log('a user connected ' + numOfPlayers);

  io.emit('players-change', numOfPlayers);

  socket.on('num-change', msg => {
    // WARNING!!! XSS vulnerability
    io.emit('num-change', msg);
  });

  socket.on('deal', ({numOfSecretMurderers, numOfKnownMurderers, numOfDetectives, numOfHealers, numOfBigBosses}) => {
    const nums = [numOfSecretMurderers, numOfKnownMurderers, numOfDetectives, numOfHealers, numOfBigBosses];
    const roleNames = ['Κρυφός Δολοφόνος', 'Φανερός Δολοφόνος', 'Ντετέκτιβ', 'EKAB', 'Μεγάλο Αφεντικό', 'Πολίτης'];
    const socketIds = Object.keys(io.sockets.sockets);
    const numOfSpecialRoles = nums.reduce((sum, n) => sum + n, 0);
    const numOfCitizens = socketIds.length - numOfSpecialRoles;

    if (numOfCitizens < 0) {
      io.emit('roles', '!!! Πολλοι ρόλοι');
      return;
    }

    nums.push(numOfCitizens);

    const roles = [];
    roleNames.forEach((role, i) => {
      Array.prototype.push.apply(roles, Array(nums[i]).fill(role));
    });

    const shuffledRoles = _.shuffle(roles);
    _.shuffle(socketIds).forEach((socketId, i) => {
      io.to(socketId).emit('roles', shuffledRoles[i]);
    });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
      const numOfPlayers = Object.keys(io.sockets.sockets).length;
      io.emit('players-change', numOfPlayers);
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log('listening on *:3000');
});
