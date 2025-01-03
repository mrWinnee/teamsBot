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
        GatewayIntentBits.MessageContent, // Enables access to the content of messages
        GatewayIntentBits.GuildMembers, // Enables listening to member-related events
    ],
});
const fs = require("fs");
require("dotenv").config();
const guildId = "1061089516737269890"; // Replace with your server ID
client.on("ready", async () => {
    console.log(`Logged in as ${client.user.tag}!`);

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

    const guild = await client.guilds.fetch(guildId);

    // Fetching all members of the guild
    const members = await guild.members.fetch();

    // Preparing an array for JSON output
    const result = [];
    members.forEach((member) => {
        const matchingRole = member.roles.cache.find((role) =>
            elo.includes(role.name),
        );
        if (matchingRole) {
            result.push({
                username: member.user.tag,
                userId: member.id,
                roleName: matchingRole.name,
                evaluation: elo.indexOf(matchingRole.name) + 1,
            });
        }
    });
    // Write the result array to a JSON file
    fs.writeFileSync('members.json', JSON.stringify(result, null, 2), 'utf-8');

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
        if (!participants.includes(interaction.user.id)) {
            participants.push(interaction.user.id);
            await interaction.reply({ content:`<@${interaction.user.id}> joined the tournament` });
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
            const membersData = JSON.parse(
                fs.readFileSync("members.json", "utf8"),
            );

            // Mapping participants to their corresponding evaluation from members.json
            const participantsWithEvaluation = participants
                .map((participantId) => {
                    const member = membersData.find(
                        (member) => member.userId === participantId,
                    );
                    return member ? { ...member, userId: participantId } : { username: interaction.user.tag, userId: participantId, roleName: "Diamond", evaluation: 7 };
                })
                .filter((member) => member !== null); // Remove null entries

            //console.log(participantsWithEvaluation); //////////////////////////// test
            teams = createTeams(participantsWithEvaluation);
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
    if (message.content.startsWith("!playRules") && message.member.permissions.has("ADMINISTRATOR")) {
        const channel = message.member.voice.channel;
        if (!channel) {
            message.reply("You need to join a voice channel first!");
            return;
        }

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        const resource = createAudioResource("rulesAudio.mp3");

        player.play(resource);
        connection.subscribe(player);

        player.on(AudioPlayerStatus.Playing, () => {
            console.log("Audio is now playing!");
        });

        player.on(AudioPlayerStatus.Idle, () => {
            console.log("Audio has finished playing!");
            connection.destroy();
        });

        player.on("error", console.error);
    }
});
client.login(process.env.TOKEN);
