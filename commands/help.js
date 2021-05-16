const fs = require('fs')
const { starter, logger, isDev, isOwner, isAdmin, isMod } = require('../utils.js')

const commands = [
    {
        name: 'help',
        short: 'h',
        desc: 'Sends this message',
        args: '',
        perm: '',
        execute(msg, arg) {
            let out = ['__**Help Menu**__']
            commands.forEach((cmd) => {
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
                if (isAllowed) {
                    out.push(
                        `\`${starter} ${cmd.name}|${cmd.short}${
                            cmd.args ? ' ' + cmd.args : ''
                        } - ${cmd.desc}\``
                    )
                }
            })
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
]

module.exports = commands[0]

for (let file of fs
    .readdirSync('commands')
    .filter((file) => file.endsWith('.js') && file !== 'help.js')) {
    let cmd = require(`./${file}`)
    commands.push(cmd)
}
