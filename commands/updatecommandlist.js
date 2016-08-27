exports.aliases = ["ucl", "reloadcommandlist", "rcl"];

exports.execute = function(bot, msg, suffix){
  bot.Utils.updateCommandList();
}