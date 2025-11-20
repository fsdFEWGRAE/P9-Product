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

client.once("clientReady", () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

// =============================
// جلسات لكل مستخدم
// =============================
const sessions = new Map();

// =============================
// messageCreate
// =============================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const userId = msg.author.id;
  const session = sessions.get(userId);

  // HELP
  if (msg.content.toLowerCase() === "*help") {
    const embed = new EmbedBuilder()
      .setColor("#00A0FF")
      .setTitle("📘 HELP MENU")
      .addFields({
        name: "🔥 Product System",
        value: "`*product` — إرسال منتج"
      });

    return msg.channel.send({ embeds: [embed] });
  }

  // START PRODUCT
  if (msg.content.startsWith("*product")) {
    sessions.set(userId, { step: "awaitText", text: "" });
    return msg.reply("📌 **ارسل نص المنتج الآن (العنوان + الأقسام + PRICE: x)**");
  }

  if (!session) return;

  // STEP 1 — PRODUCT TEXT
  if (session.step === "awaitText") {
    session.text = msg.content;
    session.step = "awaitImageLink";
    sessions.set(userId, session);

    return msg.reply("📸 **ارسل رابط صورة المنتج الآن**");
  }

  // STEP 2 — IMAGE LINK
  if (session.step === "awaitImageLink") {

    // نقبل أي شيء كنص دون قيود
    const imageUrl = msg.content.trim();

    if (!imageUrl || imageUrl.length < 5) {
      return msg.reply("⚠️ **الرابط غير صالح**");
    }

    // Session finished
    sessions.delete(userId);

    const lines = session.text.split("\n").map(l => l.trim()).filter(Boolean);

    const title = lines.shift() || "Unnamed Product";

    let price = "N/A";
    lines.forEach((l) => {
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

    // Embed
    const embed = new EmbedBuilder()
      .setColor("#8A2BE2")
      .setTitle(`🔥 ${title}`)
      .setDescription(`════════════\n💰 **${price}** 💰\n════════════`);

    sections.forEach(sec => {
      embed.addFields({
        name: `### ${sec.title || "بدون عنوان"}`,
        value: sec.items.length > 0 ? sec.items.join("\n") : "لا يوجد عناصر"
      });
    });

    // BUY Button
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("BUY NOW / شراء الآن")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${msg.guild.id}/1439600517063118989`)
    );

    // SEND PRODUCT
    await msg.channel.send("@everyone @here");

    // ⚡ هذا أهم تعديل — قبول مسار /mnt/data مباشرة
    await msg.channel.send({
      embeds: [embed],
      components: [row],
      files: [ imageUrl ]   // ← هنا القوة
    });

    return msg.reply("✅ **تم إرسال المنتج بنجاح!**");
  }
});

client.login(process.env.TOKEN);
