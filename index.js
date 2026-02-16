require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());

// Serve frontend
const frontendPath = __dirname;
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const GUILD_ID = process.env.GUILD_ID;

/* ================= LOGIN ROUTE ================= */
app.get("/login", (req, res) => {
  const discordURL =
    `https://discord.com/api/oauth2/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=identify%20guilds`;

  res.redirect(discordURL);
});

/* ================= CALLBACK ROUTE ================= */
app.get("/callback", async (req, res) => {
  const code = req.query.code;

  try {
    // Exchange code for token
    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Get user info
    const userResponse = await axios.get(
      "https://discord.com/api/users/@me",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const guildsResponse = await axios.get(
      "https://discord.com/api/users/@me/guilds",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const user = userResponse.data;
    const guilds = guildsResponse.data;

    const isInServer = guilds.some(g => g.id === GUILD_ID);

    if (!isInServer) {
      return res.send("You must join the Discord server first.");
    }

    // Return user data to frontend
    console.log("Redirecting with:", user.id, user.username);

    res.redirect(
  `http://localhost:3000/?id=${user.id}&username=${user.username}&display=${encodeURIComponent(user.global_name || user.username)}#theories`
);

  } catch (error) {
    console.error(error.response?.data || error);
    res.send("Authentication failed.");
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});