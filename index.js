const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./schema"); // ✅ التعديل هنا
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const twilio = require("twilio");
const Esp=require("./espSchema")
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "mySecretKey";
const url = process.env.MONGO_URL || "mongodb://localhost:27017/users";

// ✅ الاتصال بقاعدة البيانات
mongoose
  .connect(url)
  .then(() => console.log("✅ Connected to DB"))
  .catch((err) => console.error("❌ DB Connection Error:", err));

app.use(express.json());
app.use(cors());

// ✅ Route رئيسي للتأكد من عمل السيرفر
// app.get("/", (_, res) => {
//   res.send("✅ Server is running successfully!");
// });

// ✅ تسجيل مستخدم جديد
app.post("/register", async (req, res) => {
  try {
    const { username, email, password, address, phone, temp } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      address,
      phone,
      temp,
    });
    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        address: newUser.address,
        phone: newUser.phone,
        temp: newUser.temp,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ✅ تسجيل دخول
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Bad Request" });
    }

    const findUser = await User.findOne({ email });
    if (!findUser) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Found" });
    }

    const isMatch = await bcrypt.compare(password, findUser.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = jwt.sign(
      { id: findUser._id, email: findUser.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res
      .status(200)
      .json({ success: true, token, id: findUser._id, email: findUser.email });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ✅ تحديث بيانات
app.patch("/update/:id", async (req, res) => {
  try {
    const _id = req.params.id;
    const data = await User.findByIdAndUpdate(_id, req.body, { new: true });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ✅ جلب كل البيانات
app.get("/all", async (req, res) => {
  try {
    const data = await User.find();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ✅ إرسال إيميل
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.post("/email", async (req, res) => {
  try {
    const { phone, address } = req.body;

    const mailOptions = {
      from: `"SensoSafe" <${process.env.EMAIL_USER}>`,
      to: "ak7055864@gmail.com",
      subject: "بلاغ عاجل: تسرب غاز",
      html: `
        <h2 style="color:red;">🚨 بلاغ عاجل: تسرب غاز</h2>
        <p><b>العنوان:</b> ${address}</p>
        <p><b>رقم الهاتف للتواصل:</b> ${phone}</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    return res
      .status(200)
      .json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ✅ Twilio اتصال
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

app.post("/call", async (req, res) => {
  try {
    const { phone } = req.body;

    const call = await client.calls.create({
      url: "http://demo.twilio.com/docs/voice.xml",
      to: phone,
      from: process.env.TWILIO_PHONE,
    });

    res.json({ success: true, message: "تم الاتصال بنجاح", callSid: call.sid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "خطأ أثناء الاتصال" });
  }
});

// ✅ جلب بيانات حسب ID
app.get("/:id", async (req, res) => {
  try {
    const _id = req.params.id;
    const data = await User.findById(_id);

    if (!data) {
      return res.status(404).json({ success: false, message: "Not Found" });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ success: false, message: "Invalid ID" });
  }
});
const axios = require("axios");
app.get("/", async (req, res) => {
  try {
    const url=req.query.url
    console.log(url);
    
    const response = await axios.get(
      `${url}/status`
      
    );
    res.json(response.data); // ✅ إرجاع البيانات فقط
  } catch (err) {
    console.error("❌ ESP Error:", err.message);
    res.status(500).json({ error: "فشل الاتصال بـ ESP32" });
  }
});

app.post("/off", async (req, res) => {
  try {
    const url = req.query.url;
    console.log(url);

    const response = await axios.post(`${url}/led/off`);
    res.json(response.data); // ✅ إرجاع البيانات فقط
  } catch (err) {
    console.error("❌ ESP Error:", err.message);
    res.status(500).json({ error: "فشل الاتصال بـ ESP32" });
  }
});
app.post("/on", async (req, res) => {
  try {
    const url = req.query.url;
    console.log(url);

    const response = await axios.post(`${url}/led/on`);
    res.json(response.data); // ✅ إرجاع البيانات فقط
  } catch (err) {
    console.error("❌ ESP Error:", err.message);
    res.status(500).json({ error: "فشل الاتصال بـ ESP32" });
  }
});
// ✅ تشغيل السيرفر
app.listen(PORT, () =>
  console.log(`🚀 Server started at http://localhost:${PORT}`)
);
