'use strict'

const express = require('express')
const fetch = require('node-fetch')
const uuid = require('uuid')
const { Collection } = require('discord.js')
const { logger } = require('./utils.js')

const lobbyTimeout = 2 * 60 * 60 * 1e3

class Lobby {
    #guild
    #url
    #uuid
    #timeout

    constructor(guild, url) {
        this.#guild = guild
        this.#url = url
        this.#uuid = uuid.v4()
        this.#timeout = setTimeout(() => {
            lobbies.delete(this.#uuid)
            this.#timeout = null
        }, lobbyTimeout)
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

    join() {
        if (this.#timeout) {
            clearTimeout(this.#timeout)
        }
        this.#timeout = setTimeout(() => {
            lobbies.delete(this.#uuid)
            this.#timeout = null
        }, lobbyTimeout)
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
        let lobby = this.lobbies.find((lobby) => lobby.url === url)
        if (!lobby) {
            lobby = new Lobby(guild, url)
            this.lobbies.set(lobby.uuid, lobby)
        }
        return `${domain}/join?lobby=${lobby.uuid}`
    }

    get(uuid) {
        return this.lobbies.get(uuid)
    }

    delete(uuid) {
        return this.lobbies.delete(uuid)
    }
}

const app = express()
const lobbies = new LobbyManager()
const cookieAge = 5 * 60 * 1e3
let domain = ''

app.use(require('cookie-parser')(process.env.SECRET))

const server = app.listen(process.env.PORT, () => {
    domain = `http://${process.env.DOMAIN}`
    logger.info('Server started on ' + domain)
})

app.get('/auth', (req, res) => {
    const { code, state } = req.query
    if (!(code && state))
        return res
            .status(401)
            .append('WWW-Authenticate', 'OAuth realm="dontspell.net", charset="UTF-8"')
            .send(errorPage('401 Unauthorized'))

    let { oauthState } = req.signedCookies
    let { lobby } = req.cookies
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
        .then((token) => enterLobby(res, lobby, token))
        .catch((e) => {
            logger.error(e.stack)
            return res.status(500).send(errorPage('500 Internal Server Error'))
        })
})

app.get('/join', (req, res) => {
    let { lobby } = req.query
    if (!lobby) return res.status(403).send(errorPage('403 Forbidden'))
    if (!uuid.validate(lobby)) return res.status(400).send(errorPage('400 Bad Request'))

    res.cookie('lobby', lobby, {
        maxAge: cookieAge
    })

    const { token } = req.signedCookies
    if (token) {
        return enterLobby(res, lobby, JSON.parse(token))
    }

    let state = uuid.v4()
    return res
        .cookie('oauthState', state, {
            httpOnly: true,
            signed: true,
            maxAge: cookieAge
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
    res.cookie('token', JSON.stringify(token), {
        httpOnly: true,
        signed: true,
        maxAge: parseInt(token.expires_in, 10) * 1e3
    })

    lobby = lobbies.get(lobby)
    if (!lobby) return res.status(404).send(errorPage('404 Not Found'))

    return fetch('https://discord.com/api/users/@me/guilds', {
        headers: { authorization: `${token.token_type} ${token.access_token}` }
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.findIndex((guild) => guild.id === lobby.guild) == -1)
                return res.status(403).send(errorPage('403 Forbidden'))

            lobby.join()
            return res
                .cookie('game', lobby.url, {
                    maxAge: cookieAge
                })
                .sendFile('index.html', { root: '.' })
        })
        .catch((e) => {
            logger.error(e.stack)
            return res.status(500).send(errorPage('500 Internal Server Error'))
        })
}
