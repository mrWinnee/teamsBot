const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, AudioPlayer } = require('@discordjs/voice');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const { AudioPlayerStatus: Status } = require('@discordjs/voice');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const token = 'YOUR_DISCORD_BOT_TOKEN'; // Replace with your bot token

client.once('ready', () => {
  console.log(`${client.user.tag} has logged in!`);
});

client.on('messageCreate', async (message) => {
  if (message.content === '!stream' && message.member.voice.channel) {
    const channel = message.member.voice.channel;

    // Join the voice channel
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    // Prepare the MP3 file to be played
    const audioPath = path.join(__dirname, 'your-audio-file.mp3'); // Replace with your MP3 file path

    // Create an FFmpeg stream for the audio
    const audioStream = ffmpeg(audioPath)
      .format('mp3')
      .audioCodec('libmp3lame')
      .pipe();

    // Create an audio resource from the stream
    const resource = createAudioResource(audioStream, {
      inputType: AudioPlayerStatus.Stream,
    });

    // Create an audio player
    const player = createAudioPlayer();

    // Play the audio in the voice channel
    player.play(resource);
    connection.subscribe(player);

    // Handle when the player is done
    player.on(AudioPlayerStatus.Idle, () => {
      connection.destroy();  // Disconnect after playback finishes
    });

    message.reply("Streaming the MP3 file...");
  }
});

client.login(token);
