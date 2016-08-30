require('easy-profiler');
EP.begin("startup");
const Discord = require('discord.js');
const bot = new Discord.Client();
bot.on("ready", () => {
	EP.end("startup", true);
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
			if(matches){
				for(let match of matches){
					flags[match.split(" ")[0].toLowerCase().slice(2)] = match.split(" ")[1] || true;
				}

				suffix = suffix.replace(/--(.*?)(?=\s--|$)/gi, "").trim();
			}
		}

		if(bot.Utils.commandExists(identifier)){
			bot.Utils.getCommand(identifier)
				.then(command => {
					function run(){
						command.execute(bot, msg, suffix)
							.then(() => {
								bot.Utils.aliasToIdentifier(identifier).then((id) => bot.log(`${msg.author.username} executed ${id}`));
								EP.end(identifier);
							})
							.catch((err) => {
								msg.channel.sendMessage(err);
								EP.end(identifier);
							});
					}
					
					EP.begin(identifier);
					if(flags["delay"]){
						setTimeout(run, flags["delay"]);
					}else{
						run();
					}
				});
		}
	}
});

bot.Utils = require('./utils.js');
bot.Utils.addSomeFunctionsToBot(bot);

bot.Music = require('./music2.js');
bot.Music.setBot(bot);

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


process.on("uncaughtException", (err) => {
	console.log(`Caught an exception: ${err.stack}`);
});

bot.on("error", console.log);
bot.on("warn", console.log);
bot.on("debug", console.log);