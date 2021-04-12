const debug = false;

const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));

if (!fs.existsSync('output')) {
    fs.mkdirSync('output');
}

const https = require('https');
const http = require('http');
http.createServer((req, res) => {
    res.end('A');
}).listen(8080);

const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const imageminGifsicle = require('imagemin-gifsicle');

const winston = require('winston');
const logger = winston.createLogger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'output/log.txt' }),
    ],
    format: winston.format.printf(log => `[${new Date().toLocaleString()}] [${log.level.toUpperCase()}]: ${log.message}`),
});

const Discord = require('discord.js');
const { resolve } = require('path');
const client = new Discord.Client();

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
    member.guild.channels.cache.get(config.logChannels[member.guild.id]).send(roleList).catch(e => logger.log('error', e));
}

const inviteDays = 7;
const inviteSeconds = inviteDays * 24 * 60 * 60;
function updateInvites(invite, wasDeleted) {
    // NOTE not all invite properties will exist!
    if (invite) {
        if (wasDeleted) {
            // TODO log code, channel, inviter/client, target user, creation, expiration, maxage, uses, max uses
        } else {
            // // TODO
            // if inviter/client that created it does not currently have invite perms, delete()
            // if target user is already on the server or is banned, delete()
            // if expiresAt - createdAt > 48 hours, delete()
            // if maxAge > 48 hours, delete()
            // if maxUses > 1, delete()
            // log code, channel, inviter, expiration, max uses
        }
    }
    client.guilds.cache.each(guild => {
        guild.fetchInvites().then(invites => {
            invites.each(invite2 => {
                let willDelete = false;
                if (invite2.inviter) {
                    let member = guild.member(invite2.inviter);
                    if (member) {
                        if (!member.hasPermission('CREATE_INSTANT_INVITE')) {
                            willDelete = true;
                            invite2.delete(
                                `Auto-deleted because user <@${invite2.inviter.id}> does not have permission to invite.`
                            ).then(invite3 => {
                                logger.log('info', `Deleted invite ${invite2.url} on guild ${guild.name} by ${invite2.inviter.tag}.`);
                                guild.channels.cache.get(config.logChannels[guild.id]).send(
                                    `Auto-deleted invite ${invite2.url} because user <@${invite2.inviter.id}> does not have permission to invite.`
                                ).catch(e => logger.log('error', e));
                            }).catch(e => logger.log('error', `Failed to delete invite ${invite2.url} on guild ${guild.name}!`));
                        }
                    } else {
                        // TODO same thing but for client
                    }
                }
                if (invite2.maxAge && !willDelete) {
                    if (invite2.maxAge < 1 || invite2.maxAge > inviteSeconds) {
                        willDelete = true;
                        invite2.delete(
                            `Auto-deleted because user <@${invite2.inviter.id}> created an invite longer than ${inviteDays} days.`
                        ).then(invite3 => {
                            logger.log('info', `Deleted invite ${invite2.url} on guild ${guild.name} by ${invite2.inviter.tag}.`);
                            guild.channels.cache.get(config.logChannels[guild.id]).send(
                                `Auto-deleted invite ${invite2.url} because user <@${invite2.inviter.id}> created an invite longer than ${inviteDays} days.`
                            ).catch(e => logger.log('error', e));
                        }).catch(e => logger.log('error', `Failed to delete invite ${invite2.url} on guild ${guild.name}!`));
                    }
                }
                if (invite2.maxUses && !willDelete) {
                    if (invite2.max-uses > 1) {
                        willDelete = true;
                        invite2.delete(
                            `Auto-deleted because user <@${invite2.inviter.id}> created an invite with more than one uses.`
                        ).then(invite3 => {
                            logger.log('info', `Deleted invite ${invite2.url} on guild ${guild.name} by ${invite2.inviter.tag}.`);
                            guild.channels.cache.get(config.logChannels[guild.id]).send(
                                `Auto-deleted invite ${invite2.url} because user <@${invite2.inviter.id}> created an invite with more than one uses.`
                            ).catch(e => logger.log('error', e));
                        }).catch(e => logger.log('error', `Failed to delete invite ${invite2.url} on guild ${guild.name}!`));
                    }
                }
                // // TODO
                //   if target user is already on the server or is banned, delete()
                //   if expiresAt - createdAt > 48 hours, delete()
                //   if uses > 0, delete()
                //   log code, channel, inviter/client, target user, creation, expiration, maxage, uses, maxuses
            });
        }).catch(e => logger.log('error', `Failed to fetch invites for guild ${guild.id}:\n${e}`));
    });
}

