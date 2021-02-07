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
    if (!config.admins[msg.guild.id]) return;
    if (!config.admins[msg.guild.id].includes(msg.author.id)) return;

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
                fs.writeFileSync('./output.txt', count.join('\n'));
                
                msg.reply(`${ping - msg.createdAt - client.ws.ping}ms`, {
                    files: [
                        './output.txt'
                    ]
                }).then(() => {
                    msg.delete();
                }).catch(console.error);
            }).catch(console.error);
            break;
        case 'lm':
        case 'listmembers':
            msg.delete();
            if (!cmd[1]) return;
            let out = [];
            msg.channel.members.each(member => {
                // 547952624301768705 under review
                // 797619863584899072 bots
                if (member.roles.cache.has(cmd[1])) {
                    out.push(`${member.displayName} (${member.user.tag}) | Account creation: ${member.user.createdAt.toDateString()} | Joined on: ${member.joinedAt.toDateString()}`);
                }
            });
            fs.writeFileSync('./output.txt', out.join('\n'));
            break;
    }
});

client.login(config.token);
