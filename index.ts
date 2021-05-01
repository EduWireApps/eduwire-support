import { Client, TextChannel, Snowflake, Message, Collection } from 'discord.js';
import * as config from './config.json';

const client = new Client({
    partials: [ "MESSAGE" ],
    fetchAllMembers: true
});

let notifChannel: TextChannel = null;
let ynotesChannel: TextChannel = null;
let initialNotifMessageID: Snowflake = null;
let initialYnotesMessageID: Snowflake = null;

const ynotesContent = 
`**Tapez le numéro de votre problème et je ferai de mon mieux pour vous aider !**

\`1\` - I want to setup the bot (join/leave messages, prefix, etc...)
\`2\` - I want to use the web dashboard
\`3\` - I want to know how to use the bot
\`4\` - ManageInvite says my server needs to be upgraded
\`5\` - My problem is not in the list`;

const notifContent =
`
**Tapez le numéro de votre problème et je ferai de mon mieux pour vous aider !**

\`1\` - I want to setup the bot (join/leave messages, prefix, etc...)
\`2\` - I want to use the web dashboard
\`3\` - I want to know how to use the bot
\`4\` - ManageInvite says my server needs to be upgraded
\`5\` - My problem is not in the list
`

client.on('ready', async () => {
    console.log(`Ready. Logged as ${client.user.tag}.`);
    notifChannel = client.channels.cache.get(config.supportNotifChannel) as TextChannel;
    ynotesChannel = client.channels.cache.get(config.supportYnotesChannel) as TextChannel;
    notifChannel.messages.fetch().then(async (messages) => {
        initialNotifMessageID = messages.last()?.id;
        if(!initialNotifMessageID){
            initialNotifMessageID = (await notifChannel.send(notifContent)).id;
        }
        setInterval(() => {
            notifChannel.messages.fetch().then((fetchedMessages) => {
                const messagesToDelete = fetchedMessages.filter((m) => (Date.now() - m.createdTimestamp) > 60000 && m.id !== initialNotifMessageID);
                notifChannel.bulkDelete(messagesToDelete);
            });
        }, 10000);
    });
    ynotesChannel.messages.fetch().then(async (messages) => {
        initialYnotesMessageID = messages.last()?.id;
        if(!initialYnotesMessageID){
            initialYnotesMessageID = (await ynotesChannel.send(ynotesContent)).id;
        }
        setInterval(() => {
            ynotesChannel.messages.fetch().then((fetchedMessages) => {
                const messagesToDelete = fetchedMessages.filter((m) => (Date.now() - m.createdTimestamp) > 60000 && m.id !== initialYnotesMessageID);
                ynotesChannel.bulkDelete(messagesToDelete);
            });
        }, 10000);
    });
});

interface MessageData {
    channelID: Snowflake;
    messageID: Snowflake;
    timeout: any;
}
const relatedMessages: Collection<Snowflake, MessageData> = new Collection();

const sendAndDeleteAfter = (message: Message, content: string) => {
    message.channel.send(content).then((m) => {
        const timeout = setTimeout(() => {
            relatedMessages.delete(message.id);
            message.delete();
            m.delete();
        }, 60000);
        relatedMessages.set(message.id, {
            channelID: m.channel.id,
            messageID: m.id,
            timeout
        });
    });
};

client.on('messageDelete', (message) => {
    const relatedMessageData = relatedMessages.get(message.id);
    if(relatedMessageData){
        if (relatedMessageData.channelID === ynotesChannel.id) {
            ynotesChannel.messages.fetch(relatedMessageData.messageID).then((m) => {
                m.delete();
                clearTimeout(relatedMessageData.timeout);
                relatedMessages.delete(message.id);
            });
        } else if (relatedMessageData.channelID === notifChannel.id) {
            notifChannel.messages.fetch(relatedMessageData.messageID).then((m) => {
                m.delete();
                clearTimeout(relatedMessageData.timeout);
                relatedMessages.delete(message.id);
            });
        }
    }
})

client.on('message', (message) => {
    if(message.partial) return;
    if(message.author.bot) return;
    if(message.channel.id === config.supportYnotesChannel){
        switch(message.content){
            case "1":
                sendAndDeleteAfter(
                    message,
                    `Salut ${message.author}! (ynotes)`
                );
                break;
            default:
                sendAndDeleteAfter(
                    message,
                    `Bonjour ${message.author.toString()}, veuillez envoyer le numéro du problème que vous recontrez.`
                );
        }
    } else if(message.channel.id === config.supportNotifChannel) {
        switch(message.content){
            case "1":
                sendAndDeleteAfter(
                    message,
                    `Salut ${message.author}! (pronote notifications)`
                );
                break;
            default:
                sendAndDeleteAfter(
                    message,
                    `Bonjour ${message.author.toString()}, veuillez envoyer le numéro du problème que vous recontrez.`
                );
        }
    }
});

client.login(config.token);
