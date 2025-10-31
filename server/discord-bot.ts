import { 
  Client, 
  GatewayIntentBits, 
  Events, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ComponentType,
  REST,
  Routes,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
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
          description: 'View your Soundwave account information or create a new account',
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

    // Handle all interactions (commands, modals, select menus)
    client.on(Events.InteractionCreate, async (interaction) => {
      // Handle slash commands
      if (interaction.isChatInputCommand()) {
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
              // User doesn't have an account - show account creation options
              const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('create_account_method')
                .setPlaceholder('Choose how to sign up for Soundwave')
                .addOptions([
                  {
                    label: 'Sign Up via Discord',
                    description: 'Create your account right here in Discord',
                    value: 'discord',
                    emoji: '💬'
                  },
                  {
                    label: 'Sign Up on Website',
                    description: 'Get a direct link to register on Soundwave',
                    value: 'website',
                    emoji: '🌐'
                  }
                ]);

              const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

              const embed = new EmbedBuilder()
                .setColor(0x9333EA)
                .setTitle('Welcome to Soundwave!')
                .setDescription('You don\'t have a Soundwave account yet. Choose how you\'d like to sign up:')
                .addFields(
                  {
                    name: '💬 Sign Up via Discord',
                    value: 'Quick and easy - create your account right here in this conversation',
                    inline: false
                  },
                  {
                    name: '🌐 Sign Up on Website',
                    value: 'Prefer the full web experience - get a direct link to our sign-up page',
                    inline: false
                  }
                )
                .setThumbnail(interaction.user.displayAvatarURL())
                .setFooter({ 
                  text: 'Soundwave - Music Streaming Platform',
                  iconURL: interaction.user.displayAvatarURL() 
                });

              await interaction.reply({
                embeds: [embed],
                components: [row]
              });
              return;
            }

            // User has an account - show account info with type selector
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
      }

      // Handle select menu interactions
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'create_account_method') {
          const method = interaction.values[0];

          if (method === 'discord') {
            // Show modal for account creation
            const modal = new ModalBuilder()
              .setCustomId('create_account_modal')
              .setTitle('Sign Up for Soundwave');

            const usernameInput = new TextInputBuilder()
              .setCustomId('username')
              .setLabel('Choose Your Username')
              .setPlaceholder('Enter a unique username (min 3 characters)')
              .setMinLength(3)
              .setMaxLength(30)
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const passwordInput = new TextInputBuilder()
              .setCustomId('password')
              .setLabel('Create Your Password')
              .setPlaceholder('Enter a secure password (min 8 characters)')
              .setMinLength(8)
              .setMaxLength(100)
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(usernameInput);
            const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(passwordInput);

            modal.addComponents(firstRow, secondRow);

            await interaction.showModal(modal);
          } else if (method === 'website') {
            // Get the website URL from environment or use a default
            const websiteUrl = process.env.REPLIT_DEV_DOMAIN 
              ? `https://${process.env.REPLIT_DEV_DOMAIN}`
              : 'https://soundwave.replit.app';

            const embed = new EmbedBuilder()
              .setColor(0x9333EA)
              .setTitle('Sign Up on Website')
              .setDescription(`Click the link below to sign up for Soundwave:\n\n🔗 **[Sign Up Now](${websiteUrl})**\n\nAfter signing up, you can link your account to Discord using the \`/link\` command.`)
              .setThumbnail(interaction.user.displayAvatarURL())
              .setFooter({ 
                text: 'Soundwave - Music Streaming Platform',
                iconURL: interaction.user.displayAvatarURL() 
              });

            await interaction.update({
              embeds: [embed],
              components: []
            });
          }
        }
      }

      // Handle modal submissions
      if (interaction.isModalSubmit()) {
        if (interaction.customId === 'create_account_modal') {
          try {
            const username = interaction.fields.getTextInputValue('username');
            const password = interaction.fields.getTextInputValue('password');

            // Check if username already exists
            const existingUser = await storage.getUserByUsername(username);
            if (existingUser) {
              await interaction.reply({
                content: '❌ Username already taken. Please choose a different username.',
                ephemeral: true
              });
              return;
            }

            // Check if Discord ID is already linked
            const existingLink = await storage.getUserByDiscordId(interaction.user.id);
            if (existingLink) {
              await interaction.reply({
                content: `❌ Your Discord account is already linked to **${existingLink.username}**. Use \`/unlink\` first if you want to create a new account.`,
                ephemeral: true
              });
              return;
            }

            // Create the account (storage.createUser will hash the password)
            const newUser = await storage.createUser({
              username,
              password
            });

            // Link Discord ID immediately
            await storage.updateUser(newUser.id, { 
              discordId: interaction.user.id 
            });

            // Success message
            const embed = new EmbedBuilder()
              .setColor(0x10B981) // Green for success
              .setTitle('✅ Welcome to Soundwave!')
              .setDescription(`Your account has been created successfully, **${username}**!\n\nYou can now sign in to the website using these credentials.`)
              .addFields(
                { name: 'Username', value: username, inline: true },
                { name: 'Discord Linked', value: '✅ Yes', inline: true }
              )
              .setThumbnail(interaction.user.displayAvatarURL())
              .setFooter({ 
                text: 'Use /account anytime to view your account details',
                iconURL: interaction.user.displayAvatarURL() 
              })
              .setTimestamp();

            await interaction.reply({
              embeds: [embed],
              ephemeral: true
            });

            // Log account creation
            console.log(`✓ Discord account created: ${username} (${interaction.user.tag})`);

          } catch (error) {
            console.error('Account creation error:', error);
            await interaction.reply({
              content: '❌ An error occurred while creating your account. Please try again.',
              ephemeral: true
            });
          }
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
