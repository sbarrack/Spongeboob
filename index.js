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
const statusWaitSecs = 20;

var lastStatus;
var shops = { list: [] };

if (fs.existsSync('shops.json')) {
    shops = JSON.parse(fs.readFileSync('shops.json'));
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('#bot ;help', { type: 'PLAYING' });
});

client.on('guildMemberAdd', member => {
    const channel = member.guild.channels.cache.find(ch => ch.name === 'general');
    if (!channel) return;
    if (config.welcome) {
        if (config.welcome.length) {
            channel.send(config.welcome[0].replace('${member}', member));
        }
        return;
    }
    channel.send(`Welcome to the server, ${member}!`);
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
        case 'cp':
        case 'createpoll':
            if (msg.author.id === msg.guild.ownerID) {
                if (cmd.length < 3)  {
                    msg.delete();
                    return;
                }
                if (!Number.isInteger(+cmd[1])) {
                    cmd.splice(1, 0, '24');
                }
                let question = cmd.slice(2).join(' ');
                msg.channel.send((polls.length + 1) + '. ' + question).then(msg2 => {
                    Promise.all([msg2.react(reacts[0]), msg2.react(reacts[1])]).then(() => {
                        let i;
                        let yes = 0;
                        let no = 0;
                        let total = msg2.channel.members.array().length - 1;
                        let voters = [];

                        let poll = msg2.createReactionCollector((re, user) => {
                            return true;
                        }, { time: +cmd[1] * 3600000, maxUsers: Math.ceil(total / 2) });

                        poll.on('collect', (re, user) => {
                            if (re.client.user.id === user.id) return;
                            let repeat = voters.findIndex((voter, vote) => voter.user.id === user.id);
                            re.users.remove(user);
                            if (!(re.emoji.name === reacts[0] || re.emoji.name === reacts[1])) {
                                return;
                            }

                            if (repeat >= 0) {
                                if (voters[repeat].react === reacts[0]) yes--;
                                else if (voters[repeat].react === reacts[1]) no--;
                            } else {
                                voters.push({ user: user, react: re.emoji.name });
                            }
                            
                            if (re.emoji.name === reacts[0]) yes++;
                            else if (re.emoji.name === reacts[1]) no++;
                        });

                        poll.on('end', collected => {
                            msg.reply(`the people have spoken. The motion "${question}" ${yes > no ? 'passes' : 'fails'}.\n(${yes} yes, ${no} no, ${total - yes - no} abstain)`);
                            polls.splice(i, 1);
                        });
                        
                        i = polls.push(poll) - 1;
                        msg.delete();
                    });
                });
            }
            break;
        case 'ep':
        case 'endpoll':
            if (msg.author.id === msg.guild.ownerID) {
                if (polls.length < 1) {
                    msg.delete();
                    return;
                }
                if (!cmd[1]) {
                    cmd[1] = polls.length;
                }
                polls[+cmd[1] - 1].stop();
                msg.delete();
            }
            break;
        case 'p':
        case 'ping':
            if (!msg.channel.id === botChannel.id) return;
            msg.reply(`${ping - msg.createdAt - client.ws.ping}ms.`).then(() => {
                msg.delete();
            });
            break;
        case 'sp':
        case 'shop':
            if (!msg.channel.id === botChannel.id) return;
            if (shops[msg.author.id]) {
                // TODO manage shop, write shop file after (add cooldown to how frequently this can be done)
            } else {
                // TODO offer to create shop
            }
            msg.delete();
            break;
        case 'c':
        case 'compare':
            if (!msg.channel.id === botChannel.id) return;
            if (cmd.length > 1) {
                let target = msg.mentions.firstKey(cmd.length - 1);
                if (!target.length) {
                    if (shops[target]) {
                        if (target === msg.author.id) {
                            // TODO compare author shop to all
                        } else if (shops[msg.author.id]) {
                            // TODO compare target shop to author shop
                        } else {
                            // TODO compare target shop to all
                        }
                    } else {
                        msg.reply(`<@${target}> is not a valid user or does not have a shop.`).then(() => {
                            msg.delete();
                        });
                    }
                } else {
                    // TODO compare mentioned shops
                }
            } else {
                // TODO compare all shops
            }
            msg.delete();
            break;
        case 's':
        case 'status':
            if (!msg.channel.id === botChannel.id) return;
            let cooldown = (ping - lastStatus) / 1e3;
            if (cooldown < statusWaitSecs) {
                cooldown = Math.round(statusWaitSecs - cooldown);
                msg.reply(`please wait ${cooldown} sec${cooldown > 1 ? 's' : ''} before checking again.`).then(() => {
                    msg.delete();
                });
                return;
            }
            lastStatus = ping;
            mcping('mc.stephenbarrack.com', 25565, (err, res) => {
                if (err) {
                    msg.reply(`unable to retrieve status. Refer to last one in pins or check Minecraft.`).then(() => {
                        msg.delete();
                    });
                    return;
                }
                msg.channel.send('', new Discord.MessageEmbed()
                    .setTitle('Current status of  **The DK Crew**')
                    .setURL('https://stephenbarrack.com/Spongeboob/')
                    .setFooter(msg.member.displayName, msg.author.displayAvatarURL())
                    .setTimestamp(Date.now())
                    .setColor(msg.member.displayColor)
                    .setDescription(`Version ${res.version.name}\nPlayers ${res.players.online} / ${res.players.max}\n\n${res.players.sample ? res.players.sample.map(e => { return e.name }).join('\n') : ''}`)
                ).then(msg2 => {
                    msg.delete();
                    msg.channel.messages.fetchPinned().then(pins => {
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
                msg.channel.send('', new Discord.MessageEmbed()
                    .setTitle('Spongeboob Help Menu')
                    .setURL('https://stephenbarrack.com/Spongeboob/')
                    .setFooter(msg.member.displayName, msg.author.displayAvatarURL())
                    .setTimestamp(Date.now())
                    .setColor(msg.member.displayColor)
                    .setDescription(`Use prefix  **;**  in  \`#bot\`  only.\n\
                    For feature requests, DM <@${client.guilds.resolve('702367002085425163').ownerID}>.`)
                    .addFields(
                        {
                            name: '**help (h)**',
                            value: 'Show this message'
                        },
                        {
                            name: '**ping (p)**',
                            value: 'Get a rough ping from your client to the server'
                        },
                        {
                            name: '**status (s)**',
                            value: "Check the server state and who's online"
                        }
                    )
                ).then(() => {
                    msg.delete();
                });
            }
    }
});

client.login(config.token);
