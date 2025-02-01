const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, // Enables interaction with guild-related events
        GatewayIntentBits.GuildMessages, // Enables listening to messages in guilds
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent, // Enables access to the content of messages
        GatewayIntentBits.GuildMembers, // Enables listening to member-related events
        GatewayIntentBits.GuildModeration // Enables permission to clone a channel
    ],
});
const ffmpeg = require('fluent-ffmpeg');
//const fs = require("fs");
require("dotenv").config();
const guildId = "1061089516737269890"; // Replace with your server ID
const elo = [
    "Iron",
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Emerald",
    "Diamond",
    "Master",
    "Grand Master",
    "Challenger",
    "Souvreign",
];
client.on("ready", async () => {
    console.log(`Logged in as ${client.user.tag}!`);

/* 
    const guild = await client.guilds.fetch(guildId);

    // Fetching all members of the guild
    const members = await guild.members.fetch();

    // Preparing an array for JSON output
    const result = [];
    members.forEach((member) => {
        const matchingRole = member.roles.cache.find((role) =>
            elo.includes(role.name),
        );
        let hardnessMultiplayer = 1;
        if (matchingRole) {
            switch (matchingRole.name) {
                case 'Iron':
                    hardnessMultiplayer = 1;
                    break;
                case 'Bronze':
                    hardnessMultiplayer = 1;
                    break;
                case 'Silver':
                    hardnessMultiplayer = 1;
                    break;
                case 'Gold':
                    hardnessMultiplayer = 1;
                    break;
                case 'Platinum':
                    hardnessMultiplayer = 1;
                    break;
                case 'Emerald':
                    hardnessMultiplayer = 1;
                    break;
                case 'Diamond':
                    hardnessMultiplayer = 2;
                    break;
                case 'Master':
                    hardnessMultiplayer = 3;
                    break;
                case 'Grand Master':
                    hardnessMultiplayer = 4;
                    break;
                case 'Challenger':
                    hardnessMultiplayer = 5;
                    break;
                case 'Souvreign':
                    hardnessMultiplayer = 6;
                    break;
            }
            result.push({
                username: member.user.tag,
                userId: member.id,
                roleName: matchingRole.name,
                evaluation: (elo.indexOf(matchingRole.name)+1) * hardnessMultiplayer,
            });
        }
    });
    // Write the result array to a JSON file
    fs.writeFileSync('members.json', JSON.stringify(result, null, 2), 'utf-8'); */

    // Log the result array as a JSON string
    //console.log(JSON.stringify(result, null, 2)); // Pretty-print the JSON with 2-space indentation
});

let participants = [];
let maxParticipants = null;
let teams = [];
client.on("messageCreate", (message) => {
    if (
        message.content.startsWith("!joinBtn") &&
        message.member.permissions.has("ADMINISTRATOR")
    ) {
        const [command, maxParticipantsStr] = message.content.split(" ");
        maxParticipants = parseInt(maxParticipantsStr);
        if (isNaN(maxParticipants)) {
            message.reply(
                'Please provide a valid number of participants after "!joinBtn"',
            );
            return;
        }
        participants = [];
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("joinBtn")
                .setLabel("Join Tournament")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(false),
        );
        message.reply({
            content:
                "You want to join the tournament ! Click the button below ⬇",
            components: [row],
        });
    }
});