function failFast(msg, desc, delay = 15000) {
    if (desc) {
        msg.reply(desc).then(() => {
            msg.delete();
            setTimeout(() => msg.delete(), delay);
        }).catch(e => logger.log('error', e));
    } else {
        msg.delete();
    }
}

function dateToGoogle(date) {
    return `${[
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        date.getUTCFullYear()
    ].join('/')} ${[
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds()
    ].join(':')}`;
}

process.on('uncaughtException', e => logger.log('error', e));
process.on('unhandledRejection', e => logger.log('error', e));

client.on('ready', () => {
    logger.log('info', `Logged in as ${client.user.tag}!`);
    updateInvites();

    if (!debug) return;
    // const fromID = '690932493808828486';
    // const toID = '826180452704190464';
    // const startMsgID = '805100080335814676';
    // let start = Date.now();
    // client.channels.fetch(toID).then(to => {
    //     client.channels.fetch(fromID).then(from => {

    //         function eachMsg(msg) {
    //             let attachments = [...msg.attachments.values()];
    //             let promises = [];
    //             attachments.forEach((v, i, a) => {
    //                 if (v.size >= 8000000) {
    //                     promises.push(new Promise((resolve, reject) => {
    //                         https.get(v.url, res => {
    //                             let filename = `attachments/${v.id}_${v.name.toLowerCase()}`;
    //                             let stream = res.pipe(fs.createWriteStream(filename));
    //                             stream.on('close', () => {
    //                                 if (v.name.match(/.(jpg|jpeg|png|gif)$/i)) {
    //                                     imagemin([ filename ], {
    //                                         destination: `compressed`,
    //                                         plugins: [
    //                                             imageminGifsicle({
    //                                                 optimizationLevel: 1,
    //                                                 colors: 64
    //                                             }),
    //                                             imageminMozjpeg({
    //                                                 quality: 75
    //                                             }),
    //                                             imageminPngquant({
    //                                                 speed: 4,
    //                                                 strip: true,
    //                                                 quality: [0.65, 0.85],
    //                                                 dithering: 0.85,
    //                                                 posterize: 2
    //                                             })
    //                                         ]
    //                                     }).then(files => {
    //                                         if (files[0].data.length > 8000000) {
    //                                             logger.log('error', `Compressed ${v.name} from ${v.size} B`)
    //                                         }
    //                                         a[i] = new Discord.MessageAttachment(files[0].data, v.name);
    //                                         logger.log('info', `Compressed ${v.name} from ${v.size} B to ${files[0].data.length} B`);
    //                                         resolve();
    //                                     }).catch(e => {
    //                                         a[i] = new Discord.MessageEmbed()
    //                                             .setTimestamp(msg.createdAt)
    //                                             .setDescription(`<@${msg.author.id}>\nMissing file ${filename}`);
    //                                         logger.log('warn', `Failed to compress image attachment ${v.name}`);
    //                                         resolve();
    //                                     });
    //                                 } else {
    //                                     // TODO also compress video (and audio)
    //                                     a[i] = new Discord.MessageEmbed()
    //                                         .setTimestamp(msg.createdAt)
    //                                         .setDescription(`<@${msg.author.id}>\nMissing file ${filename}`);
    //                                     logger.log('warn', `Saved file "${filename}" for message: ${msg.url}`);
    //                                     resolve();
    //                                 }
    //                             });
    //                         });
    //                         setTimeout(() => reject(new Error('Took too long')), 30000);
    //                     }));
    //                 }
    //             });
    //             return new Promise((resolve, reject) => {
    //                 Promise.allSettled(promises).finally(results => {
    //                     let stamp = new Discord.MessageEmbed()
    //                     .setTimestamp(msg.createdAt)
    //                     .setDescription(`<@${msg.author.id}>`);
    //                     let promises2 = [];
    //                     promises2.push(to.send(msg.content, msg.embeds.concat(stamp)).catch(e => {
    //                         logger.log('error', e);
    //                         fs.appendFileSync('output/missedMessages.json', `${msg.id},`);
    //                         reject();
    //                     }));
    //                     attachments.forEach((v, i, a) => {
    //                         promises.push(
    //                             to.send('', [stamp].concat(v)).catch(e => {
    //                                 logger.log('error', e);
    //                                 fs.appendFileSync('output/missedMessages.json', `${msg.id},`);
    //                                 reject();
    //                             })
    //                         );
    //                     });
    //                     Promise.allSettled(promises2).finally(results2 => resolve());
    //                 });
    //             });
    //         }

    //         function messageRecursive(last) {
    //             from.messages.fetch({ limit: 1, after: last }, false).then(messages => {
    //                 let msg = messages.first();
    //                 if (msg) {
    //                     eachMsg(msg).finally(() => messageRecursive(msg.id));
    //                 } else {
    //                     logger.log('info', `Finished copying messages in ${Date.now() - start}ms!`);
    //                     fs.appendFileSync('output/missedMessages.json', ']}');
    //                     process.exit();
    //                 }
    //             }).catch(console.error);
    //         }

    //         if (!fs.existsSync('attachments')) {
    //             fs.mkdirSync('attachments');
    //         }
    //         if (!fs.existsSync('compressed')) {
    //             fs.mkdirSync('compressed');
    //         }
    //         fs.writeFileSync('output/missedMessages.json', '{"ids":[');
    //         logger.log('info', `Copying messages from ${from.guild.name}:${from.name} to ${to.guild.name}:${to.name}...`)
    //         setTimeout(() => {
    //             from.messages.fetch(startMsgID, false).then(msg => {
    //                 eachMsg(msg).finally(() => messageRecursive(msg.id));
    //             }).catch(console.error);
    //         }, 4000);

    //     }).catch(console.error);
    // }).catch(console.error);
});

