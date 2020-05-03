const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));

const mcping = require('mc-ping-updated');

const http = require('http');
http.createServer((req, res) => {
	res.end('A');
}).listen(8080);

const Discord = require('discord.js');
const client = new Discord.Client();

const polls = [];

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('#bot ;help', { type: 'PLAYING' });
});

client.on('message', msg => {
    let ping = Date.now();
    if (!msg.content.startsWith(';') || msg.author.bot) return;
    let cmd = msg.content.slice(1).split(' ');
    if (!cmd.length) return;
    const botChannel = client.channels.cache.find(ch => ch.name === 'bot');
    switch (cmd[0]) {
        case 'bd':
        case 'bulkdelete':
            if (msg.author.id === msg.guild.ownerID) {
                if (!cmd[1]) cmd[1] = 2;
                msg.channel.bulkDelete(cmd[1], true);
            }
            break;
        case 'sp':
        case 'simplepoll':
            if (msg.author.id === msg.guild.ownerID) {
                if (!cmd[1]) {
                    cmd[1] = 3600000;
                }
                if (!cmd[2]) {
                    cmd[2] = 'Yes or no?';
                }
                botChannel.send(cmd.slice(2).join(' ')).then(poll => {
                    poll.react('🇮').then(() => {
                        let participants = poll.channel.members.array().length;
                        let tally = poll.createReactionCollector((re, user) => {
                            return re.emoji.name === '🇮';
                        }, { time: +cmd[1], maxEmojis: Math.floor(participants / 2) + 1 });

                        tally.on('end', collected => {
                            let result = 'The motion fails.';
                            let count = collected.array()[0].count - 1;
                            if (count < 1) return;
                            if (count / participants > 0.5) result = "The I's have it!";
                            msg.reply(result);
                        });

                        polls.push(tally);
                        msg.delete();
                    });
                })
            }
            break;
        case 'ep':
        case 'endpoll':
            if (msg.author.id === msg.guild.ownerID) {
                if (!cmd[1]) {
                    cmd[1] = 1;
                }
                polls.slice(+cmd[1] - 1, 1)[0].stop();
                msg.delete();
            }
            break;
        case 'p':
        case 'ping':
            if (!msg.channel.id === botChannel.id) return;
            msg.reply(`${ping - msg.createdAt}ms.`).then(() => {
                msg.delete();
            });
            break;
        case 's':
        case 'status':
            if (!msg.channel.id === botChannel.id) return;
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
        case 'h':
        case 'help':
        default:
            if (!msg.channel.id === botChannel.id) return;
            if (!cmd[1]) {
                botChannel.send('>>> Commands (prefix ; in #bot only):\n\
                help (h) - Show this message\n\
                ping (p) - Soon:tm:\n\
                status (s) - Check the server state and who\'s online\n\n\
                For feature requests, DM @Estuvo#7008.').then(() => {
                    msg.delete();
                });
            }
    }
});

client.on('guildMemberAdd', member => {
    const channel = member.guild.channels.cache.find(ch => ch.name === 'general');
    if (!channel) return;
    channel.send(`Welcome to the server, ${member}`);
});

client.login(config.token);
