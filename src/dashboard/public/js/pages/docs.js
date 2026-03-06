// ── Documentation page (professional-grade, bleed/dyno/roti inspired) ──

/* ─── command data ─── */
function getDocsCategories() {
  return [
    {
      id: 'moderation', icon: '🛡️', title: 'Moderation', color: '#ef4444',
      desc: 'Comprehensive moderation toolkit to keep your server safe and organized — bans, mutes, warnings, role management, and advanced tools.',
      commands: [
        { name: 'ban', aliases: [], slash: true, perms: ['BanMembers'], usage: '.ban <user> [reason]', desc: 'Permanently ban a user from the server.', params: [{ n: 'user', d: 'User mention or ID', r: true }, { n: 'reason', d: 'Reason for the ban', r: false }], examples: ['.ban @user Spamming', '.ban 123456789 Advertising'] },
        { name: 'kick', aliases: [], slash: true, perms: ['KickMembers'], usage: '.kick <user> [reason]', desc: 'Kick a user from the server. They can rejoin with an invite.', params: [{ n: 'user', d: 'User mention or ID', r: true }, { n: 'reason', d: 'Reason for the kick', r: false }], examples: ['.kick @user Being rude'] },
        { name: 'mute', aliases: [], slash: true, perms: ['ModerateMembers'], usage: '.mute <user> <duration> [reason]', desc: 'Timeout a user for a specified duration. Uses Discord\'s native timeout.', params: [{ n: 'user', d: 'User mention or ID', r: true }, { n: 'duration', d: 'Duration (e.g. 1h, 30m, 1d)', r: true }, { n: 'reason', d: 'Reason for the mute', r: false }], examples: ['.mute @user 1h Spam', '.mute @user 30m'] },
        { name: 'unmute', aliases: [], slash: true, perms: ['ModerateMembers'], usage: '.unmute <user>', desc: 'Remove timeout from a muted user.', params: [{ n: 'user', d: 'User mention or ID', r: true }], examples: ['.unmute @user'] },
        { name: 'warn', aliases: [], slash: false, perms: ['ModerateMembers'], usage: '.warn <user> <reason>', desc: 'Issue an official warning to a user. Warnings are logged and tracked.', params: [{ n: 'user', d: 'User mention or ID', r: true }, { n: 'reason', d: 'Reason for the warning', r: true }], examples: ['.warn @user First offense', '.warn @user Spam warning'] },
        { name: 'warnings', aliases: [], slash: false, perms: ['ModerateMembers'], usage: '.warnings <user>', desc: 'View all active warnings for a user with timestamps and reasons.', params: [{ n: 'user', d: 'User mention or ID', r: true }], examples: ['.warnings @user'] },
        { name: 'clearwarnings', aliases: [], slash: false, perms: ['ModerateMembers'], usage: '.clearwarnings <user>', desc: 'Clear all warnings from a user\'s record.', params: [{ n: 'user', d: 'User mention or ID', r: true }], examples: ['.clearwarnings @user'] },
        { name: 'delete', aliases: ['del', 'purge'], slash: true, perms: ['ManageMessages'], usage: '.delete <amount> [@user]', desc: 'Bulk delete messages in the current channel. Optionally filter by user.', params: [{ n: 'amount', d: 'Number of messages (1-100)', r: true }, { n: 'user', d: 'Filter by user', r: false }], examples: ['.delete 50', '.delete 10 @user'] },
        { name: 'lock', aliases: [], slash: false, perms: ['ManageChannels'], usage: '.lock [channel] [reason]', desc: 'Lock a channel to prevent members from sending messages.', params: [{ n: 'channel', d: 'Channel mention (default: current)', r: false }, { n: 'reason', d: 'Reason shown to members', r: false }], examples: ['.lock', '.lock #general Cleaning chat'] },
        { name: 'unlock', aliases: [], slash: false, perms: ['ManageChannels'], usage: '.unlock [channel]', desc: 'Unlock a previously locked channel.', params: [{ n: 'channel', d: 'Channel mention (default: current)', r: false }], examples: ['.unlock', '.unlock #general'] },
        { name: 'slowmode', aliases: [], slash: false, perms: ['ManageChannels'], usage: '.slowmode <seconds>', desc: 'Set the slowmode interval for the current channel.', params: [{ n: 'seconds', d: 'Slowmode delay in seconds (0 to disable)', r: true }], examples: ['.slowmode 5', '.slowmode 0'] },
        { name: 'detain', aliases: [], slash: false, perms: ['Administrator'], usage: '.detain <user> [reason]', desc: 'Detain a user — strips roles and applies a restricted role with limited permissions.', params: [{ n: 'user', d: 'User mention or ID', r: true }, { n: 'reason', d: 'Reason for detention', r: false }], examples: ['.detain @user Suspicious activity'] },
        { name: 'imute', aliases: [], slash: false, perms: ['ManageMessages'], usage: '.imute <user> [duration]', desc: 'Image/attachment mute — prevents a user from sending images.', params: [{ n: 'user', d: 'User mention or ID', r: true }, { n: 'duration', d: 'Duration (optional)', r: false }], examples: ['.imute @user 2h'] },
        { name: 'softban', aliases: [], slash: false, perms: ['BanMembers'], usage: '.softban <user> [reason]', desc: 'Ban and immediately unban a user to purge their recent messages.', params: [{ n: 'user', d: 'User mention or ID', r: true }, { n: 'reason', d: 'Reason for softban', r: false }], examples: ['.softban @user Advertising'] },
        { name: 'tempban', aliases: [], slash: false, perms: ['BanMembers'], usage: '.tempban <user> <duration> [reason]', desc: 'Temporarily ban a user. They will be automatically unbanned after the duration.', params: [{ n: 'user', d: 'User mention or ID', r: true }, { n: 'duration', d: 'Ban duration (e.g. 7d, 24h)', r: true }, { n: 'reason', d: 'Reason for ban', r: false }], examples: ['.tempban @user 7d Repeated warnings'] },
        { name: 'massban', aliases: [], slash: false, perms: ['Administrator'], usage: '.massban <user1> <user2> ...', desc: 'Ban multiple users at once. Useful for cleaning up raids.', params: [{ n: 'users', d: 'Multiple user mentions or IDs', r: true }], examples: ['.massban @user1 @user2 @user3'] },
        { name: 'masskick', aliases: [], slash: false, perms: ['Administrator'], usage: '.masskick <user1> <user2> ...', desc: 'Kick multiple users at once.', params: [{ n: 'users', d: 'Multiple user mentions or IDs', r: true }], examples: ['.masskick @user1 @user2'] },
        { name: 'role', aliases: [], slash: false, perms: ['ManageRoles'], usage: '.role <user> <role>', desc: 'Toggle a role for a member — adds if they don\'t have it, removes if they do.', params: [{ n: 'user', d: 'User mention or ID', r: true }, { n: 'role', d: 'Role mention or name', r: true }], examples: ['.role @user Moderator'] },
        { name: 'roleadd', aliases: [], slash: false, perms: ['ManageRoles'], usage: '.roleadd <user> <role>', desc: 'Add a specific role to a user.', params: [{ n: 'user', d: 'User mention or ID', r: true }, { n: 'role', d: 'Role mention or name', r: true }], examples: ['.roleadd @user VIP'] },
        { name: 'roleremove', aliases: [], slash: false, perms: ['ManageRoles'], usage: '.roleremove <user> <role>', desc: 'Remove a specific role from a user.', params: [{ n: 'user', d: 'User mention or ID', r: true }, { n: 'role', d: 'Role mention or name', r: true }], examples: ['.roleremove @user VIP'] },
        { name: 'temprole', aliases: [], slash: false, perms: ['ManageRoles'], usage: '.temprole <user> <role> <duration>', desc: 'Give a temporary role that auto-removes after the specified duration.', params: [{ n: 'user', d: 'User mention', r: true }, { n: 'role', d: 'Role mention', r: true }, { n: 'duration', d: 'Duration (e.g. 1d, 12h)', r: true }], examples: ['.temprole @user VIP 7d'] },
        { name: 'nick', aliases: [], slash: false, perms: ['ManageNicknames'], usage: '.nick <user> [nickname]', desc: 'Change a member\'s nickname. Omit nickname to reset.', params: [{ n: 'user', d: 'User mention or ID', r: true }, { n: 'nickname', d: 'New nickname (empty to reset)', r: false }], examples: ['.nick @user Cool Name', '.nick @user'] },
        { name: 'nuke', aliases: [], slash: false, perms: ['ManageChannels'], usage: '.nuke', desc: 'Clone the current channel and delete the original — wipes all messages.', params: [], examples: ['.nuke'] },
        { name: 'modhistory', aliases: [], slash: false, perms: ['ModerateMembers'], usage: '.modhistory <user>', desc: 'View the complete moderation history for a user — bans, kicks, warns, mutes.', params: [{ n: 'user', d: 'User mention or ID', r: true }], examples: ['.modhistory @user'] },
        { name: 'modstats', aliases: [], slash: false, perms: ['ModerateMembers'], usage: '.modstats', desc: 'View moderation statistics — actions taken by each moderator.', params: [], examples: ['.modstats'] },
        { name: 'snapshot', aliases: [], slash: false, perms: ['Administrator'], usage: '.snapshot', desc: 'Take a snapshot of all member roles for backup/restore purposes.', params: [], examples: ['.snapshot'] },
        { name: 'voidstaff', aliases: [], slash: false, perms: ['Administrator'], usage: '.voidstaff <user>', desc: 'Strip all staff/admin roles from a user immediately.', params: [{ n: 'user', d: 'User mention or ID', r: true }], examples: ['.voidstaff @user'] },
        { name: 'topic', aliases: [], slash: false, perms: ['ManageChannels'], usage: '.topic <text>', desc: 'Set the current channel\'s topic.', params: [{ n: 'text', d: 'New channel topic', r: true }], examples: ['.topic Welcome to general chat!'] },
        { name: 'notes', aliases: [], slash: false, perms: ['ModerateMembers'], usage: '.notes <user> [note]', desc: 'Add or view moderator notes on a user.', params: [{ n: 'user', d: 'User mention or ID', r: true }, { n: 'note', d: 'Note content', r: false }], examples: ['.notes @user Previous offender', '.notes @user'] },
        { name: 'reason', aliases: [], slash: false, perms: ['ModerateMembers'], usage: '.reason <case#> <reason>', desc: 'Update the reason for a moderation case.', params: [{ n: 'case', d: 'Case number', r: true }, { n: 'reason', d: 'New reason', r: true }], examples: ['.reason 42 Updated: repeated spam'] },
      ]
    },
    {
      id: 'antinuke', icon: '🔒', title: 'Anti-Nuke', color: '#f59e0b',
      desc: 'Advanced server protection system — monitors destructive actions like mass bans, channel deletions, role modifications, and webhook abuse in real-time.',
      commands: [
        { name: 'antinuke', aliases: ['antiwizard'], slash: true, perms: ['Administrator'], usage: '.antinuke [subcommand]', desc: 'Configure the full anti-nuke protection system with 10+ protection modules, presets, and punishments.', params: [{ n: 'subcommand', d: 'enable / disable / wizard / preset / whitelist / settings', r: false }], examples: ['.antinuke enable', '.antinuke wizard', '.antinuke preset strict', '.antinuke ban threshold 3', '.antinuke whitelist add @user'],
          subcommands: ['enable', 'disable', 'wizard', 'preset strict|recommended|light', 'ban threshold <n>', 'kick threshold <n>', 'channel threshold <n>', 'role threshold <n>', 'webhook threshold <n>', 'emoji threshold <n>', 'botadd on|off', 'vanity on|off', 'prune on|off', 'permissions on|off', 'whitelist add|remove <user>', 'settings'],
          modules: ['ban', 'kick', 'role', 'channel', 'webhook', 'emoji', 'botadd', 'vanity', 'prune', 'permissions'],
          punishments: ['protocol', 'strip', 'kick', 'ban', 'timeout']
        },
      ]
    },
    {
      id: 'antiraid', icon: '🛡️', title: 'Anti-Raid', color: '#f97316',
      desc: 'Real-time raid detection and response — monitors join rates, detects suspicious accounts, and triggers automated lockdown.',
      commands: [
        { name: 'antiraid', aliases: ['ar'], slash: false, perms: ['ManageGuild'], usage: '.antiraid <subcommand>', desc: 'Configure raid protection with join-rate monitoring, new account filtering, and whitelisting.', params: [{ n: 'subcommand', d: 'enable / massjoin / avatar / newaccounts / whitelist', r: true }], examples: ['.antiraid enable', '.antiraid massjoin threshold 5', '.antiraid newaccounts 7d', '.antiraid whitelist add @user'],
          subcommands: ['enable', 'disable', 'massjoin threshold <n>', 'avatar', 'newaccounts <age>', 'whitelist add|remove <user>']
        },
      ]
    },
    {
      id: 'automod', icon: '🤖', title: 'Automod', color: '#8b5cf6',
      desc: 'Intelligent automatic moderation with 14 filter modules — anti-invite, anti-link, anti-spam, bad words, and more. Supports presets and granular configuration.',
      commands: [
        { name: 'automod', aliases: ['am'], slash: false, perms: ['ManageGuild'], usage: '.automod [subcommand]', desc: 'Configure automatic message moderation with multiple filter modules, presets, ignore lists, and custom punishments.', params: [{ n: 'subcommand', d: 'Module name or configuration action', r: false }], examples: ['.automod enable', '.automod preset moderate', '.automod antiinvite enable', '.automod badwords add toxicword', '.automod ignore add @Moderator'],
          subcommands: ['enable', 'disable', 'preset strict|moderate|light', 'antiinvite enable|disable', 'antilink enable|disable', 'antispam enable|disable', 'anticaps enable|disable', 'antimention enable|disable', 'antiemoji enable|disable', 'badwords add|remove|list', 'maxlines <n>', 'antieveryone enable|disable', 'antizalgo enable|disable', 'anticopypasta enable|disable', 'antiai enable|disable', 'ignore add|remove <role|channel>', 'punishment <module> <warn|delete|mute|kick|ban>'],
          modules: ['antiinvite', 'antilink', 'antispam', 'anticaps', 'antimention', 'antiemoji', 'badwords', 'maxlines', 'antieveryone', 'antirole', 'antizalgo', 'antinewlines', 'anticopypasta', 'antiai'],
          punishments: ['warn', 'delete', 'mute', 'kick', 'ban', 'protocol']
        },
      ]
    },
    {
      id: 'music', icon: '🎵', title: 'Music', color: '#06b6d4',
      desc: 'Lavalink-powered music system with multi-source playback, queue management, 24/7 mode, autoplay, and loop controls.',
      commands: [
        { name: 'play', aliases: ['p'], slash: true, perms: [], usage: '.play <query or URL>', desc: 'Play a song from YouTube, Spotify, SoundCloud, or a direct URL. Adds to queue if already playing.', params: [{ n: 'query', d: 'Song name, URL, or playlist link', r: true }], examples: ['.play Never Gonna Give You Up', '.play https://youtube.com/watch?v=...', '/play Despacito'] },
        { name: 'skip', aliases: [], slash: true, perms: [], usage: '.skip [amount]', desc: 'Skip the currently playing track, or skip multiple tracks at once.', params: [{ n: 'amount', d: 'Number of tracks to skip', r: false }], examples: ['.skip', '.skip 3'] },
        { name: 'stop', aliases: [], slash: true, perms: [], usage: '.stop', desc: 'Stop playback, clear the queue, and disconnect from voice.', params: [], examples: ['.stop'] },
        { name: 'pause', aliases: [], slash: true, perms: [], usage: '.pause', desc: 'Pause the currently playing track.', params: [], examples: ['.pause'] },
        { name: 'resume', aliases: [], slash: true, perms: [], usage: '.resume', desc: 'Resume playback of the paused track.', params: [], examples: ['.resume'] },
        { name: 'queue', aliases: ['q'], slash: true, perms: [], usage: '.queue [page]', desc: 'Show the current music queue with track names, durations, and requesters.', params: [{ n: 'page', d: 'Page number', r: false }], examples: ['.queue', '.queue 2'] },
        { name: 'nowplaying', aliases: [], slash: true, perms: [], usage: '.nowplaying', desc: 'Display the currently playing track with a progress bar and details.', params: [], examples: ['.nowplaying'] },
        { name: 'volume', aliases: [], slash: true, perms: [], usage: '.volume <1-200>', desc: 'Adjust the playback volume. Values above 100 may distort audio.', params: [{ n: 'level', d: 'Volume level (1-200)', r: true }], examples: ['.volume 50', '.volume 100'] },
        { name: 'loop', aliases: [], slash: true, perms: [], usage: '.loop <off|once|all>', desc: 'Set the loop mode — loop a single track, the entire queue, or disable looping.', params: [{ n: 'mode', d: 'off / once / all', r: true }], examples: ['.loop once', '.loop all', '.loop off'] },
        { name: 'shuffle', aliases: [], slash: true, perms: [], usage: '.shuffle', desc: 'Randomly reorder all tracks in the current queue.', params: [], examples: ['.shuffle'] },
        { name: '247', aliases: [], slash: true, perms: [], usage: '.247 [on|off]', desc: 'Toggle 24/7 mode — the bot stays in voice channel even when the queue is empty.', params: [{ n: 'state', d: 'on / off', r: false }], examples: ['.247 on', '.247 off'] },
        { name: 'autoplay', aliases: [], slash: false, perms: [], usage: '.autoplay [on|off]', desc: 'Automatically queue similar tracks when the queue ends.', params: [{ n: 'state', d: 'on / off', r: false }], examples: ['.autoplay on'] },
        { name: 'remove', aliases: [], slash: true, perms: [], usage: '.remove <position>', desc: 'Remove a specific track from the queue by its position number.', params: [{ n: 'position', d: 'Track position in queue', r: true }], examples: ['.remove 3'] },
        { name: 'clear', aliases: [], slash: true, perms: [], usage: '.clear', desc: 'Clear the entire music queue without stopping the current track.', params: [], examples: ['.clear'] },
        { name: 'join', aliases: [], slash: true, perms: [], usage: '.join', desc: 'Make the bot join your current voice channel.', params: [], examples: ['.join'] },
      ]
    },
    {
      id: 'leveling', icon: '📊', title: 'Leveling', color: '#10b981',
      desc: 'Full XP and leveling system with customizable rank cards, role rewards, leaderboards, and voice/message tracking.',
      commands: [
        { name: 'rank', aliases: ['level', 'profile'], slash: true, perms: [], usage: '.rank [@user]', desc: 'Display your or another user\'s rank card with XP, level, and progress.', params: [{ n: 'user', d: 'User to check (default: you)', r: false }], examples: ['.rank', '.rank @user', '/rank'] },
        { name: 'leaderboard', aliases: ['lb', 'leveltop'], slash: true, perms: [], usage: '.leaderboard [page]', desc: 'View the server XP leaderboard with rankings and levels.', params: [{ n: 'page', d: 'Page number', r: false }], examples: ['.leaderboard', '.leaderboard 2'] },
        { name: 'leveling', aliases: [], slash: true, perms: ['ManageGuild'], usage: '.leveling [subcommand]', desc: 'Configure the leveling system — enable/disable, set XP rates, role rewards, and announcement channels.', params: [{ n: 'subcommand', d: 'enable / disable / set / announce', r: false }], examples: ['.leveling enable', '.leveling set multiplier 2', '.leveling announce #levels'] },
        { name: 'addxp', aliases: [], slash: true, perms: ['Administrator'], usage: '.addxp <user> <amount>', desc: 'Manually add XP to a user.', params: [{ n: 'user', d: 'User mention', r: true }, { n: 'amount', d: 'XP amount to add', r: true }], examples: ['.addxp @user 500'] },
        { name: 'removexp', aliases: [], slash: true, perms: ['Administrator'], usage: '.removexp <user> <amount>', desc: 'Remove XP from a user.', params: [{ n: 'user', d: 'User mention', r: true }, { n: 'amount', d: 'XP amount to remove', r: true }], examples: ['.removexp @user 200'] },
        { name: 'setlevel', aliases: [], slash: true, perms: ['Administrator'], usage: '.setlevel <user> <level>', desc: 'Directly set a user\'s level.', params: [{ n: 'user', d: 'User mention', r: true }, { n: 'level', d: 'Level number', r: true }], examples: ['.setlevel @user 10'] },
        { name: 'setxp', aliases: [], slash: true, perms: ['Administrator'], usage: '.setxp <user> <xp>', desc: 'Directly set a user\'s XP amount.', params: [{ n: 'user', d: 'User mention', r: true }, { n: 'xp', d: 'XP amount', r: true }], examples: ['.setxp @user 5000'] },
        { name: 'optout', aliases: [], slash: true, perms: [], usage: '.optout', desc: 'Opt out of the leveling system. Your XP will stop being tracked.', params: [], examples: ['.optout'] },
        { name: 'reset', aliases: [], slash: true, perms: ['Administrator'], usage: '.reset', desc: 'Reset all leveling data for the server.', params: [], examples: ['.reset'] },
        { name: 'cleanup', aliases: [], slash: true, perms: ['Administrator'], usage: '.cleanup [days]', desc: 'Clean up leveling data for users who left the server.', params: [{ n: 'days', d: 'Inactivity threshold in days', r: false }], examples: ['.cleanup 30'] },
      ]
    },
    {
      id: 'stats', icon: '📈', title: 'Statistics', color: '#6366f1',
      desc: 'Comprehensive server analytics — message counts, voice time tracking, invite stats, daily/weekly/monthly reports, and configurable leaderboards.',
      commands: [
        { name: 'stats', aliases: [], slash: false, perms: [], usage: '.stats [@user]', desc: 'View your or another user\'s overall statistics including messages, voice time, and invites.', params: [{ n: 'user', d: 'User to check', r: false }], examples: ['.stats', '.stats @user'] },
        { name: 'messages', aliases: [], slash: true, perms: [], usage: '.messages [@user]', desc: 'View message count statistics for a user.', params: [{ n: 'user', d: 'User to check', r: false }], examples: ['.messages', '.messages @user'] },
        { name: 'voice', aliases: [], slash: false, perms: [], usage: '.voice [@user]', desc: 'View voice time statistics for a user.', params: [{ n: 'user', d: 'User to check', r: false }], examples: ['.voice', '.voice @user'] },
        { name: 'invites', aliases: [], slash: false, perms: [], usage: '.invites [page]', desc: 'View the invite leaderboard.', params: [{ n: 'page', d: 'Page number', r: false }], examples: ['.invites', '.invites 2'] },
        { name: 'inviter', aliases: [], slash: false, perms: [], usage: '.inviter [@user]', desc: 'See who invited you or another user, and their invite count.', params: [{ n: 'user', d: 'User to check', r: false }], examples: ['.inviter', '.inviter @user'] },
        { name: 'daily', aliases: [], slash: false, perms: [], usage: '.daily [@user]', desc: 'View daily activity statistics.', params: [{ n: 'user', d: 'User to check', r: false }], examples: ['.daily'] },
        { name: 'weekly', aliases: [], slash: false, perms: [], usage: '.weekly [@user]', desc: 'View weekly activity statistics.', params: [{ n: 'user', d: 'User to check', r: false }], examples: ['.weekly'] },
        { name: 'monthly', aliases: [], slash: false, perms: [], usage: '.monthly [@user]', desc: 'View monthly activity statistics.', params: [{ n: 'user', d: 'User to check', r: false }], examples: ['.monthly'] },
        { name: 'top', aliases: [], slash: false, perms: [], usage: '.top [type] [page]', desc: 'View top members sorted by messages, voice, or invites.', params: [{ n: 'type', d: 'messages / voice / invites', r: false }, { n: 'page', d: 'Page number', r: false }], examples: ['.top messages', '.top voice 2'] },
        { name: 'leaderboard', aliases: [], slash: true, perms: [], usage: '.leaderboard [type]', desc: 'View the stats leaderboard with customizable sorting.', params: [{ n: 'type', d: 'messages / voice / invites', r: false }], examples: ['.leaderboard messages'] },
        { name: 'channel', aliases: [], slash: false, perms: [], usage: '.channel [#channel]', desc: 'View statistics for a specific channel.', params: [{ n: 'channel', d: 'Channel to check', r: false }], examples: ['.channel #general'] },
        { name: 'statsconfig', aliases: [], slash: false, perms: ['ManageGuild'], usage: '.statsconfig [subcommand]', desc: 'Configure the statistics system for your server.', params: [{ n: 'subcommand', d: 'Configuration action', r: false }], examples: ['.statsconfig'] },
        { name: 'addmessages', aliases: [], slash: true, perms: ['Administrator'], usage: '.addmessages <user> <amount>', desc: 'Manually add message stats to a user.', params: [{ n: 'user', d: 'User mention', r: true }, { n: 'amount', d: 'Message count', r: true }], examples: ['.addmessages @user 100'] },
        { name: 'addvoicetime', aliases: [], slash: true, perms: ['Administrator'], usage: '.addvoicetime <user> <hours>', desc: 'Manually add voice time to a user.', params: [{ n: 'user', d: 'User mention', r: true }, { n: 'hours', d: 'Hours to add', r: true }], examples: ['.addvoicetime @user 5'] },
      ]
    },
    {
      id: 'giveaways', icon: '🎉', title: 'Giveaways', color: '#ec4899',
      desc: 'Full-featured giveaway system with customizable duration, winner count, requirements, and auto-reroll.',
      commands: [
        { name: 'giveaway', aliases: ['gw', 'giveaways'], slash: true, perms: ['ManageGuild'], usage: '.giveaway <subcommand> [options]', desc: 'Create and manage giveaways with full control over duration, prize, winner count, and more.', params: [{ n: 'subcommand', d: 'start / end / list / reroll', r: true }, { n: 'prize', d: 'Prize description', r: false }, { n: 'duration', d: 'Giveaway duration (e.g. 1d, 12h)', r: false }, { n: 'winners', d: 'Number of winners', r: false }], examples: ['.giveaway start Nitro Classic 1d 2', '.giveaway end', '.giveaway list', '.giveaway reroll'],
          subcommands: ['start <prize> <duration> <winners>', 'end [messageID]', 'list', 'reroll [messageID]']
        },
      ]
    },
    {
      id: 'tickets', icon: '🎫', title: 'Tickets', color: '#14b8a6',
      desc: 'Panel-based support ticket system with categories, staff roles, transcripts, auto-close, and claimable tickets.',
      commands: [
        { name: 'ticket', aliases: ['tickets', 't'], slash: false, perms: ['ManageGuild'], usage: '.ticket <subcommand>', desc: 'Full ticket system with panel creation, member management, transcripts, and configuration.', params: [{ n: 'subcommand', d: 'new / add / remove / close / reopen / list / settings', r: true }, { n: 'user', d: 'User for add/remove', r: false }], examples: ['.ticket new', '.ticket add @user', '.ticket close', '.ticket list', '.ticket settings'],
          subcommands: ['new', 'add <user>', 'remove <user>', 'close', 'reopen', 'list', 'settings']
        },
      ]
    },
    {
      id: 'welcome', icon: '👋', title: 'Welcome & Goodbye', color: '#22c55e',
      desc: 'Customizable welcome and goodbye message system with multi-channel support, embed builder, and placeholder variables.',
      commands: [
        { name: 'welcome', aliases: [], slash: true, perms: ['ManageGuild'], usage: '.welcome <subcommand> [options]', desc: 'Configure multi-channel welcome messages with embeds, placeholders, and auto-send.', params: [{ n: 'subcommand', d: 'add / remove / list / config / toggle / test / reset / show', r: true }, { n: 'channel', d: 'Target channel', r: false }], examples: ['.welcome add #welcome', '.welcome config #welcome', '.welcome test', '/welcome add #channel'],
          subcommands: ['add <#channel>', 'remove <#channel>', 'list', 'config <#channel>', 'toggle', 'test', 'reset', 'show'],
          placeholders: ['{user}', '{user.mention}', '{user.tag}', '{user.name}', '{user.id}', '{server}', '{memberCount}', '{user.created_at}', '{user.joined_at}']
        },
        { name: 'goodbye', aliases: [], slash: true, perms: ['ManageGuild'], usage: '.goodbye <subcommand> [options]', desc: 'Configure multi-channel goodbye/farewell messages.', params: [{ n: 'subcommand', d: 'add / remove / list / config / toggle / test / reset / show', r: true }, { n: 'channel', d: 'Target channel', r: false }], examples: ['.goodbye add #goodbye-channel', '.goodbye config #channel', '/goodbye add #farewell'],
          subcommands: ['add <#channel>', 'remove <#channel>', 'list', 'config <#channel>', 'toggle', 'test', 'reset', 'show']
        },
      ]
    },
    {
      id: 'logs', icon: '📝', title: 'Logging', color: '#64748b',
      desc: 'Detailed event logging system — track message edits/deletes, member joins/leaves, role changes, moderation actions, and more.',
      commands: [
        { name: 'logsetup', aliases: [], slash: false, perms: ['ManageGuild'], usage: '.logsetup', desc: 'Interactive setup wizard to configure logging for your server.', params: [], examples: ['.logsetup'] },
        { name: 'logchannel', aliases: ['setchannel', 'setlogchannel'], slash: false, perms: ['ManageGuild'], usage: '.logchannel <category> <#channel|none>', desc: 'Set or remove the channel for a specific log category.', params: [{ n: 'category', d: 'Log category name', r: true }, { n: 'channel', d: 'Channel mention or "none"', r: true }], examples: ['.logchannel moderation #mod-logs', '.logchannel messages #msg-logs', '.logchannel moderation none'] },
        { name: 'logevents', aliases: [], slash: false, perms: ['ManageGuild'], usage: '.logevents', desc: 'View and configure which events are logged.', params: [], examples: ['.logevents'] },
        { name: 'logtoggle', aliases: [], slash: false, perms: ['ManageGuild'], usage: '.logtoggle', desc: 'Toggle the logging system on or off.', params: [], examples: ['.logtoggle'] },
        { name: 'logs', aliases: [], slash: false, perms: ['ManageGuild'], usage: '.logs [page]', desc: 'View recent server logs.', params: [{ n: 'page', d: 'Page number', r: false }], examples: ['.logs', '.logs 2'] },
      ]
    },
    {
      id: 'config', icon: '⚙️', title: 'Server Configuration', color: '#a855f7',
      desc: 'Configure bot behavior — custom prefix, auto-responders, reaction triggers, starboard, birthdays, bump reminders, and command toggles.',
      commands: [
        { name: 'setprefix', aliases: [], slash: false, perms: ['ManageGuild'], usage: '.setprefix <new prefix>', desc: 'Change the bot\'s command prefix for your server.', params: [{ n: 'prefix', d: 'New prefix symbol', r: true }], examples: ['.setprefix !', '.setprefix $'] },
        { name: 'prefix', aliases: [], slash: false, perms: [], usage: '.prefix', desc: 'View the current server prefix.', params: [], examples: ['.prefix'] },
        { name: 'trigger', aliases: ['triggers', 'autoresponder'], slash: false, perms: ['ManageGuild'], usage: '.trigger <subcommand>', desc: 'Create and manage auto-responder triggers with match modes, placeholders, and toggle support.', params: [{ n: 'subcommand', d: 'add / remove / list / edit / matchmode / toggle / info', r: true }], examples: ['.trigger add hello | Hello there!', '.trigger add !greet | Hey {user}!', '.trigger matchmode hello startswith', '.trigger toggle hello'],
          subcommands: ['add <trigger> | <response>', 'remove <trigger>', 'list', 'edit <trigger> | <new response>', 'matchmode <trigger> <exact|startswith|endswith|includes|regex>', 'toggle <trigger>', 'info <trigger>'],
          placeholders: ['{user}', '{user_name}', '{server}', '{channel}', '{args}', '{timestamp}']
        },
        { name: 'reaction', aliases: ['rt', 'reactiontrigger', 'autoreact'], slash: false, perms: ['ManageGuild'], usage: '.reaction <subcommand>', desc: 'Set up auto-reactions — the bot reacts with specified emojis when messages match triggers.', params: [{ n: 'subcommand', d: 'add / remove / list / messages / reset / matchmode', r: true }], examples: ['.reaction add 👍 hello', '.reaction remove 👍 hello', '.reaction matchmode hello startswith', '.reaction messages #selfies 👍 ❤️'],
          subcommands: ['add <emoji> <trigger>', 'remove <emoji> <trigger>', 'list', 'messages <#channel> <emoji1> <emoji2>', 'reset', 'matchmode <trigger> <mode>']
        },
        { name: 'starboard', aliases: [], slash: false, perms: ['ManageGuild'], usage: '.starboard [subcommand]', desc: 'Configure the starboard system — highlight popular messages with customizable emoji thresholds and settings.', params: [{ n: 'subcommand', d: 'set / emoji / selfstar / config / ignore / color', r: false }], examples: ['.starboard set #starboard', '.starboard emoji add ⭐ 3', '.starboard selfstar on', '.starboard color #FFD700'] },
        { name: 'birthday', aliases: ['bday', 'bd'], slash: false, perms: [], usage: '.birthday <subcommand>', desc: 'Birthday system — set your birthday, view upcoming birthdays, and configure announcement channels.', params: [{ n: 'subcommand', d: 'set / view / upcoming / remove / setup', r: true }], examples: ['.birthday set 15/03', '.birthday view @user', '.birthday upcoming', '.birthday setup #announcements'] },
        { name: 'bumpreminder', aliases: ['br', 'bumpr'], slash: true, perms: ['ManageChannels'], usage: '.bumpreminder [subcommand]', desc: 'Get automatic reminders to /bump your server on Disboard.', params: [{ n: 'subcommand', d: 'channel / message / toggle / autolock / autoclean', r: false }], examples: ['.bumpreminder channel #bumps', '.bumpreminder toggle on'] },
        { name: 'customrole', aliases: ['cr', 'crole'], slash: false, perms: ['ManageGuild'], usage: '.customrole <subcommand>', desc: 'Manage custom role aliases — members can self-assign predefined roles.', params: [{ n: 'subcommand', d: 'add / remove / view / reqrole', r: true }], examples: ['.customrole add dev Developer', '.customrole remove artist', '.customrole view'] },
        { name: 'disable', aliases: [], slash: false, perms: ['ManageGuild'], usage: '.disable <command|module>', desc: 'Disable a specific command or module in your server.', params: [{ n: 'target', d: 'Command or module name', r: true }], examples: ['.disable 8ball', '.disable fun'] },
        { name: 'enable', aliases: [], slash: false, perms: ['ManageGuild'], usage: '.enable <command|module>', desc: 'Re-enable a previously disabled command or module.', params: [{ n: 'target', d: 'Command or module name', r: true }], examples: ['.enable 8ball', '.enable fun'] },
      ]
    },
    {
      id: 'general', icon: '💬', title: 'General & Utility', color: '#3b82f6',
      desc: 'Essential utility commands — user/server info, avatars, banners, bot info, suggestions, and more.',
      commands: [
        { name: 'help', aliases: ['h', 'commands', 'cmds'], slash: true, perms: [], usage: '.help [command|category]', desc: 'Browse all commands or get detailed help for a specific command.', params: [{ n: 'target', d: 'Command name or category', r: false }], examples: ['.help', '.help moderation', '.help ban'] },
        { name: 'ping', aliases: ['pong'], slash: true, perms: [], usage: '.ping', desc: 'Check the bot\'s latency and API response time.', params: [], examples: ['.ping'] },
        { name: 'botinfo', aliases: ['bi', 'bot'], slash: true, perms: [], usage: '.botinfo', desc: 'Show detailed bot information — version, uptime, memory usage, server count.', params: [], examples: ['.botinfo'] },
        { name: 'serverinfo', aliases: ['guildinfo', 'si'], slash: true, perms: [], usage: '.serverinfo', desc: 'Show detailed server info — member count, roles, channels, boosts, creation date.', params: [], examples: ['.serverinfo'] },
        { name: 'userinfo', aliases: ['whois', 'ui'], slash: true, perms: [], usage: '.userinfo [@user]', desc: 'Show detailed user profile — join date, roles, badges, permissions.', params: [{ n: 'user', d: 'User to check', r: false }], examples: ['.userinfo', '.userinfo @user'] },
        { name: 'avatar', aliases: ['av', 'pfp'], slash: true, perms: [], usage: '.avatar [@user]', desc: 'Get a user\'s avatar in full resolution with download links.', params: [{ n: 'user', d: 'User to check', r: false }], examples: ['.avatar', '.avatar @user'] },
        { name: 'banner', aliases: ['bg', 'userbanner', 'ub'], slash: true, perms: [], usage: '.banner [@user]', desc: 'Display a user\'s profile banner.', params: [{ n: 'user', d: 'User to check', r: false }], examples: ['.banner', '.banner @user'] },
        { name: 'afk', aliases: [], slash: false, perms: [], usage: '.afk [reason]', desc: 'Set yourself as AFK. Others who mention you will see your status and reason.', params: [{ n: 'reason', d: 'AFK reason', r: false }], examples: ['.afk Be right back', '.afk In a meeting'] },
        { name: 'suggest', aliases: ['suggestion'], slash: true, perms: [], usage: '.suggest <suggestion>', desc: 'Submit a suggestion to the server\'s suggestion channel.', params: [{ n: 'suggestion', d: 'Your suggestion text', r: true }], examples: ['.suggest Add a memes channel', '/suggest More events please'] },
        { name: 'say', aliases: ['broadcast', 'announce'], slash: true, perms: ['ManageGuild'], usage: '.say [#channel] <message>', desc: 'Make the bot send a message. Supports channel targeting, replies, and edits.', params: [{ n: 'channel', d: 'Target channel', r: false }, { n: 'message', d: 'Message content', r: true }], examples: ['.say Hello everyone!', '.say #announcements Big news!'] },
        { name: 'uptime', aliases: [], slash: false, perms: [], usage: '.uptime', desc: 'Show how long the bot has been running.', params: [], examples: ['.uptime'] },
        { name: 'membercount', aliases: ['mc'], slash: false, perms: [], usage: '.membercount', desc: 'Show the total member count of the server.', params: [], examples: ['.membercount'] },
        { name: 'boostcount', aliases: ['bc'], slash: false, perms: [], usage: '.boostcount', desc: 'Show the server boost count and tier level.', params: [], examples: ['.boostcount'] },
        { name: 'invitebot', aliases: [], slash: true, perms: [], usage: '.invitebot', desc: 'Get the bot\'s invite link.', params: [], examples: ['.invitebot'] },
      ]
    },
    {
      id: 'fun', icon: '🎮', title: 'Fun', color: '#f43f5e',
      desc: 'Entertainment commands — 8ball, coinflip, dice, shipping, hacking simulations, and more.',
      commands: [
        { name: '8ball', aliases: ['eightball', 'question'], slash: false, perms: [], usage: '.8ball <question>', desc: 'Ask the magic 8-ball a yes/no question and receive a mystical answer.', params: [{ n: 'question', d: 'Your question', r: true }], examples: ['.8ball Will I pass my exams?', '.8ball Is Discord the best?'] },
        { name: 'coinflip', aliases: ['cf', 'flip', 'toss'], slash: false, perms: [], usage: '.coinflip', desc: 'Flip a coin — heads or tails.', params: [], examples: ['.coinflip'] },
        { name: 'roll', aliases: ['dice', 'random'], slash: false, perms: [], usage: '.roll [limit]', desc: 'Roll a die with a custom upper limit (default: 100).', params: [{ n: 'limit', d: 'Maximum number (default: 100)', r: false }], examples: ['.roll', '.roll 20', '.roll 6'] },
        { name: 'ship', aliases: ['match'], slash: false, perms: [], usage: '.ship [@user1] [@user2]', desc: 'Calculate the love compatibility between two users with a percentage and heart meter.', params: [{ n: 'user1', d: 'First user', r: false }, { n: 'user2', d: 'Second user', r: false }], examples: ['.ship @user1 @user2', '.ship @user'] },
        { name: 'hack', aliases: ['hacker'], slash: false, perms: [], usage: '.hack <user>', desc: 'Run a simulated "hacking" sequence on a user — purely for fun.', params: [{ n: 'user', d: 'User to "hack"', r: true }], examples: ['.hack @user'] },
        { name: 'rate', aliases: ['ratewaifu', 'rating'], slash: false, perms: [], usage: '.rate [user|text]', desc: 'Rate anything or anyone on a scale of 0-100.', params: [{ n: 'subject', d: 'User or text to rate', r: false }], examples: ['.rate @user', '.rate pizza', '.rate'] },
        { name: 'choose', aliases: ['pick', 'choice'], slash: false, perms: [], usage: '.choose <opt1> | <opt2> | ...', desc: 'Randomly pick one option from a list separated by pipes.', params: [{ n: 'options', d: 'Options separated by |', r: true }], examples: ['.choose Pizza | Burger | Tacos', '.choose Yes | No | Maybe'] },
      ]
    },
    {
      id: 'voice', icon: '🔊', title: 'Voice Commands', color: '#0ea5e9',
      desc: 'Full voice channel management — mute, deafen, kick, move, and pull members in bulk or individually.',
      commands: [
        { name: 'vcmute', aliases: [], slash: false, perms: ['MuteMembers'], usage: '.vcmute <user>', desc: 'Server-mute a member in their voice channel.', params: [{ n: 'user', d: 'User mention or ID', r: true }], examples: ['.vcmute @user'] },
        { name: 'vcunmute', aliases: [], slash: false, perms: ['MuteMembers'], usage: '.vcunmute <user>', desc: 'Remove server-mute from a member in voice.', params: [{ n: 'user', d: 'User mention or ID', r: true }], examples: ['.vcunmute @user'] },
        { name: 'vcmuteall', aliases: [], slash: false, perms: ['MuteMembers'], usage: '.vcmuteall', desc: 'Server-mute all members in your current voice channel.', params: [], examples: ['.vcmuteall'] },
        { name: 'vcunmuteall', aliases: [], slash: false, perms: ['MuteMembers'], usage: '.vcunmuteall', desc: 'Unmute all members in your current voice channel.', params: [], examples: ['.vcunmuteall'] },
        { name: 'vcdeafen', aliases: [], slash: false, perms: ['DeafenMembers'], usage: '.vcdeafen <user>', desc: 'Server-deafen a member in their voice channel.', params: [{ n: 'user', d: 'User mention or ID', r: true }], examples: ['.vcdeafen @user'] },
        { name: 'vcundeafen', aliases: [], slash: false, perms: ['DeafenMembers'], usage: '.vcundeafen <user>', desc: 'Remove server-deafen from a member in voice.', params: [{ n: 'user', d: 'User mention or ID', r: true }], examples: ['.vcundeafen @user'] },
        { name: 'vcdeafenall', aliases: [], slash: false, perms: ['DeafenMembers'], usage: '.vcdeafenall', desc: 'Deafen all members in your current voice channel.', params: [], examples: ['.vcdeafenall'] },
        { name: 'vcundeafenall', aliases: [], slash: false, perms: ['DeafenMembers'], usage: '.vcundeafenall', desc: 'Undeafen all members in your current voice channel.', params: [], examples: ['.vcundeafenall'] },
        { name: 'vckick', aliases: [], slash: false, perms: ['MoveMembers'], usage: '.vckick <user>', desc: 'Disconnect a member from their voice channel.', params: [{ n: 'user', d: 'User mention or ID', r: true }], examples: ['.vckick @user'] },
        { name: 'vckickall', aliases: [], slash: false, perms: ['MoveMembers'], usage: '.vckickall', desc: 'Disconnect all members from your voice channel.', params: [], examples: ['.vckickall'] },
        { name: 'vcmove', aliases: [], slash: false, perms: ['MoveMembers'], usage: '.vcmove <user> <#channel>', desc: 'Move a member to a different voice channel.', params: [{ n: 'user', d: 'User mention', r: true }, { n: 'channel', d: 'Target voice channel', r: true }], examples: ['.vcmove @user #lounge'] },
        { name: 'vcmoveall', aliases: [], slash: false, perms: ['MoveMembers'], usage: '.vcmoveall <#channel>', desc: 'Move all members to a different voice channel.', params: [{ n: 'channel', d: 'Target voice channel', r: true }], examples: ['.vcmoveall #meeting'] },
        { name: 'vcpull', aliases: [], slash: false, perms: ['MoveMembers'], usage: '.vcpull', desc: 'Pull all members from other channels into your voice channel.', params: [], examples: ['.vcpull'] },
        { name: 'vclist', aliases: [], slash: false, perms: [], usage: '.vclist', desc: 'List all members in your current voice channel.', params: [], examples: ['.vclist'] },
      ]
    },
    {
      id: 'misc', icon: '✨', title: 'Miscellaneous', color: '#d946ef',
      desc: 'Utility tools — emoji management, sticker tools, message sniping, embed builder, and reaction tracking.',
      commands: [
        { name: 'snipe', aliases: ['s'], slash: false, perms: [], usage: '.snipe [index]', desc: 'Recover the most recently deleted message in the channel.', params: [{ n: 'index', d: 'Message index (default: 1)', r: false }], examples: ['.snipe', '.snipe 3'] },
        { name: 'editsnipe', aliases: [], slash: false, perms: [], usage: '.editsnipe [index]', desc: 'View the original content of the most recently edited message.', params: [{ n: 'index', d: 'Message index', r: false }], examples: ['.editsnipe', '.editsnipe 2'] },
        { name: 'clearsnipe', aliases: [], slash: false, perms: ['ManageMessages'], usage: '.clearsnipe', desc: 'Clear the snipe cache for the current channel.', params: [], examples: ['.clearsnipe'] },
        { name: 'reactionsnipe', aliases: [], slash: false, perms: [], usage: '.reactionsnipe', desc: 'Snipe the most recently removed reaction.', params: [], examples: ['.reactionsnipe'] },
        { name: 'reactionhistory', aliases: [], slash: false, perms: [], usage: '.reactionhistory <messageID>', desc: 'View the full reaction history of a message.', params: [{ n: 'messageID', d: 'Message ID to check', r: true }], examples: ['.reactionhistory 123456789'] },
        { name: 'addemoji', aliases: [], slash: false, perms: ['ManageEmojisAndStickers'], usage: '.addemoji <emoji|url> [name]', desc: 'Add a custom emoji to the server from an existing emoji or image URL.', params: [{ n: 'emoji', d: 'Emoji or image URL', r: true }, { n: 'name', d: 'Custom name for the emoji', r: false }], examples: ['.addemoji 😎 cool', '.addemoji https://i.imgur.com/...'] },
        { name: 'addsticker', aliases: [], slash: false, perms: ['ManageEmojisAndStickers'], usage: '.addsticker [image] [name]', desc: 'Add a custom sticker to the server.', params: [{ n: 'image', d: 'Sticker image', r: true }, { n: 'name', d: 'Sticker name', r: false }], examples: ['.addsticker'] },
        { name: 'steal', aliases: [], slash: false, perms: ['ManageEmojisAndStickers'], usage: '.steal <emoji|sticker> [name]', desc: 'Steal an emoji or sticker from another server.', params: [{ n: 'emoji', d: 'Emoji or sticker to steal', r: true }, { n: 'name', d: 'Custom name', r: false }], examples: ['.steal :pepe: myPepe'] },
        { name: 'embed', aliases: [], slash: false, perms: ['ManageMessages'], usage: '.embed [name]', desc: 'Interactive embed builder — create rich embeds with titles, descriptions, colors, fields, and more.', params: [{ n: 'name', d: 'Embed template name', r: false }], examples: ['.embed', '.embed rules'] },
        { name: 'component', aliases: [], slash: false, perms: ['ManageMessages'], usage: '.component [options]', desc: 'Create advanced message components like buttons and select menus.', params: [], examples: ['.component'] },
      ]
    },
  ];
}

