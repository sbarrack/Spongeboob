const fs = require('fs')
const { logger } = require('../utils.js')

let isRunning = false

module.exports = {
    name: 'rolecount',
    short: 'rc',
    desc: "Lists the guild's roles by quantity of users",
    args: '',
    perm: 'admin',
    execute(msg, arg) {
        if (!isRunning) {
            msg.guild.members
                .fetch()
                .then((members) => {
                    msg.guild.roles
                        .fetch()
                        .then((roles) => {
                            const fileName = `./output/${this.name}.txt`

                            isRunning = true
                            fs.writeFileSync(fileName, '')
                            roles.cache.each((role) => {
                                let name = role.name
                                if (name === '@everyone') {
                                    name = 'Total'
                                }
                                fs.appendFileSync(
                                    fileName,
                                    [name, role.members.array().length].join('\t') + '\n'
                                )
                            })

                            msg.reply(
                                `completed ${this.name} in ${Date.now() - msg.createdAt}ms`,
                                {
                                    files: [fileName]
                                }
                            )
                                .then(() => msg.delete())
                                .catch((e) => logger.error(e.stack))
                                .finally(() => {
                                    isRunning = false
                                })
                        })
                        .catch((e) => logger.error(e.stack))
                })
                .catch((e) => logger.error(e.stack))
        } else {
            msg.reply('This command is already running. Please try again later.').catch((e) =>
                logger.error(e.stack)
            )
        }
    }
}
