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
// SERVER FOR RENDER
// ======================
const app = express();
app.get("/", (req, res) => res.send("Bot running"));
app.listen(process.env.PORT || 3000);

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

client.on("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// جلسات
const sessions = new Map();

// ===========================================
// دالة التقاط صورة من أي رسالة
// ===========================================
function extractImage(msg) {

  if (msg.attachments.size > 0) {
    return msg.attachments.first().url;
  }

  if (msg.content.startsWith("http")) {
    return msg.content.trim();
  }

  if (msg.content.startsWith("/mnt/data/")) {
    return msg.content.trim();
  }

  return "https://i.imgur.com/3ZUrjUP.png";
}

// ===========================================
// BOT LOGIC
// ===========================================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const uid = msg.author.id;
  const session = sessions.get(uid);

  // HELP
  if (msg.content === "*help") {
    return msg.reply("الأوامر:\n*product = لإنشاء منتج");
  }

  // START PRODUCT
  if (msg.content.startsWith("*product")) {
    sessions.set(uid, { step: "text", text: "", image: "", prices: "" });
    return msg.reply("📌 **أرسل نص المنتج الآن (العنوان + المميزات + الأقسام)**");
  }

  if (!session) return;

  // ============= STEP 1 (TEXT) =============
  if (session.step === "text") {
    session.text = msg.content;
    session.step = "image";
    sessions.set(uid, session);
    return msg.reply("📸 **أرسل صورة المنتج الآن — أي رسالة بعدها تعتبر صورة**");
  }

  // ============= STEP 2 (IMAGE) =============
  if (session.step === "image") {

    const image = extractImage(msg);
    if (!image) return msg.reply("⚠️ **لم يتم العثور على صورة — أرسل صورة الآن**");

    session.image = image;
    session.step = "prices";
    sessions.set(uid, session);

    return msg.reply("💰 **أرسل الأسعار الآن (كل سطر فيه السعر)**\nمثال:\nday 4\n3 days 6.5\nweek 10");
  }

  // ============= STEP 3 (PRICES MULTI) =============
  if (session.step === "prices") {

    const rawPrices = msg.content.split("\n").map(l => l.trim()).filter(Boolean);

    let priceLines = [];
    rawPrices.forEach(line => {
      const parts = line.split(" ");
      const label = parts.slice(0, -1).join(" ");
      const value = parts.slice(-1)[0];
      priceLines.push(`• ${label} → ${value}$`);
    });

    session.prices = priceLines.join("\n");

    // معالجة النص
    const lines = session.text.split("\n").map(l => l.trim()).filter(Boolean);
    const title = lines.shift() || "منتج";

    const desc = lines.join("\n");

    // ============= ULTRA DOUBLE-LINE PRICE BOX =============
    const priceUltraBox =
"╔════════════════════════════╗\n" +
"║ 💜  PRICES LIST (ULTRA)    ║\n" +
"╠════════════════════════════╣\n" +
session.prices
  .split("\n")
  .map(l => `║ ${l.padEnd(26, " ")} ║`)
  .join("\n") +
"\n╚════════════════════════════╝";

    // ============= EMBED =============
    const embed = new EmbedBuilder()
      .setColor("#6A0DAD")
      .setTitle(`🔥 ${title}`)
      .setDescription(
        desc +            // الوصف أول شيء
        "\n\n" +
        priceUltraBox     // السعر آخر نص فوق الصورة
      )
      .setImage(session.image);  // الصورة آخر شيء

    // زر شراء
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("BUY NOW / شراء الآن")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${msg.guild.id}/1442766452552634389`)
    );

    sessions.delete(uid);

    await msg.channel.send("@everyone @here");
    await msg.channel.send({ embeds: [embed], components: [row] });

    return msg.reply("✅ **تم إرسال المنتج بنجاح!**");
  }

});

client.login(process.env.TOKEN);

