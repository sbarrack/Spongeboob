const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));

const mcping = require('mc-ping-updated');

const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('#bot ;help', { type: 'PLAYING' });
});

client.on('message', msg => {
    const botChannel = client.channels.cache.find(ch => ch.name === 'bot');
    if (!(msg.channel.equals(botChannel) && msg.content.startsWith(';'))) return;
    let cmd = msg.content.slice(1).split(' ');
    switch (cmd[0]) {
        case 's':
        case 'status':
            mcping('mc.stephenbarrack.com', 25565, (err, res) => {
                if (err) {
                    botChannel.send(JSON.stringify(error));
                    return;
                }
                botChannel.send('', {
                    embed: {
                        // thumbnail: { url: res.favicon },
                        footer: {
                            iconUrl: msg.author.displayAvatarURL(),
                            text: msg.member.displayName,
                        },
                        timestamp: new Date().toISOString(),
                        color: 7879685,
                        title: 'Current status of **The DK Crew**',
                        description: `Version ${res.version.name}\nPlayers ${res.players.online} / ${res.players.max}\n\n${res.players.sample ? res.players.sample.map(e => { return e.name }).join('\n') : ''}`,
                    },
                });
            }, 3e3);
            break;
        case 'p':
        case 'ping':
            msg.reply('coming soon:tm:');
            break;
        case 'h':
        case 'help':
        default:
            msg.reply('coming soon:tm:');
    }
});

client.on('guildMemberAdd', member => {
    const channel = member.guild.channels.cache.find(ch => ch.name === 'general');
    if (!channel) return;
    channel.send(`Welcome to the server, ${member}`);
});

client.login(config.token);
