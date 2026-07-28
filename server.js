import express from "express";
import * as cheerio from "cheerio";
import { chromium } from "playwright";

const app = express();

app.get("/ping", (req, res) => {
  res.json({ message: "pong" });
});

app.get("/get-chapter", async (req, res) => {
  let browser = null;

  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ message: "Missing url" });
    }

    // 1. Khởi tạo trình duyệt Playwright
    browser = await chromium.launch({
      headless: true, // Chạy ngầm (đặt false nếu muốn mở cửa sổ debug)
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // Cần thiết nếu deploy lên VPS/Docker
    });

    // 2. Tạo context với User-Agent và kích thước màn hình như máy tính thật
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();

    // 3. Chặn các tài nguyên không cần thiết (mạng/ảnh/font) để tăng tốc độ cào
    await page.route("**/*.{png,jpg,jpeg,gif,svg,css,woff,woff2}", (route) =>
      route.abort(),
    );

    // 4. Truy cập URL và chờ đến khi HTML/JS tải xong
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000, // Timeout 30 giây
    });

    // Chờ selector chính xuất hiện (phòng trường hợp render chậm bằng JS)
    await page.waitForSelector("#chapter-c", { timeout: 10000 }).catch(() => {
      console.log("Không tìm thấy #chapter-c, tiến hành lấy HTML hiện tại...");
    });

    // 5. Lấy HTML hoàn chỉnh từ Playwright
    const html = await page.content();

    // 6. Dùng Cheerio bóc tách và làm sạch HTML như cũ
    const $ = cheerio.load(html);

    const title = $(".chapter-title").text().trim();

    // Làm sạch DOM bằng Cheerio
    $("#chapter-c script").remove();
    $("#chapter-c style").remove();
    $("#chapter-c .ads").remove();
    $("#chapter-c iframe").remove();

    const content = $("#chapter-c").html();

    res.json({
      title,
      content,
    });
  } catch (err) {
    console.error("Scraping error:", err.message);
    res.status(500).json({
      message: err.message,
    });
  } finally {
    // 7. Đảm bảo LUÔN đóng trình duyệt để tránh tràn RAM
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
