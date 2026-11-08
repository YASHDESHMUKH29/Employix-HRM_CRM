import jwt from "jsonwebtoken";

/**
 * verifyToken
 * Reads the Bearer token from the Authorization header, verifies it,
 * and attaches the decoded payload to req.user.
 */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    const message =
      err.name === "TokenExpiredError"
        ? "Token has expired. Please log in again."
        : "Invalid token.";
    return res.status(401).json({ error: message });
  }
};

/**
 * authorizeRoles(...roles)
 * Factory that returns a middleware restricting access to specific roles.
 * Must be used AFTER verifyToken.
 *
 * Usage:
 *   router.delete('/api/employees/:id', verifyToken, authorizeRoles('Admin', 'HR Manager'), handler)
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        error: `Access denied. Required role(s): ${roles.join(", ")}.`,
      });
    }
    next();
  };
};
