var Utils = require("./utils.js");
var ytdl = require('ytdl-core');
const dataFile = "music_queue";

var playing = {};
var bot;
exports.setBot = function(botClient){
  bot = botClient;
}

exports.getQueues = function(){
  return new Promise(resolve => {
    Utils.loadData(dataFile)
      .then(resolve)
      .catch(() => resolve({}));
  });
}

exports.addToQueue = function(msg, url){
  return new Promise(() => {
    exports.getQueues().then(queues => {
      queues[Utils.channelOrGuildID(msg)] = queues[Utils.channelOrGuildID(msg)] || [];
      queues[Utils.channelOrGuildID(msg)].push(url);
      console.log(queues);
      Utils.saveData(dataFile, queues)
        .then(() => {
          msg.channel.sendMessage(`\`Added #${queues[Utils.channelOrGuildID(msg)].length}\`\n${Utils.codeblock(url)}`)
            .catch(() => reject("Response message failed to send"));
        })
        .then(() => {
          if(!exports.isPlaying(msg)){
            exports.startPlaying(msg);
          }
        })
        .catch(console.log);
    });
  });
}

exports.removeFromQueue = function(msg, url, type){
  return new Promise((resolve, reject) => {
    exports.getQueues().then(queues => {
      if((queues[Utils.channelOrGuildID(msg)] || []).length > 0){
        var index;
        if(url.match(/^\d+$/)){
          index = url - 1;
        }else index = queues[Utils.channelOrGuildID(msg)].indexOf(url);

        queues[Utils.channelOrGuildID(msg)].splice(index, 1);
        Utils.saveData(dataFile, queues)
          .then(() => {
            msg.channel.sendMessage(`\`${type ? type : "Removed #" + (index+1)}\`\n${Utils.codeblock(url)}`)
              .then(resolve)
              .catch(() => reject("Response message failed to send"));
          })
          .catch(console.log);
        }else{
          reject("No songs left in queue");
        }
    });
  });
}

exports.join = function(msg){
  return new Promise((resolve, reject) => {
    if(!msg.guild){
      reject("Can't use ´join´ in DM");
    }else{
      var guildMember = msg.guild.member(msg.author);
      var vcID = guildMember.voiceChannelID;
      var vc = msg.guild.channels.get(vcID);
      if(vc){
        vc.join().then(resolve).catch(console.log);
      }else reject("You're not in a voice channel");
    }
  });
}

exports.startPlaying = function(msg){
  console.log(exports.isPlaying(msg));
  if(exports.isPlaying(msg)){
    msg.channel.sendMessage("Already playing.").catch(console.log);
    return;
  }

  var connection = bot.voiceConnections.get(msg.guild.id);
  if(!connection){
    exports.join(msg).then(exports.startPlaying.bind(undefined, msg)).catch(msg.channel.sendMessage.bind(msg.channel));
  }else{
    playing[msg.guild.id] = true;
    exports.playNextSong(msg, connection);
  }
}

exports.playNextSong = function(msg, connection){
  exports.getNextSong(msg)
    .then((url) => {
      //var info = ytdl.getInfo(url, (err, info) => {console.log(info.formats)});

      var stream = ytdl(url, {filter: (format) => /*format.audioEncoding === "opus" ||*/ format.audioBitrate <= 48 /*|| format.type.startsWith("audio/webm")*/});
      connection.playStream(stream)
        .on("end", () => {
          exports.playNextSong(connection);
        });
    })
    .catch((err) => {
      msg.channel.sendMessage(err);
      playing[msg.guild.id] = false;
    });
}

exports.getNextSong = function(msg){
  return new Promise(resolve => {
    exports.getQueues().then((queues) => {
      if((queues[msg.guild.id] || []).length > 0){
        let url = queues[msg.guild.id].shift();
        exports.removeFromQueue(msg, url, "Playing");
        resolve(url);
      }else{
        reject("No songs left in queue, stopping");
      }
    });
  });
}

exports.isPlaying = function(msg){
  return !!playing[msg.guild.id];
}