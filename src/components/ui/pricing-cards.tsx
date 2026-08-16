import { useState } from "react"
import { Check, MoveRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type BillingPeriod = "monthly" | "yearly"

const plans = [
  {
    name: "Базовый",
    description: "Для личного использования",
    price: {
      monthly: 0,
      yearly: 0,
    },
    features: [
      "10 GB хранилища",
      "До 5 устройств",
      "Базовая поддержка",
      "История версий 7 дней",
      "Шифрование данных",
    ],
  },
  {
    name: "Профессиональный",
    description: "Для профессионалов",
    price: {
      monthly: 990,
      yearly: 9900,
    },
    features: [
      "1 TB хранилища",
      "Неограниченно устройств",
      "Приоритетная поддержка",
      "История версий 30 дней",
      "Расширенное шифрование",
      "Совместная работа",
      "API доступ",
    ],
  },
  {
    name: "Бизнес",
    description: "Для команд и компаний",
    price: {
      monthly: 2990,
      yearly: 29900,
    },
    features: [
      "10 TB хранилища",
      "Неограниченно пользователей",
      "24/7 поддержка",
      "Безлимитная история версий",
      "Корпоративное шифрование",
      "Управление команмой",
      "Расширенный API",
      "SSO интеграция",
      "Аудит безопасности",
    ],
  },
]

const formatPrice = (price: number, billingPeriod: BillingPeriod) => {
  if (price === 0) {
    return {
      amount: "Бесплатно",
      period: "",
    }
  }

  return {
    amount: `${price.toLocaleString("ru-RU")} ₽`,
    period: billingPeriod === "monthly" ? "/ месяц" : "/ год",
  }
}

function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly")

  return (
    <section className="pricing" id="pricing">
      <div className="container">
        <div className="pricing-shell">
          <div className="pricing-header">
            <Badge className="pricing-badge">Тарифы</Badge>
            <div className="pricing-heading">
              <h2 className="section-title">Выберите свой план</h2>
              <p className="section-description">
                Гибкие тарифы для любых потребностей. Начните бесплатно, обновитесь когда нужно
              </p>
            </div>
            <div className="pricing-billing-toggle" aria-label="Выбор периода оплаты">
              <button
                className={`pricing-toggle-btn ${billingPeriod === "monthly" ? "pricing-toggle-btn-active" : ""}`}
                type="button"
                onClick={() => setBillingPeriod("monthly")}
              >
                Ежемесячно
              </button>
              <button
                className={`pricing-toggle-btn ${billingPeriod === "yearly" ? "pricing-toggle-btn-active" : ""}`}
                type="button"
                onClick={() => setBillingPeriod("yearly")}
              >
                Ежегодно
                <span className="pricing-discount-badge">-20%</span>
              </button>
            </div>
          </div>

          <div className="pricing-grid">
            {plans.map((plan, index) => {
              const price = formatPrice(plan.price[billingPeriod], billingPeriod)
              const isFeatured = index === 1

              return (
              <Card
                className={`pricing-card ${isFeatured ? "featured" : ""}`}
                key={plan.name}
              >
                  <CardHeader className="pricing-card-header">
                    <CardTitle className="plan-name">{plan.name}</CardTitle>
                    <CardDescription className="plan-description">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pricing-card-content">
                    <div className="plan-price">
                      <span className="price-amount">{price.amount}</span>
                      {price.period && (
                        <span className="price-period">{price.period}</span>
                      )}
                    </div>
                    <div className="plan-features">
                      {plan.features.map((feature) => (
                        <div className="feature-item" key={feature}>
                          <Check className="feature-check" aria-hidden="true" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="pricing-action"
                      variant={isFeatured ? "default" : "outline"}
                    >
                      {plan.price[billingPeriod] === 0 ? "Начать бесплатно" : "Выбрать план"}
                      <MoveRight className="pricing-action-icon" aria-hidden="true" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export { Pricing }
