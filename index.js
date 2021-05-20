const fs = require('fs')
const http = require('http')
const Discord = require('discord.js')
const { lobbies } = require('./oauth.js')
const { logger, starter, config, saveConfig } = require('./utils.js')

// Get list of commands
const commands = new Discord.Collection()
for (let file of fs.readdirSync('commands').filter((file) => file.endsWith('.js'))) {
    let cmd = require(`./commands/${file}`)
    commands.set(cmd.name, cmd)
}

// Respond to all handshakes
http.createServer((req, res) => {
    console.log(JSON.stringify(req))
    res.end('A')
}).listen(8080)

// Discord API interactions
const client = new Discord.Client()
client.on('ready', () => {
    logger.log('info', `Logged in as ${client.user.tag}`)
    // updateInvites()

    // Update config
    client.guilds.cache.each((guild) => {
        if (!config[guild.id]) {
            config[guild.id] = {}
        }
    })
    saveConfig()
})

client.on('debug', (m) => {
    logger.debug(m)
})
client.on('warn', (m) => {
    logger.warn(m)
})
client.on('error', (e) => {
    logger.error(e.stack)
})

client.on('guildMemberAdd', (member) => {
    // updateInvites()
})
client.on('guildMemberRemove', (member) => {
    updateRole(member)
    // updateInvites()
})
client.on('guildMemberUpdate', (oldMember, newMember) => {
    updateRole(oldMember, newMember)
    // updateInvites()
})

client.on('inviteCreate', (invite) => {
    // updateInvites()
})
client.on('inviteDelete', (invite) => {
    // updateInvites()
})

const skribblLink = new RegExp('http(s)*://skribbl.io/\\?[a-z,A-Z,0-9]{12}', 'g')
client.on('message', (msg) => {
    if (msg.author.id !== process.env.DEV && process.env.ENV === 'dev') return
    if (msg.author.bot || msg.channel.type !== 'text' || msg.system) return

    let mentioned = msg.mentions.users.get(client.user.id)
    if (mentioned) {
        msg.reply(
            'What the fuck did you just fucking say about me, you little bitch? I’ll have you know I graduated top of my class in the Navy Seals, and I’ve been involved in numerous secret raids on Al-Quaeda, and I have over 300 confirmed kills. I am trained in gorilla warfare and I’m the top sniper in the entire US armed forces. You are nothing to me but just another target. I will wipe you the fuck out with precision the likes of which has never been seen before on this Earth, mark my fucking words. You think you can get away with saying that shit to me over the Internet? Think again, fucker. As we speak I am contacting my secret network of spies across the USA and your IP is being traced right now so you better prepare for the storm, maggot. The storm that wipes out the pathetic little thing you call your life. You’re fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred ways, and that’s just with my bare hands. Not only am I extensively trained in unarmed combat, but I have access to the entire arsenal of the United States Marine Corps and I will use it to its full extent to wipe your miserable ass off the face of the continent, you little shit. If only you could have known what unholy retribution your little “clever” comment was about to bring down upon you, maybe you would have held your fucking tongue. But you couldn’t, you didn’t, and now you’re paying the price, you goddamn idiot. I will shit fury all over you and you will drown in it. You’re fucking dead, kiddo.'
        ).catch((e) => logger.error(e.stack))
        return
    }

    let cmd = msg.content
    let cmdStarter = starter
    if (config[msg.guild.id].starter) cmdStarter = config[msg.guild.id].starter
    if (cmd.startsWith(cmdStarter)) {
        cmd = cmd.slice(starter.length).split(' ')
        if (cmd.length < 1) return
        let command = commands.find(
            (command) => command.name === cmd[0] || command.short === cmd[0]
        )
        if (command) command.execute(msg, cmd.slice(1))
        return
    }

    let link = skribblLink.exec(cmd)
    if (link) {
        msg.delete({
            reason: `Hosted custom game link in ${msg.channel.name} by ${msg.author.tag}`
        })
            .then((msg2) => {
                msg2.channel
                    .send(
                        `@here ${lobbies.add(msg2.guild.id, link[0])}\n${link.input.replace(
                            skribblLink,
                            ''
                        )}`
                    )
                    .catch((e) => logger.error(e.stack))
            })
            .catch((e) => logger.error(e.stack))
    }
})

client.login(process.env.TOKEN)

// All non load time code below

function updateRole(member, newMember) {
    if (!config[member.guild.id].log) return

    let out = [`<@${member.id}>\`\`\``]
    let cache = member.roles.cache
    if (newMember) {
        cache = member.roles.cache.difference(newMember.roles.cache)
    }
    if (!cache) return
    if (cache.array().length < 1) return
    cache.each((role) => {
        if (role.name !== '@everyone') {
            out.push(
                `${role.name} | ${role.hexColor} | User count: ${role.members.array().length}`
            )
        }
    })

    member.guild.channels.cache
        .get(config[member.guild.id].log)
        .send(out.join('\n') + '```')
        .catch((e) => logger.error(e.stack))
}

