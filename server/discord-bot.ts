import { Client, GatewayIntentBits, Events } from 'discord.js';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=discord',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Discord not connected');
  }
  return accessToken;
}

export async function startDiscordBot() {
  try {
    const token = await getAccessToken();

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
