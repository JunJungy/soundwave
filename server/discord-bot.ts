import { Client, GatewayIntentBits, Events } from 'discord.js';

export async function startDiscordBot() {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    
    if (!token) {
      console.log('Discord bot token not configured - skipping bot startup');
      console.log('To start the Discord bot, add your DISCORD_BOT_TOKEN in Secrets');
      return null;
    }

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    client.once(Events.ClientReady, (readyClient) => {
      console.log(`✓ Discord bot is online as ${readyClient.user.tag}`);
    });

    client.on(Events.MessageCreate, async (message) => {
      // Ignore messages from bots
      if (message.author.bot) return;

      // Respond to !ping command
      if (message.content === '!ping') {
        await message.reply('Pong! 🏓');
      }

      // Respond to !help command
      if (message.content === '!help') {
        await message.reply(
          '**Soundwave Discord Bot**\n' +
          'Available commands:\n' +
          '• `!ping` - Check if bot is online\n' +
          '• `!help` - Show this help message'
        );
      }
    });

    client.on(Events.Error, (error) => {
      console.error('Discord client error:', error);
    });

    await client.login(token);
    
    return client;
  } catch (error) {
    console.error('Failed to start Discord bot:', error);
    throw error;
  }
}
