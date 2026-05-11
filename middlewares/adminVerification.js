import { verifyToken } from "../utils/authUtils.js";

export const adminVerification = (req, res, next) => {
  try {
    // Try cookie first (login sets cookie named 'token'), then Authorization header, then query string
    const tokenFromCookie = req.cookies && (req.cookies.token || req.cookies.authToken);
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = tokenFromCookie;

    if (!token && authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // fallback to query param (optional)
    if (!token && req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ message: "Authorization token missing or invalid" });
    }

    const decoded = verifyToken(token);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }
    // attach decoded payload to req.user for downstream handlers
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: error.message || "Invalid token" });
  }
};
