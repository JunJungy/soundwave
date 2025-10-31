import { 
  Client, 
  GatewayIntentBits, 
  Events, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ComponentType,
  REST,
  Routes
} from 'discord.js';
import { storage } from './storage';

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

    client.once(Events.ClientReady, async (readyClient) => {
      console.log(`✓ Discord bot is online as ${readyClient.user.tag}`);
      
      // Register slash commands
      const commands = [
        {
          name: 'account',
          description: 'View your Soundwave account information',
        },
        {
          name: 'link',
          description: 'Link your Discord account to Soundwave using a code',
          options: [
            {
              name: 'code',
              description: 'Your 6-digit link code from Soundwave settings',
              type: 3, // STRING type
              required: true,
            },
          ],
        },
        {
          name: 'unlink',
          description: 'Unlink your Discord account from Soundwave',
        },
      ];

      const rest = new REST({ version: '10' }).setToken(token);

      try {
        await rest.put(
          Routes.applicationCommands(readyClient.user.id),
          { body: commands }
        );
        console.log('✓ Slash commands registered');
      } catch (error) {
        console.error('Failed to register slash commands:', error);
      }
    });

    // Handle slash commands
    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      if (interaction.commandName === 'link') {
        const code = interaction.options.getString('code', true);
        
        try {
          // Find user by link code
          const allUsers = await storage.getAllUsers();
          const user = allUsers.find(u => {
            if (!u.discordLinkCode || !u.discordLinkCodeExpiry) return false;
            if (u.discordLinkCode !== code) return false;
            // Check if code is expired
            const expiry = new Date(u.discordLinkCodeExpiry);
            return expiry > new Date();
          });

          if (!user) {
            await interaction.reply({
              content: '❌ Invalid or expired link code. Please generate a new code from your Soundwave account settings.',
              ephemeral: true
            });
            return;
          }

          // Check if Discord ID is already linked to another account
          const existingLink = await storage.getUserByDiscordId(interaction.user.id);
          if (existingLink && existingLink.id !== user.id) {
            await interaction.reply({
              content: `❌ Your Discord account is already linked to **${existingLink.username}**. Use \`/unlink\` first if you want to link a different account.`,
              ephemeral: true
            });
            return;
          }

          // Link Discord ID and clear the link code
          await storage.updateUser(user.id, { 
            discordId: interaction.user.id,
            discordLinkCode: null,
            discordLinkCodeExpiry: null
          });

          await interaction.reply({
            content: `✅ Successfully linked your Discord account to **${user.username}**!\n\nYou can now use \`/account\` to view your account info.`,
            ephemeral: true
          });
        } catch (error) {
          console.error('Link command error:', error);
          await interaction.reply({
            content: '❌ An error occurred while linking your account. Please try again.',
            ephemeral: true
          });
        }
      }

      if (interaction.commandName === 'unlink') {
        try {
          const user = await storage.getUserByDiscordId(interaction.user.id);

          if (!user) {
            await interaction.reply({
              content: '❌ Your Discord account is not linked to any Soundwave account.',
              ephemeral: true
            });
            return;
          }

          // Unlink Discord ID
          await storage.updateUser(user.id, { discordId: null });

          await interaction.reply({
            content: `✅ Successfully unlinked your Discord account from **${user.username}**.`,
            ephemeral: true
          });
        } catch (error) {
          console.error('Unlink command error:', error);
          await interaction.reply({
            content: '❌ An error occurred while unlinking your account. Please try again.',
            ephemeral: true
          });
        }
      }

      if (interaction.commandName === 'account') {
        try {
          // Find user by Discord ID
          const user = await storage.getUserByDiscordId(interaction.user.id);
          
          if (!user) {
            await interaction.reply({
              content: '❌ Your Discord account is not linked to a Soundwave account.\n\nTo link your account:\n1. Go to your Soundwave account settings\n2. Generate a Discord link code\n3. Use \`/link code:YOUR_CODE\` here',
              ephemeral: true
            });
            return;
          }

          // Create select menu
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('account_type')
            .setPlaceholder('Select account type to view')
            .addOptions([
              {
                label: 'Normal Account',
                description: 'View your general account information',
                value: 'normal',
                emoji: '👤'
              },
              {
                label: 'Artist Account',
                description: 'View your artist stats and information',
                value: 'artist',
                emoji: '🎵'
              }
            ]);

          const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

          // Get initial account info (normal view)
          const embed = await createNormalAccountEmbed(user, interaction);

          const response = await interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true
          });

          // Create collector for select menu
          const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 300000 // 5 minutes
          });

          collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
              await i.reply({ 
                content: 'This menu is not for you!', 
                ephemeral: true 
              });
              return;
            }

            const selectedType = i.values[0];
            let newEmbed;

            if (selectedType === 'normal') {
              newEmbed = await createNormalAccountEmbed(user, interaction);
            } else {
              newEmbed = await createArtistAccountEmbed(user, interaction);
            }

            await i.update({ embeds: [newEmbed] });
          });

        } catch (error) {
          console.error('Account command error:', error);
          await interaction.reply({
            content: '❌ An error occurred while fetching your account. Please try again.',
            ephemeral: true
          });
        }
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

