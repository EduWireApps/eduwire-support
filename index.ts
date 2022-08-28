import { Client, TextChannel, Snowflake, Message, Collection } from 'discord.js';
import * as config from './config.json';
import issuesApollo from './issues-apollo.json';
import issuesYnotes from './issues-ynotes.json';
import keywords from './keywords.json';

const client = new Client({
    partials: ["MESSAGE"],
    fetchAllMembers: true
});

client.login(config.token);

let apolloChannel: TextChannel = null;
let ynotesChannel: TextChannel = null;
let initialApolloMessageID: Snowflake = null;
let initialYnotesMessageID: Snowflake = null;
const ynotesContent =
    `**Tapez le numéro de votre question et je ferai de mon mieux pour vous aider !**

${issuesYnotes.map((issue, index) => {
        return `\`${++index}\` - ${issue.name}`
    }).join('\n')}`;

const apolloContent =
    `
**Tapez le numéro de votre question et je ferai de mon mieux pour vous aider !**

${issuesApollo.length > 0 ? issuesApollo.map((issue, index) => {
        return `\`${++index}\` - ${issue.name}`
    }).join('\n') : 'Aucune question disponible pour le moment.'}
`

client.on('ready', async () => {
    console.log(`Ready. Logged as ${client.user.tag}.`);
    ynotesChannel = client.channels.cache.get(config.supportYnotesChannel) as TextChannel;
    ynotesChannel.messages.fetch().then(async (messages) => {
        initialYnotesMessageID = messages.last()?.id;
        if (!initialYnotesMessageID) {
            initialYnotesMessageID = (await ynotesChannel.send(ynotesContent)).id;
        }
        setInterval(() => {
            ynotesChannel.messages.fetch().then((fetchedMessages) => {
                const messagesToDelete = fetchedMessages.filter((m) => (Date.now() - m.createdTimestamp) > 60000 && m.id !== initialYnotesMessageID);
                ynotesChannel.bulkDelete(messagesToDelete);
            });
        }, 10000);
    });
    apolloChannel = client.channels.cache.get(config.supportApolloChannel) as TextChannel;
    apolloChannel.messages.fetch().then(async (messages) => {
        initialApolloMessageID = messages.last()?.id;
        if (!initialApolloMessageID) {
            initialApolloMessageID = (await apolloChannel.send(apolloContent)).id;
        }
        setInterval(() => {
            apolloChannel.messages.fetch().then((fetchedMessages) => {
                const messagesToDelete = fetchedMessages.filter((m) => (Date.now() - m.createdTimestamp) > 60000 && m.id !== initialApolloMessageID);
                apolloChannel.bulkDelete(messagesToDelete);
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
    if (relatedMessageData) {
        if (relatedMessageData.channelID === ynotesChannel.id) {
            ynotesChannel.messages.fetch(relatedMessageData.messageID).then((m) => {
                m.delete();
                clearTimeout(relatedMessageData.timeout);
                relatedMessages.delete(message.id);
            });
        } else if (relatedMessageData.channelID === apolloChannel.id) {
            apolloChannel.messages.fetch(relatedMessageData.messageID).then((m) => {
                m.delete();
                clearTimeout(relatedMessageData.timeout);
                relatedMessages.delete(message.id);
            });
        }
    }
})
function endOfSupportPremadeMessages(input: String) {
    return (keywords.keywords.some(kw => input.toLowerCase().includes(kw)))
}

client.on('message', (message) => {
    if (message.partial) return;
    if (message.author.bot) return;
    if (endOfSupportPremadeMessages(message.content)) {
        message.channel.send(keywords.endofsupport);
    }
    if (message.channel.id === config.supportYnotesChannel) {
        const answer = issuesYnotes.find((i, indx) => (indx + 1).toString() === message.content);
        if (answer) {
            sendAndDeleteAfter(
                message,
                `Salut ${message.author.toString()}! ${answer.answer}`
            );
        } else {
            sendAndDeleteAfter(
                message,
                `Bonjour ${message.author.toString()}, veuillez envoyer le numéro du problème que vous rencontrez.`
            );
        }
    } if (message.channel.id === config.supportApolloChannel) {
        const answer = issuesApollo.find((i, indx) => (indx + 1).toString() === message.content);
        if (answer) {
            sendAndDeleteAfter(
                message,
                `Salut ${message.author.toString()}! ${answer.answer}`
            );
        } else {
            sendAndDeleteAfter(
                message,
                `Bonjour ${message.author.toString()}, veuillez envoyer le numéro du problème que vous rencontrez.`
            );
        }
    }
});
