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

  const roleProps = {
    SecretMurderer: {
      title: 'Κρυφός Δολοφόνος',
      knownBy: ['KnownMurderer', 'BigBoss', 'SecretMurderer']
    }, KnownMurderer: {
      title:'Φανερός Δολοφόνος',
      knownBy: ['Detective', 'SecretMurderer', 'BigBoss', 'KnownMurderer']
    }, Detective: {
      title: 'Ντετέκτιβ',
    }, Healer: {
      title: 'EKAB',
    }, BigBoss: {
      title: 'Μεγάλο Αφεντικό',
    }, Citizen: {
      title: 'Πολίτης',
    },
  }
  socket.on('deal', ({numOfSecretMurderers, numOfKnownMurderers, numOfDetectives, numOfHealers, numOfBigBosses}) => {
    const nums = [numOfSecretMurderers, numOfKnownMurderers, numOfDetectives, numOfHealers, numOfBigBosses];
    const roles = ['SecretMurderer', 'KnownMurderer', 'Detective', 'Healer', 'BigBoss', 'Citizen'];
    const powers = [
      'DoubleVote', 'Helmet',  'Indecisive',  'TheAmbassador', 'TheBarber', 'TheDetectiveLens',
      'TheHiddenAssistant', 'TheKey', 'TheMayor', 'TheParaphernalia', 'ThePhone', 'ThePhonecall',
      'TheProof', 'TheTrip', 'TheWill', 'TheX-Agent'
    ]
    const socketIds = Object.keys(io.sockets.sockets);
    const numOfSpecialRoles = nums.reduce((sum, n) => sum + n, 0);
    const numOfCitizens = socketIds.length - numOfSpecialRoles;

    if (numOfCitizens < 0) {
      io.emit('deal', { error: '!!! Πολλοι ρόλοι' });
      return;
    }

    nums.push(numOfCitizens);

    const rolesToDeal = [];
    roles.forEach((role, i) => {
      Array.prototype.push.apply(rolesToDeal, Array(nums[i]).fill(role));
    });

    const shuffledRoles = _.shuffle(rolesToDeal);
    const shufflePowers = _.shuffle(powers);
    _.shuffle(socketIds).forEach((socketId, i) => {
      const role = shuffledRoles[i];
      const power = shufflePowers[i];
      const hand = {
        role: {
          img: `/images/roles/${role}.png`,
          title: roleProps[role].title,
        }, power: {
          img: `/images/powers/${power}.png`
        }
      }
      io.to(socketId).emit('deal', hand);
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