/* ─── count helpers (includes subcommands) ─── */
function getCmdCount(c) {
  return c.commands.reduce((s, cmd) => s + 1 + (cmd.subcommands ? cmd.subcommands.length : 0), 0);
}
function getTotalCmds(categories) {
  return categories.reduce((s, c) => s + getCmdCount(c), 0);
}

/* ─── sidebar category grouping ─── */
function getDocsSidebarGroups(categories) {
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });
  return [
    { label: 'Getting Started', icon: '📖', items: [
      { id: '__intro', icon: '🏠', title: 'Introduction' },
      { id: '__setup', icon: '🚀', title: 'Quick Setup' },
    ]},
    { label: 'Security & Protection', icon: '🔐', items: ['antinuke', 'antiraid', 'automod'].map(id => catMap[id]).filter(Boolean) },
    { label: 'Moderation', icon: '⚔️', items: ['moderation'].map(id => catMap[id]).filter(Boolean) },
    { label: 'Engagement', icon: '🎯', items: ['music', 'leveling', 'stats', 'giveaways', 'fun'].map(id => catMap[id]).filter(Boolean) },
    { label: 'Server Management', icon: '🏗️', items: ['config', 'welcome', 'logs', 'tickets'].map(id => catMap[id]).filter(Boolean) },
    { label: 'Utilities', icon: '🧰', items: ['general', 'voice', 'misc'].map(id => catMap[id]).filter(Boolean) },
  ];
}

