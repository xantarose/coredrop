import React from 'react'
import './FAQ.css'

interface FAQItem {
  icon: JSX.Element
  question: string
  answer: JSX.Element
}

const FAQ: React.FC = () => {
  const faqData: FAQItem[] = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.5 19A5.5 5.5 0 0 0 18 8.02a1 1 0 0 1-.8-.4 8.5 8.5 0 1 0-14.7 6.1 1 1 0 0 1-.3.8A5.5 5.5 0 0 0 6.5 19z" />
          <path d="M12 11v6M9 14l3-3 3 3" />
        </svg>
      ),
      question: 'Что такое CoreDrop?',
      answer: (
        <>
          CoreDrop — это безопасное облачное хранилище для ваших файлов с <span className="highlight-text">шифрованием</span> на стороне клиента, синхронизацией между устройствами и удобным доступом из любого браузера.
        </>
      )
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <path d="M6 14h2M12 14h4" />
        </svg>
      ),
      question: 'Сколько стоит подписка?',
      answer: (
        <>
          Мы предлагаем бесплатный тариф с 5 ГБ места. Платные планы начинаются от <span className="highlight-text">199 ₽/мес</span> за 100 ГБ с расширенными возможностями.
        </>
      )
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <circle cx="12" cy="11" r="2" />
          <path d="M12 13v3" />
        </svg>
      ),
      question: 'Мои файлы в безопасности?',
      answer: (
        <>
          Да, все файлы <span className="highlight-text">шифруются</span> до отправки на сервер. Даже мы не можем получить доступ к вашим данным без вашего ключа.
        </>
      )
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      question: 'Как восстановить удалённые файлы?',
      answer: (
        <>
          В <span className="highlight-text">Корзине</span> файлы хранятся 30 дней. В платных тарифах есть расширенная история версий и восстановление до 1 года.
        </>
      )
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      ),
      question: 'Как поделиться файлами с другими?',
      answer: (
        <>
          Вы можете создать общую <span className="highlight-text">ссылку</span> на файл или папку с настройками доступа (только просмотр или редактирование) и установить пароль при необходимости.
        </>
      )
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="18" y1="8" x2="22" y2="12" />
          <line x1="22" y1="8" x2="18" y2="12" />
        </svg>
      ),
      question: 'Как удалить аккаунт?',
      answer: (
        <>
          Перейдите в раздел <span className="highlight-text">Настройки</span>, выберите "Удаление аккаунта" и следуйте инструкциям. Все данные будут удалены безвозвратно.
        </>
      )
    }
  ]

  return (
    <section className="faq-section">
      <div className="container">
        <div className="faq-header">
          <h2 className="faq-title">ОТВЕТЫ НА ЧАСТЫЕ ВОПРОСЫ</h2>
        </div>

        <div className="faq-grid">
          {faqData.map((item, index) => (
            <div key={index} className="faq-card">
              <div className={`faq-icon faq-icon-${index}`}>
                {item.icon}
              </div>
              <h3 className="faq-question">{item.question}</h3>
              <p className="faq-answer">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FAQ
