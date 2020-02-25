'use script';

let clearMessage = () => {
   setTimeout(function () {
      $('.feedback-html').remove()
   }, 1000)
};

$(document).ready(function () {
   let socket = io.connect('http://localhost:4000');
   let user_message = $('#users-message');
   let message = $('#message');
   let comment = $('#comment');
   message.on('click', function () {
      //console.log($('#comment').val())
      socket.emit('new_message', {message: comment.val()});
      comment.val('');
   });

   socket.on('new_message', (data) => {
      user_message.append('<p class="message">' +data.username + ': ' + data.message +'</p>')
   });

   comment.bind('keypress', () => {
      socket.emit('typing')
   });
   socket.on('typing', (data) => {
      $('.feedback').html('<p class="feedback-html">' +  data.username + 'is typing...' + '</p>');
      clearMessage();
   })
});