/* ─── shared navbar ─── */
function docsNavbar() {
  return `
    <header class="lp-nav">
      <div class="lp-nav-inner">
        <a href="/" class="lp-nav-brand" data-link="/" style="text-decoration:none">
          <span class="lp-nav-logo">⚡</span>
          <span class="lp-nav-wordmark">Ares</span>
        </a>
        <nav class="lp-nav-links">
          <a href="/" data-link="/">Home</a>
          <a href="/docs" class="docs-nav-active" data-docs-link="/docs">Docs</a>
          <a href="https://discord.com/oauth2/authorize?client_id=1434107390856401049&permissions=8&scope=bot%20applications.commands" target="_blank" rel="noopener">Invite</a>
        </nav>
        <a href="/auth/login" class="lp-nav-cta">Dashboard <span class="lp-arrow">↗</span></a>
      </div>
    </header>`;
}

/* ─── shared sidebar (hierarchical tree) ─── */
function docsSidebar(categories, activeId) {
  const groups = getDocsSidebarGroups(categories);

  // Determine which group should be open
  function groupHasActive(group) {
    return group.items.some(item => {
      if (item.id === '__intro' && !activeId) return true;
      if (item.id === '__setup' && !activeId) return true;
      return item.id === activeId;
    });
  }

  return `
    <aside class="docs-sidebar" id="docs-sidebar">
      <a class="docs-sidebar-brand" data-docs-link="/docs">
        <span class="docs-sidebar-brand-icon">⚡</span>
        <span class="docs-sidebar-brand-text">Ares Docs</span>
      </a>
      <div class="docs-search">
        <svg class="docs-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="docs-search" class="docs-search-input" placeholder="Search docs..." autocomplete="off" />
      </div>
      <nav class="docs-toc">
        ${groups.map(group => {
          const isOpen = groupHasActive(group);
          return `
            <div class="docs-toc-group${isOpen ? ' open' : ''}">
              <button class="docs-toc-group-toggle" aria-expanded="${isOpen}">
                <span class="docs-toc-group-icon">${group.icon}</span>
                <span class="docs-toc-group-text">${group.label}</span>
                <svg class="docs-toc-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 4L5 6L7 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <div class="docs-toc-children">
                ${group.items.map(item => {
                  if (item.id === '__intro') {
                    return `<a class="docs-toc-item${!activeId ? ' active' : ''}" data-docs-link="/docs" data-scroll="introduction">
                      <span class="docs-toc-dot"></span><span>${item.title}</span>
                    </a>`;
                  }
                  if (item.id === '__setup') {
                    return `<a class="docs-toc-item" data-docs-link="/docs" data-scroll="getting-started">
                      <span class="docs-toc-dot"></span><span>${item.title}</span>
                    </a>`;
                  }
                  return `<a class="docs-toc-item${activeId === item.id ? ' active' : ''}" data-docs-link="/docs/${item.id}">
                    <span class="docs-toc-dot"></span>
                    <span>${item.title}</span>
                    <span class="docs-toc-count">${getCmdCount(item)}</span>
                  </a>`;
                }).join('')}
              </div>
            </div>`;
        }).join('')}
      </nav>
    </aside>`;
}

