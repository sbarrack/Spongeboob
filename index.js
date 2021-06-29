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

client.on('guildMemberUpdate', (oldMember, newMember) => {
    // TODO log rank role change to #general/promotion channel from config (set by ranks command)
})

const skribblLink = new RegExp('http(s)?://skribbl.io/\\?[a-z,A-Z,0-9]{12}', 'g')
client.on('message', (msg) => {
    if (msg.author.id !== process.env.DEV && process.env.ENV === 'dev') return
    if (msg.author.bot || msg.channel.type !== 'text' || msg.system) return

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
    if (link && msg.mentions.users.has(client.user.id)) {
        msg.delete({
            reason: `Hosted custom game link in ${msg.channel.name} by ${msg.author.tag}`
        })
            .then((msg2) => {
                msg2.channel
                    .send(
                        `<@${msg.author.id}> ${lobbies.add(
                            msg2.guild.id,
                            link[0]
                        )}\n${link.input
                            .replace(skribblLink, '')
                            .replace(Discord.MessageMentions.USERS_PATTERN, '')}`
                    )
                    .catch((e) => logger.error(e.stack))
            })
            .catch((e) => logger.error(e.stack))
        return
    }

    if (msg.channel.id === config[msg.guild.id].guess) {
        // TODO add guessing game
    }
})

client.login(process.env.TOKEN)
