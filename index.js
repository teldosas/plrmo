const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const _ = require('underscore');
const shortid = require('shortid');

const stateStore = new WeakMap();

app.use(express.static('public'));

app.get('/new', (req, res) => {
  res.redirect(`/${shortid.generate()}`)
});

app.get('/:gameId', (req, res) => {
  res.sendFile(__dirname + '/public/game.html');
});

io.of(/^\/[A-Za-z0-9-_]+$/).on('connection', socket => {
  const nsp = socket.nsp;
  if (!stateStore.has(nsp)) {
    stateStore.set(nsp, {});
  }
  const state = stateStore.get(nsp);
  const numOfPlayers = Object.keys(nsp.sockets).length;
  console.log(`${nsp.name}:a user connected ${numOfPlayers}`);


  nsp.emit('players-change', numOfPlayers);

  socket.on('num-change', msg => {
    // WARNING!!! XSS vulnerability
    nsp.emit('num-change', msg);
  });

  const roleProps = {
    SecretMurderer: {
      title: 'Κρυφός Κλέφτης',
      knownBy: ['KnownMurderer', 'BigBoss', 'SecretMurderer'],
      evil: true,
    }, KnownMurderer: {
      title:'Φανερός Κλέφτης',
      knownBy: ['Detective', 'SecretMurderer', 'BigBoss', 'KnownMurderer'],
      evil: true,
    }, Detective: {
      title: 'Ντετέκτιβ',
      knownBy: ['Detective'],
    }, Healer: {
      title: 'EKAB',
    }, BigBoss: {
      title: 'Μεγάλο Αφεντικό',
      knownByPower: ['TheX-Agent'],
      evil: true,
    }, Citizen: {
      title: 'Πολίτης',
    },
  };
  socket.on('deal', ({numOfSecretMurderers, numOfKnownMurderers, numOfDetectives, numOfHealers, numOfBigBosses}) => {
    const nums = [numOfSecretMurderers, numOfKnownMurderers, numOfDetectives, numOfHealers, numOfBigBosses];
    const roles = ['SecretMurderer', 'KnownMurderer', 'Detective', 'Healer', 'BigBoss', 'Citizen'];
    const powersOrderedByImportance = [
      'Helmet', 'TheDetectiveLens', 'TheDoctor', 'TheMayor', 'TheBarber', 'Indecisive', 'TheTrip',
      'TheComeback', 'TheX-Agent', 'DoubleVote', 'ThePhonecall', 'TheAmbassador', 'TheWill', 'TheKey',
      'TheParaphernalia', 'TheProof', 'TheFingerprint', 'ThePhone', 'TheHiddenAssistant', 'TheWarrant'
    ];
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

    const powersToDeal = _.take(powersOrderedByImportance, socketIds.length);

    const shuffledRoles = _.shuffle(rolesToDeal);
    const shuffledPowers = _.shuffle(powersToDeal);
    const socketRoleMap = state.socketRoleMap = {};
    _.shuffle(socketIds).forEach((socketId, i) => {
      const role = shuffledRoles[i];
      const power = shuffledPowers[i];
      const numOfKnownBy = _.chain(roles).object(nums).
        pick(roleProps[role].knownBy).values().
        reduce((acc, n) => acc+n, 0).value();
      const hand = {
        role: {
          img: `/images/roles/${role}.png`,
          title: roleProps[role].title,
          leakName: numOfKnownBy > 1 || !!roleProps[role].knownByPower
        }, power: {
          img: `/images/powers/${power}.png`
        }
      }
      nsp.to(socketId).emit('deal', hand);
      socketRoleMap[socketId] = {role, power};
    });
  });

  socket.on('leak', name => {
    const socketRoleMap = state.socketRoleMap;
    const role = socketRoleMap[socket.id].role;
    const knownBy = roleProps[role].knownBy || [];
    const knownByPower = roleProps[role].knownByPower || [];

    const recipients = _.chain(socketRoleMap).
      omit(socket.id).
      pick(({role, power}) => {
        return knownBy.includes(role) || knownByPower.includes(power);
      }).keys().value();

    const {title, evil} = roleProps[role];
    recipients.forEach(socketId => {
      nsp.to(socketId).emit('leak', {name, role, title, evil});
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
