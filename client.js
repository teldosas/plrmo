const $ = require('jquery');
require('bootstrap');
const _ = require('underscore');
global.jQuery = $;
require('bootstrap-input-spinner');

var socket = io();
var numOfPlayers;

socket.on('deal', (hand) => {
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

$('form').submit(e => {
  e.preventDefault();
  socket.emit('deal', getNums());
});

socket.on('num-change', (msg) => {
  $(`#${msg[0]}`).val(msg[1]);
});

var callBackId;
$('input[type=number]').change(e => {
  const numOfRoles = _.values(getNums()).reduce((acc, e) => acc+e, 0);
  const diff = numOfPlayers - numOfRoles
  if (diff < 0) {
    $(e.target).val(parseInt(e.target.value) + diff);
    return;
  }
  clearTimeout(callBackId);
  socket.emit('num-change', [e.target.getAttribute('id'), e.target.value])
})
