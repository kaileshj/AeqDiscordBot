require('dotenv').config();

module.exports = {
    name: 'log',
    description: 'Logs the application in the ticket the command is run in',
    async execute(interaction) {
        const channel = interaction.channel;
        await interaction.deferReply();
    
        try {
            const messages = await channel.messages.fetch({ limit: 100 });
    
            const ticketBotMessage = messages.find(msg => msg.author.id === process.env.TICKET_BOT_ID && msg.mentions.users.size > 0);
            if (!ticketBotMessage) {
                await interaction.editReply('No recent message from TicketBot mentioning a user was found.');
                return;
            }
    
            const mentionedUser = ticketBotMessage.mentions.users.first();
            if (!mentionedUser) {
                await interaction.editReply('TicketBot message does not contain a user mention.');
                return;
            }
    
            const userMessages = messages.filter(msg => msg.author.id === mentionedUser.id);
    
            if (userMessages.size === 0) {
                await interaction.editReply(`No messages found from the mentioned user: ${mentionedUser.tag}`);
                return;
            }
    
            const formattedLogMessages = userMessages.map(msg => `${msg.content}`).join('\n');
            const logChannel = await interaction.client.channels.fetch(process.env.LOG_CHANNEL_ID);
            const pingChannelApplication = await interaction.client.channels.fetch(process.env.PING_CHANNEL_ID);
            const pingChannelPromotion = await interaction.client.channels.fetch(process.env.PROMOTION_CHANNEL_ID);
    
            const shouldGoToApplicationChannel = ticketBotMessage.content.includes('community') || ticketBotMessage.content.includes('guild application');
            const targetChannel = shouldGoToApplicationChannel ? pingChannelApplication : pingChannelPromotion;
    
            const MAX_MESSAGE_LENGTH = 1989;

            const sendChunkedMessages = async (channel, text) => {
                for (let i = 0; i < text.length; i += MAX_MESSAGE_LENGTH) {
                    const end = Math.min(text.length, i + MAX_MESSAGE_LENGTH);
                    const chunk = text.substring(i, end);
                    await channel.send(`\`\`\`${chunk}\`\`\``);
                }
            };
            
            if (logChannel) {
                await interaction.editReply('Your application is being reviewed!');
                if (formattedLogMessages.length <= MAX_MESSAGE_LENGTH) {
                    await logChannel.send(`\`\`\`${formattedLogMessages}\`\`\``);
                } else {
                    await sendChunkedMessages(logChannel, formattedLogMessages);
                }
            } else {
                await interaction.editReply('Log channel not found.');
            }
        
            if (targetChannel) {
                if (formattedLogMessages.length <= MAX_MESSAGE_LENGTH) {
                    await targetChannel.send(`@here`+`\`\`\`${formattedLogMessages}\`\`\``);
                } else {
                    await targetChannel.send(`@here`)
                    await sendChunkedMessages(targetChannel, formattedLogMessages);
                }
            } else {
                await interaction.editReply('Target ping channel not found.');
            }
        } catch (error) {
            console.error('Error handling log command:', error);
            await interaction.editReply({ content: 'An error occurred while processing the command.', ephemeral: true });
        }
    }
};    