# DNS Configuration Update - Status Report

**Date:** 2026-01-03
**Domain:** sabalist.com
**AWS Amplify App:** d2hef9d7y3mss4

---

## Current Status: ✅ DNS Updated, ⏳ Awaiting Verification

### What Was Done:

1. **Fixed DNS Configuration**
   - Added AWS CAA records (amazon.com, amazontrust.com)
   - Changed root domain from ALIAS to CNAME (Hostinger CNAME flattening)
   - Updated CloudFront distribution target

2. **Recreated AWS Amplify Domain Association**
   - Deleted failed domain association
   - Created fresh domain association
   - New CloudFront distribution: `dw7vwsazooevk.cloudfront.net`

3. **Current DNS Records:**
   ```
   @ (root)          → CNAME → dw7vwsazooevk.cloudfront.net
   www               → CNAME → dw7vwsazooevk.cloudfront.net
   _a39684f0...      → CNAME → AWS ACM validation
   @ (CAA)           → amazon.com, amazontrust.com
   ```

---

## Current AWS Amplify Status:

- **Domain Status:** `AWAITING_APP_CNAME`
- **Root Domain (@):** Not verified yet
- **WWW Subdomain:** Not verified yet
- **SSL Certificate:** Pending verification

This status means AWS is waiting for DNS to propagate and then will verify domain ownership.

---

## What Happens Next (Automatic):

1. **DNS Propagation** (5-15 minutes)
   - Hostinger DNS servers update globally
   - CloudFront detects the CNAME records

2. **Domain Verification** (5-30 minutes after DNS propagates)
   - AWS verifies you own sabalist.com
   - Checks the SSL verification CNAME record

3. **SSL Certificate Issuance** (5-10 minutes)
   - AWS Certificate Manager creates free SSL certificate
   - Certificate includes sabalist.com and www.sabalist.com

4. **CloudFront Deployment** (5-10 minutes)
   - SSL certificate attached to CloudFront distribution
   - Domain goes live

**Total Expected Time:** 20-65 minutes from now (typically 30 minutes)

---

## How to Monitor Progress:

### Option 1: Run Monitoring Script (Recommended)
```bash
powershell.exe -ExecutionPolicy Bypass -File monitor-domain-status.ps1
```

This will check status every 30 seconds and notify you when domain is live.

### Option 2: Manual AWS CLI Check
```bash
aws amplify get-domain-association --app-id d2hef9d7y3mss4 --domain-name sabalist.com --region us-east-1 --query "domainAssociation.domainStatus"
```

### Option 3: AWS Console
https://console.aws.amazon.com/amplify/home?region=us-east-1#/d2hef9d7y3mss4/settings/customdomains

---

## Verification Steps (After Domain is Live):

1. **Check DNS Propagation:**
   ```bash
   nslookup sabalist.com 8.8.8.8
   nslookup www.sabalist.com 8.8.8.8
   ```

2. **Test HTTPS:**
   - https://sabalist.com
   - https://www.sabalist.com

3. **Verify SSL Certificate:**
   - Click padlock icon in browser
   - Should show "Issued by: Amazon"
   - Should be valid for both sabalist.com and www.sabalist.com

---

## Troubleshooting:

### If Still "AWAITING_APP_CNAME" After 30 Minutes:

1. **Check DNS propagation:**
   ```bash
   nslookup sabalist.com 8.8.8.8
   ```
   Should return CloudFront IPs

2. **Verify CNAME records:**
   ```bash
   powershell.exe -ExecutionPolicy Bypass -File test-fetch-records.ps1
   ```
   Confirm all records point to `dw7vwsazooevk.cloudfront.net`

3. **Check for typos in DNS records**

### If Status Changes to "FAILED":

Check the error message:
```bash
aws amplify get-domain-association --app-id d2hef9d7y3mss4 --domain-name sabalist.com --region us-east-1 --query "domainAssociation.statusReason" --output text
```

---

## Firebase Configuration (After Domain is Live):

Once domain verification succeeds, you still need to add domains to Firebase:

1. Go to: https://console.firebase.google.com/project/sabalist/authentication/settings
2. Scroll to: **Authorized domains**
3. Add these domains:
   - `sabalist.com`
   - `www.sabalist.com`
   - `main.d2hef9d7y3mss4.amplifyapp.com`

This will fix the Firebase auth error:
```
Firebase: Domain not allowlisted by project (auth/unauthorized-continue-uri)
```

---

## Files Created:

- `fix-dns-working.ps1` - Added AWS CAA records
- `fix-dns-cloudfront.ps1` - Updated to new CloudFront (d3qtzst32m5et0)
- `fix-dns-root-cname.ps1` - Changed root from ALIAS to CNAME
- `update-to-latest-cloudfront.ps1` - Updated to current CloudFront (dw7vwsazooevk) ✓ CURRENT
- `monitor-domain-status.ps1` - Automated status monitoring
- `test-fetch-records.ps1` - View current DNS records

---

## Summary:

✅ DNS records configured correctly
✅ AWS CAA records allow Amazon SSL certificates
✅ SSL verification CNAME in place
✅ Root and www point to correct CloudFront distribution
⏳ Waiting for AWS to verify domain (automatic, 20-65 min)

**Next Action:** Run `monitor-domain-status.ps1` or wait 30 minutes and check AWS Console.

---

**Last Updated:** 2026-01-03
**Current CloudFront:** dw7vwsazooevk.cloudfront.net
**Expected Status:** Domain will be AVAILABLE within 30 minutes
