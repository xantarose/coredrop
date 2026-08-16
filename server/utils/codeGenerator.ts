import crypto from 'crypto';

export const generateResetCode = (): string => {
  const code = crypto.randomInt(100000, 999999).toString();
  return code;
};
