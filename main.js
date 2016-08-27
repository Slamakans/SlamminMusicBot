const Discord = require('discord.js');
const bot = new Discord.Client();
bot.on("ready", () => {
	console.log(`Bot is logged in and ready!`);
})
.on("disconnected", () => {
	console.log(`Bot disconnected`);
	throw "Bot disconnected";
})
.on("message", (msg) => {
	var prefix = bot.getPrefix(msg);
	var lowerCase = msg.content.toLowerCase();

	if(lowerCase.startsWith(prefix)){
		let identifier = lowerCase.replace(prefix, "").split(" ")[0];
		let suffix = msg.content.replace(`${prefix}${identifier}`, "").trim();
		let flags = {};
		suffix = suffix ? suffix : undefined;
		if(suffix){
			let matches = suffix.match(/--(.*?)(?=\s--|$)/gi);
			if(matches)
				for(let match of matches){
					flags[match.split(" ")[0].toLowerCase().slice(2)] = match.split(" ")[1] || true;
				}
		}

		if(bot.Utils.commandExists(identifier)){
			bot.Utils.getCommand(identifier)
				.then(command => {
					if(flags["delay"]){
						setTimeout(command.execute.bind(command, bot, msg, suffix), flags["delay"]);
					}else{
						command.execute(bot, msg, suffix);
					}
				});
		}
	}
});

bot.Utils = require('./utils.js');
bot.Utils.addSomeFunctionsToBot(bot);

bot.Utils.getJSON('prefix_config.json')
	.then(object => {
		bot.PrefixConfig = object;
		bot.log = bot.Utils.log;

		bot.Utils.updateCommandList();
	})
	.then(() => {
		bot.Utils.getJSON("config.json")
			.then(object => {
				bot.Config = object;
				bot.login(bot.Config.auth.token);
			}).catch(console.log);
	});