var fs = require('fs');

exports.getJSON = function(path){
	return new Promise((resolve, reject) => {
		fs.readFile(path, (err, data) => {
			if(err) reject(err);
			else resolve(JSON.parse(data.toString()));
		});
	});
}

exports.saveJSON = function(path, jsonObject){
	return new Promise((resolve, reject) => {
		fs.writeFile(path, JSON.stringify(jsonObject, null, 4), (err) => {
			if(err) reject(err);
			resolve();
		});
	});
}

exports.timeOfDay = function(unix_timestamp){
	return new Date(unix_timestamp).toUTCString().replace(/.*?(\d{2}:)/, "$1").replace(/(\d)\s.*?$/, "$1");
}

exports.log = function(s){
	var time = exports.timeOfDay(Date.now());
	console.log(`[${time}] ${s}`);
}

exports.aliasToIdentifier = function(alias){
	return new Promise(resolve => {
		exports.getJSON("commands/command_list.json")
			.then(commandList => {
				if(commandList[alias]) return resolve(alias);

				for(let key in commandList){
					if(~commandList[key].indexOf(alias)){
						resolve(key);
					}
				}

				resolve(undefined);
			});
	});
}

exports.commandExists = function(aliasOrIdentifier){
	return new Promise(resolve => {
		exports.aliasToIdentifier(aliasOrIdentifier)
			.then((identifier) => {
				if(identifier) resolve(true);
				else resolve(false);
			});
	});
}

exports.getCommand = function(aliasOrIdentifier){
	return new Promise((resolve, reject) => {
		exports.aliasToIdentifier(aliasOrIdentifier).then(identifier => {
			if(identifier){
				let path = `./commands/${identifier}.js`
				delete require.cache[require.resolve(path)];
				resolve(require(path));
			}else{
				reject(`Invalid command: ${aliasOrIdentifier}`);
			}
		});
	});
}

exports.updateCommandList = function(){
	fs.readdir("commands", (err, dir) => {
		var command_names = dir.filter(p => p.endsWith(".js")).map(p => p.slice(0, -3));
		var jsonObject = {};
		for(let name of command_names){
			jsonObject[name] = require(`./commands/${name}.js`).aliases;
		}
		exports.saveJSON("commands/command_list.json", jsonObject);
  	console.log("- Updated Command List -");
	});
}

exports.createFile = function(path, content){
	return new Promise((resolve, reject) => {
		fs.writeFile(path, content, (err) => {
			if(err) reject(err);
			resolve();
		});
	});
}

function setPrefix(msg, prefix){
	this.PrefixConfig.prefixes[msg.isPrivate ? msg.channel.id : msg.guild.id] = prefix;
	msg.channel.sendMessage(`Set prefix to ${prefix}`);
}

function getPrefix(msg){
	return this.PrefixConfig.prefixes[msg.isPrivate ? msg.channel.id : msg.guild.id] || this.PrefixConfig.defaultPrefix;
}

exports.addSomeFunctionsToBot = function(bot){
	bot.getPrefix = getPrefix;
	console.log("Added getPrefix to bot");
	bot.setPrefix = setPrefix;
	console.log("Added setPrefix to bot");
}