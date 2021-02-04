const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));

const http = require('http');
http.createServer((req, res) => {
	res.end('A');
}).listen(8080);

const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    let ping = Date.now();
    if (msg.author.bot) return;
    if (msg.author.id !== config.creator) return;
    let cmd = msg.content.split(' ');
    if (cmd.length < 2) return;
    if (cmd[0] !== config.starter) return;
    switch (cmd[1]) {
        case 'p':
        case 'ping':
            msg.reply(`${ping - msg.createdAt - client.ws.ping}ms.`).then(() => {
                msg.delete();
            });
            break;
    }
});

client.login(config.token);
