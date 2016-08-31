var Utils = require("./utils.js");
var ytdl = require('ytdl-core');
const dataFile = "music_queue";

var dispatchers = {};
var bot;

exports.setBot = function(botClient) {
  bot = botClient;
}

exports.getQueues = function() {
  return new Promise(resolve => {
    Utils.loadData(dataFile)
      .then(resolve)
      .catch(() => resolve({}));
  });
}

exports.addToQueue = function(msg, url) {
  return new Promise(() => {
    exports.getQueues().then(queues => {
      ytdl.getInfo(url, (err, info) => {
        if(err) {
          reject(err);
          return;
        }

        var id = msg.guild.id;
        // Lazy initialize
        queues[id] = queues[id] || [];
        queues[id].push({
          url: url,
          voiceChannelID: msg.guild.member(msg.author).voiceChannelID,
          info: info
        });
        console.log(info);
        var song_info = `${info.title} - ${Math.floor(info.length_seconds/60)}:${("0" + info.length_seconds%60).slice(-2)}`;
        Utils.saveData(dataFile, queues)
          .then(msg.channel.sendMessage.bind(msg.channel, `\`Added to position #${queues[id].length}\`\n${Utils.codeblock("haskell", song_info)}`))
          .then(() => {
            if(!exports.isPlaying(msg)) {
              exports.startPlaying(msg);
            }
          })
          .catch(console.log);
      });
    });
  });
}

exports.removeFromQueue = function(msg, position, type) {
  return new Promise((resolve, reject) => {
    exports.getQueues().then(queues => {
      var id = msg.guild.id;
      // Lazy initialize
      queues[id] = queues[id] || [];

      if(queues[id].length > 0) {
        var song = queues[id].splice(position - 1, 1)[0];

        Utils.saveData(dataFile, queues)
          .then(() => {
            var song_info = `${song.info.title} - ${Math.floor(song.info.length_seconds/60)}:${("0" + song.info.length_seconds%60).slice(-2)}`;
            msg.channel.sendMessage(`\`${type ? type : "Removed #" + (position)}\`\n${Utils.codeblock("haskell", song_info)}`)
              .then(() => {
                resolve(song)
              })
              .catch(() => {
                resolve(song)
              });
          })
          .catch((err) => {
            console.log(err);
            resolve(song);
          });
      } else {
        reject("No songs left in queue");
      }
    });
  });
}

exports.join = function(msg) {
  return new Promise((resolve, reject) => {
    if(!msg.guild) {
      reject("Can't use ´join´ in DM");
    } else {
      var guildMember = msg.guild.member(msg.author);
      exports.joinById(guildMember.voiceChannelID)
        .then(resolve)
        .catch(reject.bind("You're not in a voice channel"));
    }
  });
}

exports.joinById = function(vcID) {
  return new Promise((resolve, reject) => {
    var conn = bot.voiceConnections.array().find(vc => vc.channel.id === vcID);
    var vc = bot.channels.array().find(c => c.id === vcID);

    if(conn) {
      // Is already connected to the voice channel
      resolve(conn);
    } else if(vc) {
      // Join voice channel if found
      vc.join().then(resolve).catch(reject);
    } else {
      reject("That's not a valid voice channel");
    }
  });
}

exports.startPlaying = function(msg) {
  if(exports.isPlaying(msg)) {
    msg.channel.sendMessage("Already playing.").catch(console.log);
    return;
  }

  exports.playNextSong(msg);
}

exports.playNextSong = function(msg) {
  exports.getNextSong(msg)
    .then((next) => {
      exports.joinById(next.voiceChannelID)
        .then(conn => {
          var stream = ytdl(next.url, {
            filter: f => f.type == 'audio/webm; codecs="opus"' || f.type == 'audio/webm; codecs="vorbis"'
          });

          stream.pipe(require("fs").createWriteStream("temp.webm"));
          setTimeout(() => {
            dispatchers[msg.guild.id] = conn.playFile("temp.webm");
            dispatchers[msg.guild.id].once("end", () => {
              exports.playNextSong(msg);
            });
          }, 1000);
        })
        .catch(console.log);
    })
    .catch(msg.channel.sendMessage.bind(msg.channel));
}

exports.getNextSong = function(msg) {
  return new Promise((resolve, reject) => {
    exports.removeFromQueue(msg, 1, "Playing")
      .then((song) => {
        resolve(song)
      })
      .catch(reject);
  });
}

exports.skip = function(msg) {
  if(!dispatchers[msg.guild.id]) return;
  dispatchers[msg.guild.id].end();
}

exports.isPlaying = function(msg) {
  return !!(dispatchers[msg.guild.id] || {}).speaking;
}