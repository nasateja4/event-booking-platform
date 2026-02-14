# Event Booking Platform

A comprehensive event booking system with admin control panel and public landing page for managing venues, inventory, bookings, and payments.

## 🚀 Features

### Admin Panel
- **Dashboard** - Daily/monthly profit tracking, booking statistics
- **Manage Inventory** - Create simple & nested products with discounts
- **Venue Management** - Create venue cards with packages and deals
- **Store Management** - Control which inventory items display publicly
- **Time Slot Management** - Manual booking with buffer time support
- **Coupon Management** - Create discount codes with expiry
- **Booking Details** - View all bookings with advanced filters
- **Account Management** - Profile settings and password reset

### Landing Page
- **Venue Cards** - Browse and customize event packages
- **Time Slot Booking** - Interactive calendar with real-time availability
- **Store** - Shop additional items and services
- **Map Integration** - Location display
- **Reviews** - Customer testimonials

### Key Capabilities
- ✅ Multi-room booking system with buffer time
- ✅ Real-time availability sync
- ✅ Google OAuth authentication
- ✅ Razorpay payment integration (UPI/Cards/COD)
- ✅ Email notifications
- ✅ Firebase Storage for images
- ✅ Responsive design

## 📦 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Auth**: NextAuth.js with Google OAuth
- **Payment**: Razorpay
- **Email**: Nodemailer (Gmail SMTP)

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Firestore Database**
4. Enable **Storage**
5. Enable **Authentication** → Google Sign-In
6. Get your Firebase config from Project Settings

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID and Secret

### 4. Razorpay Setup

1. Sign up at [Razorpay](https://razorpay.com/)
2. Get your API Key ID and Secret from Dashboard
3. Test mode keys are fine for development

### 5. Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Fill in all the required values:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=run: openssl rand -base64 32

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret

# Email (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
Event_Booking_Platform/
├── app/                      # Next.js App Router
│   ├── (admin)/             # Admin panel routes
│   ├── (public)/            # Public landing page
│   ├── auth/                # Authentication pages
│   ├── api/                 # API routes
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── admin/              # Admin components
│   ├── public/             # Public components
│   └── shared/             # Shared components
├── lib/                     # Utility functions
│   ├── firebase.ts         # Firebase config
│   ├── firestore.ts        # Firestore helpers
│   ├── storage.ts          # Storage helpers
│   └── auth.ts             # Auth config
├── types/                   # TypeScript definitions
└── .env.local              # Environment variables
```

## 🔒 Security Notes

- Never commit `.env.local` to version control
- Use Firebase security rules for production
- Enable CORS only for trusted domains
- Use Razorpay webhooks to verify payments
- Implement rate limiting for API routes

## 📝 Development Roadmap

- [x] Project setup and dependencies
- [x] Firebase configuration
- [ ] Admin authentication
- [ ] Admin dashboard
- [ ] Inventory management
- [ ] Venue management
- [ ] Booking system
- [ ] Payment integration
- [ ] Email notifications
- [ ] Landing page
- [ ] Deployment

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

## 📄 License

Private and Proprietary
