export interface FooterLink {
  title: string
  href: string
  disabled?: boolean
  badge?: string
}

export interface FooterLinksData {
  product: FooterLink[]
  company: FooterLink[]
  legal: FooterLink[]
}

export const footerLinksData: FooterLinksData = {
  product: [
    { title: 'Возможности', href: '#features' },
    { title: 'Цены', href: '#pricing' },
    { title: 'Безопасность', href: '#security' },
    { title: 'API', href: '', disabled: true, badge: 'недоступно' }
  ],
  company: [
    { title: 'О нас', href: '#about' },
    { title: 'Блог', href: '#blog' },
    { title: 'Контакты', href: 'https://t.me/coredropteam' }
  ],
  legal: [
    { title: 'Конфиденциальность', href: '/legal?section=privacy' },
    { title: 'Условия использования', href: '/legal?section=terms' },
    { title: 'Cookies', href: '/legal?section=cookies' },
    { title: 'EULA', href: '/legal?section=eula' },
    { title: 'Обработка данных', href: '/legal?section=data-processing' }
  ]
}
