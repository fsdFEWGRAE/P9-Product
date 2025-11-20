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
/*
 session = {
   step: 'awaitingText' | 'awaitingImage',
   text: 'النص الكامل اللي ارسله'
 }
*/
const sessions = new Map();

// =============================
// messageCreate واحد لكل الأوامر
// =============================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const userId = msg.author.id;
  const session = sessions.get(userId);

  // ========== أمر help ==========
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

    await msg.channel.send({ embeds: [helpEmbed] });
    return;
  }

  // ========== خطوة 1: بدء منتج جديد ==========
  if (msg.content.startsWith("*product")) {
    sessions.set(userId, { step: "awaitingText", text: "" });
    await msg.reply("📌 **ارسل نص المنتج الآن (العنوان + الأقسام + PRICE: x)**");
    return;
  }

  // لو ما فيه جلسة ولا أمر → تجاهل
  if (!session) return;

  // ========== خطوة 2: استقبال النص ==========
  if (session.step === "awaitingText") {
    // نتأكد انها رسالة بدون صور
    if (msg.attachments.size > 0) {
      await msg.reply("⚠️ **ارسِل نص المنتج فقط بدون صورة، بعدين بنطلب منك الصورة.**");
      return;
    }

    session.text = msg.content;
    session.step = "awaitingImage";
    sessions.set(userId, session);

    await msg.reply("📸 **تمام! الآن ارسل صورة المنتج (أي صورة بدون نص)**");
    return;
  }

  // ========== خطوة 3: استقبال الصورة ==========
  if (session.step === "awaitingImage") {
    // لازم يكون فيه مرفقات
    if (msg.attachments.size === 0) {
      await msg.reply("⚠️ **ما استقبلت صورة، ارسل صورة المنتج بدون نص.**");
      return;
    }

    // ناخذ أول صورة من المرفقات
    const firstAttachment = msg.attachments.first();
    const imageUrl = firstAttachment?.url;

    if (!imageUrl) {
      await msg.reply("⚠️ **تعذر قراءة رابط الصورة، جرّب ترفعها مرة ثانية.**");
      return;
    }

    // نحذف الجلسة خلاص
    sessions.delete(userId);

    // =============================
    // معالجة نص المنتج
    // =============================
    const lines = session.text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const title = lines.shift() || "Unnamed Product"; // أول سطر = العنوان

    let price = "N/A";
    lines.forEach((l) => {
      if (l.toLowerCase().startsWith("price")) {
        price = l.split(":")[1]?.trim() || "N/A";
      }
    });

    // نحذف سطر السعر من باقي المعالجة
    const cleanLines = lines.filter((l) => !l.toLowerCase().startsWith("price"));

    // تقسيم الأقسام حسب ---
    const sections = [];
    let current = null;

    cleanLines.forEach((line) => {
      if (line.startsWith("---")) {
        if (current) sections.push(current);
        current = { title: "", items: [] };
      } else if (current && current.title === "") {
        current.title = line; // أول سطر بعد الخط = عنوان قسم
      } else if (current) {
        current.items.push("• " + line); // باقي الأسطر نقاط
      }
    });

    if (current) sections.push(current);

    // =============================
    // بناء الـ Embed
    // =============================
    const embed = new EmbedBuilder()
      .setColor("#8A2BE2")
      .setTitle(`🔥 ${title}`)
      .setDescription(`════════════\n💰 **${price}** 💰\n════════════`);

    sections.forEach((sec) => {
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

    // =============================
    // إرسال المنتج
    // =============================
    await msg.channel.send("@everyone @here");

    await msg.channel.send({
      embeds: [embed],
      components: [row],
      files: [{ attachment: imageUrl, name: "product.png" }]
    });

    await msg.reply("✅ **تم إرسال المنتج بالشكل المطلوب!**");
    return;
  }
});

client.login(process.env.TOKEN);
