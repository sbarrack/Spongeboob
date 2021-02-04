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

    let cmd = msg.content;
    if (!cmd.startsWith(config.starter)) return;
    cmd = cmd.slice(config.starter.length).split(' ');
    if (cmd.length < 1) return;

    switch (cmd[0]) {
        case 'p':
        case 'ping':
            msg.reply(`${ping - msg.createdAt - client.ws.ping}ms.`).then(() => {
                msg.delete();
            }).catch(console.error);
            break;

        case 'rc':
        case 'rolecount':
            msg.guild.roles.fetch().then(roles => {
                let count = [];
                roles.cache.each(role => {
                    let name = role.name;
                    if (name === '@everyone') {
                        name = 'Total';
                    }
                    count.push([ name, role.members.array().length ].join(' | '));
                });
                
                msg.reply(`\n${count.join('\n')}`).then(() => {
                    msg.delete();
                }).catch(console.error);
            }).catch(console.error);
            break;
    }
});

client.login(config.token);