/* ─── shared footer ─── */
function docsFooter() {
  return `
    <footer class="docs-footer docs-anim-fade">
      <p>Ares Bot Documentation &mdash; Built with ❤️</p>
      <div class="docs-footer-links">
        <a href="/" data-link="/">Home</a>
        <a href="https://discord.com/oauth2/authorize?client_id=1434107390856401049&permissions=8&scope=bot%20applications.commands" target="_blank" rel="noopener">Invite Bot</a>
        <a href="/auth/login">Dashboard</a>
      </div>
    </footer>`;
}

/* ─── hero illustration (SVG) ─── */
function docsHeroIllustration() {
  return `<svg class="docs-hero-illustration" viewBox="0 0 500 220" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- grid pattern -->
    <defs>
      <linearGradient id="dg1" x1="0" y1="0" x2="500" y2="220"><stop offset="0%" stop-color="#818cf8" stop-opacity="0.15"/><stop offset="100%" stop-color="#c084fc" stop-opacity="0.08"/></linearGradient>
      <linearGradient id="dg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#818cf8"/><stop offset="100%" stop-color="#c084fc"/></linearGradient>
      <linearGradient id="dg3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#34d399"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient>
    </defs>
    <rect width="500" height="220" rx="16" fill="url(#dg1)"/>
    <!-- floating cards -->
    <g opacity="0.9">
      <rect x="30" y="30" width="130" height="80" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      <rect x="42" y="44" width="40" height="4" rx="2" fill="url(#dg2)" opacity="0.7"/>
      <rect x="42" y="54" width="90" height="3" rx="1.5" fill="rgba(255,255,255,0.12)"/>
      <rect x="42" y="63" width="70" height="3" rx="1.5" fill="rgba(255,255,255,0.08)"/>
      <rect x="42" y="78" width="50" height="16" rx="4" fill="url(#dg2)" opacity="0.2"/>
      <text x="54" y="90" font-size="7" fill="#818cf8" font-family="sans-serif" font-weight="600">.ban</text>
    </g>
    <g opacity="0.85">
      <rect x="185" y="50" width="130" height="80" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      <rect x="197" y="64" width="45" height="4" rx="2" fill="url(#dg3)" opacity="0.7"/>
      <rect x="197" y="74" width="100" height="3" rx="1.5" fill="rgba(255,255,255,0.12)"/>
      <rect x="197" y="83" width="80" height="3" rx="1.5" fill="rgba(255,255,255,0.08)"/>
      <rect x="197" y="98" width="55" height="16" rx="4" fill="url(#dg3)" opacity="0.2"/>
      <text x="208" y="110" font-size="7" fill="#34d399" font-family="sans-serif" font-weight="600">.play</text>
    </g>
    <g opacity="0.75">
      <rect x="340" y="25" width="130" height="80" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      <rect x="352" y="39" width="35" height="4" rx="2" fill="#f59e0b" opacity="0.5"/>
      <rect x="352" y="49" width="95" height="3" rx="1.5" fill="rgba(255,255,255,0.12)"/>
      <rect x="352" y="58" width="75" height="3" rx="1.5" fill="rgba(255,255,255,0.08)"/>
      <rect x="352" y="73" width="60" height="16" rx="4" fill="rgba(245,158,11,0.15)"/>
      <text x="361" y="85" font-size="7" fill="#fbbf24" font-family="sans-serif" font-weight="600">.antinuke</text>
    </g>
    <!-- terminal strip -->
    <g opacity="0.6">
      <rect x="60" y="140" width="380" height="55" rx="8" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
      <circle cx="76" cy="153" r="4" fill="#ef4444" opacity="0.6"/>
      <circle cx="88" cy="153" r="4" fill="#fbbf24" opacity="0.6"/>
      <circle cx="100" cy="153" r="4" fill="#34d399" opacity="0.6"/>
      <text x="76" y="176" font-size="8" fill="#818cf8" font-family="monospace" opacity="0.7">$ .help moderation</text>
      <text x="76" y="188" font-size="7" fill="rgba(255,255,255,0.3)" font-family="monospace">Found 30 commands in Moderation module</text>
    </g>
    <!-- decorative dots -->
    <circle cx="25" cy="180" r="2" fill="#818cf8" opacity="0.3"/>
    <circle cx="480" cy="140" r="3" fill="#c084fc" opacity="0.25"/>
    <circle cx="250" cy="18" r="2" fill="#34d399" opacity="0.35"/>
    <circle cx="470" cy="200" r="1.5" fill="#f59e0b" opacity="0.3"/>
  </svg>`;
}

