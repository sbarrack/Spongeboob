const { logger, starter, config, saveConfig, isAdmin } = require('../utils.js')

module.exports = {
    name: 'prefix',
    short: 'pf',
    desc: 'Sets the server prefix',
    args: 'set [prefix] | clear',
    perm: 'admin',
    execute(msg, arg) {
        if (!(isAdmin(msg) && arg)) return
        let prefix = ''

        switch (arg[0]) {
            case 'clear':
                prefix = config[msg.guild.id].starter
                if (prefix) {
                    config[msg.guild.id].starter = ''
                    saveConfig()
                    msg.channel
                        .send(`Prefix changed from ${prefix} to ${starter}`)
                        .catch((e) => logger.error(e.stack))
                }

                break
            case 'set':
                if (arg[1]) {
                    prefix = config[msg.guild.id].starter
                    config[msg.guild.id].starter = arg[1]
                    saveConfig()
                    msg.channel
                        .send(
                            'Prefix ' +
                                (prefix ? `changed from ${prefix}` : 'set') +
                                ` to ${arg[1]}`
                        )
                        .catch((e) => logger.error(e.stack))
                }
        }
    }
}
