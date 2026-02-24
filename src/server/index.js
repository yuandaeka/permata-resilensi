import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

console.log("🚀 Server starting...");

// ================= CHECK API KEY =================
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY not found in .env");
  process.exit(1);
}

const app = express();

// 🔥 allow big base64 uploads
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// ================= CHAT ENDPOINT =================
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ reply: "Message is required." });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `
Kamu adalah Pendamping Dukungan Mental.

Aturan:
- Jangan mendiagnosis kondisi medis atau psikologis.
- Jangan menggantikan peran profesional atau terapi.
- Berikan respons dengan empati dan validasi emosi.
- Jika diperlukan, sarankan mencari bantuan profesional.
- Gunakan bahasa Indonesia yang hangat, lembut, dan suportif.
- Hindari bahasa yang terlalu klinis atau kaku.
`
    });

    const result = await model.generateContent(message);

    const reply = result.response.text();

    res.json({ reply });

  } catch (error) {
    console.error("🔥 CHAT ERROR:", error);
    res.status(500).json({ reply: "AI error occurred." });
  }
});

// ================= MOOD + FILE ANALYZER =================
app.post("/api/mood-food", async (req, res) => {
  try {
    console.log("📦 BODY RECEIVED:", req.body);

    const { mood, file } = req.body;

    if (!mood || !file || !file.base64) {
      return res.status(400).json({ reply: "Mood and file required." });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
Mood Pengguna: ${mood}

Analisis file yang dilampirkan.

Jika berupa gambar makanan:
- Identifikasi makanannya
- Jelaskan dampak nutrisinya
- Hubungkan dengan kondisi mood
- Berikan saran suportif

Jika berupa dokumen:
- Ringkas secara singkat
- Hubungkan dengan kesadaran emosional

Gunakan bahasa Indonesia yang hangat, suportif, dan tidak menghakimi.
`
            },
            {
              inlineData: {
                mimeType: file.mimeType || "image/jpeg",
                data: file.base64,
              },
            },
          ],
        },
      ],
    });

    const reply = result.response.text();

    res.json({ reply });

  } catch (error) {
    console.error("🔥 MOOD FOOD ERROR:", error);
    res.status(500).json({ reply: "Analisis Gagal." });
  }
});

// ================= START SERVER =================
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});