exports.aliases = ["p", "pingaling"];

exports.execute = function(bot, msg, suffix){
	msg.channel.sendMessage("ping!").catch(bot.log);
}