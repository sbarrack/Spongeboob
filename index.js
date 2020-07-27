const fs = require("fs");
const path = require("path");
const http = require("http");
const Discord = require("discord.js");

http.createServer((req, res) => {
    res.end("OK");
}).listen(8080);

const configPath = path.join(__dirname, 'config.json');
var config = JSON.parse(fs.readFileSync(configPath));
const client = new Discord.Client();
const date = new Date().toString().slice(4, 15);
const dir = path.join(__dirname, "output");
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}
const filepath = path.join(dir, `ds_${date}.csv`);

var poll, time;

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity("& silently judging you", { type: "PLAYING" });

    if (config.poll) {
        client.channels.fetch(config.channel).then(chan => {
            chan.messages.fetch(config.poll).then(msg => {
                startPoll(msg);
            });
        });
    }

    client.guilds.cache.get('527796496440098816').emojis.cache.each(emote => {
        if (!emote.animated) {
            fs.appendFileSync(filepath, emote.name + "\r\n");
        }
    });
});

client.on("message", msg => {
    if (msg.author.bot) return;
    if (!msg.content.startsWith(config.starter)) return;
    if (!(msg.author.tag === "Hajmahkra#4120" || msg.author.tag === "Estuvo#2425")) return;
    let cmd = msg.content.split(" ").slice(1);
    if (!cmd.length) return;

    switch (cmd[0]) {
        case "go":
            if (config.poll !== "") {
                msg.reply("there's already a poll going silly").then(msg2 => {
                    setTimeout(() => {
                        msg2.delete();
                    }, 5000);
                });
                msg.delete();
                return;
            }

            if (!Number.isInteger(+cmd[1]) || +cmd[1] < 1) {
                cmd.splice(1, 0, "24");
            }

            msg.channel.send(cmd.slice(2).join(" ")).then(msg2 => {
                time = +cmd[1] * 3600000;
                fs.appendFileSync(filepath, ["emote_id", "emote_name", "user_id", "user_tag\r\n"].join(","));
                startPoll(msg2);
                msg.delete();
            });
            break;

        case "stop":
            if (poll) {
                poll.stop();
            }
            msg.delete();
            break;

        default:
            msg.reply("use a real command silly").then(msg2 => {
                setTimeout(() => {
                    msg2.delete()
                }, 5000);
            });
            msg.delete();
            break;
    }
});

client.login(config.token);

function startPoll(msg) {
    fs.writeFileSync(configPath, JSON.stringify(Object.assign(config, {
        poll: msg.id,
        channel: msg.channel.id,
    }), null, '\t') + '\r\n');

    poll = msg.createReactionCollector((react, user) => {
        console.log(react.emoji.name);
        return true;
    }, { time: time });

    poll.on("collect", (react, user) => {
        if (msg.guild.emojis.resolve(react.emoji.id)) {
            fs.appendFileSync(filepath, [react.emoji.id, react.emoji.name, user.id, user.tag].join(",") + "\r\n");
        }
        react.users.remove(user);
    });

    poll.on("end", collected => {
        msg.reactions.removeAll().then(msg3 => {
            msg.react("⛔");
        });
        msg.reply("everyone finished voting silly");
        fs.writeFileSync(configPath, JSON.stringify(Object.assign(config, {
            poll: ""
        }), null, '\t') + '\r\n');
    });
}
