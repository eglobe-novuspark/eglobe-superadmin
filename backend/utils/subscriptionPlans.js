const subscriptionPlans = {
  trial: {
    name: "Free Trial",
    duration: 14,
    price: 0,
    smsMonthlyLimit: 5,  // Low for testing; change to 500 in prod
    whatsappMonthlyLimit: 5,
    features: [
      "Full access to all features",
      "Up to 50 students",
      "Basic support",
      "No payment required"
    ],
    recommended: false
  },
  basic: {
    monthly: {
      name: "Basic Monthly",
      price: 700,
      originalPrice: 700,
      duration: 30,
      smsMonthlyLimit: 10,  // Low for testing; change to 1000 in prod
      whatsappMonthlyLimit: 10,
      features: [
        "Unlimited students",
        "Basic reporting tools",
        "Email support",
        "Mobile app access"
      ],
      savings: 0,
      recommended: false
    },
    yearly: {
      name: "Basic Yearly",
      price: 6000,
      originalPrice: 8400,
      duration: 365,
      smsMonthlyLimit: 10,  // Same monthly limit; change to 1000 in prod
      whatsappMonthlyLimit: 10,
      features: [
        "Unlimited students",
        "Advanced reporting tools",
        "Priority email support",
        "Mobile app access",
        "2 admin accounts"
      ],
      savings: 2400,
      recommended: true
    }
  },
  premium: {
    monthly: {
      name: "Premium Monthly",
      price: 1200,
      originalPrice: 1200,
      duration: 30,
      smsMonthlyLimit: 30,  // Low for testing; change to 3000 in prod
      whatsappMonthlyLimit: 30,
      features: [
        "Unlimited students & staff",
        "Advanced analytics", 
        "Phone & email support",
        "Custom reports",
        "5 admin accounts",
        "Data export"
      ],
      savings: 0,
      recommended: false
    },
    yearly: {
      name: "Premium Yearly",
      price: 12000,
      originalPrice: 14400,
      duration: 365,
      smsMonthlyLimit: 30,  // Same monthly limit; change to 3000 in prod
      whatsappMonthlyLimit: 30,
      features: [
        "Unlimited students & staff",
        "Advanced analytics dashboard",
        "24/7 priority support",
        "Custom report builder",
        "Unlimited admin accounts",
        "Automated data backups",
        "White-label option",
        "API access"
      ],
      savings: 2400,
      recommended: true
    }
  }
};

module.exports = subscriptionPlans;