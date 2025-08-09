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

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: findUser._id,
        username: findUser.username,
        email: findUser.email,
        address: findUser.address,
        phone: findUser.phone,
        temp: findUser.temp,
      },
    });
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
    const { phone, address ,email} = req.body;

    const mailOptions = {
      from: `"SensoSafe" <${process.env.EMAIL_USER}>`,
      to: ["ak7055864@gmail.com", email],
      subject: "بلاغ عاجل: تسرب غاز",
      html: `
        <h2 style="color:red;"> بلاغ عاجل: تسرب غاز</h2>
        <a href="${address}"><b>العنوان:</b> ${address}</ش>
        <p><b>رقم الهاتف للتواصل:</b> ${phone}</p>
        <P><b>البريد الإلكتروني:</b> ${email}</P>
        <P><b>التاريخ والوقت:</b> ${new Date().toLocaleString()}</P>

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


app.post("/forgotPassword", async (req, res) => {
  try {
    const { email } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "البريد الإلكتروني غير صالح",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود",
      });
    }

    // رمز مكون من 6 أرقام
    const resetCode = Math.floor(100000 + Math.random() * 900000);

    user.resetCode = resetCode;
    user.resetCodeExpires = Date.now() + 10 * 60 * 1000; // 10 دقائق
    await user.save();

    const mailOptions = {
      from: `"SensoSafe" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "رمز تعيين كلمة المرور",
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center;">
          <h2>رمز تعيين كلمة المرور</h2>
          <p>يرجى استخدام الرمز التالي لتعيين كلمة المرور الخاصة بك:</p>
          <h1 style="letter-spacing: 5px;">${resetCode}</h1>
          <p>صالح لمدة 10 دقائق.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "تم إرسال رمز تعيين كلمة المرور إلى بريدك الإلكتروني",
    });
  } catch (error) {
    console.error("❌ Error in forgotPassword:", error.message);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ في الخادم",
    });
  }
});






app.patch("/resetPassword", async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;

    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "البيانات غير مكتملة",
      });
    }

    const user = await User.findOne({ email });

    if (
      !user ||
      user.resetCode !== Number(resetCode) ||
      !user.resetCodeExpires ||
      user.resetCodeExpires < Date.now()
    ) {
      console.log(user);
      
      return res.status(400).json({
        success: false,
        message: "رمز غير صالح أو منتهي الصلاحية",
      });
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // تحديث كلمة المرور ومسح الرمز
    user.password = hashedPassword;
    user.resetCode = undefined;
    user.resetCodeExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "تم تغيير كلمة المرور بنجاح",
    });
  } catch (error) {
    console.error("❌ Error in resetPassword:", error.message);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ في الخادم",
    });
  }
});


// ✅ تشغيل السيرفر
app.listen(PORT, () =>
  console.log(`🚀 Server started at http://localhost:${PORT}`)
);
