function makeCode(aliases, execCode){
  return `// Generated by newcommand.js
exports.aliases = ${aliases};

exports.execute = function(bot, msg, suffix){${execCode}
}`;
}

exports.aliases = ["newcommand", "createcommand", "nc"];

exports.execute = function(bot, msg, suffix){
  var re = /(.*?) (\[.*?\]) ?((?:.|[\r\n])*)/;
  suffix.match(re);
  var command_name = RegExp.$1;
  var aliases = RegExp.$2;
  var execCode = RegExp.$3
                .replace(/respond\((.*?)\);/g, "msg.channel.sendMessage($1)")
                .split("\n")
                .map(s => `  ${s}`)
                .join("\n");

  var code = makeCode(aliases, execCode);
  bot.Utils.createFile(`commands/${command_name}.js`, code)
    .then(() => {
      bot.Utils.updateCommandList();
    });
}