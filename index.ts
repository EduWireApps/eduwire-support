import { Client, TextChannel, Snowflake, Message, Collection } from 'discord.js';
import * as config from './config.json';
import issuesNotif from './issues-pnotif.json';
import issuesYnotes from './issues-ynotes.json';

const client = new Client({
    partials: [ "MESSAGE" ],
    fetchAllMembers: true
});

client.login(config.token);

let notifChannel: TextChannel = null;
let ynotesChannel: TextChannel = null;
let initialNotifMessageID: Snowflake = null;
let initialYnotesMessageID: Snowflake = null;
const ynotesContent = 
`**Tapez le numéro de votre question et je ferai de mon mieux pour vous aider !**

${issuesYnotes.map((issue, index) => {
    return `\`${++index}\` - ${issue.name}`
}).join('\n')}`;

const notifContent =
`
**Tapez le numéro de votre question et je ferai de mon mieux pour vous aider !**

${issuesNotif.length > 0 ? issuesNotif.map((issue, index) => {
    return `\`${++index}\` - ${issue.name}`
}).join('\n') : 'Aucune question disponible pour le moment.'}
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
        const answer = issuesYnotes.find((i, indx) => (indx+1).toString() === message.content);
        if (answer) {
            sendAndDeleteAfter(
                message,
                `Salut ${message.author.toString()}! ${answer.answer}`
            );
        } else {
            sendAndDeleteAfter(
                message,
                `Bonjour ${message.author.toString()}, veuillez envoyer le numéro du problème que vous recontrez.`
            );
        }
    } else if(message.channel.id === config.supportNotifChannel) {
        const answer = issuesNotif.find((i, indx) => (indx+1).toString() === message.content);
        if (answer) {
            sendAndDeleteAfter(
                message,
                `Salut ${message.author.toString()}! ${answer.answer}`
            );
        } else {
            sendAndDeleteAfter(
                message,
                `Bonjour ${message.author.toString()}, veuillez envoyer le numéro du problème que vous recontrez.`
            );
        }
    }
});
