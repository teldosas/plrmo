const $ = require('jquery');
require('bootstrap');
const _ = require('underscore');
global.jQuery = $;
require('bootstrap-input-spinner');

var socket = io(location.pathname);
var numOfPlayers;

$('#leak input').focus();

socket.on('deal', (hand) => {
  $('#leakedNames').html('');
  if (hand.error) {
    $('#role').html(hand.error);
    return;
  }
  $('#role').html($('<img>').
    attr('src', hand.role.img).
    attr('alt', hand.role.title)).
    removeClass('col-12').
    addClass('col-6');

  $('#power').html($('<img>').
    attr('src', hand.power.img)).
    addClass('col-6');

  if (hand.role.leakName) {
    socket.emit('leak', $('#leak input').val());
  }
  $('#leak').fadeOut(1000);
});

socket.on('leak', ({title, name, evil}) => {
  const time = 20;
  var timeLeft = time;
  const html = `<strong>${title}:</strong> ${name} <div class="float-right">${timeLeft--}</div>`;
  const leakDiv = $('<div>').html(html).addClass(`alert alert-${evil?'danger':'success'}`)
  $('#leakedNames').append(leakDiv);
  const interval = setInterval(() => leakDiv.children('div').text(timeLeft--), 1000)
  setTimeout(() => {
    clearInterval(interval);
    leakDiv.fadeOut(2000, () => leakDiv.remove());
  }, time * 1000);
});

socket.on('players-change', (msg) => {
  document.querySelector('#numOfPlayers').innerHTML = 'Παίκτες: ' + msg;
  numOfPlayers = msg;
});
$('input[type=number]').inputSpinner()

const getNums = () => {
  const nums = {};

  const rawNums = $('input[type=number]').toArray().map(e => [e.getAttribute('id'), e.value]);
  rawNums.forEach(n => nums[n[0]] = parseInt(n[1]));
  return nums;
}

$('form#deal').submit(e => {
  e.preventDefault();
  socket.emit('deal', getNums());
});

socket.on('num-change', (msg) => {
  $(`#${msg[0]}`).val(msg[1]);
});

$('input[type=number]').change(e => {
  const numOfRoles = _.values(getNums()).reduce((acc, e) => acc+e, 0);
  const diff = numOfPlayers - numOfRoles
  if (diff < 0) {
    $(e.target).val(parseInt(e.target.value) + diff);
    return;
  }

  socket.emit('num-change', [e.target.getAttribute('id'), e.target.value])
});
