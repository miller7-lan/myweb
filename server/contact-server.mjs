import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const app = express();
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '127.0.0.1';
const contactTo = process.env.CONTACT_TO || '1813395822@qq.com';
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

app.use(express.json({ limit: '24kb' }));

const cleanSingleLine = (value) => String(value || '').replace(/[\r\n]+/g, ' ').trim();
const escapeHtml = (value) =>
  cleanSingleLine(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeMessageHtml = (value) =>
  String(value || '')
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br />');

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const transporter = () => {
  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP credentials are not configured.');
  }

  return nodemailer.createTransport({
    host: 'smtp.qq.com',
    port: 465,
    secure: true,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

app.post('/api/contact', async (req, res) => {
  const name = cleanSingleLine(req.body?.name);
  const email = cleanSingleLine(req.body?.email);
  const subject = cleanSingleLine(req.body?.subject);
  const message = String(req.body?.message || '').trim();

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ ok: false, message: '请完整填写姓名、邮箱、主题和消息。' });
  }

  if (!isEmail(email)) {
    return res.status(400).json({ ok: false, message: '请填写有效的邮箱地址。' });
  }

  if (message.length > 3000 || subject.length > 120 || name.length > 80 || email.length > 160) {
    return res.status(400).json({ ok: false, message: '内容太长了，请稍微精简后再发送。' });
  }

  const submittedAt = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const safeSubject = `Galaxy Portfolio 联系：${subject}`;

  try {
    await transporter().sendMail({
      from: `"Galaxy Portfolio" <${smtpUser}>`,
      to: contactTo,
      replyTo: `"${name}" <${email}>`,
      subject: safeSubject,
      text: [
        `姓名：${name}`,
        `邮箱：${email}`,
        `主题：${subject}`,
        `时间：${submittedAt}`,
        '',
        '消息：',
        message,
      ].join('\n'),
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.7; color: #111827;">
          <h2 style="margin: 0 0 16px;">Galaxy Portfolio 新留言</h2>
          <p><strong>姓名：</strong>${escapeHtml(name)}</p>
          <p><strong>邮箱：</strong>${escapeHtml(email)}</p>
          <p><strong>主题：</strong>${escapeHtml(subject)}</p>
          <p><strong>时间：</strong>${escapeHtml(submittedAt)}</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p>${escapeMessageHtml(message)}</p>
        </div>
      `,
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error('[contact] failed to send mail', error);
    return res.status(500).json({ ok: false, message: '消息暂时发送失败，请稍后再试。' });
  }
});

app.use(express.static(distDir));

app.use((req, res, next) => {
  if (req.method !== 'GET' || !req.accepts('html')) {
    return next();
  }

  return res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, host, (error) => {
  if (error) {
    console.error('[contact] failed to start server', error);
    process.exit(1);
  }

  console.log(`Contact server listening on http://${host}:${port}`);
});
