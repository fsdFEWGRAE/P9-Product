import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import express from "express";

// ======================
// Express Server for Render
// ======================
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});

// ======================
// Discord Bot
// ======================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on("ready", () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

// =============================
// نظام الجلسات لكل مستخدم
// =============================
const sessions = new Map();

// =============================
// messageCreate الرئيسي
// =============================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const userId = msg.author.id;
  const session = sessions.get(userId);

  // ========== help ==========
  if (msg.content.toLowerCase() === "*help") {
    const helpEmbed = new EmbedBuilder()
      .setColor("#00A0FF")
      .setTitle("📘 HELP MENU — قائمة المساعدة")
      .addFields(
        {
          name: "🔥 Products",
          value: "`*product` — إرسال منتج بالرابط والصورة"
        }
      );

    return msg.channel.send({ embeds: [helpEmbed] });
  }

  // ========== بدء منتج ==========
  if (msg.content.startsWith("*product")) {
    sessions.set(userId, { step: "awaitingText", text: "" });
    return msg.reply("📌 **ارسل نص المنتج (العنوان + الأقسام + PRICE: x)**");
  }

  if (!session) return;

  // ========== استقبال النص ==========
  if (session.step === "awaitingText") {
    session.text = msg.content;
    session.step = "awaitingImageLink";
    sessions.set(userId, session);

    return msg.reply("📸 **تمام! الآن ارسل رابط صورة المنتج فقط**");
  }

  // ========== استقبال رابط الصورة ==========
  if (session.step === "awaitingImageLink") {

    let imageUrl = msg.content.trim();

    // هل الرابط يبدأ بـ http ؟
    if (!imageUrl.startsWith("http")) {
      return msg.reply("⚠️ **ارسل رابط صورة صحيح يبدأ بـ http**");
    }

    // انتهت الجلسة
    sessions.delete(userId);

    // ========== معالجة النص ==========
    const lines = session.text.split("\n").map(l => l.trim()).filter(l => l.length > 0);

    const title = lines.shift() || "Unnamed Product";

    let price = "N/A";
    lines.forEach((l) => {
      if (l.toLowerCase().startsWith("price")) {
        price = l.split(":")[1]?.trim();
      }
    });

    const cleanLines = lines.filter((l) => !l.toLowerCase().startsWith("price"));

    let sections = [];
    let current = null;

    cleanLines.forEach((line) => {
      if (line.startsWith("---")) {
        if (current) sections.push(current);
        current = { title: "", items: [] };
      } else if (current && current.title === "") {
        current.title = line;
      } else if (current) {
        current.items.push("• " + line);
      }
    });

    if (current) sections.push(current);

    const embed = new EmbedBuilder()
      .setColor("#8A2BE2")
      .setTitle(`🔥 ${title}`)
      .setDescription(`════════════\n💰 **${price}** 💰\n════════════`);

    sections.forEach(sec => {
      embed.addFields({
        name: `### ${sec.title}`,
        value: sec.items.join("\n")
      });
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("BUY NOW / شراء الآن")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${msg.guild.id}/1439600517063118989`)
    );

    await msg.channel.send("@everyone @here");

    await msg.channel.send({
      embeds: [embed],
      components: [row],
      files: [{ attachment: imageUrl, name: "product.png" }]
    });

    return msg.reply("✅ **تم إرسال المنتج بالرابط بنجاح!**");
  }
});

client.login(process.env.TOKEN);
