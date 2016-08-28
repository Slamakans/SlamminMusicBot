exports.aliases = ["p", "pingaling"];

exports.execute = function(bot, msg, suffix){
	return new Promise((resolve, reject) => {
    msg.channel.sendMessage(["Nice", "meme", "lad", "Ping!"][Math.floor(Math.random() * 4)]).then(resolve).catch(reject);
  });
}