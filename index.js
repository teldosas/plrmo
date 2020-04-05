const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const _ = require('underscore');
const shortid = require('shortid')

app.use(express.static('public'));

app.get('/new', (req, res) => {
  res.redirect(`/${shortid.generate()}`)
});

app.get('/:gameId', (req, res) => {
  res.sendFile(__dirname + '/public/game.html');
});

io.of(/^\/[A-Za-z0-9-_]+$/).on('connection', socket => {
  const nsp = socket.nsp;
  const numOfPlayers = Object.keys(nsp.sockets).length;
  console.log(`${nsp.name}:a user connected ` + numOfPlayers);

  nsp.emit('players-change', numOfPlayers);

  nsp.on('num-change', msg => {
    // WARNING!!! XSS vulnerability
    nsp.emit('num-change', msg);
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
    const socketIds = Object.keys(nsp.sockets);
    const numOfSpecialRoles = nums.reduce((sum, n) => sum + n, 0);
    const numOfCitizens = socketIds.length - numOfSpecialRoles;

    if (numOfCitizens < 0) {
      nsp.emit('deal', { error: '!!! Πολλοι ρόλοι' });
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
      nsp.to(socketId).emit('deal', hand);
    });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
      const numOfPlayers = Object.keys(nsp.sockets).length;
      nsp.emit('players-change', numOfPlayers);
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log('listening on *:3000');
});
