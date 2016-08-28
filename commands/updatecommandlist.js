exports.aliases = ["ucl", "reloadcommandlist", "rcl"];

exports.execute = function(bot, msg, suffix){
  return new Promise((resolve, reject) => bot.Utils.updateCommandList().then(resolve));
}