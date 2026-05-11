import { verifyToken } from "../utils/authUtils.js";



export const studentVerification = (req, res, next) => {
    // get token from cookies 
    try {
        const tokenFromCookie = req.cookies && (req.cookies.token || req.cookies.authToken);
        const authHeader = req.headers.authorization || req.headers.Authorization;
        let token = tokenFromCookie;
        console.log("the token from cookies", tokenFromCookie);
        

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
        // if (decoded.role !== "student") {
        //     return res.status(403).json({ message: "Access denied: Students only" });
        // }

        req.user = decoded;
        next();




    } catch (error) {
        return res.status(401).json({ message: error.message || "Invalid token" });


    }
}