// const inviteDays = 7
// const inviteSeconds = inviteDays * 24 * 60 * 60
// function updateInvites() {
//     client.guilds.cache.each((guild) => {
//         guild
//             .fetchInvites()
//             .then((invites) => {
//                 invites.each((invite) => {
//                     if (Number.isInteger(invite.maxAge)) {
//                         if (
//                             invite.maxAge < 1 ||
//                             invite.maxAge > inviteSeconds
//                         ) {
//                             invite
//                                 .delete(
//                                     `Auto-deleted because user <@${invite.inviter.id}> created an invite longer than ${inviteDays} days.`
//                                 )
//                                 .then((invite2) => {
//                                     if (!isProd()) {
//                                         logger.log(
//                                             'info',
//                                             `Deleted invite ${invite.url} on guild ${guild.name} by ${invite.inviter.tag}.`
//                                         )
//                                     }
//                                     guild.channels.cache
//                                         .get(config.logChannels[guild.id])
//                                         .send(
//                                             `Auto-deleted invite ${invite.url} because user <@${invite.inviter.id}> created an invite longer than ${inviteDays} days.`
//                                         )
//                                         .catch((e) => logger.error(e.stack))
//                                 })
//                                 .catch((e) =>
//                                     logger.log(
//                                         'error',
//                                         `Failed to delete invite ${invite.url} on guild ${guild.name}!`
//                                     )
//                                 )
//                             return
//                         }
//                     }
//                     if (invite.maxUses != 1) {
//                         invite
//                             .delete(
//                                 `Auto-deleted because user <@${invite.inviter.id}> created an invite with more than one uses.`
//                             )
//                             .then((invite2) => {
//                                 if (!isProd()) {
//                                     logger.log(
//                                         'info',
//                                         `Deleted invite ${invite.url} on guild ${guild.name} by ${invite.inviter.tag}.`
//                                     )
//                                 }
//                                 guild.channels.cache
//                                     .get(config.logChannels[guild.id])
//                                     .send(
//                                         `Auto-deleted invite ${invite.url} because user <@${invite.inviter.id}> created an invite with more than one uses.`
//                                     )
//                                     .catch((e) => logger.error(e.stack))
//                             })
//                             .catch((e) =>
//                                 logger.log(
//                                     'error',
//                                     `Failed to delete invite ${invite.url} on guild ${guild.name}!`
//                                 )
//                             )
//                         return
//                     }
//                     if (Number.isInteger(invite.uses)) {
//                         if (invite.uses > 0) {
//                             invite
//                                 .delete(
//                                     `Auto-deleted because invite was used more than once.`
//                                 )
//                                 .then((invite2) => {
//                                     if (!isProd()) {
//                                         logger.log(
//                                             'info',
//                                             `Deleted invite ${invite.url} on guild ${guild.name} by ${invite.inviter.tag}.`
//                                         )
//                                     }
//                                     guild.channels.cache
//                                         .get(config.logChannels[guild.id])
//                                         .send(
//                                             `Auto-deleted invite ${invite.url} because user <@${invite.inviter.id}>'s invite was used more than once.`
//                                         )
//                                         .catch((e) => logger.error(e.stack))
//                                 })
//                                 .catch((e) =>
//                                     logger.log(
//                                         'error',
//                                         `Failed to delete invite ${invite.url} on guild ${guild.name}!`
//                                     )
//                                 )
//                             return
//                         }
//                     }
//                     if (invite.inviter) {
//                         guild.members
//                             .fetch()
//                             .then((members) => {
//                                 if (members.has(invite.inviter.id)) {
//                                     let member = members.get(invite.inviter.id)
//                                     if (
//                                         !member.hasPermission(
//                                             'CREATE_INSTANT_INVITE'
//                                         )
//                                     ) {
//                                         invite
//                                             .delete(
//                                                 `Auto-deleted because user <@${invite.inviter.id}> does not have permission to invite.`
//                                             )
//                                             .then((invite2) => {
//                                                 if (!isProd()) {
//                                                     logger.log(
//                                                         'info',
//                                                         `Deleted invite ${invite.url} on guild ${guild.name} by ${invite.inviter.tag}.`
//                                                     )
//                                                 }
//                                                 guild.channels.cache
//                                                     .get(
//                                                         config.logChannels[
//                                                             guild.id
//                                                         ]
//                                                     )
//                                                     .send(
//                                                         `Auto-deleted invite ${invite.url} because user <@${invite.inviter.id}> does not have permission to invite.`
//                                                     )
//                                                     .catch((e) =>
//                                                         logger.error(e.stack)
//                                                     )
//                                             })
//                                             .catch((e) =>
//                                                 logger.log(
//                                                     'error',
//                                                     `Failed to delete invite ${invite.url} on guild ${guild.name}!`
//                                                 )
//                                             )
//                                     }
//                                 } else {
//                                     invite
//                                         .delete(
//                                             `Auto-deleted because user <@${invite.inviter.id}> is no longer on ${guild.name}.`
//                                         )
//                                         .then((invite2) => {
//                                             if (!isProd()) {
//                                                 logger.log(
//                                                     'info',
//                                                     `Deleted invite ${invite.url} on guild ${guild.name} by ${invite.inviter.tag}.`
//                                                 )
//                                             }
//                                             guild.channels.cache
//                                                 .get(
//                                                     config.logChannels[guild.id]
//                                                 )
//                                                 .send(
//                                                     `Auto-deleted invite ${invite.url} because user <@${invite.inviter.id}> is no longer on ${guild.name}.`
//                                                 )
//                                                 .catch((e) =>
//                                                     logger.error(e.stack)
//                                                 )
//                                         })
//                                         .catch((e) =>
//                                             logger.log(
//                                                 'error',
//                                                 `Failed to delete invite ${invite.url} on guild ${guild.name}!`
//                                             )
//                                         )
//                                 }
//                             })
//                             .catch((e) =>
//                                 logger.log(
//                                     'error',
//                                     `Failed to fetch members for guild ${guild.name}!`
//                                 )
//                             )
//                     }
//                     if (invite.targetUser) {
//                         guild
//                             .fetchBans()
//                             .then((bans) => {
//                                 if (bans.has(invite.targetUser.id)) {
//                                     invite
//                                         .delete(
//                                             `Auto-deleted because user <@${invite.inviter.id}> invited <@${invite.targetUser.id}> who is banned.`
//                                         )
//                                         .then((invite2) => {
//                                             if (!isProd()) {
//                                                 logger.log(
//                                                     'info',
//                                                     `Deleted invite ${invite.url} on guild ${guild.name} by ${invite.inviter.tag}.`
//                                                 )
//                                             }
//                                             guild.channels.cache
//                                                 .get(
//                                                     config.logChannels[guild.id]
//                                                 )
//                                                 .send(
//                                                     `Auto-deleted invite ${invite.url} because user <@${invite.inviter.id}> invited <@${invite.targetUser.id}> who is banned.`
//                                                 )
//                                                 .catch((e) =>
//                                                     logger.error(e.stack)
//                                                 )
//                                         })
//                                         .catch((e) =>
//                                             logger.log(
//                                                 'error',
//                                                 `Failed to delete invite ${invite.url} on guild ${guild.name}!`
//                                             )
//                                         )
//                                 } else {
//                                     guild.members
//                                         .fetch()
//                                         .then((members) => {
//                                             if (
//                                                 members.has(
//                                                     invite.targetUser.id
//                                                 )
//                                             ) {
//                                                 invite
//                                                     .delete(
//                                                         `Auto-deleted because user <@${invite.inviter.id}> invited <@${invite.targetUser.id}> who is already on ${guild.name}.`
//                                                     )
//                                                     .then((invite2) => {
//                                                         if (!isProd()) {
//                                                             logger.log(
//                                                                 'info',
//                                                                 `Deleted invite ${invite.url} on guild ${guild.name} by ${invite.inviter.tag}.`
//                                                             )
//                                                         }
//                                                         guild.channels.cache
//                                                             .get(
//                                                                 config
//                                                                     .logChannels[
//                                                                     guild.id
//                                                                 ]
//                                                             )
//                                                             .send(
//                                                                 `Auto-deleted invite ${invite.url} because user <@${invite.inviter.id}> invited <@${invite.targetUser.id}> who is already on ${guild.name}.`
//                                                             )
//                                                             .catch((e) =>
//                                                                 logger.log(
//                                                                     'error',
//                                                                     e
//                                                                 )
//                                                             )
//                                                     })
//                                                     .catch((e) =>
//                                                         logger.log(
//                                                             'error',
//                                                             `Failed to delete invite ${invite.url} on guild ${guild.name}!`
//                                                         )
//                                                     )
//                                             }
//                                         })
//                                         .catch((e) =>
//                                             logger.log(
//                                                 'error',
//                                                 `Failed to fetch members for guild ${guild.name}!`
//                                             )
//                                         )
//                                 }
//                             })
//                             .catch((e) =>
//                                 logger.log(
//                                     'error',
//                                     `Failed to fetch bans for guild ${guild.name}!`
//                                 )
//                             )
//                     }
//                 })
//             })
//             .catch((e) =>
//                 logger.log(
//                     'error',
//                     `Failed to fetch invites for guild ${guild.name}:\n${e}`
//                 )
//             )
//     })
// }
