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
const reacts = ['👍', '👎'];

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
                if (cmd.length < 2) cmd[1] = 2;
                msg.channel.bulkDelete(cmd[1], true);
            }
            break;
        case 'sp':
        case 'startpoll':
            if (msg.author.id === msg.guild.ownerID) {
                if (cmd.length < 3) return;
                if (!Number.isInteger(+cmd[1])) {
                    cmd.splice(1, 0, '24');
                }
                msg.channel.send(cmd.slice(2).join(' ')).then(msg2 => {
                    Promise.all([msg2.react(reacts[0]), msg2.react(reacts[1])]).then(() => {
                        let i;
                        let yes = 0;
                        let no = 0;
                        let total = msg2.channel.members.array().length - 1;
                        let voters = [];

                        let poll = msg2.createReactionCollector((re, user) => {
                            return re.emoji.name === reacts[0] || re.emoji.name === reacts[1];
                        }, { time: +cmd[1] * 3600000, maxUsers: total });

                        poll.on('collect', (re, user) => {
                            if (re.client.user.id === user.id) return;
                            let repeat = voters.find(voter => voter.id === user.id);
                            re.users.remove(user);
                            if (repeat) {
                                return;
                            }
                            voters.push(user);
                            if (re.emoji.name === reacts[0]) yes++;
                            else if (re.emoji.name === reacts[1]) no++;
                        });

                        poll.on('end', collected => {
                            msg.reply('the people have spoken. The motion ' + (yes > no ? 'passes' : 'fails') + `.\n(${yes} yes, ${no} no, ${total - yes - no} abstain)`);
                            polls.splice(i, 1);
                        });
                        
                        i = polls.push(poll) - 1;
                        msg.delete();
                    });
                });
            }
            break;
        case 'cp':
        case 'closepoll':
            if (msg.author.id === msg.guild.ownerID) {
                if (polls.length < 1) return;
                if (!cmd[1]) {
                    cmd[1] = polls.length - 1;
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
                    msg.reply(`unable to retrieve status. Refer to last one in pins or check Minecraft.`).then(() => {
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
            }, 5e3);
            break;
        case 'h':
        case 'help':
        default:
            if (!msg.channel.id === botChannel.id) return;
            if (!cmd[1]) {
                botChannel.send('>>> Commands (prefix ; in #bot only):\n\
                help (h) - Show this message\n\
                ping (p) - Get a rough ping from your client to the server (experimental)\n\
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
