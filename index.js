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

  // 1 — إذا فيه صورة مرفوعة على ديسكورد
  if (msg.attachments.size > 0) {
    return msg.attachments.first().url;
  }

  // 2 — إذا الرابط يبدأ بـ http
  if (msg.content.startsWith("http")) {
    return msg.content.trim();
  }

  // 3 — إذا مسار مثل /mnt/data/...
  if (msg.content.startsWith("/mnt/data/")) {
    return msg.content.trim();
  }

  // 4 — أي شيء ثاني نخليه رابط صورة افتراضية
  return "https://i.imgur.com/3ZUrjUP.png"; // صورة افتراضية
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
    sessions.set(uid, { step: "text", text: "" });
    return msg.reply("📌 **أرسل نص المنتج الآن**");
  }

  // لا يوجد جلسة → تجاهل
  if (!session) return;

  // ============= STEP 1 (TEXT) =============
  if (session.step === "text") {
    session.text = msg.content;
    session.step = "image";
    sessions.set(uid, session);
    return msg.reply("📸 **أرسل صورة المنتج الآن — أي شيء ترسله يستخدم كصورة**");
  }

  // ============= STEP 2 (IMAGE) =============
  if (session.step === "image") {

    const imageUrl = extractImage(msg); // ← هنا السحر 🔥🔥🔥

    sessions.delete(uid);

    // تحليل النص
    const lines = session.text.split("\n").map(l => l.trim()).filter(Boolean);
    const title = lines.shift() || "منتج";
    
    let price = "N/A";
    lines.forEach(l => {
      if (l.toLowerCase().startsWith("price")) {
        price = l.split(":")[1]?.trim() || "N/A";
      }
    });

    const desc = lines.filter(l => !l.toLowerCase().startsWith("price")).join("\n");

    // EMBED
    const embed = new EmbedBuilder()
      .setColor("#8A2BE2")
      .setTitle(`🔥 ${title}`)
      .setDescription(`💰 **${price}**\n\n${desc}`)
      .setImage(imageUrl);

    // BUTTON
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("BUY NOW / شراء الآن")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${msg.guild.id}/1439600517063118989`)
    );

    await msg.channel.send("@everyone @here");

    await msg.channel.send({
      embeds: [embed],
      components: [row]
    });

    return msg.reply("✅ **تم إرسال المنتج بنجاح!**");
  }
});

client.login(process.env.TOKEN);
