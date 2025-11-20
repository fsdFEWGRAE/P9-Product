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
// EXPRESS SERVER (FOR RENDER)
// ======================
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("Bot is running"));
app.listen(PORT, () => console.log(`HTTP server on ${PORT}`));

// ======================
// DISCORD CLIENT
// ======================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on("clientReady", () => console.log(`Logged in as ${client.user.tag}`));

// ======================
// USER SESSIONS
// ======================
const sessions = new Map();

// ======================
// MESSAGE HANDLER
// ======================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const uid = msg.author.id;
  const session = sessions.get(uid);

  // HELP
  if (msg.content.toLowerCase() === "*help") {
    const embed = new EmbedBuilder()
      .setColor("#00A0FF")
      .setTitle("📘 HELP MENU")
      .setDescription("• `*product` لإنشاء منتج");

    return msg.channel.send({ embeds: [embed] });
  }

  // START NEW PRODUCT
  if (msg.content.startsWith("*product")) {
    sessions.set(uid, { step: "awaitText", text: "" });
    return msg.reply("📌 **ارسل نص المنتج الآن (العنوان + الأقسام + PRICE: x)**");
  }

  // NO SESSION → IGNORE
  if (!session) return;

  // STEP 1 — GET PRODUCT TEXT
  if (session.step === "awaitText") {
    session.text = msg.content;
    session.step = "awaitImage";
    sessions.set(uid, session);

    return msg.reply("📸 **ارسل صورة المنتج الآن — أي رسالة بعدها تُستخدم كصورة**");
  }

  // STEP 2 — GET IMAGE (ANY TYPE)
  if (session.step === "awaitImage") {

    let imageUrl;

    // 🔥 لو أرسل صورة
    if (msg.attachments.size > 0) {
      imageUrl = msg.attachments.first().url;
    }
    // 🔥 لو أرسل رابط أو نص
    else {
      imageUrl = msg.content.trim();
    }

    if (!imageUrl) {
      return msg.reply("⚠️ **لم يتم العثور على صورة — ارسل صورة الآن**");
    }

    // REMOVE SESSION
    sessions.delete(uid);

    // =====================================
    // PARSE PRODUCT TEXT
    // =====================================
    const lines = session.text.split("\n").map(l => l.trim()).filter(Boolean);

    const title = lines.shift() || "Unnamed Product";

    let price = "N/A";
    lines.forEach(l => {
      if (l.toLowerCase().startsWith("price")) {
        price = l.split(":")[1]?.trim() || "N/A";
      }
    });

    const cleanLines = lines.filter(l => !l.toLowerCase().startsWith("price"));

    let sections = [];
    let current = null;

    cleanLines.forEach(line => {
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

    // =====================================
    // BUILD EMBED
    // =====================================
    const embed = new EmbedBuilder()
      .setColor("#8A2BE2")
      .setTitle(`🔥 ${title}`)
      .setDescription(`════════════\n💰 **${price}** 💰\n════════════`)
      .setImage(imageUrl);

    sections.forEach(sec => {
      embed.addFields({
        name: `### ${sec.title || "بدون عنوان"}`,
        value: sec.items.length > 0 ? sec.items.join("\n") : "لا يوجد عناصر"
      });
    });

    // BUY BUTTON
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("BUY NOW / شراء الآن")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${msg.guild.id}/1439600517063118989`)
    );

    // SEND PRODUCT
    await msg.channel.send("@everyone @here");

    await msg.channel.send({
      embeds: [embed],
      components: [row]
    });

    return msg.reply("✅ **تم إرسال المنتج بنجاح!**");
  }
});

client.login(process.env.TOKEN);
