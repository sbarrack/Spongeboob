const fs = require('fs')
const { transports, format, createLogger } = require('winston')
if (isDevelopment()) {
    require('dotenv').config()
}

const outputDir = 'output'
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir)
}

const configPath = outputDir + '/config.json'
let config = {}
if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath))
}

const logPath = outputDir + '/log.txt'
let tp = [
    new transports.File({
        filename: logPath,
        level: 'error',
        format: format.combine(
            format.timestamp({ format: 'DD/MM/YY HH:mm:ss' }),
            format.errors({ stack: true }),
            format.printf(printf)
        )
    }),
    new transports.Console({
        level: 'warn',
        format: format.combine(
            format.timestamp({ format: 'HH:mm:ss' }),
            format.errors(),
            format.printf(printf)
        )
    })
]
if (isDevelopment()) {
    tp = [
        new transports.File({
            filename: logPath,
            level: 'info',
            format: format.combine(
                format.timestamp({ format: 'DD/MM/YY HH:mm:ss' }),
                format.errors({ stack: true }),
                format.printf(printf)
            )
        }),
        new transports.Console({
            level: 'info',
            format: format.combine(
                format.timestamp({ format: 'HH:mm:ss' }),
                format.errors({ stack: true }),
                format.printf(printf)
            )
        })
    ]
}
const logger = createLogger({
    transports: tp,
    exitOnError: isDevelopment()
})

process.on('uncaughtException', (e) => logger.error(e.stack))
process.on('unhandledRejection', (e) => logger.error(e.stack))

module.exports = {
    logger: logger,
    starter: 'sb',
    config: config,
    saveConfig: saveConfig,
    isDev: isDev,
    isOwner: isOwner,
    isAdmin: isAdmin,
    isMod: isMod
}

function isDevelopment() {
    return !process.env.ENV || process.env.ENV === 'dev'
}

function printf(info) {
    return `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}`
}

function saveConfig() {
    fs.writeFileSync(configPath, JSON.stringify(config))
}

function isDev(msg) {
    return msg.author.id === process.env.DEV
}

function isOwner(msg) {
    return msg.guild.ownerID === msg.author.id || isDev(msg)
}

function isAdmin(msg) {
    if (!config[msg.guild.id].adminRole) return undefined
    return msg.member.roles.cache.has(config[msg.guild.id].adminRole) || isOwner(msg)
}

function isMod(msg) {
    if (!config[msg.guild.id].modRole) return undefined
    return msg.member.roles.cache.has(config[msg.guild.id].modRole) || isAdmin(msg)
}