client.on("interactionCreate", async (interaction) => {
    if (interaction.customId === "joinBtn") {
        if (!participants.some(participant => participant.userId === interaction.user.id)) {
            //participants.push(interaction.user.id);
///////////////////////////////////////// IN TEST MODE //////////////////////////////////////////

            const member = await interaction.guild.members.fetch(interaction.user.id);
            const matchingRole = member.roles.cache.find((role) => elo.includes(role.name));
            let roleName = "Grand Master";
            let evaluation = 36;
            if (matchingRole) {
                roleName = matchingRole.name;
                evaluation = (elo.indexOf(roleName) + 1) * (roleName === 'Diamond' ? 2 : roleName === 'Master' ? 3 : roleName === 'Grand Master' ? 4 : roleName === 'Challenger' ? 5 : roleName === 'Souvreign' ? 6 : 1);
            }
            participants.push({
                username: interaction.user.tag,
                userId: interaction.user.id,
                roleName: roleName,
                evaluation: evaluation,
            });

////////////////////////////////////////////////////////////////////////////////////////////////
            const joinedPlayer = await interaction.reply({ content: `<@${interaction.user.id}> joined the tournament` });
            setTimeout(() => {
                joinedPlayer.delete().catch(console.error);
            }, 2000); // 5000 milliseconds = 5 seconds
        }
        console.log(participants.length);
        //console.log(participants);


        if (participants.length >= maxParticipants) {
            interaction.message.edit({
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("joinBtn")
                            .setLabel("tournament is full")
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true),
                    ),
                ],
            });
            // Assuming members.json is in the same directory as your script
            /* const membersData = JSON.parse(
                fs.readFileSync("members.json", "utf8"),
            );

            // Mapping participants to their corresponding evaluation from members.json
            const participantsWithEvaluation = participants
                .map((participantId) => {
                    const member = membersData.find(
                        (member) => member.userId === participantId,
                    );
                    return member ? { ...member, userId: participantId } : { username: interaction.user.tag, userId: participantId, roleName: "Diamond", evaluation: 14 };
                })
                .filter((member) => member !== null); // Remove null entries 
                // */

            //console.log(participantsWithEvaluation); //////////////////////////// test
            teams = createTeams(participants);
            console.log("Teams created:", teams); // Log the created teams
            const channel = await client.channels.fetch("1321584360599846992"); // ID of tournament chanel
            //console.log(channel);
            if (!channel) {
                console.error("Channel not found.");
                return;
            }
            console.log(JSON.stringify(teams)); // Log the created teams
            sendTeamMessage(teams.teams, channel);
            // create teams voice channels
            await createVoiceRooms(teams.teams.length);
        }
    }
});
/* client.on("messageCreate", async (message) => {
    if (message.content.startsWith("!sendTeams") &&
       message.member.permissions.has("ADMINISTRATOR")) {
        // Assume the command is given in the same channel where the teams were created
        console.log(teams.teams.length);
        const voiceChannels = await createVoiceRooms(teams.teams.length);
        console.log(voiceChannels);
        /* const channel = message.channel;
        if (!channel) {
            console.error("Channel not found.");
            return;
        } 
        for (let i = 0; i < teams.teams.length; i++) {
            const team = teams.teams[i];
            const voiceChannelID = voiceChannels[i];
            if (voiceChannelID) {
                for (const member of team) {
                    try {
                        const voiceChannel = client.channels.cache.get(voiceChannelID);
                        console.log("voice : ", voiceChannel);
                        //await voiceChannel.members.add(member);
                        await member.voice.setChannel(voiceChannel);
                    } catch (err) {
                        console.error("Error adding member to voice channel: ", err);
                    }
                }
            } else {
                console.error("Voice channel not found.");
            }
        }
    }
}); */
function createTeams(participants) {
    // Sort participants by evaluation in descending order
    participants.sort((a, b) => b.evaluation - a.evaluation);

    // Number of teams, assuming participants length is divisible by 5
    const numTeams = participants.length / 5;

    // Initialize empty teams
    let teams = Array.from({ length: numTeams }, () => []);

    // Use a zigzag approach to balance the evaluations
    let left = 0;
    let right = participants.length - 1;
    let direction = true; // Start with the leftmost participant

    // Distribute participants into teams
    for (let i = 0; i < participants.length; i++) {
        if (direction) {
            teams[i % numTeams].push(participants[left]);
            left++;
        } else {
            teams[i % numTeams].push(participants[right]);
            right--;
        }

        // Change direction after filling each team
        if ((i + 1) % numTeams === 0) {
            direction = !direction;
        }
    }

    // Calculate total evaluation for each team
    let teamEvaluations = teams.map((team) =>
        team.reduce((sum, participant) => sum + participant.evaluation, 0),
    );

    return { teams, teamEvaluations };
}
function sendTeamMessage(teams, channel) {
    teams.forEach((team, index) => {
        const teamMembers = team.map((member) => `<@${member.userId}>`); // Get member IDs as mentions
        const teamMessage = `Team ${index + 1}: ${teamMembers.join(", ")}`; // Format team message
        channel.send(teamMessage);
        //console.log(teamMessage);
    });
}
async function createVoiceRooms(numRooms) {
    const guild = await client.guilds.fetch(guildId);
    const voiceChannels = [];
    for (let i = 1; i <= numRooms; i++) {
        const channel = await guild.channels.create({
            name: `🚩 team ${i}`,
            type: 2, // Channel type: Voice Channel
            parent: "1309637048004644924", // Parent category ID
        });
        voiceChannels.push(channel.id);
    }
    return voiceChannels;
}