/* ─── docs SPA navigation ─── */
function docsNavigate(path, scrollTarget) {
  window.history.pushState({ scrollTarget }, '', path);
  renderDocs(scrollTarget);
}

/* ─── main render (routes /docs and /docs/:moduleId) ─── */
function renderDocs(scrollTarget) {
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('content').style.marginLeft = '0';
  document.getElementById('content').style.padding = '0';

  const categories = getDocsCategories();
  const pathParts = window.location.pathname.replace(/\/+$/, '').split('/');
  const moduleId = pathParts.length >= 3 ? pathParts[2] : null;

  if (moduleId) {
    const cat = categories.find(c => c.id === moduleId);
    if (cat) {
      renderDocsModule(categories, cat);
    } else {
      renderDocsHome(categories, scrollTarget);
    }
  } else {
    renderDocsHome(categories, scrollTarget);
  }
}

/* ─── home / overview page (/docs) ─── */
function renderDocsHome(categories, scrollTarget) {
  const totalCmds = getTotalCmds(categories);
  const groups = getDocsSidebarGroups(categories);

  document.getElementById('page-content').innerHTML = `
    <div class="docs">
      ${docsNavbar()}
      <div class="docs-layout">
        ${docsSidebar(categories, null)}
        <main class="docs-main">

          <!-- Hero with illustration -->
          <section class="docs-hero-banner docs-anim-fade" id="introduction">
            <div class="docs-hero-content">
              <div class="docs-hero-badge">Documentation</div>
              <h1 class="docs-hero-title">Ares <span class="lp-gradient-text">Documentation</span></h1>
              <p class="docs-hero-desc">The complete guide to all ${totalCmds}+ commands across ${categories.length} modules. Everything you need to manage and protect your Discord server.</p>
              <div class="docs-hero-actions">
                <a class="docs-hero-btn docs-hero-btn-primary" data-docs-link="/docs" data-scroll="getting-started">Get Started</a>
                <a class="docs-hero-btn docs-hero-btn-secondary" data-docs-link="/docs/moderation">Browse Commands</a>
              </div>
            </div>
            <div class="docs-hero-visual">
              ${docsHeroIllustration()}
            </div>
          </section>

          <!-- Quick stats strip -->
          <div class="docs-stats-strip docs-anim-slide" style="--d:0">
            <div class="docs-strip-stat docs-anim-up" style="--d:0"><span class="docs-strip-num">${totalCmds}+</span><span class="docs-strip-label">Commands</span></div>
            <div class="docs-strip-stat docs-anim-up" style="--d:1"><span class="docs-strip-num">${categories.length}</span><span class="docs-strip-label">Modules</span></div>
            <div class="docs-strip-stat docs-anim-up" style="--d:2"><span class="docs-strip-num">Slash</span><span class="docs-strip-label">& Prefix</span></div>
            <div class="docs-strip-stat docs-anim-up" style="--d:3"><span class="docs-strip-num">24/7</span><span class="docs-strip-label">Uptime</span></div>
          </div>

          <!-- Info callout -->
          <div class="docs-callout docs-callout-info docs-anim-slide" style="--d:0">
            <div class="docs-callout-icon">💡</div>
            <div>
              <strong>Default prefix:</strong> <code>.</code> — Change it with <code>.setprefix &lt;symbol&gt;</code>. Most commands also support <code>/slash</code> syntax.
            </div>
          </div>

          <!-- Getting Started -->
          <section class="docs-guides" id="getting-started">
            <h2 class="docs-section-title docs-anim-slide" style="--d:0">Getting Started</h2>
            <p class="docs-section-desc docs-anim-slide" style="--d:1">Set up Ares in your server in under 2 minutes.</p>
            <div class="docs-guide-grid">
              <div class="docs-guide-card docs-anim-up" style="--d:0">
                <div class="docs-guide-step">1</div>
                <h3>Invite Ares</h3>
                <p>Add Ares to your server using the invite link. Grant the <strong>Administrator</strong> permission for full functionality.</p>
              </div>
              <div class="docs-guide-card docs-anim-up" style="--d:1">
                <div class="docs-guide-step">2</div>
                <h3>Set Up Protection</h3>
                <p>Run <code>.antinuke wizard</code> and <code>.automod preset moderate</code> to enable security with recommended settings.</p>
              </div>
              <div class="docs-guide-card docs-anim-up" style="--d:2">
                <div class="docs-guide-step">3</div>
                <h3>Configure Features</h3>
                <p>Set up <code>.welcome</code>, <code>.logsetup</code>, <code>.leveling enable</code>, and <code>.starboard</code> to customize your experience.</p>
              </div>
              <div class="docs-guide-card docs-anim-up" style="--d:3">
                <div class="docs-guide-step">4</div>
                <h3>Open Dashboard</h3>
                <p>Visit the web dashboard for visual configuration, stats, music controls, and moderation management.</p>
              </div>
            </div>
          </section>

          <div class="docs-callout docs-callout-tip docs-anim-slide" style="--d:0">
            <div class="docs-callout-icon">⚡</div>
            <div>
              <strong>Pro tip:</strong> Use <code>.help &lt;command&gt;</code> in Discord for quick inline help, or press <kbd>Ctrl+K</kbd> to search.
            </div>
          </div>

          <!-- Module groups (organized by category) -->
          ${groups.filter(g => g.items[0] && !g.items[0].id?.startsWith('__')).map((group, gi) => `
            <section class="docs-group-section docs-anim-section" id="group-${gi}">
              <div class="docs-group-header">
                <span class="docs-group-icon">${group.icon}</span>
                <h2 class="docs-group-title">${group.label}</h2>
              </div>
              <div class="docs-module-grid docs-module-grid-home">
                ${group.items.map((c, i) => `
                  <a class="docs-module-card docs-module-card-home docs-anim-up" data-docs-link="/docs/${c.id}" style="--d:${i};--accent-c:${c.color}">
                    <span class="docs-module-card-icon">${c.icon}</span>
                    <span class="docs-module-card-title">${c.title}</span>
                    <span class="docs-module-card-count">${getCmdCount(c)} commands</span>
                    <p class="docs-module-card-desc">${c.desc}</p>
                    <span class="docs-module-card-arrow">→</span>
                  </a>
                `).join('')}
              </div>
            </section>
          `).join('')}

          ${docsFooter()}
        </main>
      </div>
    </div>
  `;

  initDocsAnimations();
  initDocsHomeSearch(categories);
  initDocsNavLinks();
  initDocsSidebarToggle();
  initDocsKeyboardSearch();

  if (scrollTarget) {
    requestAnimationFrame(() => {
      const el = document.getElementById(scrollTarget);
      if (el) {
        const navH = document.querySelector('.lp-nav')?.offsetHeight || 0;
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - navH - 24, behavior: 'smooth' });
      }
    });
  }
}

