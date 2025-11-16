# TODO List for Password Strength and Forgot Password Feature

## Step 1: Install Dependencies
- [x] Install nodemailer via npm for email sending

## Step 2: Update Backend (server.js)
- [x] Update User schema to add otp (String) and otpExpires (Date) fields
- [x] Add password strength validation function (excellent: ≥8 chars, uppercase, lowercase, digit, special char)
- [x] Modify /api/auth/signup endpoint to validate password strength before saving user
- [x] Add /api/auth/forgot-password endpoint: generate/send OTP to email
- [x] Add /api/auth/verify-otp endpoint: verify OTP
- [x] Add /api/auth/reset-password endpoint: reset password if OTP valid

## Step 3: Update Frontend (src/App.js)
- [x] Modify Signup component: add password strength validation on frontend, show real-time feedback, prevent submit if weak
- [x] Create ForgotPassword component with multi-step form (email → OTP → new password)
- [x] Add /forgot-password route in App.js
- [x] Add "Forgot Password?" link in Login component
- [x] Add "Forgot Password?" link in Signup component

## Step 4: Configuration and Testing
- [x] Add SMTP config to .env (EMAIL_USER, EMAIL_PASS, EMAIL_HOST)
- [x] Test signup with weak/strong passwords
- [x] Test forgot password flow end-to-end (OTP sent, verification tested with invalid OTP)
- [ ] Update README if needed
