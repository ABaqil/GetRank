import "dotenv/config";
import express from "express";
import fetch from "node-fetch";

#testing push 1
const app = express();
const PORT = process.env.PORT || 3000;

// 🔑 Riot API Key from .env
const RIOT_API_KEY = process.env.RIOT_API_KEY;

if (!RIOT_API_KEY) {
  console.error("❌ Missing RIOT_API_KEY in .env file");
  process.exit(1);
}

console.log("🔑 API Key loaded");

// 🎮 Accounts
const ACCOUNTS = {
  euw: {
    gameName: "Thorned",
    tagLine: "2329",
    platform: "euw1",
    routing: "europe"
  },
  mena: {
    gameName: "Thorned",
    tagLine: "MENA",
    platform: "me1",
    routing: "europe"
  }
};

// 🔧 Fetch rank function
async function getRank(account) {
  const { gameName, tagLine, platform, routing } = account;

  // 1️⃣ Get PUUID
  const accountRes = await fetch(
    `https://${routing}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      gameName
    )}/${encodeURIComponent(tagLine)}`,
    {
      headers: {
        "X-Riot-Token": RIOT_API_KEY
      }
    }
  );

  if (!accountRes.ok) {
    throw new Error(`Account lookup failed (${gameName})`);
  }

  const accountData = await accountRes.json();

  if (!accountData.puuid) {
    throw new Error(`PUUID not found (${gameName})`);
  }

  // 2️⃣ Get rank
  const rankRes = await fetch(
    `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${accountData.puuid}`,
    {
      headers: {
        "X-Riot-Token": RIOT_API_KEY
      }
    }
  );

  if (!rankRes.ok) {
    throw new Error(`Rank lookup failed (${gameName})`);
  }

  const rankData = await rankRes.json();

  const solo = rankData.find(
    (q) => q.queueType === "RANKED_SOLO_5x5"
  );

  if (!solo) {
    return "Unranked";
  }

  return `${solo.tier} ${solo.rank} (${solo.leaguePoints} LP)`;
}

// 🌍 ONE ENDPOINT → STRING RESPONSE (FIXED)
app.get("/rank", async (req, res) => {
  try {
    const euwRank = await getRank(ACCOUNTS.euw);
    const menaRank = await getRank(ACCOUNTS.mena);

    const response =
      `EUW: Thorned#2329 → ${euwRank} | ` +
      `MENA: Thorned#MENA → ${menaRank}`;

    // ✅ IMPORTANT: return plain text for Twitch
    res.setHeader("Content-Type", "text/plain");
    res.send(response);

  } catch (error) {
    console.error("Error:", error.message);

    res.setHeader("Content-Type", "text/plain");
    res.status(500).send("Error: " + error.message);
  }
});

// 🧪 Health check
app.get("/", (req, res) => {
  res.send("LoL Rank API is running (EUW + MENA)");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});