client.on('debug', m => {
    logger.log('debug', m);
});

client.on('warn', m => {
    logger.log('warn', m);
});

client.on('error', e => {
    logger.log('error', e);
});

client.on('guildMemberAdd', member => {
    updateInvites();
});
client.on('guildMemberRemove', member => {
    updateRole(member);
});
client.on('guildMemberUpdate', (oldMember, newMember) => {
    updateRole(oldMember, newMember);
});

client.on('inviteCreate', invite => {
    updateInvites(invite);
});
client.on('inviteDelete', invite => {
    updateInvites(invite, true);
});

client.on('message', msg => {
    if (debug) return;
    let ping = Date.now();

    if (msg.author.bot) return;
    let cmd = msg.content;
    if (!cmd.startsWith(config.starter)) return;
    cmd = cmd.slice(config.starter.length).split(' ');
    if (cmd.length < 1) return;

    switch (cmd[0]) {
        case 'p':
        case 'ping':
            failFast(msg, `${ping - msg.createdAt - client.ws.ping}ms`);

            break;
        case 'h':
        case 'help':
            msg.channel.send(`__**Command Help**__
\`${config.starter}help|h [stay]\` - Print this message. "stay" will prevent it from auto-deleting
\`${config.starter}ping|p\` - Get a rough ping to the bot`
                + (isMod(msg) ? `\n\n**Mod only**
\`${config.starter}listmembers|lm @role1 [@role2 @role3...]\` - List members in one or more roles
\`${config.starter}rolecount|rc\` - List a count of members in each role
\`${config.starter}users|u\` - Create a TSV file of all users on the server to import into Google Sheets` : '')
                + (isAdmin(msg) ? `\n\n**Admin only**
Coming soon:tm:!` : '')
            ).then(m => {
                msg.delete();
                if (cmd[1] !== 'stay') setTimeout(() => m.delete(), 65000);
            }).catch(e => logger.log('error', e));

            break;
        case 'lm':
        case 'listmembers':
            if (!isMod(msg)) {
                logger.log('info', `${msg.author.tag} (${msg.author.id}) attemted to execute ${cmd} without permission`);
                failFast(msg, 'you lack sufficient privileges');
                return;
            }
            if (!msg.mentions.roles.array().length) {
                failFast(msg, `proper usage: \`${config.starter}${cmd[0]} @role1 [@role2 @role3...]\``, 25000);
                return;
            }

            let out = [];
            msg.mentions.roles.each(role => {
                out.push(`Members for @${role.name}:`);
                role.members.each(member => {
                    out.push(`${member.displayName} (${member.user.tag}) | Account creation: ${member.user.createdAt.toDateString()} | Joined on: ${member.joinedAt.toDateString()}`);
                });
            });
            fs.writeFileSync('./output/listmembers.txt', out.join('\n'));

            msg.reply(`completed ${cmd[0]} in ${Date.now() - ping}ms`, {
                files: ['./output/listmembers.txt']
            }).then(() => msg.delete()).catch(e => logger.log('error', e));

            break;
        case 'rc':
        case 'rolecount':
            if (!isMod(msg)) {
                logger.log('info', `${msg.author.tag} (${msg.author.id}) attemted to execute ${cmd} without permission`);
                failFast(msg, 'you lack sufficient privileges');
                return;
            }

            msg.guild.roles.fetch().then(roles => {
                let count = [];
                roles.cache.each(role => {
                    let name = role.name;
                    if (name === '@everyone') {
                        name = 'Total';
                    }
                    count.push([name, role.members.array().length].join(' | '));
                });
                fs.writeFileSync('./output/rolecount.txt', count.join('\n'));

                msg.reply(`completed ${cmd[0]} in ${Date.now() - ping}ms`, {
                    files: ['./output/rolecount.txt']
                }).then(() => msg.delete()).catch(e => logger.log('error', e));
            }).catch(e => logger.log('error', e));

            break;
        case 'u':
        case 'users':
            if (!isMod(msg)) {
                logger.log('info', `${msg.author.tag} (${msg.author.id}) attemted to execute ${cmd} without permission`);
                failFast(msg, 'you lack sufficient privileges');
                return;
            }

            msg.guild.members.fetch().then(members => {
                fs.writeFileSync('./output/users.txt', 'id\ttag\tnick\trank\tcreated\tjoined\tlastMessage\tlastBoost\tavatar');

                members.filter(member => !member.deleted && !member.user.bot).each(member => {
                    let rank = member.roles.cache.filter(role =>
                        config.rankRoles[msg.guild.id].includes(role.id) ||
                        config.modRoles[msg.guild.id].includes(role.id) ||
                        config.adminRoles[msg.guild.id].includes(role.id)
                    ).sort(role => role.position).first();

                    fs.appendFileSync('./output/users.txt', '\n' + [
                        member.id,
                        member.user.tag,
                        member.displayName,
                        rank ? rank.name : '',
                        dateToGoogle(member.user.createdAt),
                        dateToGoogle(member.joinedAt),
                        member.lastMessage ? dateToGoogle(member.lastMessage.createdAt) : '',
                        member.premiumSince ? dateToGoogle(member.premiumSince) : '',
                        member.user.displayAvatarURL(),
                    ].join('\t'));
                });

                msg.reply(`completed ${cmd[0]} in ${Date.now() - ping}ms`, {
                    files: ['./output/users.txt']
                }).this(() => msg.delete()).catch(e => logger.log('error', e));
            }).catch(e => logger.log('error', e));

            break;
        case 'bd':
        case 'bulkdelete':
            if (!isSuper(msg)) {
                logger.log('info', `${msg.author.tag} (${msg.author.id}) attemted to execute ${cmd} without permission`);
                failFast(msg, 'you lack sufficient privileges');
                return;
            }
            if (cmd.length < 2) {
                failFast(msg, `proper usage: \`${config.starter}${cmd[0]} 2-100\``, 25000);
                return;
            }
            let count = parseInt(cmd[1], 10);
            if (!count) {
                failFast(msg, `"${cmd[1]}" is not an integer`);
                return;
            }
            if (count < 2 || count > 100) {
                failFast(msg, `${cmd[1]} is not between 2 and 100`);
                return;
            }

            msg.channel.bulkDelete(count).then(messages => {
                if (config.deletedMessageChannels[msg.guild.id]) {
                    fs.writeFileSync('./output/bulkdeleted.json', JSON.stringify([...messages.values()]));
                    msg.guild.channels.cache.get(config.deletedMessageChannels[msg.guild.id]).send(`Completed ${cmd[0]} ${cmd[1]} in ${Date.now() - ping}ms`, {
                        files: ['./output/bulkdeleted.json']
                    }).catch(e => logger.log('error', e));
                }
            }).catch(e => logger.log('error', e));

            break;
        // case 'ra':
        // case 'rollall':
        //     if (!isAdmin(msg)) {
        //         logger.log('info', `${msg.author.tag} (${msg.author.id}) attemted to execute ${cmd} without permission`);
        //         failFast(msg, 'you lack sufficient privileges');
        //         return;
        //     }
        //     // TODO fix later
        //     let targetRole = msg.mentions.roles.first();
        //     msg.guild.members.fetch().then(members => {
        //         members.each(member => {
        //             member.roles.add(targetRole);
        //         });
        //     }).catch(console.error);

        //     break;
    }
});

client.login(config.token);
