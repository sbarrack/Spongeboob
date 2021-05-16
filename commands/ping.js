const { logger } = require('../utils.js')

module.exports = {
    name: 'ping',
    short: 'p',
    desc: 'Measures latency',
    args: '',
    perm: '',
    execute(msg, arg) {
        msg.channel.send(`${Date.now() - msg.createdAt}ms`).catch((e) => logger.error(e.stack))
    }
}
