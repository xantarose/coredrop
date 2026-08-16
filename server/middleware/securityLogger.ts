import { Request } from "express";

type SecurityEvent =
  | "DISPOSABLE_EMAIL_BLOCKED"
  | "INVALID_QUERY_PARAM"
  | "MALFORMED_TOKEN"
  | "REGISTRATION_IP_LIMIT"
  | "LOGIN_FAILED_BURST"
  | "RESET_CODE_BRUTE";

interface LogEntry {
  timestamp: string;
  event: SecurityEvent;
  ip: string;
  userId?: string;
  email?: string;
  details: Record<string, unknown>;
}

export function logSuspiciousRequest(
  req: Request,
  event: SecurityEvent,
  details: Record<string, unknown> = {}
): void {
  const ip = req.ip || "unknown";
  const userId = (req.user as any)?.id;
  const email = (req.user as any)?.email;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    event,
    ip,
    ...(userId && { userId }),
    ...(email && { email }),
    details,
  };

  console.error(JSON.stringify(entry));
}

export function requestAuditLogger(req: Request, res: any, next: Function): void {
  const originalJson = res.json;

  res.json = function (data: any) {
    if (req.method === "POST" && req.path.includes("auth")) {
      const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        ip: req.ip,
        status: res.statusCode,
      };
      console.error(JSON.stringify(logData));
    }

    return originalJson.call(this, data);
  };

  next();
}
