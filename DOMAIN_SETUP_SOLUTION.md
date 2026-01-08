# Sabalist Domain Setup - Final Solution

**Date:** 2026-01-03
**Issue:** AWS Amplify custom domain keeps failing with CloudFront conflict error

---

## Current Situation

Your app is **successfully deployed and working** at:
- **https://main.d2hef9d7y3mss4.amplifyapp.com**

The issue is with adding the custom domain `sabalist.com` / `www.sabalist.com`.

---

## The Problem

AWS Amplify keeps failing with this error:
```
One or more aliases specified for the distribution includes an incorrectly configured
DNS record that points to another CloudFront distribution.
```

This happens because:
1. Multiple CloudFront distributions were created during troubleshooting attempts
2. AWS has a global restriction: one CNAME can only point to one CloudFront distribution
3. Even after deleting domain associations, AWS may have cached/orphaned configurations

---

## Solution 1: Use AWS Amplify Default Domain (WORKS NOW)

### ✅ Immediate Solution - No Custom Domain Needed

Your site is live right now at:
**https://main.d2hef9d7y3mss4.amplifyapp.com**

**Advantages:**
- Works immediately (already deployed)
- Free SSL certificate
- No DNS configuration needed
- No additional costs

**To Use This:**
1. Update Firebase authorized domains:
   - Go to: https://console.firebase.google.com/project/sabalist/authentication/settings
   - Add: `main.d2hef9d7y3mss4.amplifyapp.com`

2. Share this URL with users or update your marketing materials

---

## Solution 2: Wait 24-48 Hours and Retry Custom Domain

AWS CloudFront configurations can take 24-48 hours to fully clear from their global cache.

### Steps to Retry After Waiting:

1. **Wait 24-48 hours** for AWS to clear old configurations

2. **Delete current domain association:**
   ```bash
   aws amplify delete-domain-association --app-id d2hef9d7y3mss4 --domain-name sabalist.com --region us-east-1
   ```

3. **Create fresh domain association (www only):**
   ```bash
   aws amplify create-domain-association --app-id d2hef9d7y3mss4 --domain-name sabalist.com --sub-domain-settings file://domain-config-www-only.json --region us-east-1
   ```

4. **Update Hostinger DNS** to the NEW CloudFront distribution shown in AWS

5. **Set up redirect** in Hostinger: `sabalist.com` → `www.sabalist.com`

---

## Solution 3: Use Different Domain or Subdomain

If you have another domain or want to use a subdomain:

### Option A: Use a Subdomain
- Instead of `sabalist.com`, use `app.sabalist.com` or `shop.sabalist.com`
- Subdomains don't have the same CloudFront conflicts
- Easier to configure

### Option B: Use Different TLD
- If you own `sabalist.net` or `sabalist.co`, try that instead
- Fresh domain = no CloudFront conflicts

---

## Solution 4: Contact AWS Support (Recommended for Custom Domain)

AWS Support can manually clear the CloudFront alias conflict.

### Steps:

1. **Open AWS Support Case:**
   - Go to: https://console.aws.amazon.com/support/home
   - Click: "Create case"
   - Choose: "Service limit increase" or "Technical support"

2. **Provide This Information:**
   ```
   Subject: CloudFront alias conflict for AWS Amplify custom domain

   Issue: Unable to add custom domain sabalist.com to AWS Amplify app d2hef9d7y3mss4

   Error: "One or more aliases specified for the distribution includes an incorrectly
   configured DNS record that points to another CloudFront distribution"

   Request: Please clear any orphaned CloudFront configurations for:
   - sabalist.com
   - www.sabalist.com

   Amplify App ID: d2hef9d7y3mss4
   Region: us-east-1
   Account ID: 066028476096
   ```

3. **AWS Support Will:**
   - Investigate CloudFront distributions
   - Clear any conflicts
   - Allow you to re-add the domain

**Timeline:** Usually resolved within 1-2 business days

---

## Solution 5: Use Hostinger Redirect (Temporary Workaround)

While waiting for AWS, you can use Hostinger's redirect feature:

### Steps:

1. **Log into Hostinger hPanel:**
   - https://hpanel.hostinger.com

2. **Go to Domains → sabalist.com → Redirects**

3. **Create redirect:**
   ```
   From: sabalist.com
   To: https://main.d2hef9d7y3mss4.amplifyapp.com
   Type: 301 Permanent Redirect
   Include Path: Yes
   ```

4. **Create www redirect:**
   ```
   From: www.sabalist.com
   To: https://main.d2hef9d7y3mss4.amplifyapp.com
   Type: 301 Permanent Redirect
   Include Path: Yes
   ```

**Result:** Users visiting `sabalist.com` will be redirected to your Amplify app

---

## Recommended Immediate Action

**I recommend Solution 1 + Solution 5:**

1. **Use the working Amplify domain immediately:**
   - https://main.d2hef9d7y3mss4.amplifyapp.com

2. **Set up Hostinger redirect** so users can type `sabalist.com` and get redirected

3. **Open AWS Support case** to fix the CloudFront conflict

4. **Once AWS resolves**, add custom domain properly

This gets your site working TODAY while AWS Support fixes the domain issue.

---

## Current DNS Configuration

Your Hostinger DNS is currently set to:
```
www.sabalist.com → d2gvmmtq2x5ne7.cloudfront.net (CNAME)
_a39684f0933de309c0799b5602087b2b.sabalist.com → AWS ACM validation (CNAME)
@ (CAA) → amazon.com, amazontrust.com
```

---

## Firebase Configuration

Once you choose a domain solution, add it to Firebase:

https://console.firebase.google.com/project/sabalist/authentication/settings

**Add these domains:**
- `main.d2hef9d7y3mss4.amplifyapp.com` (Amplify default - add this NOW)
- `www.sabalist.com` (once custom domain works)
- `sabalist.com` (once custom domain works)

---

## Summary

✅ **Your app is deployed and working:**
   - https://main.d2hef9d7y3mss4.amplifyapp.com

❌ **Custom domain has CloudFront conflict:**
   - Requires AWS Support intervention OR 24-48 hour wait

🎯 **Best immediate solution:**
   1. Use Amplify default domain
   2. Add Hostinger redirect from sabalist.com
   3. Open AWS Support case

---

**Questions?**
Let me know which solution you'd like to pursue and I can help implement it.
