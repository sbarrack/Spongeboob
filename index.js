const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));

const mcping = require('mc-ping-updated');

const http = require('http');
http.createServer((req, res) => {
	res.end('A');
}).listen(8080);

const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('#bot ;help', { type: 'PLAYING' });
});

client.on('message', msg => {
    return;
    const botChannel = client.channels.cache.find(ch => ch.name === 'bot');
    if (!(msg.channel.equals(botChannel) && msg.content.startsWith(';'))) return;
    let cmd = msg.content.slice(1).split(' ');
    switch (cmd[0]) {
        case 's':
        case 'status':
            mcping('mc.stephenbarrack.com', 25565, (err, res) => {
                if (err) {
                    msg.reply('unable to retrieve status. Refer to last one in pins or check Minecraft.').then(() => {
                        msg.delete();
                    });
                    return;
                }
                botChannel.send('', new Discord.MessageEmbed()
                    .setTitle('Current status of **The DK Crew**')
                    .setFooter(msg.member.displayName, msg.author.displayAvatarURL())
                    .setTimestamp(Date.now())
                    .setColor(7879685)
                    .setDescription(`Version ${res.version.name}\nPlayers ${res.players.online} / ${res.players.max}\n\n${res.players.sample ? res.players.sample.map(e => { return e.name }).join('\n') : ''}`)
                ).then(msg2 => {
                    msg.delete();
                    botChannel.messages.fetchPinned().then(pins => {
                        pins.forEach(pin => {
                            pin.unpin();
                        });
                        msg2.pin().then(() => {
                            botChannel.lastMessage.delete();
                        });
                    });
                });
            }, 3e3);
            break;
        case 'p':
        case 'ping':
            msg.reply(`${Date.now() - msg.createdAt}ms.`).then(() => {
                msg.delete();
            });
            break;
        case 'h':
        case 'help':
        default:
            botChannel.send('>>> Commands (prefix ; in #bot only):\n\
            help (h) - Show this message\n\
            ping (p) - Measure your current lag to the server in milliseconds (soon:tm:)\n\
            status (s) - Check the server state and who\'s online').then(() => {
                msg.delete();
            });
    }
});

client.on('guildMemberAdd', member => {
    const channel = member.guild.channels.cache.find(ch => ch.name === 'general');
    if (!channel) return;
    channel.send(`Welcome to the server, ${member}`);
});

client.login(config.token);
