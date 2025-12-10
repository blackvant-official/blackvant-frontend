# BlackVant Investment Platform

A modern cryptocurrency investment platform with secure authentication and transaction management.

## 🚀 Features

- **Secure Authentication**: Powered by Clerk for seamless signup/login
- **Dashboard**: Real-time portfolio tracking with interactive charts
- **Crypto Transactions**: TRC20 USDT deposits and withdrawals
- **Transaction History**: Complete record of all investments and profits
- **Profile Management**: Secure account settings and preferences
- **Support Center**: Live chat and ticket system for assistance

## 📁 Project Structure
BlackVant/
├── index.html # Landing page
├── login.html # Sign in page
├── signup.html # Sign up page
├── dashboard.html # Main dashboard
├── deposit.html # Deposit funds
├── withdraw.html # Withdraw earnings
├── transaction-history.html # Transaction history
├── profile-settings.html # Profile management
├── support.html # Support center
├── assets/
│ ├── css/
│ │ └── style.css # All styles
│ └── js/
│ ├── main.js # Landing page functions
│ ├── dashboard.js # Dashboard functions
│ ├── transactions.js # Deposit/withdraw functions
│ ├── history.js # Transaction history functions
│ ├── profile.js # Profile settings functions
│ └── support.js # Support page functions
└── README.md

## 🔧 Setup Instructions

### 1. Clone or extract the project files
Place all files in a single directory structure as shown above.

### 2. Update Clerk Publishable Key
In each HTML file, update the Clerk publishable key with your own:
```javascript
window.Clerk.config = {
    publishableKey: 'YOUR_CLERK_PUBLISHABLE_KEY_HERE'
};