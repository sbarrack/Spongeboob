const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));
const memory = JSON.parse(fs.readFileSync('memory.json'));

const http = require('http');
http.createServer((req, res) => {
	res.end('A');
}).listen(8080);

const Discord = require('discord.js');
const client = new Discord.Client();

const msMins = 60 * 1000;
const saveMemoryInterval = config.saveMemoryInterval * msMins;

let hasMemoryChanged = false;

function isDev(msg) {
    return msg.author.id === config.developer;
}

function isSuper(msg) {
    if (isDev(msg)) return true;

    return config.superusers.includes(msg.author.id);
}

function isAdmin(msg) {
    if (isSuper(msg)) return true;
    if (!config.adminRoles[msg.guild.id]) return false;

    let hasAdminRole = false;
    config.adminRoles[msg.guild.id].forEach(adminRole => {
        if (msg.member.roles.cache.has(adminRole)) hasAdminRole = true;
    });

    return hasAdminRole;
}

function isMod(msg) {
    if (isAdmin(msg)) return true;
    if (!config.modRoles[msg.guild.id]) return false;

    let hasModRole = false;
    config.modRoles[msg.guild.id].forEach(modRole => {
        if (msg.member.roles.cache.has(modRole)) hasModRole = true;
    });

    return hasModRole;
}

function objHasProp(obj, prop) {
    return obj[prop] ? obj[prop].size >= 1 : false;
}

function updateRole(member, memberAfter) {
    if (!config.logChannels[member.guild.id]) return;

    let roleList = [`<@${member.id}>\nAffected roles:\n\`\`\``];
    let cache = member.roles.cache;
    if (memberAfter) {
        cache = member.roles.cache.difference(memberAfter.roles.cache);
    }
    if (!cache) return;
    if (cache.array().length < 1) return;
    cache.each(role => {
        let name = role.name;
        if (name !== '@everyone') {
            roleList.push(`${name} | ${role.hexColor} | User count: ${role.members.array().length}`);
        }
    });

    roleList = roleList.join('\n');
    roleList += '```';
    member.guild.channels.cache.get(config.logChannels[member.guild.id]).send(roleList).then(console.log).catch(console.error);
}

function saveMemories() {
    if (hasMemoryChanged) {
        fs.writeFileSync('./memory.json', JSON.stringify(memory));
        hasMemoryChanged = false;
    }
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // client.channels.fetch('813818780823978055').then(copyto => {
    //     client.channels.fetch('676848184169070615').then(channel => {
    //         channel.messages.fetch({ limit: 2 }).then(messages => {
    //             messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp).each(msg => {
    //                 let files = [];
    //                 msg.attachments.each(a => {
    //                     files.push(a.url);
    //                 });
    //                 if (files.length) {
    //                     files = '\n' + files.join('\n');
    //                 } else {
    //                     files = '';
    //                 }
    //                 copyto.send(`<@${msg.author.id}> at ${msg.createdAt.toString()}\n${msg.content}${files}`);
    //             });
    //         }).catch(console.error);
    //     }).catch(console.error);
    // }).catch(console.error);
});

client.on('guildMemberRemove', member => {
    updateRole(member);
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
    updateRole(oldMember, newMember);
});

client.on('message', msg => {
    let ping = Date.now();

    if (msg.author.bot) return;
    let cmd = msg.content;
    if (!cmd.startsWith(config.starter)) return;
    cmd = cmd.slice(config.starter.length).split(' ');
    if (cmd.length < 1) return;

    switch (cmd[0]) {
        case 'p':
        case 'ping':
            msg.reply(`${ping - msg.createdAt - client.ws.ping}ms.`).then(() => {
                msg.delete();
            }).catch(console.error);

            break;
        case 'rc':
        case 'rolecount':
            if (!isMod(msg)) {
                msg.delete();
                return;
            }

            msg.guild.roles.fetch().then(roles => {
                let count = [];
                roles.cache.each(role => {
                    let name = role.name;
                    if (name === '@everyone') {
                        name = 'Total';
                    }
                    count.push([ name, role.members.array().length ].join(' | '));
                });
                fs.writeFileSync('./output.txt', count.join('\n'));
                
                msg.reply(`${ping - msg.createdAt - client.ws.ping}ms`, {
                    files: [
                        './output.txt'
                    ]
                }).then(() => {
                    msg.delete();
                }).catch(console.error);
            }).catch(console.error);

            break;
        case 'lm':
        case 'listmembers':
            if (!isMod(msg)) {
                msg.delete();
                return;
            }
            if (!cmd[1]) {
                msg.delete();
                return;
            }

            let out = [];
            msg.channel.members.each(member => {
                // 547952624301768705 under review (DS)
                // 797619863584899072 bots (DK)
                if (member.roles.cache.has(cmd[1])) {
                    out.push(`${member.displayName} (${member.user.tag}) | Account creation: ${member.user.createdAt.toDateString()} | Joined on: ${member.joinedAt.toDateString()}`);
                }
            });
            fs.writeFileSync('./output.txt', out.join('\n'));
                
            msg.reply(`${ping - msg.createdAt - client.ws.ping}ms`, {
                files: [
                    './output.txt'
                ]
            }).then(() => {
                msg.delete();
            }).catch(console.error);

            break;
    }
});

client.login(config.token);
setInterval(saveMemories, saveMemoryInterval);
