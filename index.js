import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import express from "express";

const app = express();
app.get("/", (req, res) => res.send("Bot running"));
app.listen(process.env.PORT || 3000);

// ====================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

const sessions = new Map();

// ====================================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const uid = msg.author.id;
  const session = sessions.get(uid);

  // HELP
  if (msg.content === "*help") {
    return msg.reply("الأوامر:\n*product = إنشاء منتج");
  }

  // START PRODUCT
  if (msg.content.startsWith("*product")) {
    sessions.set(uid, { step: "text", text: "" });
    return msg.reply("📌 **ارسل نص المنتج الآن**");
  }

  if (!session) return;

  // STEP 1 — TEXT
  if (session.step === "text") {
    session.text = msg.content;
    session.step = "image";
    sessions.set(uid, session);
    return msg.reply("📸 **ارسل رابط الصورة الآن (أي نص او رابط راح نستخدمه كصورة)**");
  }

  // STEP 2 — IMAGE (ANY TEXT)
  if (session.step === "image") {
    const imageUrl = msg.content.trim();

    sessions.delete(uid);

    // ========== Parse product ==========
    const lines = session.text.split("\n").map(l => l.trim());
    const title = lines.shift() || "Product";
    let price = "N/A";

    lines.forEach(l => {
      if (l.toLowerCase().startsWith("price")) {
        price = l.split(":")[1]?.trim() || "N/A";
      }
    });

    const desc = lines.filter(l => !l.toLowerCase().startsWith("price")).join("\n");

    // ========== Embed ==========
    const embed = new EmbedBuilder()
      .setColor("#8A2BE2")
      .setTitle(`🔥 ${title}`)
      .setDescription(`💰 **${price}**\n\n${desc}`)
      .setImage(imageUrl);  // ← أهم شيء 🔥

    // زر شراء
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("BUY NOW / شراء الآن")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${msg.guild.id}/1439600517063118989`)
    );

    // إرسال المنتج
    await msg.channel.send("@everyone @here");
    await msg.channel.send({ embeds: [embed], components: [row] });

    return msg.reply("✅ **تم إرسال المنتج بنجاح!**");
  }
});

client.login(process.env.TOKEN);