/* ─── module sub-page (/docs/:moduleId) ─── */
function renderDocsModule(categories, cat) {
  const cmdCount = getCmdCount(cat);
  const allModules = categories;
  const catIdx = allModules.indexOf(cat);
  const prev = catIdx > 0 ? allModules[catIdx - 1] : null;
  const next = catIdx < allModules.length - 1 ? allModules[catIdx + 1] : null;

  // Find group label for breadcrumb
  const groups = getDocsSidebarGroups(categories);
  const parentGroup = groups.find(g => g.items.some(i => i.id === cat.id));
  const groupLabel = parentGroup ? parentGroup.label : '';

  document.getElementById('page-content').innerHTML = `
    <div class="docs">
      ${docsNavbar()}
      <div class="docs-layout">
        ${docsSidebar(categories, cat.id)}
        <main class="docs-main">

          <nav class="docs-breadcrumb docs-anim-slide" style="--d:0">
            <a data-docs-link="/docs">Docs</a>
            <span class="docs-breadcrumb-sep">›</span>
            <span class="docs-breadcrumb-mid">${groupLabel}</span>
            <span class="docs-breadcrumb-sep">›</span>
            <span>${cat.title}</span>
          </nav>

          <section class="docs-module-hero docs-anim-fade" style="--accent-c:${cat.color}">
            <div class="docs-module-hero-icon">${cat.icon}</div>
            <div class="docs-module-hero-content">
              <h1 class="docs-module-hero-title">${cat.title}</h1>
              <p class="docs-module-hero-desc">${cat.desc}</p>
              <div class="docs-module-hero-stats">
                <span class="docs-module-hero-stat">${cmdCount} commands</span>
                ${cat.commands.some(c => c.slash) ? '<span class="docs-module-hero-stat">Slash supported</span>' : ''}
                ${cat.commands.some(c => c.subcommands?.length) ? `<span class="docs-module-hero-stat">${cat.commands.reduce((s, c) => s + (c.subcommands?.length || 0), 0)} subcommands</span>` : ''}
              </div>
            </div>
          </section>

          <div class="docs-search docs-module-search docs-anim-slide" style="--d:1">
            <svg class="docs-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="docs-search-module" class="docs-search-input" placeholder="Search ${cat.title.toLowerCase()} commands..." autocomplete="off" />
          </div>

          <div class="docs-cmd-grid">
            ${cat.commands.map((cmd, i) => buildCommandCard(cmd, i)).join('')}
          </div>

          <div class="docs-module-pager docs-anim-fade">
            ${prev ? `<a class="docs-pager-link docs-pager-prev" data-docs-link="/docs/${prev.id}"><span class="docs-pager-dir">← Previous</span><span class="docs-pager-name">${prev.icon} ${prev.title}</span></a>` : '<span></span>'}
            ${next ? `<a class="docs-pager-link docs-pager-next" data-docs-link="/docs/${next.id}"><span class="docs-pager-dir">Next →</span><span class="docs-pager-name">${next.icon} ${next.title}</span></a>` : '<span></span>'}
          </div>

          ${docsFooter()}
        </main>
      </div>
    </div>
  `;

  initDocsAnimations();
  initDocsModuleSearch(cat);
  initDocsNavLinks();
  initDocsSidebarToggle();
  initDocsExpandable();
  initDocsKeyboardSearch();
  window.scrollTo({ top: 0 });
}

