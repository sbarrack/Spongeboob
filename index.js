const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));

const rpc = require('discord-rich-presence')(config.id);

const mcping = require('mc-ping-updated');
const date = new Date();
let status;
pingServer();
setInterval(pingServer, 300e3); // 5 mins

function pingServer() {
    mcping('mc.stephenbarrack.com', 25565, (err, res) => {
        if (err) {
            status = err;
            return;
        }
        status = res;
        /* Sample response:
        {
            "version": {
                "name": "1.8.7",
                "protocol": 47
            },
            "players": {
                "max": 100,
                "online": 5,
                "sample": [
                    {
                        "name": "thinkofdeath",
                        "id": "4566e69f-c907-48ee-8d71-d7ba5aa00d20"
                    }
                ]
            },	
            "description": {
                "text": "Hello world"
            },
            "favicon": "data:image/png;base64,<data>"
        } */
    }, 3e3);

    rpc.updatePresence({
        state: 'test2',
        details: 'test',
        startTimestamp: date,
        startTimestamp: date + 1337,
        largeImageKey: config.asset,
        // largeImageText: 'test3',
        smallImageKey: config.asset,
        // smallImageText: 'test4',
        instance: true,
    });
}

const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    const botChannel = client.channels.cache.find(ch => ch.name === 'bot');
    if (!(msg.channel.equals(botChannel) && msg.content.startsWith(';'))) return;
    let cmd = msg.content.slice(1).split(' ');
    switch (cmd[0]) {
        case 'p':
        case 'ping':
            msg.reply('coming soon:tm:');
            break;
        case 'h':
        case 'help':
        default:
            msg.reply('coming soon:tm:');
    }
});

client.on('guildMemberAdd', member => {
    const channel = member.guild.channels.cache.find(ch => ch.name === 'general');
    if (!channel) return;
    channel.send(`Welcome to the server, ${member}`);
});

client.login(config.token);
