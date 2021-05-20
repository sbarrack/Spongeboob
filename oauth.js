'use strict'

const express = require('express')
const fetch = require('node-fetch')
const uuid = require('uuid')
const { Collection } = require('discord.js')
const { logger } = require('./utils.js')

class Lobby {
    #guild
    #url
    #uuid

    constructor(guild, url) {
        this.#guild = guild
        this.#url = url
        this.#uuid = uuid.v4()
    }

    get guild() {
        return this.#guild
    }

    get url() {
        return this.#url
    }

    get uuid() {
        return this.#uuid
    }
}

class LobbyManager {
    static lobbies

    constructor() {
        if (!this.lobbies) {
            this.lobbies = new Collection()
        }
    }

    add(guild, url) {
        let lobby = new Lobby(guild, url)
        this.lobbies.set(lobby.uuid, lobby)
        return `${domain}/join?lobby=${lobby.uuid}`
    }

    get(uuid) {
        return this.lobbies.get(uuid)
    }
}

const app = express()
const lobbies = new LobbyManager()
let domain = ''

app.use(require('cookie-parser')(process.env.SECRET))

const server = app.listen(80, () => {
    let { port, address } = server.address()
    if (address === '::' || address === '0.0.0.0') address = 'localhost'
    domain = `http://${address}`
    logger.info('Server started on ' + domain)
})

app.get('/auth', (req, res) => {
    const { code, state } = req.query
    if (!(code && state))
        return res
            .status(401)
            .append('WWW-Authenticate', 'OAuth realm="dontspell.net", charset="UTF-8"')
            .send(errorPage('401 Unauthorized'))

    let { oauthState, lobby } = req.signedCookies
    if (!(oauthState && lobby)) return res.status(403).send(errorPage('403 Forbidden'))
    if (typeof oauthState !== 'string') return res.status(403).send(errorPage('403 Forbidden'))
    if (typeof state !== 'string') return res.status(403).send(errorPage('403 Forbidden'))
    if (oauthState.length < 1) return res.status(403).send(errorPage('403 Forbidden'))
    if (state.length < 1) return res.status(403).send(errorPage('403 Forbidden'))
    if (!uuid.validate(oauthState)) return res.status(403).send(errorPage('403 Forbidden'))
    if (!uuid.validate(state)) return res.status(403).send(errorPage('403 Forbidden'))
    if (oauthState !== state) return res.status(403).send(errorPage('403 Forbidden'))

    return fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.CLIENT,
            client_secret: process.env.SECRET,
            grant_type: 'authorization_code',
            scope: 'guilds',
            redirect_uri: domain + '/auth',
            code: code
        })
    })
        .then((res) => res.json())
        .then((data) => enterLobby(res, lobby, data))
        .catch((e) => {
            logger.error(e.stack)
            return res.status(500).send(errorPage('500 Internal Server Error'))
        })
})

app.get('/join', (req, res) => {
    let { lobby } = req.query
    if (!lobby) return res.status(403).send(errorPage('403 Forbidden'))
    if (!uuid.validate(lobby)) return res.status(400).send(errorPage('400 Bad Request'))
    lobby = lobbies.get(lobby)
    if (!lobby) return res.status(404).send(errorPage('404 Not Found'))

    // // TODO Get token stored on client for this conditional
    // if (token) {
    //     return enterLobby(res, lobby, token)
    // }

    let state = uuid.v4()
    return res
        .cookie('oauthState', state, {
            httpOnly: true,
            signed: true
        })
        .cookie('lobby', lobby.uuid, {
            httpOnly: true,
            signed: true
        })
        .redirect(
            307,
            'https://discord.com/api/oauth2/authorize?' +
                new URLSearchParams({
                    client_id: process.env.CLIENT,
                    response_type: 'code',
                    scope: 'guilds',
                    redirect_uri: domain + '/auth',
                    state: state
                }).toString()
        )
})

module.exports = {
    lobbies: lobbies
}

function errorPage(h) {
    return `<h1>${h}</h1>`
}

function enterLobby(res, lobby, token) {
    lobby = lobbies.get(lobby)
    if (!lobby) return res.status(404).send(errorPage('404 Not Found'))

    return fetch('https://discord.com/api/users/@me/guilds', {
        headers: { authorization: `${token.token_type} ${token.access_token}` }
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.findIndex((guild) => guild.id === lobby.guild) == -1)
                return res.status(403).send(errorPage('403 Forbidden'))

            // TODO redirect to alternate game page instead (probably going to need to be an iframe)
            return res.redirect(lobby.url)
        })
        .catch((e) => {
            logger.error(e.stack)
            return res.status(500).send(errorPage('500 Internal Server Error'))
        })
}
