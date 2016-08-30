var Utils = require("./utils.js");
var ytdl = require('ytdl-core');
const dataFile = "music_queue";

var dispatchers = {};
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
      queues[msg.guild.id] = queues[msg.guild.id] || [];
      queues[msg.guild.id].push({url: url, voiceChannelID: msg.guild.member(msg.author).voiceChannelID});
      console.log(queues);
      Utils.saveData(dataFile, queues)
        .then(() => {
          msg.channel.sendMessage(`\`Added to position #${queues[msg.guild.id].length}\`\n${Utils.codeblock(url)}`)
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
      if((queues[msg.guild.id] || []).length > 0){


        var index;
        if(url.match(/^\d+$/)){
          index = url - 1;
          url = queues[msg.guild.id][index].url;
        }else index = queues[msg.guild.id].map(song => song.url).indexOf(url);
        console.log(index);

        queues[msg.guild.id].splice(index, 1);
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
      exports.joinById(guildMember.voiceChannelID)
        .then(resolve)
        .catch(() => {reject("You're not in a voice channel")});
    }
  });
}

exports.joinById = function(vcID){
  return new Promise((resolve, reject) => {
    var conn = bot.voiceConnections.array().find(vc => vc.channel.id === vcID);
    var vc = bot.channels.array().find(c => c.id === vcID);

    if(conn){
      // Is already connected to voice channel
      resolve(conn);
    }else if(vc){
      // Join voice channel if found
      vc.join().then(resolve).catch(reject);
    }else{
      reject("That's not a valid voice channel");
    }
  });
}

exports.startPlaying = function(msg){
  console.log(exports.isPlaying(msg));
  if(exports.isPlaying(msg)){
    msg.channel.sendMessage("Already playing.").catch(console.log);
    return;
  }

  exports.join(msg).then(exports.playNextSong.bind(exports, msg)).catch(msg.channel.sendMessage.bind(msg.channel));
}

exports.playNextSong = function(msg){
  // connection.playFile("test.mp3"); // works
  exports.getNextSong(msg)
    .then((next) => {
      //var info = ytdl.getInfo(url, (err, info) => {console.log(info.formats)});
      //var url = next.url;

      exports.joinById(next.voiceChannelID)
        .then(conn => {
          var stream = ytdl(next.url, {filter: f => (f.audioBitrate > 0 && !f.bitrate) || f.audioBitrate > 0});

          dispatchers[msg.guild.id] = conn.playStream(stream);
          dispatchers[msg.guild.id].once("end", () => {
              console.log("Playing next song");
              exports.playNextSong(msg);
            })
        })
        .catch(console.log);
    })
    .catch(msg.channel.sendMessage.bind(msg.channel));
}

exports.skip = function(msg){
  if(!dispatchers[msg.guild.id]) return;
  dispatchers[msg.guild.id].end();
  exports.playNextSong(msg);
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
  return !!(dispatchers[msg.guild.id] || {}).speaking;
}