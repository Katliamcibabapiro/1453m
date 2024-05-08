const { Client, Intents, MessageEmbed, MessageButton, MessageActionRow, MessageAttachment, VoiceChannel } = require('discord.js');
const fetch = require('node-fetch');
const { prefix, token, prefixIdarat } = require('./config.json');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS
    ]
});

let capslockEnabled = true; // capslockEngel özelliğini başlangıçta açık olarak tanımlıyoruz
const afkUsers = new Map();
let voiceChannelId = null;

client.once('ready', () => {
    console.log('Bot is ready.');
});

client.on('messageCreate', async message => {
    if (!message.guild) return;
    const member = message.member;

    // Komutların kullanımını kontrol etmeden önce bot mesajı veya izinsiz kullanımı engelle
    if (message.author.bot || !member) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Komutlar için izin kontrolleri
    if (command === 'yavaşmod') {
        if (!member.permissions.has('MANAGE_MESSAGES')) 
            return message.reply('Bu komutu kullanmak için gerekli izinlere sahip değilsiniz.');

        const time = parseInt(args[0]);

        if (!time || time < 0 || time > 21600) // 21600 saniye (6 saat) maksimum sınırı
            return message.reply('Geçerli bir süre belirtmelisiniz.');

        await message.channel.setRateLimitPerUser(time, args.slice(1).join(' '))
            .then(() => {
                message.channel.send(`Bu kanal için yavaş mod ${time} saniye olarak ayarlandı.`);
            })
            .catch(error => {
                console.error('Yavaş mod ayarlanırken bir hata oluştu:', error);
                message.reply('Yavaş mod ayarlanırken bir hata oluştu. Lütfen tekrar deneyin.');
            });
    } else if (command === 'sil') {
        if (!member.permissions.has('MANAGE_MESSAGES')) 
            return message.reply('Bu komutu kullanmak için gerekli izinlere sahip değilsiniz.');

        const amount = parseInt(args[0]);

        if (isNaN(amount) || amount < 2 || amount > 100) {
            return message.reply('Lütfen silinecek mesaj sayısını 2 ile 100 arasında bir değer olarak belirtin!');
        }

        await message.channel.bulkDelete(amount, true)
            .then(messages => message.channel.send(`${messages.size} mesaj silindi!`))
            .catch(error => {
                console.error('Mesajları silerken bir hata oluştu:', error);
                message.channel.send('Mesajları silerken bir hata oluştu!');
            });
    } else if (command === 'ping') {
        message.channel.send('Ölçülüyor...').then(sentMessage => {
            const pingEmbed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Ping')
                .setDescription(`Botun gecikmesi: ${sentMessage.createdTimestamp - message.createdTimestamp}ms\nAPI Gecikmesi: ${client.ws.ping}ms`)
                .setTimestamp()
                .setFooter({ text: client.user.username });

            sentMessage.edit({ content: 'Botun gecikme hızı', embeds: [pingEmbed] });
        });
    } else if (command === 'ban') {
        if (!member.permissions.has('BAN_MEMBERS')) {
            return message.reply('Bu komutu kullanmaya yetkiniz yok.');
        }
        const member = message.mentions.members.first();
        if (!member) {
            return message.reply('Lütfen bir kullanıcı etiketleyin.');
        }
        if (!member.bannable) {
            return message.reply('Bu kullanıcıyı yasaklayamam.');
        }
        member.ban()
            .then(() => message.channel.send(`${member.user.tag} başarıyla yasakland.`))
            .catch(error => message.reply('Bir hata oluştu.'));
    } else if (command === 'kick') {
        if (!member.permissions.has('KICK_MEMBERS')) {
            return message.reply('Bu komutu kullanmaya yetkiniz yok.');
        }
        const member = message.mentions.members.first();
        if (!member) {
            return message.reply('Lütfen bir kullanıcı etiketleyin.');
        }
        if (!member.kickable) {
            return message.reply('Bu kullanıcıyı atamam.');
        }
        member.kick()
            .then(() => message.channel.send(`${member.user.tag} başarıyla atıldı.`))
            .catch(error => message.reply('Bir hata oluştu.'));
    } else if (command === 'yardım') {
        const helpEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Yardım')
            .setDescription('Mevcut yardım menüsü')
            .addFields(                
                { name: `!komutlar`, value: 'Botun tüm komutlarını görürsün' },
                { name: `Destek`, value: '[Sunucuya gelmek için tıkla](https://discord.gg/Je8ucNCfBa) ' },
                { name: `Davet`, value: '[Davet etmek için tıkla](https://discord.com/oauth2/authorize?client_id=1233449004281499699&permissions=8&scope=bot) '}
            )
            .setTimestamp()
            .setFooter({ text: client.user.username });

        message.channel.send({ embeds: [helpEmbed] });
    } else if (command === 'botistatistik') {
        const botPing = client.ws.ping;
        const embed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Bot İstatistikleri')
            .addField('Ping', `${botPing}ms`, true)
            .addField('Node Sürümü', `v${process.version}`, true)
            .addField('Discord.js Sürümü', `v${require('discord.js').version}`, true)
            .setTimestamp()
            .setFooter({ text: client.user.username });

        message.channel.send({ embeds: [embed] });
    } else if (command === 'kurucukim') {
        const guild = message.guild;
        const guildOwner = guild.owner;

        const embed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Sunucunun Kurucusu')
            .setDescription(guildOwner ? `Sunucunun kurucusu: ${guildOwner}` : 'Sunucunun kurucusu bulunamadı.')
            .setTimestamp()
            .setFooter({ text: client.user.username });

        message.channel.send({ embeds: [embed] });
    } else if (command === 'davet') {
        const inviteEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Bot Davet Linki')
            .setDescription('Botu sunucunuza davet etmek için aşağıdaki bağlantıyı kullanabilirsiniz:')
            .addField('Davet Linki', '[Botu Davet Et](https://discord.com/oauth2/authorize?client_id=1233449004281499699&permissions=8&scope=bot)', true)
            .setTimestamp()
            .setFooter({ text: client.user.username });

        message.channel.send({ embeds: [inviteEmbed] });
    } else if (command === 'komutlar') {
        const commandListEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Komutlar')
            .setDescription('Mevcut komutlar ve açıklamaları:')
            .addFields(
                { name: '!ping', value: 'Botun gecikmesini ve API gecikmesini gösterir.' },
                { name: '!ban', value: 'Belirtilen kullanıcıyı sunucudan yasaklar.' },
                { name: '!kick', value: 'Belirtilen kullanıcıyı sunucudan atar.' },
                { name: '!yardım', value: 'Mevcut komutları ve yardım bağlantılarını gösterir.' },
                { name: '!botistatistik', value: 'Botun istatistiklerini gösterir.' },
                { name: '!kurucukim', value: 'Sunucunun kurucusunu gösterir.' },
                { name: '!davet', value: 'Botun davet linkini gösterir.' },
				{ name: '!roller', value: 'Sunucudaki rolleri önünüze sunar.' },
				{ name: '!tagtaraması id', value: 'Etiketlenen rolün kimlerde olduğunu gösterir.' },
				{ name: '!botara id', value: 'ID si verilen botun bilgilerini verir.' }
            )
            .setTimestamp()
            .setFooter({ text: client.user.username });

        message.channel.send({ embeds: [commandListEmbed] });
    } else if (command === 'roller') {
        const roles = message.guild.roles.cache.map(role => role.name);
        
        const embed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Sunucudaki Roller')
            .setDescription(roles.join('\n'))
            .setTimestamp();
        
        message.channel.send({ embeds: [embed] });
    } else if (command === 'tagtaraması') {
        const role = message.mentions.roles.first();
        
        if (!role) {
            return message.reply('Lütfen bir rol etiketleyin!');
        }

        const membersWithRole = role.members.map(member => member.user);

        if (membersWithRole.length === 0) {
            return message.reply('Bu role sahip kullanıcı bulunamadı!');
        }

        const embed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`"${role.name}" Rolüne Sahip Kullanıcılar`)
            .setDescription(membersWithRole.map(user => user.username).join('\n'));

        message.channel.send({ embeds: [embed] });
    } else if (command === 'botara') {
        const botId = args[0];

        try {
            const bot = await client.users.fetch(botId);

            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Bot Bilgileri')
                .addField('Adı', bot.username)
                .addField('ID', bot.id)
                .addField('Oluşturulma Tarihi', bot.createdAt.toLocaleDateString())
                .setThumbnail(bot.avatarURL());

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            message.reply('Bot bulunamadı veya bir hata oluştu!');
        }
} else if (command === 'avatar') {
    const user = message.mentions.users.first() || message.author;
    const avatarURL = user.displayAvatarURL({ dynamic: true, size: 1024 });

    const extension = avatarURL.endsWith('.gif') ? 'gif' : 'png';
    const attachment = new MessageAttachment(avatarURL, `avatar.${extension}`);

    message.channel.send({ files: [attachment] });
    } else if (command === 'yetkilerim') {
        const permissions = member.permissions.toArray();

        const embed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Botun Yetkileri')
            .setDescription(permissions.map(permission => {
                const emoji = member.permissions.has(permission) ? '✅' : '❌';
                return `${emoji} ${permission.replace(/_/g, ' ').toLowerCase()}`;
            }).join('\n'));

        message.channel.send({ embeds: [embed] });
    } else if (command === 'afk') {
        const reason = args.join(' ');
        afkUsers.set(message.author.id, reason || 'Belirtilmedi');
        message.reply(`Artık AFK'sınız. Sebep: ${reason || 'Belirtilmedi'}`);
    } else if (afkUsers.has(message.author.id)) {
        const reason = afkUsers.get(message.author.id);
        afkUsers.delete(message.author.id);
        message.reply(`Artık AFK değilsiniz. Sebep: ${reason}`);
    }
});

client.login(token);
