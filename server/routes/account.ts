import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { RowDataPacket } from 'mysql2'
import pool from '../database/init'
import authenticate from '../middleware/auth'
import { strictRateLimiter } from '../middleware/rateLimiter'

const router = Router()

interface AuthRequest extends Request {
  userId?: number
}

interface UserRow extends RowDataPacket {
  id: number
  email: string
  password_hash: string
}

router.delete('/delete', strictRateLimiter, authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    const { password } = req.body

    if (!password) {
      return res.status(400).json({ error: 'Пароль обязателен' })
    }

    const [users] = await pool.query<UserRow[]>(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    )

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' })
    }

    const isPasswordValid = await bcrypt.compare(password, users[0].password_hash)

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный пароль' })
    }

    await pool.query('DELETE FROM sessions WHERE user_id = ?', [userId])
    await pool.query('DELETE FROM users WHERE id = ?', [userId])

    res.json({
      success: true,
      message: 'Аккаунт успешно удален'
    })
  } catch (error) {
    console.error('Delete account error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