/* ─── build command card ─── */
function buildCommandCard(cmd, idx) {
  const aliasHTML = cmd.aliases && cmd.aliases.length
    ? `<div class="docs-cmd-aliases"><span class="docs-cmd-meta-label">Aliases</span>${cmd.aliases.map(a => `<code>${a}</code>`).join(' ')}</div>` : '';

  const permHTML = cmd.perms && cmd.perms.length
    ? `<div class="docs-cmd-perms">${cmd.perms.map(p => `<span class="docs-perm-badge">${p}</span>`).join('')}</div>` : '';

  const slashBadge = cmd.slash ? '<span class="docs-slash-badge">/slash</span>' : '';

  const paramsHTML = cmd.params && cmd.params.length
    ? `<div class="docs-cmd-params">
        <span class="docs-cmd-meta-label">Parameters</span>
        <div class="docs-params-table">
          ${cmd.params.map(p => `
            <div class="docs-param-row">
              <code class="docs-param-name">${p.n}</code>
              <span class="docs-param-req">${p.r ? 'Required' : 'Optional'}</span>
              <span class="docs-param-desc">${p.d}</span>
            </div>
          `).join('')}
        </div>
      </div>` : '';

  const examplesHTML = cmd.examples && cmd.examples.length
    ? `<div class="docs-cmd-examples">
        <span class="docs-cmd-meta-label">Examples</span>
        <div class="docs-examples-block">${cmd.examples.map(e => `<div class="docs-example-line"><code>${e}</code></div>`).join('')}</div>
      </div>` : '';

  const subcommandsHTML = cmd.subcommands && cmd.subcommands.length
    ? `<div class="docs-cmd-subs">
        <span class="docs-cmd-meta-label">Subcommands</span>
        <div class="docs-subs-list">${cmd.subcommands.map(s => `<code class="docs-sub-chip">${s}</code>`).join('')}</div>
      </div>` : '';

  const modulesHTML = cmd.modules && cmd.modules.length
    ? `<div class="docs-cmd-modules">
        <span class="docs-cmd-meta-label">Modules</span>
        <div class="docs-modules-list">${cmd.modules.map(m => `<span class="docs-module-chip">${m}</span>`).join('')}</div>
      </div>` : '';

  const punishmentsHTML = cmd.punishments && cmd.punishments.length
    ? `<div class="docs-cmd-punishments">
        <span class="docs-cmd-meta-label">Punishments</span>
        <div class="docs-punishments-list">${cmd.punishments.map(p => `<span class="docs-punishment-chip">${p}</span>`).join('')}</div>
      </div>` : '';

  const placeholdersHTML = cmd.placeholders && cmd.placeholders.length
    ? `<div class="docs-cmd-placeholders">
        <span class="docs-cmd-meta-label">Placeholders</span>
        <div class="docs-placeholders-list">${cmd.placeholders.map(p => `<code class="docs-placeholder-chip">${p}</code>`).join('')}</div>
      </div>` : '';

  const hasDetails = aliasHTML || paramsHTML || examplesHTML || subcommandsHTML || modulesHTML || punishmentsHTML || placeholdersHTML;

  return `
    <div class="docs-cmd docs-anim-card" data-cmd="${cmd.name}" style="--ci:${idx}">
      <div class="docs-cmd-top">
        <code class="docs-cmd-name">${cmd.name}</code>
        ${slashBadge}
        ${permHTML}
      </div>
      <p class="docs-cmd-desc">${cmd.desc}</p>
      <div class="docs-cmd-usage"><span class="docs-cmd-usage-label">Usage</span><code>${cmd.usage}</code></div>
      ${hasDetails ? `
        <button class="docs-cmd-expand" aria-expanded="false">
          <span>Show details</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="docs-cmd-details">
          ${aliasHTML}
          ${paramsHTML}
          ${subcommandsHTML}
          ${modulesHTML}
          ${punishmentsHTML}
          ${placeholdersHTML}
          ${examplesHTML}
        </div>
      ` : ''}
    </div>
  `;
}

