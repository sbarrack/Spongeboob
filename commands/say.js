const { logger } = require('../utils.js')

module.exports = {
    name: 'say',
    short: 's',
    desc: 'Talk as the bot',
    args: '[text]',
    perm: 'admin',
    execute(msg, arg) {
        msg.channel
            .send(arg.join(' '))
            .then((msg2) => {
                msg.delete().catch((e) => logger.error(e.stack))
            })
            .catch((e) => logger.error(e.stack))
    }
}
