const fs = require('fs')
const { logger, dateToGoogle } = require('../utils.js')

let isRunning = false

module.exports = {
    name: 'members',
    short: 'ms',
    desc: 'Creates a list of all members of the guild',
    args: '',
    perm: 'admin',
    execute(msg, arg) {
        if (!isRunning)
            msg.guild.members
                .fetch()
                .then((members) => {
                    const fileName = `./output/${this.name}.txt`

                    fs.writeFileSync(
                        fileName,
                        'ID\tTag\tNickname\tHighest rank\tDate created\tDate joined\tAvatar'
                    )

                    members
                        .filter((member) => !member.deleted && !member.user.bot)
                        .each((member) => {
                            fs.appendFileSync(
                                fileName,
                                '\n' +
                                    [
                                        member.id,
                                        member.user.tag,
                                        member.displayName,
                                        member.roles.highest ? member.roles.highest.name : '',
                                        dateToGoogle(member.user.createdAt),
                                        dateToGoogle(member.joinedAt),
                                        member.user.displayAvatarURL()
                                    ].join('\t')
                            )
                        })

                    msg.reply(`Completed ${this.name} in ${Date.now() - msg.createdAt}ms`, {
                        files: [fileName]
                    })
                        .then(() => {
                            msg.delete()
                            fs.unlinkSync()
                        })
                        .catch((e) => logger.error(e.stack))
                })
                .catch((e) => logger.error(e.stack))
        else
            msg.reply('This command is already running. Please try again later.').catch((e) =>
                logger.error(e.stack)
            )
    }
}
