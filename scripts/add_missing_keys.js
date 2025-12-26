const fs = require('fs');
const path = require('path');

const languages = ['ha', 'ig', 'om', 'yo', 'ff'];
const basePath = path.join(__dirname, '..', 'src', 'locales');

const keysToAdd = {
  common: {
    comingSoon: "Coming Soon"
  },
  auth: {
    welcome: "Welcome!",
    signInMessage: "Sign in with your phone number to start buying and selling",
    enterCode: "Enter the verification code sent to your phone",
    resendCode: "Resend Code",
    verify: "Verify & Sign In"
  },
  features: {
    secure: "Secure",
    secureDesc: "Your data is protected",
    fast: "Fast",
    fastDesc: "Buy & sell instantly",
    community: "Community",
    communityDesc: "Trusted marketplace"
  },
  listing: {
    active: "Active"
  },
  validation: {
    enterCode: "Please enter the verification code",
    invalidCode: "Invalid verification code",
    enterPhone: "Please enter your phone number" // update existing
  },
  profile: {
    editProfile: "Edit Profile",
    editProfileDesc: "Update your information",
    editProfileSoon: "Profile editing will be available soon",
    notifications: "Notifications",
    notificationsDesc: "Manage notification preferences",
    notificationsSoon: "Notification settings will be available soon",
    support: "Support",
    help: "Help & Support",
    helpDesc: "Get help with Sabalist",
    helpContact: "Contact support at support@sabalist.com",
    termsPrivacy: "Terms & Privacy",
    termsDesc: "Read our policies",
    termsMessage: "Terms and privacy policy",
    about: "About Sabalist",
    version: "Version 1.1.0",
    aboutMessage: "Sabalist - Pan-African Marketplace\\nVersion 1.1.0",
    confirmSignOut: "Are you sure you want to sign out?",
    signOutFailed: "Failed to sign out"
  }
};

languages.forEach(lang => {
  const filePath = path.join(basePath, lang, 'translation.json');
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(content);
    
    // Add missing keys
    Object.keys(keysToAdd).forEach(section => {
      if (!json[section]) {
        json[section] = {};
      }
      Object.keys(keysToAdd[section]).forEach(key => {
        json[section][key] = keysToAdd[section][key];
      });
    });
    
    // Write back
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\\n\\n\\n');
    console.log(`✅ Updated ${lang}/translation.json`);
  } catch (error) {
    console.error(`❌ Error updating ${lang}:`, error.message);
  }
});

console.log('\\n✅ All languages updated!');

