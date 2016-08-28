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
			else resolve();
		});
	});
}

exports.loadData = function(name){
	return new Promise((resolve, reject) => {
		exports.getJSON(`data/${name}.json`)
			.then(resolve)
			.catch(reject);
	});
}

exports.saveData = function(name, object){
	return new Promise((resolve, reject) => {
		exports.saveJSON(`data/${name}.json`, object)
			.then(resolve)
			.catch(reject);
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
		}).catch(reject);
	});
}

exports.updateCommandList = function(){
	return new Promise((resolve, reject) => {
		fs.readdir("commands", (err, dir) => {
			if(err) reject(err);
			var command_names = dir.filter(p => p.endsWith(".js")).map(p => p.slice(0, -3));
			var jsonObject = {};
			for(let name of command_names){
				jsonObject[name] = require(`./commands/${name}.js`).aliases;
			}

			exports.saveJSON("commands/command_list.json", jsonObject).then(() => {
	  		console.log("- Updated Command List -");
	  		resolve();
			}).catch(console.log);
		});
	});
}

exports.createFile = function(path, content){
	return new Promise((resolve, reject) => {
		fs.writeFile(path, content, (err) => {
			if(err) reject(err);
			else resolve();
		});
	});
}

exports.codeblock = function(lang, content){
	if(!content){
		content = lang;
		lang = "";
	}

	return "```" + lang + "\n" + content + "```";
}

function setPrefix(msg, prefix){
	return new Promise((resolve, reject) => {
		this.PrefixConfig.prefixes[exports.channelOrGuildID(msg)] = prefix;
		msg.channel.sendMessage(`Set prefix to ${prefix}`).then(resolve).catch(reject);
	});
}

function getPrefix(msg){
	return this.PrefixConfig.prefixes[exports.channelOrGuildID(msg)] || this.PrefixConfig.defaultPrefix;
}

exports.addSomeFunctionsToBot = function(bot){
	bot.getPrefix = getPrefix;
	console.log("Added getPrefix to bot");
	bot.setPrefix = setPrefix;
	console.log("Added setPrefix to bot");
}

exports.channelOrGuildID = function(msg){
	return !msg.guild ? msg.channel.id : msg.guild.id;
}