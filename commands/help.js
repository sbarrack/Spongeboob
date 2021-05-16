const fs = require('fs')
const { Collection } = require('discord.js')
const { starter, logger, isDev, isOwner, isAdmin, isMod } = require('../utils.js')

module.exports = {
    name: 'help',
    short: 'h',
    desc: 'Sends this message',
    args: '(command)',
    perm: '',
    execute(msg, arg) {
        let out = []
        let command = arg[0]
        if (command) {
            command = commands.get(command)
            if (!command) {
                command = commands.find((cmd) => cmd.short === arg[0])
            }
            if (command) {
                if (isAllowed(msg, command)) {
                    out.push(
                        `${command.desc}\n\`${starter} ${command.name}|${command.short}${
                            command.args ? ' ' + command.args : ''
                        }\``
                    )
                } else {
                    out.push('No soup for you >:(')
                }
            } else {
                out.push('Invalid command name :(')
            }
        } else {
            out.push('__***Help Menu***__')
            commands.each((cmd) => {
                if (isAllowed(msg, cmd)) {
                    out.push(`\`${starter} ${cmd.name}\` - ${cmd.desc}`)
                }
            })
        }

        out = out.join('\n')
        if (isMod(msg)) {
            msg.author
                .createDM()
                .then((dm) => {
                    dm.send(out).catch((e) => logger.error(e.stack))
                })
                .catch((e) => logger.error(e.stack))
        } else {
            msg.channel.send(out).catch((e) => logger.error(e.stack))
        }
    }
}

const commands = new Collection()
commands.set(module.exports.name, module.exports)
for (let file of fs
    .readdirSync('commands')
    .filter((file) => file.endsWith('.js') && file !== 'help.js')) {
    let cmd = require(`./${file}`)
    commands.set(cmd.name, cmd)
}

function isAllowed(msg, cmd) {
    let isAllowed = true
    if (cmd.perm) {
        switch (cmd.perm) {
            case 'mod':
                isAllowed = isMod(msg)
                break
            case 'admin':
                isAllowed = isAdmin(msg)
                break
            case 'owner':
                isAllowed = isOwner(msg)
                break
            case 'dev':
                isAllowed = isDev(msg)
        }
    }
    return isAllowed
}