/* ─── animations ─── */
function initDocsAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('docs-visible');
        entry.target.querySelectorAll('.docs-anim-up, .docs-anim-card').forEach((el, i) => {
          el.style.setProperty('--d', i);
          el.classList.add('docs-visible');
        });
      }
    });
  }, { rootMargin: '0px 0px -60px 0px', threshold: 0.05 });

  document.querySelectorAll('.docs-anim-fade, .docs-anim-slide, .docs-anim-section, .docs-anim-up, .docs-anim-card').forEach(el => {
    observer.observe(el);
  });
}

/* ─── home page search (filter module cards + sidebar) ─── */
function initDocsHomeSearch(categories) {
  const input = document.getElementById('docs-search');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    // filter home module cards
    document.querySelectorAll('.docs-module-card-home').forEach(card => {
      const title = (card.querySelector('.docs-module-card-title')?.textContent || '').toLowerCase();
      const desc = (card.querySelector('.docs-module-card-desc')?.textContent || '').toLowerCase();
      card.style.display = (!q || title.includes(q) || desc.includes(q)) ? '' : 'none';
    });
    // filter sidebar tree items
    filterSidebarTree(q);
  });
}

/* ─── module page search (filter command cards + sidebar) ─── */
function initDocsModuleSearch(cat) {
  const input = document.getElementById('docs-search-module');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    document.querySelectorAll('.docs-cmd').forEach(el => {
      const name = el.dataset.cmd || '';
      const desc = (el.querySelector('.docs-cmd-desc')?.textContent || '').toLowerCase();
      const aliases = (el.querySelector('.docs-cmd-aliases')?.textContent || '').toLowerCase();
      const subs = (el.querySelector('.docs-cmd-subs')?.textContent || '').toLowerCase();
      el.style.display = (!q || name.includes(q) || desc.includes(q) || aliases.includes(q) || subs.includes(q)) ? '' : 'none';
    });
  });

  const sidebarInput = document.getElementById('docs-search');
  if (sidebarInput) {
    sidebarInput.addEventListener('input', () => {
      filterSidebarTree(sidebarInput.value.toLowerCase().trim());
    });
  }
}

/* ─── filter sidebar tree by query ─── */
function filterSidebarTree(q) {
  document.querySelectorAll('.docs-toc-group').forEach(group => {
    const items = group.querySelectorAll('.docs-toc-item');
    let anyVisible = false;
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      const show = !q || text.includes(q);
      item.style.display = show ? '' : 'none';
      if (show) anyVisible = true;
    });
    group.style.display = anyVisible ? '' : 'none';
    if (q && anyVisible) group.classList.add('open');
  });
  // Reset when cleared
  if (!q) {
    document.querySelectorAll('.docs-toc-group').forEach(g => {
      g.style.display = '';
      g.querySelectorAll('.docs-toc-item').forEach(i => i.style.display = '');
    });
  }
}

/* ─── keyboard shortcut ─── */
function initDocsKeyboardSearch() {
  if (window._docsKBHandler) document.removeEventListener('keydown', window._docsKBHandler);
  window._docsKBHandler = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const input = document.getElementById('docs-search-module') || document.getElementById('docs-search');
      if (input) { input.focus(); input.select(); }
    }
  };
  document.addEventListener('keydown', window._docsKBHandler);
}

/* ─── SPA navigation links ─── */
function initDocsNavLinks() {
  document.querySelectorAll('[data-docs-link]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const path = a.getAttribute('data-docs-link');
      const scroll = a.getAttribute('data-scroll') || undefined;
      docsNavigate(path, scroll);
    });
  });
  document.querySelectorAll('.docs [data-link]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      router.navigate(a.getAttribute('data-link'));
    });
  });
}

/* ─── sidebar collapsible groups + mobile toggle ─── */
function initDocsSidebarToggle() {
  // Group collapse/expand
  document.querySelectorAll('.docs-toc-group-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.docs-toc-group');
      const isOpen = group.classList.contains('open');
      group.classList.toggle('open', !isOpen);
      btn.setAttribute('aria-expanded', !isOpen);
    });
  });
}

/* ─── expandable command cards ─── */
function initDocsExpandable() {
  document.querySelectorAll('.docs-cmd-expand').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.docs-cmd');
      const details = card.querySelector('.docs-cmd-details');
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', !isOpen);
      btn.querySelector('span').textContent = isOpen ? 'Show details' : 'Hide details';
      details.classList.toggle('open', !isOpen);
      card.classList.toggle('docs-cmd-expanded', !isOpen);
    });
  });
}
