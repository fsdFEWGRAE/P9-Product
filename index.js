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
// وضعية استقبال النص والصورة
// =============================
let expectingText = false;
let expectingImage = false;
let cachedText = "";
let cachedAuthor = "";

// =============================
// أمر help
// =============================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  if (msg.content.toLowerCase() === "*help") {

    const helpEmbed = new EmbedBuilder()
      .setColor("#00A0FF")
      .setTitle("📘 HELP MENU — قائمة المساعدة")
      .setDescription("**Bot Commands / أوامر البوت**")
      .addFields(
        {
          name: "🔥 Product System / نظام المنتجات",
          value:
            "`*product`\n" +
            "إرسال منتج مع صورة + سعر + زر شراء\n" +
            "Send product with image + price + buy button"
        },
        {
          name: "⚙️ Developer Tools / أدوات المطور",
          value:
            "`*help`\n" +
            "عرض قائمة الأوامر\n" +
            "Show help menu"
        }
      )
      .setFooter({ text: "P9 Store – Help System" });

    return msg.channel.send({ embeds: [helpEmbed] });
  }
});

// =============================
// الأمر الرئيسي product
// =============================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  // =============== خطوة 1: كتابة الأمر
  if (msg.content.startsWith("*product")) {
    expectingText = true;
    cachedAuthor = msg.author.id;

    msg.reply("📌 **ارسل نص المنتج الآن (بما فيه PRICE: x)**");
    return;
  }

  // =============== خطوة 2: استقبال نص المنتج
  if (expectingText && msg.author.id === cachedAuthor && !msg.attachments.size) {
    cachedText = msg.content;
    expectingText = false;
    expectingImage = true;

    msg.reply("📸 **تمام! الآن ارسل صورة المنتج (أي صورة بدون نص)**");
    return;
  }

  // =============== خطوة 3: استقبال الصورة — يقبل أي صورة
  if (expectingImage && msg.author.id === cachedAuthor) {

    // التقاط الصورة من جميع الاحتمالات (attachments + embeds)
    const attachmentImage = [...msg.attachments][0]?.[1]?.url;
    const embedImage = msg.embeds?.[0]?.image?.url;

    const image = attachmentImage || embedImage;

    if (!image) {
      msg.reply("⚠️ **لم يتم العثور على صورة — ارسل صورة بدون نص.**");
      return;
    }

    expectingImage = false;

    // =============================
    // معالجة النص
    // =============================

    const lines = cachedText.split("\n").map(l => l.trim()).filter(l => l.length > 0);

    const title = lines.shift();

    let price = "N/A";

    // استخراج السعر
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

    // =============================
    // Embed المنتج
    // =============================
    const embed = new EmbedBuilder()
      .setColor("#8A2BE2")
      .setTitle(`🔥 ${title}`)
      .setDescription(
        `════════════\n💰 **${price} SAR** 💰\n════════════`
      );

    sections.forEach(sec => {
      embed.addFields({
        name: `### ${sec.title}`,
        value: sec.items.join("\n") || "No details"
      });
    });

    // زر شراء عربي + إنجليزي
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("BUY NOW / شراء الآن")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${msg.guild.id}/1439600517063118989`)
    );

    // إرسال الرسالة
    await msg.channel.send("@everyone @here");

    await msg.channel.send({
      embeds: [embed],
      components: [row],
      files: [{ attachment: image, name: "product.png" }]
    });

    msg.reply("✅ **تم إرسال المنتج بالشكل المطلوب!**");
  }
});

client.login(process.env.TOKEN);
