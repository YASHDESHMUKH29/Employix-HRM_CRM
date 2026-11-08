import { Router } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = Router();

// Helper: sign a JWT for a user document
const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );

// ── POST /api/auth/register ──────────────────────────────────────
// Body: { email, password, role?, employeeId? }
// Only Admins should call this in production; no auth guard here so
// the initial Admin account can be created (or use seed.js).
router.post("/register", async (req, res) => {
  try {
    const { email, password, role, employeeId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const user = new User({
      email: email.toLowerCase(),
      password,
      role: role || "Employee",
      employeeId: employeeId || null,
    });

    await user.save(); // password hashed by pre-save hook

    const token = signToken(user);

    return res.status(201).json({
      token,
      user: user.toJSON(), // password stripped by toJSON()
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────
// Body: { email, password }
// Returns: { token, user }
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    // Explicitly select password back (stripped by toJSON but needed here)
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────
// Returns the currently authenticated user's profile.
// Requires a valid Bearer token.
import { verifyToken } from "../middleware/auth.js";

router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    return res.json({ user: user.toJSON() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
