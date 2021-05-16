const { logger } = require('../utils.js')

module.exports = {
    name: 'kill',
    short: 'k',
    desc: 'Stops the bot',
    args: '',
    perm: 'dev',
    execute(msg, arg) {
        msg.author
            .createDM()
            .then((dm) => {
                dm.send(`Stopping ${msg.client.user.tag}`)
                    .then((msg2) => {
                        process.kill(0)
                    })
                    .catch((e) => logger.error(e.stack))
            })
            .catch((e) => logger.error(e.stack))
    }
}
