import { Request, Response, NextFunction } from "express";
import { logSuspiciousRequest } from "./securityLogger";

export async function ipRegistrationLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ip = req.ip || "unknown";

  try {
    const query = `
      SELECT COUNT(*) as count FROM users
      WHERE registration_ip = ?
      AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `;

    const [rows]: any = await (req.app.get("db") as any).execute(query, [ip]);
    const count = rows[0]?.count || 0;

    if (count >= 3) {
      logSuspiciousRequest(req, "REGISTRATION_IP_LIMIT", { ip, registrationCount: count });
      res.status(429).json({ error: "Too many registrations from this IP" });
      return;
    }

    next();
  } catch (err) {
    console.error("IP registration limiter error:", err);
    next();
  }
}