//////////////////////////////////////////////////
client.on("messageCreate", async (message) => {
    if (message.content.startsWith("!rules") && message.member.permissions.has("ADMINISTRATOR")) {
        const channel = message.member.voice.channel;
        if (!channel) {
            message.reply("You need to join a voice channel first!");
            return;
        }
        let audioStream;
        let script = "Welcome everyone, and thank you so much for being here. Please focus on what I'm going to say now. In just a moment, a tournament organization bot will post the \"Join the Tournament\" button in the chat of the channel. After you click on it, the same bot will assign teams based on your ranks in Wild Rift to balance the teams. After that, the tournament managers will move the players into their team channels. The most important thing is, once you're moved, please do not leave your team channel, as you risk losing your spot.";

        if (message.content.startsWith("!rules en")){
            audioStream = ffmpeg('./en.mp3')
            .format('mp3')
            .audioCodec('libmp3lame')
            .pipe();
            script = "Welcome everyone, and thank you so much for being here. Please focus on what I'm going to say now. In just a moment, a tournament organization bot will post the \"Join the Tournament\" button in the chat of the channel. After you click on it, the same bot will assign teams based on your ranks in Wild Rift to balance the teams. After that, the tournament managers will move the players into their team channels. The most important thing is, once you're moved, please do not leave your team channel, as you risk losing your spot."
        }
        if (message.content.startsWith("!rules fr")){
            audioStream = ffmpeg('./fr.mp3')
            .format('mp3')
            .audioCodec('libmp3lame')
            .pipe();
            script = "Bienvenue à tous et merci beaucoup d’être présents. Je vous prie de bien vouloir vous concentrer sur ce que je vais dire maintenant. Dans quelques instants, un bot d'organisation de tournoi va mettre le bouton \"Rejoindre le tournoi\" dans le chat du canal. Une fois que vous aurez cliqué dessus, le même bot répartira les équipes en fonction de vos rangs dans Wild Rift pour équilibrer les équipes. Ensuite, les managers du tournoi déplaceront les joueurs dans les canaux de leurs équipes. Le plus important est que, une fois déplacés, ne quittez surtout pas le canal de votre équipe, sinon vous risquez de perdre votre place."
        }
        if (message.content.startsWith("!rules ar")){
            audioStream = ffmpeg('./ar.mp3')
            .format('mp3')
            .audioCodec('libmp3lame')
            .pipe();
            script = `أهلاً وسهلاً بالجميع، وشكراً جزيلاً لكم على حضوركم. أتمنى أن تركزوا على ما سأقوله الآن. في لحظات قليلة، سيقوم بوت تنظيم البطولة بوضع زر "الانضمام إلى البطولة" في الدردشة داخل القناة. بمجرد أن تضغطوا عليه، سيقوم نفس البوت بتوزيع الفرق حسب رتبكم في لعبة "Wild Rift" لتوزيع الفرق بشكل متوازن. بعد ذلك، سيقوم مدراء البطولة بنقل اللاعبين إلى القنوات الخاصة بكل فريق. الأهم من ذلك، بعد أن يتم نقلكم، يرجى عدم مغادرة قناة الفريق، لأنكم قد تفقدون مكانكم في الفريق.
`
        }
        // Join the voice channel
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        // Create an FFmpeg stream for the audio
        

        // Create an audio resource from the stream
        const resource = createAudioResource(audioStream, {
            inputType: AudioPlayerStatus.Stream,
        });

        // Create an audio player
        const player = createAudioPlayer();

        // Play the audio in the voice channel
        player.play(resource);
        connection.subscribe(player);
        
        // Send a message and delete it after 5 seconds
        const sentMessage = await message.channel.send(script);
        
        // Handle when the player is done
        player.on(AudioPlayerStatus.Idle, () => {
            connection.destroy();  // Disconnect after playback finishes
            //sentMessage.delete().catch(console.error);
        });

    }
});


/* let lastDeletedChannel = null;
let lastDeletedChannelMessages = [];
client.on("messageDelete", async (message) => {
    if (message.channel.guild) {
        lastDeletedChannelMessages.push({
            content: message.content,
            author: message.author.tag,
            timestamp: message.createdTimestamp,
            channelId: message.channel.id,
        });
    }
});
client.on("channelDelete", async (channel) => {
    if (channel.guild) {
        const ceoRole = channel.guild.roles.cache.find(role => role.name === "CEO");
        if (ceoRole) {
            const ceoMember = channel.guild.members.cache.find(member => member.roles.cache.has(ceoRole.id));
            if (ceoMember) {
                lastDeletedChannel = channel;
                try {
                    await ceoMember.send(`A channel named "${channel.name}" was deleted. Type "!allowLastDel" to confirm the deletion.`);

                    // Check bot permissions
                    const botMember = await channel.guild.members.fetch(client.user.id);
                    if (!botMember.permissions.has('MANAGE_CHANNELS')) {
                        console.error('Bot does not have MANAGE_CHANNELS permission');
                        return;
                    }
                    // Recreate the channel to prevent deletion
                    const clonedChannel = await channel.clone();
                    // Copy messages to the new channel
                    const messagesToCopy = lastDeletedChannelMessages.filter(msg => msg.channelId === channel.id);
                    for (const msg of messagesToCopy) {
                        await clonedChannel.send(`[${new Date(msg.timestamp).toLocaleString()}] ${msg.author}: ${msg.content}`);
                    }
                } catch (error) {
                    console.error('Error handling channel deletion:', error);
                }
            }
        }
    }
});

client.on("messageCreate", async (message) => {
    if (message.content === "!allowLastDel" && message.member.roles.cache.some(role => role.name === "CEO")) {
        if (lastDeletedChannel) {
            await lastDeletedChannel.delete();
            lastDeletedChannel = null;
            message.reply("The last channel deletion has been confirmed.");
        } else {
            message.reply("There is no recent channel deletion to confirm.");
        }
    }
}); */
client.login(process.env.TOKEN);
