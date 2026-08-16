import fs from "fs";
import path from "path";

let disposableBlocklist = new Set<string>();
let allowlist = new Set<string>();

function loadEmailLists(): void {
  const blocklistPath = path.join(process.cwd(), "blockemails", "disposable_email_blocklist.conf");
  const allowlistPath = path.join(process.cwd(), "blockemails", "allowlist.conf");

  try {
    if (fs.existsSync(blocklistPath)) {
      const data = fs.readFileSync(blocklistPath, "utf-8");
      data.split("\n").forEach((line) => {
        const domain = line.trim().toLowerCase();
        if (domain) disposableBlocklist.add(domain);
      });
    }
  } catch (err) {
    console.error("Error loading disposable email blocklist:", err);
  }

  try {
    if (fs.existsSync(allowlistPath)) {
      const data = fs.readFileSync(allowlistPath, "utf-8");
      data.split("\n").forEach((line) => {
        const domain = line.trim().toLowerCase();
        if (domain) allowlist.add(domain);
      });
    }
  } catch (err) {
    console.error("Error loading email allowlist:", err);
  }
}

loadEmailLists();

export function isDisposableEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const domainMatch = normalized.match(/@(.+)$/);

  if (!domainMatch) return false;

  let domain = domainMatch[1];

  if (allowlist.has(domain)) return false;

  if (disposableBlocklist.has(domain)) return true;

  const parts = domain.split(".");
  for (let i = 1; i < parts.length; i++) {
    const subdomain = parts.slice(i).join(".");
    if (disposableBlocklist.has(subdomain)) return true;
  }

  return false;
}
