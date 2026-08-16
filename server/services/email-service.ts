import { Resend } from 'resend';

export const sendPasswordResetCode = async (email: string, resetLink: string): Promise<boolean> => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('Missing RESEND_API_KEY environment variable');
      return false;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ru">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Восстановление пароля</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #1c1c1c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#1c1c1c">
            <tr>
              <td align="center" style="padding: 32px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 560px;">

                  <!-- Brand label -->
                  <tr>
                    <td style="padding: 0 0 4px 0;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 16px 24px 12px;">
                            <span style="font-size: 15px; font-weight: 700; color: #4a9eff;">CoreDrop</span>
                            <span style="font-size: 13px; color: #6b8aaa; margin-left: 4px;">— восстановление пароля</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Main card -->
                  <tr>
                    <td style="background-color: #252525; border-radius: 6px; border: 1px solid #333333; overflow: hidden;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

                        <!-- Body -->
                        <tr>
                          <td style="padding: 28px 28px 20px;">
                            <p style="margin: 0 0 14px; font-size: 14px; color: #d0d0d0; line-height: 1.7;">
                              Для завершения восстановления пароля на сайте
                              <a href="https://coredrop.com" style="color: #4a9eff; text-decoration: none; font-weight: 600;">CoreDrop</a>
                              нажмите на кнопку ниже:
                            </p>

                            <!-- Button -->
                            <table cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="background-color: #4a9eff; border-radius: 6px;">
                                  <a href="${resetLink}" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; letter-spacing: 0.2px;">
                                    Восстановить пароль
                                  </a>
                                </td>
                              </tr>
                            </table>

                            <p style="margin: 18px 0 18px; font-size: 13px; color: #888888; line-height: 1.6;">
                              Ссылка действительна в течение 1 часа.
                            </p>

                            <!-- Divider -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr><td height="1" bgcolor="#333333" style="font-size:0;line-height:0;">&nbsp;</td></tr>
                            </table>

                            <p style="margin: 18px 0 0; font-size: 13px; color: #777777; line-height: 1.7;">
                              Если Вы не запрашивали восстановление пароля — просто проигнорируйте это письмо. Ваш аккаунт остаётся в безопасности.
                            </p>
                          </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                          <td style="padding: 14px 28px 18px; background-color: #1e1e1e; border-top: 1px solid #2e2e2e;">
                            <p style="margin: 0 0 2px; font-size: 13px; color: #d0d0d0;">Спасибо.</p>
                            <p style="margin: 0; font-size: 13px; color: #4a9eff;">CoreDrop</p>
                          </td>
                        </tr>

                      </table>
                    </td>
                  </tr>

                  <!-- Bottom caption -->
                  <tr>
                    <td style="padding: 14px 4px 0;">
                      <p style="margin: 0; font-size: 11px; color: #555555; line-height: 1.7;">
                        Автоматическое письмо &middot; Не отвечайте на него &middot; &copy; 2026 CoreDrop. Все права защищены.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>

        </body>
      </html>
    `;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject: 'Восстановление пароля CoreDrop',
      html: htmlContent
    });

    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

export const sendEmailVerification = async (email: string, token: string, name: string): Promise<boolean> => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('Missing RESEND_API_KEY environment variable');
      return false;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const verificationUrl = `${process.env.CLIENT_URL}/api/auth/verify-email?token=${token}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ru">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Подтверждение email</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #1c1c1c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#1c1c1c">
            <tr>
              <td align="center" style="padding: 32px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 560px;">

                  <!-- Brand label -->
                  <tr>
                    <td style="padding: 0 0 4px 0;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 16px 24px 12px;">
                            <span style="font-size: 15px; font-weight: 700; color: #4a9eff;">CoreDrop</span>
                            <span style="font-size: 13px; color: #6b8aaa; margin-left: 4px;">— подтверждение email</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Main card -->
                  <tr>
                    <td style="background-color: #252525; border-radius: 6px; border: 1px solid #333333; overflow: hidden;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

                        <!-- Body -->
                        <tr>
                          <td style="padding: 28px 28px 20px;">
                            <p style="margin: 0 0 14px; font-size: 14px; color: #d0d0d0; line-height: 1.7;">
                              Привет, <strong style="color: #ffffff;">${name}</strong>!
                            </p>
                            <p style="margin: 0 0 20px; font-size: 14px; color: #d0d0d0; line-height: 1.7;">
                              Для завершения регистрации на сайте
                              <a href="https://coredrop.com" style="color: #4a9eff; text-decoration: none; font-weight: 600;">CoreDrop</a>
                              необходимо подтвердить ваш email адрес. Нажмите на кнопку ниже:
                            </p>

                            <!-- Button -->
                            <table cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="background-color: #4a9eff; border-radius: 6px;">
                                  <a href="${verificationUrl}" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; letter-spacing: 0.2px;">
                                    Подтвердить email
                                  </a>
                                </td>
                              </tr>
                            </table>

                            <p style="margin: 18px 0 18px; font-size: 13px; color: #888888; line-height: 1.6;">
                              Ссылка действительна в течение 24 часов.
                            </p>

                            <!-- Divider -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr><td height="1" bgcolor="#333333" style="font-size:0;line-height:0;">&nbsp;</td></tr>
                            </table>

                            <p style="margin: 18px 0 0; font-size: 13px; color: #777777; line-height: 1.7;">
                              Если Вы не регистрировались на CoreDrop — просто проигнорируйте это письмо. Этот email не будет использован.
                            </p>
                          </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                          <td style="padding: 14px 28px 18px; background-color: #1e1e1e; border-top: 1px solid #2e2e2e;">
                            <p style="margin: 0 0 2px; font-size: 13px; color: #d0d0d0;">Спасибо.</p>
                            <p style="margin: 0; font-size: 13px; color: #4a9eff;">CoreDrop</p>
                          </td>
                        </tr>

                      </table>
                    </td>
                  </tr>

                  <!-- Bottom caption -->
                  <tr>
                    <td style="padding: 14px 4px 0;">
                      <p style="margin: 0; font-size: 11px; color: #555555; line-height: 1.7;">
                        Автоматическое письмо &middot; Не отвечайте на него &middot; &copy; 2026 CoreDrop. Все права защищены.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>

        </body>
      </html>
    `;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject: 'Подтверждение email — CoreDrop',
      html: htmlContent
    });

    return true;
  } catch (error) {
    console.error('Email verification sending error:', error);
    return false;
  }
};
