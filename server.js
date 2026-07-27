import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();

app.get("/ping", (req, res) => {
  res.json({
    message: "pong",
  });
});

app.get("/get-chapter", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        message: "Missing url",
      });
    }

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36",
      },
    });

    const $ = cheerio.load(response.data);

    // ví dụ title nằm trong <title>
    const title = $(".chapter-title").text().trim();

    // lấy div id=content

    $("#chapter-c script").remove();

    // Xóa style
    $("#chapter-c style").remove();

    // Xóa quảng cáo
    $("#chapter-c .ads").remove();

    // Xóa iframe
    $("#chapter-c iframe").remove();

    const content = $("#chapter-c").html();

    res.json({
      title,
      content,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message,
    });
  }
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
