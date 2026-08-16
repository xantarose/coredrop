import React, { useEffect, useState } from 'react'

interface User {
  id: number
  email: string
  name: string
  created_at: string
  last_login: string | null
  is_admin: boolean
  is_active: boolean
  file_count: number
  total_size: number
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('created_at')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [limit] = useState(50)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPasswordChoiceModal, setShowPasswordChoiceModal] = useState(false)
  const [customPassword, setCustomPassword] = useState('')
  const [customPasswordConfirm, setCustomPasswordConfirm] = useState('')

  useEffect(() => {
    loadUsers()
  }, [search, sort, order, page])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search,
        sort,
        order,
        limit: limit.toString(),
        offset: (page * limit).toString()
      })

      const response = await fetch(`/api/admin/users?${params}`, {
        credentials: 'include'
      })

      const data = await response.json()
      setUsers(data.users)
      setTotal(data.total)
    } catch (error) {
      console.error('Load users error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (user: User) => {
    setSelectedUser(user)
    setShowPasswordChoiceModal(true)
  }

  const handleGeneratePassword = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/password`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ generate: true })
      })

      const data = await response.json()
      setNewPassword(data.password)
      setShowPasswordChoiceModal(false)
      setShowPasswordModal(true)
    } catch (error) {
      console.error('Reset password error:', error)
      alert('Ошибка при сбросе пароля')
    }
  }

  const handleSetCustomPassword = async () => {
    if (!selectedUser || !customPassword) {
      alert('Введите пароль')
      return
    }

    if (customPassword !== customPasswordConfirm) {
      alert('Пароли не совпадают')
      return
    }

    if (customPassword.length < 8) {
      alert('Пароль должен быть не менее 8 символов')
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/password`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: customPassword })
      })

      const data = await response.json()
      setNewPassword(customPassword)
      setShowPasswordChoiceModal(false)
      setCustomPassword('')
      setCustomPasswordConfirm('')
      setShowPasswordModal(true)
    } catch (error) {
      console.error('Reset password error:', error)
      alert('Ошибка при сбросе пароля')
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete user')
      }

      setShowDeleteModal(false)
      setSelectedUser(null)
      loadUsers()
    } catch (error) {
      console.error('Delete user error:', error)
      alert('Ошибка при удалении пользователя')
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (date: string | null): string => {
    if (!date) return 'Никогда'
    return new Date(date).toLocaleString('ru-RU')
  }

  const handleSort = (field: string) => {
    if (sort === field) {
      setOrder(order === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(field)
      setOrder('desc')
    }
    setPage(0)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="admin-users">
      <div className="admin-users-header">
        <h1>Управление пользователями</h1>
        <div className="admin-users-stats">
          Всего пользователей: {total}
        </div>
      </div>

      <div className="admin-users-controls">
        <input
          type="text"
          placeholder="Поиск по email или имени..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
          className="admin-search-input"
        />
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner"></div>
        </div>
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('email')}>
                    Email {sort === 'email' && (order === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('name')}>
                    Имя {sort === 'name' && (order === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('created_at')}>
                    Дата регистрации {sort === 'created_at' && (order === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('last_login')}>
                    Последний вход {sort === 'last_login' && (order === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('file_count')}>
                    Файлов {sort === 'file_count' && (order === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('total_size')}>
                    Размер {sort === 'total_size' && (order === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Роль</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.name}</td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>{formatDate(user.last_login)}</td>
                    <td>{user.file_count}</td>
                    <td>{formatBytes(user.total_size)}</td>
                    <td>
                      {user.is_admin ? (
                        <span className="admin-badge">Админ</span>
                      ) : (
                        <span className="user-badge">Пользователь</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button
                          className="admin-btn admin-btn-warning"
                          onClick={() => handleResetPassword(user)}
                          title="Сбросить пароль"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h16v16H4z" />
                            <path d="M9 12c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z" />
                          </svg>
                        </button>
                        <button
                          className="admin-btn admin-btn-danger"
                          onClick={() => {
                            setSelectedUser(user)
                            setShowDeleteModal(true)
                          }}
                          title="Удалить"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-9l-1 1H5v2h14V4z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <button
                className="admin-btn"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Назад
              </button>
              <span className="admin-pagination-info">
                Страница {page + 1} из {totalPages}
              </span>
              <button
                className="admin-btn"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                Вперёд
              </button>
            </div>
          )}
        </>
      )}

      {showPasswordChoiceModal && (
        <div className="admin-modal-overlay" onClick={() => {
          setShowPasswordChoiceModal(false)
          setCustomPassword('')
          setCustomPasswordConfirm('')
        }}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Выбор способа установки пароля</h2>
              <button
                className="admin-modal-close"
                onClick={() => {
                  setShowPasswordChoiceModal(false)
                  setCustomPassword('')
                  setCustomPasswordConfirm('')
                }}
              >
                ×
              </button>
            </div>
            <div className="admin-modal-content">
              <p>Выберите способ установки пароля для <strong>{selectedUser?.email}</strong></p>

              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Введите свой пароль:
                  </label>
                  <input
                    type="password"
                    placeholder="Новый пароль (мин. 8 символов)"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #2a2a2a',
                      borderRadius: '6px',
                      backgroundColor: '#0a0a0a',
                      color: '#ffffff',
                      marginBottom: '0.5rem'
                    }}
                  />
                  <input
                    type="password"
                    placeholder="Повторите пароль"
                    value={customPasswordConfirm}
                    onChange={(e) => setCustomPasswordConfirm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #2a2a2a',
                      borderRadius: '6px',
                      backgroundColor: '#0a0a0a',
                      color: '#ffffff'
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button
                className="admin-btn"
                onClick={() => {
                  setShowPasswordChoiceModal(false)
                  setCustomPassword('')
                  setCustomPasswordConfirm('')
                }}
              >
                Отмена
              </button>
              <button
                className="admin-btn admin-btn-primary"
                onClick={handleSetCustomPassword}
                disabled={!customPassword || customPassword !== customPasswordConfirm}
              >
                Установить пароль
              </button>
              <button
                className="admin-btn admin-btn-warning"
                onClick={handleGeneratePassword}
              >
                Сгенерировать
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="admin-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Новый пароль</h2>
              <button
                className="admin-modal-close"
                onClick={() => setShowPasswordModal(false)}
              >
                ×
              </button>
            </div>
            <div className="admin-modal-content">
              <p>Пароль для пользователя <strong>{selectedUser?.email}</strong> сброшен.</p>
              <div className="admin-password-display">
                {newPassword}
              </div>
              <p className="admin-modal-note">
                Скопируйте пароль и передайте его пользователю. После закрытия окна пароль будет недоступен.
              </p>
            </div>
            <div className="admin-modal-footer">
              <button
                className="admin-btn"
                onClick={() => {
                  navigator.clipboard.writeText(newPassword || '')
                  alert('Пароль скопирован в буфер обмена')
                }}
              >
                Копировать
              </button>
              <button
                className="admin-btn admin-btn-primary"
                onClick={() => {
                  setShowPasswordModal(false)
                  setNewPassword(null)
                  setSelectedUser(null)
                }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="admin-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Подтверждение удаления</h2>
              <button
                className="admin-modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>
            <div className="admin-modal-content">
              <p>Вы уверены, что хотите удалить пользователя <strong>{selectedUser?.email}</strong>?</p>
              <p className="admin-modal-warning">
                Это действие необратимо. Все файлы пользователя также будут удалены.
              </p>
            </div>
            <div className="admin-modal-footer">
              <button
                className="admin-btn"
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedUser(null)
                }}
              >
                Отмена
              </button>
              <button
                className="admin-btn admin-btn-danger"
                onClick={handleDeleteUser}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users
