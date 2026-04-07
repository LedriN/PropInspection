# Resend Email Integration Setup

## ✅ What's Been Implemented

1. **Resend Package Installed** - Added to server dependencies
2. **Email Service Created** - `server/services/emailService.js` with professional email templates
3. **API Route Added** - `/api/reports/send-email` endpoint in `server/routes/reports.js`
4. **Frontend Updated** - React Native app now sends emails to both agent and client
5. **Environment Configuration** - Added `RESEND_API_KEY` to `server/env.example`

## 🚀 Setup Steps

### Step 1: Get Resend API Key
1. Go to [resend.com](https://resend.com) and sign up for a free account
2. Navigate to your dashboard and get your API key
3. The free tier includes 3,000 emails per month

### Step 2: Configure Environment
1. Copy `server/env.example` to `server/.env`
2. Add your Resend API key:
   ```
   RESEND_API_KEY=re_ixf3sUDZ_NhHarKTeEXV3GsUwNYn7o1ZN
   ```

### Step 3: Start the Server
```bash
cd server
npm run dev
```

### Step 4: Test the Integration
1. Open your React Native app
2. Go to the Reports screen
3. Click the email button on any report
4. The system will send emails to both the agent and client

## 📧 Email Features

### What Gets Sent
- **To Agent**: Notification about new inspection report with report details
- **To Client**: Professional inspection report with property information

### Email Content Includes
- Property address
- Inspection date
- Inspector name
- Report ID
- Professional formatting with company branding

### Error Handling
- Validates email addresses before sending
- Shows detailed success/error messages
- Handles network failures gracefully
- Skips sending if email is "No email available"

## 🔧 Customization

### Email Templates
Edit `server/services/emailService.js` to customize:
- Email styling and colors
- Company branding
- Email content and messaging
- From address (requires domain verification)

### Domain Setup (Optional)
For production use:
1. Add your domain in Resend dashboard
2. Update DNS records as instructed
3. Change the `from` address in `emailService.js`

## 🐛 Troubleshooting

### Common Issues
1. **"Failed to send emails"** - Check your RESEND_API_KEY
2. **Network errors** - Ensure server is running and accessible
3. **"No email available"** - Check that reports have valid email addresses

### Testing
- Use Resend's test domain (`noreply@resend.dev`) for development
- Check Resend dashboard for delivery status
- Monitor server logs for detailed error messages

## 📊 Free Tier Limits
- 3,000 emails per month
- 100 emails per day
- Perfect for small to medium property inspection businesses

## 🎯 Next Steps
1. Set up your Resend account
2. Add your API key to the environment file
3. Test with a sample report
4. Customize email templates as needed
5. Set up your own domain for production use
