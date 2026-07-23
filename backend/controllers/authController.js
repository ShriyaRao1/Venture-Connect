const crypto = require('crypto');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

// @desc  Register new user
// @route POST /api/auth/register
// @access Public
const register = async (req, res) => {
  try {
    const { name, email, password, role, investorPreferences, investorType } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ success: false, message: 'Email already registered' });

    const userData = { name, email, password, role };
    if (role === 'investor') {
      if (investorPreferences) userData.investorPreferences = investorPreferences;
      if (investorType) userData.investorType = investorType;
    }

    const user = await User.create(userData);
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      token,
      user: user.toPublicJSON(),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Login user
// @route POST /api/auth/login
// @access Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, user.role);
    res.json({
      success: true,
      token,
      user: user.toPublicJSON(),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get current logged-in user
// @route GET /api/auth/me
// @access Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('savedStartups', 'name tagline logo stage');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Forgot password – generate reset token
// @route POST /api/auth/forgot-password
// @access Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+resetPasswordToken +resetPasswordExpire');
    // Always respond with success to avoid email enumeration
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });

    // Generate token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;

    let emailSent = false;
    // ── Send email if SMTP is configured ────────────────────────────────────
    if (
      process.env.SMTP_EMAIL &&
      process.env.SMTP_EMAIL !== 'your_gmail@gmail.com' &&
      process.env.SMTP_APP_PASSWORD &&
      process.env.SMTP_APP_PASSWORD !== 'your_16_char_app_password'
    ) {
      const nodemailer = require('nodemailer');

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_APP_PASSWORD,
        },
      });

      const html = `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;padding:32px;background:#111;color:#f0f0f0;border-radius:12px;border:1px solid #2a2a2a;">
          <h2 style="color:#00c853;margin-bottom:8px;">VentureConnect</h2>
          <h3 style="margin-top:0;color:#fff;">Reset your password</h3>
          <p style="color:#888;font-size:14px;">Hi ${user.name},</p>
          <p style="color:#888;font-size:14px;">You requested a password reset. Click the button below — the link expires in <strong style="color:#fff;">1 hour</strong>.</p>
          <a href="${resetUrl}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#00c853;color:#000;font-weight:700;border-radius:8px;text-decoration:none;font-size:14px;">Reset Password</a>
          <p style="color:#555;font-size:12px;">If the button doesn't work, copy this link:<br/><a href="${resetUrl}" style="color:#00c853;word-break:break-all;">${resetUrl}</a></p>
          <hr style="border:none;border-top:1px solid #2a2a2a;margin:24px 0;"/>
          <p style="color:#444;font-size:11px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `;

      await transporter.sendMail({
        from: `"VentureConnect" <${process.env.SMTP_EMAIL}>`,
        to: user.email,
        subject: 'Reset your VentureConnect password',
        html,
      });

      console.log(`\n✅ Password reset email sent to ${user.email}`);
      emailSent = true;
    } else {
      // Fallback: log reset link for local dev without SMTP
      console.log('\n🔑 PASSWORD RESET LINK (copy into browser):');
      console.log(resetUrl);
      console.log('');
    }

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.', emailSent });
  } catch (err) {
    console.error('forgotPassword error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send reset email. Try again.' });
  }
};

// @desc  Reset password using token
// @route PUT /api/auth/reset-password/:token
// @access Public
const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user)
      return res.status(400).json({ success: false, message: 'Invalid or expired reset link' });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, message: 'Password reset successful', token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { register, login, getMe, forgotPassword, resetPassword };