async function createNormalAccountEmbed(user: any, interaction: any) {
  const playlists = await storage.getPlaylists(user.id);
  const accountAge = user.createdAt ? 
    Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 
    0;

  const embed = new EmbedBuilder()
    .setColor(0x9333EA) // Purple accent color
    .setTitle(`${user.username}'s Account`)
    .setDescription('Your Soundwave account details')
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      { name: 'Username', value: user.username, inline: true },
      { name: 'Account Type', value: user.isArtist ? '🎵 Artist' : '👤 Normal User', inline: true },
      { name: 'Admin', value: user.isAdmin ? '✅ Yes' : '❌ No', inline: true },
      { name: 'Playlists Created', value: playlists.length.toString(), inline: true },
      { name: 'Account Age', value: `${accountAge} days`, inline: true },
      { name: 'Email', value: user.email || 'Not set', inline: true }
    )
    .setFooter({ 
      text: `Linked Discord: ${interaction.user.tag}`, 
      iconURL: interaction.user.displayAvatarURL() 
    })
    .setTimestamp();

  return embed;
}

async function createArtistAccountEmbed(user: any, interaction: any) {
  const artist = await storage.getArtistByUserId(user.id);

  if (!artist || !user.isArtist) {
    const embed = new EmbedBuilder()
      .setColor(0xEF4444) // Red for error
      .setTitle('Not an Artist')
      .setDescription('You don\'t have an artist account yet.\n\nApply to become an artist on the Soundwave app!')
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ 
        text: `Linked Discord: ${interaction.user.tag}`, 
        iconURL: interaction.user.displayAvatarURL() 
      })
      .setTimestamp();
    return embed;
  }

  const songs = await storage.getSongsByArtist(artist.id);
  const totalStreams = songs.reduce((sum, song) => sum + (song.streams || 0), 0);
  const publishedSongs = songs.filter(s => s.releaseStatus === 'published').length;
  
  // Get follower count
  const followers = await storage.getFollowersByArtist(artist.id);
  const followerCount = followers.length;

  const embed = new EmbedBuilder()
    .setColor(0x9333EA) // Purple accent color
    .setTitle(`${artist.name}'s Artist Profile`)
    .setDescription(artist.bio || 'No bio available')
    .setThumbnail(artist.imageUrl || interaction.user.displayAvatarURL())
    .addFields(
      { name: 'Artist Name', value: artist.name, inline: true },
      { name: 'Genre', value: artist.genre || 'Not specified', inline: true },
      { name: 'Verification', value: artist.verificationStatus === 'verified' ? '✅ Verified' : '⏳ Pending', inline: true },
      { name: 'Total Streams', value: totalStreams.toLocaleString(), inline: true },
      { name: 'Published Songs', value: publishedSongs.toString(), inline: true },
      { name: 'Total Songs', value: songs.length.toString(), inline: true },
      { name: 'Followers', value: followerCount.toLocaleString(), inline: true },
      { name: 'Verified Badge', value: artist.verified ? '✅ Yes' : '❌ No', inline: true }
    )
    .setFooter({ 
      text: `Linked Discord: ${interaction.user.tag}`, 
      iconURL: interaction.user.displayAvatarURL() 
    })
    .setTimestamp();

  return embed;
}
