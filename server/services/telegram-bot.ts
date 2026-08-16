import TelegramBot from 'node-telegram-bot-api';
import pool from '../database/init';
import { RowDataPacket } from 'mysql2';

const ADMIN_TELEGRAM_IDS = process.env.ADMIN_TELEGRAM_ID
  ? process.env.ADMIN_TELEGRAM_ID.split(',').map(id => id.trim())
  : [];
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  is_admin: boolean;
}

let bot: TelegramBot | null = null;

export const initTelegramBot = () => {
  if (!BOT_TOKEN) {
    console.log('Telegram bot token not found, skipping bot initialization');
    return;
  }

  if (ADMIN_TELEGRAM_IDS.length === 0) {
    console.log('Admin Telegram IDs not set, skipping bot initialization');
    return;
  }

  try {
    bot = new TelegramBot(BOT_TOKEN, { polling: true });

    bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id.toString();

      if (!userId || !ADMIN_TELEGRAM_IDS.includes(userId)) {
        return;
      }

      const text = msg.text?.trim();

      if (!text) {
        return;
      }

      if (text === '/start') {
        await bot?.sendMessage(chatId,
          'Добро пожаловать в панель управления администраторами!\n\n' +
          'Команды:\n' +
          '/grant email@example.com - Выдать админ-права\n' +
          '/revoke email@example.com - Снять админ-права\n' +
          '/list - Список всех админов'
        );
        return;
      }

      if (text.startsWith('/grant ')) {
        const email = text.replace('/grant ', '').trim();

        if (!email) {
          await bot?.sendMessage(chatId, 'Укажите email пользователя');
          return;
        }

        try {
          const [users] = await pool.query<UserRow[]>(
            'SELECT id, email, is_admin FROM users WHERE email = ?',
            [email]
          );

          if (users.length === 0) {
            await bot?.sendMessage(chatId, `Пользователь с email ${email} не найден`);
            return;
          }

          const user = users[0];

          if (user.is_admin) {
            await bot?.sendMessage(chatId, `Пользователь ${email} уже является администратором`);
            return;
          }

          await pool.query(
            'UPDATE users SET is_admin = TRUE WHERE id = ?',
            [user.id]
          );

          await bot?.sendMessage(chatId, `✅ Админ-права выданы пользователю ${email}`);
        } catch (error) {
          console.error('Grant admin error:', error);
          await bot?.sendMessage(chatId, 'Ошибка при выдаче прав');
        }
        return;
      }

      if (text.startsWith('/revoke ')) {
        const email = text.replace('/revoke ', '').trim();

        if (!email) {
          await bot?.sendMessage(chatId, 'Укажите email пользователя');
          return;
        }

        try {
          const [users] = await pool.query<UserRow[]>(
            'SELECT id, email, is_admin FROM users WHERE email = ?',
            [email]
          );

          if (users.length === 0) {
            await bot?.sendMessage(chatId, `Пользователь с email ${email} не найден`);
            return;
          }

          const user = users[0];

          if (!user.is_admin) {
            await bot?.sendMessage(chatId, `Пользователь ${email} не является администратором`);
            return;
          }

          await pool.query(
            'UPDATE users SET is_admin = FALSE WHERE id = ?',
            [user.id]
          );

          await bot?.sendMessage(chatId, `✅ Админ-права сняты с пользователя ${email}`);
        } catch (error) {
          console.error('Revoke admin error:', error);
          await bot?.sendMessage(chatId, 'Ошибка при снятии прав');
        }
        return;
      }

      if (text === '/list') {
        try {
          const [admins] = await pool.query<UserRow[]>(
            'SELECT id, email FROM users WHERE is_admin = TRUE ORDER BY email ASC'
          );

          if (admins.length === 0) {
            await bot?.sendMessage(chatId, 'Нет пользователей с правами администратора');
            return;
          }

          const list = admins.map((admin, index) => `${index + 1}. ${admin.email}`).join('\n');
          await bot?.sendMessage(chatId, `Администраторы (${admins.length}):\n\n${list}`);
        } catch (error) {
          console.error('List admins error:', error);
          await bot?.sendMessage(chatId, 'Ошибка при получении списка');
        }
        return;
      }
    });

    console.log('Telegram bot started successfully');
  } catch (error) {
    console.error('Telegram bot initialization error:', error);
  }
};

export const stopTelegramBot = () => {
  if (bot) {
    bot.stopPolling();
  }
};
