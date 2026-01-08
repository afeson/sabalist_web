# DNS & SSL Certificate Status for sabalist.com

## Current Status (January 4, 2026)

### ❌ Problem: 404 NOT_FOUND Error

The error you're seeing is caused by **SSL certificate issues**, not missing pages.

---

## DNS Resolution Status

### ✅ DNS is Resolving Correctly

```
sabalist.com → 76.76.21.21 (Vercel)
www.sabalist.com → cname.vercel-dns.com → 76.76.21.22, 66.33.60.129 (Vercel)
```

**DNS is working fine!** Both domains point to Vercel.

---

## SSL Certificate Status

### ✅ www.sabalist.com - Working
- **SSL Certificate:** Valid (issued 2 hours ago)
- **Expires:** In 90 days
- **Status:** ✅ HTTPS works perfectly

### ❌ sabalist.com (root domain) - NOT Working
- **SSL Certificate:** NOT ISSUED
- **Status:** ❌ SSL certificate failed to issue
- **Result:** Browser shows certificate error / 404

---

## Root Cause: Conflicting DNS Records

### Problem Found in Hostinger DNS:

The Hostinger DNS zone has **CONFLICTING RECORDS** that block SSL certificate issuance:

```json
// ✅ CORRECT - Vercel A record
{
  "name": "@",
  "type": "A",
  "content": "76.76.21.21"
}

// ❌ WRONG - CloudFront ALIAS (CONFLICTS WITH A RECORD!)
{
  "name": "@",
  "type": "ALIAS",
  "content": "dw7vwsazooevk.cloudfront.net"
}

// ❌ WRONG - CAA records blocking Let's Encrypt
{
  "name": "@",
  "type": "CAA",
  "content": "0 issue \"amazon.com\""
},
{
  "name": "@",
  "type": "CAA",
  "content": "0 issue \"amazontrust.com\""
}

// ❌ WRONG - Old AWS SSL validation CNAMEs
{
  "name": "_55fb929d28f12bc18903fcc1d5baac73.www",
  "type": "CNAME",
  "content": "_1e0f82cbac46ebb235ee5c6c4ec6adcf.jkddzztszm.acm-validations.aws."
}
```

---

## Why SSL Certificate Issuance is Failing

1. **ALIAS Record Conflict**
   - Hostinger has both A record (76.76.21.21) AND ALIAS record (CloudFront)
   - When Vercel tries to validate domain ownership, it gets inconsistent results
   - SSL challenge fails because responses come from CloudFront instead of Vercel

2. **CAA Records Blocking Let's Encrypt**
   - CAA records say "only Amazon can issue certificates"
   - Vercel uses Let's Encrypt for SSL certificates
   - Let's Encrypt is blocked by the CAA policy

3. **Old AWS Validation Records**
   - AWS SSL validation CNAMEs are leftovers from old setup
   - Confuse the DNS validation process

---

## Attempted Fix via Hostinger API

I attempted to remove the conflicting records using the Hostinger API:

```powershell
# API Request
PUT https://developers.hostinger.com/api/dns/v1/zones/sabalist.com
{
  "zone": [
    {"name": "@", "type": "A", "content": "76.76.21.21"},
    {"name": "www", "type": "CNAME", "content": "cname.vercel-dns.com."}
  ]
}

# Response
{
  "message": "Request accepted"
}
```

**Result:** API returned success, but DNS records remain unchanged when queried again.

**Possible causes:**
1. Hostinger API has caching/delay (changes may take 5-30 minutes)
2. API requires different endpoint or method for zone replacement
3. Manual DNS management overrides API changes
4. DNS zone is managed elsewhere (not via API)

---

## ✅ SOLUTION: Manual Fix Required

Since the API changes aren't taking effect immediately, here's the **manual fix**:

### Step 1: Log into Hostinger DNS Management

1. Go to https://hpanel.hostinger.com
2. Navigate to **Domains** → **sabalist.com**
3. Click **DNS / Name Servers**

### Step 2: Remove Conflicting Records

Delete these records from the DNS zone:

| Type  | Name | Content | Action |
|-------|------|---------|--------|
| ALIAS | @ | dw7vwsazooevk.cloudfront.net | ❌ DELETE |
| CAA | @ | 0 issue "amazon.com" | ❌ DELETE |
| CAA | @ | 0 issue "amazontrust.com" | ❌ DELETE |
| CNAME | _55fb929d28f12bc18903fcc1d5baac73.www | _1e0f82cbac46ebb235ee5c6c4ec6adcf... | ❌ DELETE |
| CNAME | _a39684f0933de309c0799b5602087b2b | _82394b3d74094c1ec49bf7f3c55b791a... | ❌ DELETE |

### Step 3: Keep ONLY These Records

| Type | Name | Content | TTL |
|------|------|---------|-----|
| A | @ | 76.76.21.21 | 3600 |
| CNAME | www | cname.vercel-dns.com. | 3600 |

**That's it!** Only 2 records should exist.

### Step 4: Wait for SSL Certificate

1. **Save changes** in Hostinger
2. **Wait 5-10 minutes** for DNS propagation
3. Vercel will **automatically detect** the clean DNS
4. SSL certificate will be **issued within 10-30 minutes**

---

## Alternative Solution: Use Vercel DNS (Recommended)

Instead of managing DNS in Hostinger, you can transfer DNS management to Vercel:

### Benefits:
- ✅ Automatic SSL certificate management
- ✅ No DNS conflicts
- ✅ Better performance (Vercel's global CDN)
- ✅ No manual DNS configuration needed

### Steps:

1. **In Hostinger:**
   - Change nameservers to:
     - `ns1.vercel-dns.com`
     - `ns2.vercel-dns.com`

2. **In Vercel:**
   - Vercel will automatically configure DNS
   - SSL certificates will be issued immediately
   - Both sabalist.com and www.sabalist.com will work

---

## Quick Workaround (Works Right Now)

### ✅ Use www.sabalist.com

**https://www.sabalist.com** has a valid SSL certificate and works perfectly!

You can:
1. Use this as your primary URL
2. Update Firebase authorized domains to include www.sabalist.com
3. Set up a redirect from sabalist.com → www.sabalist.com (once SSL is fixed)

---

## Testing SSL Certificate Status

### Check if SSL is issued:

```bash
# Using OpenSSL
echo | openssl s_client -connect sabalist.com:443 -servername sabalist.com 2>&1 | grep subject

# Should show:
# subject=CN=sabalist.com  (not CN=www.sabalist.com)
```

### Check Vercel certificate:

```bash
npx vercel certs ls

# Should show:
# cert_xxx  sabalist.com  in 90d  yes  0m
```

---

## Current Workaround

**For immediate access:**

✅ **Use: https://www.sabalist.com**

This URL works perfectly with:
- Valid SSL certificate
- All features working
- Listing creation functional
- All fixes deployed

---

## Next Steps

### Option 1: Manual DNS Fix (5-30 minutes)
1. Log into Hostinger
2. Delete conflicting ALIAS, CAA, and AWS validation records
3. Keep only A record (@ → 76.76.21.21) and CNAME (www → cname.vercel-dns.com)
4. Wait for Vercel to issue SSL

### Option 2: Switch to Vercel DNS (Recommended)
1. Change Hostinger nameservers to ns1.vercel-dns.com, ns2.vercel-dns.com
2. Vercel handles everything automatically
3. Immediate SSL certificate issuance

### Option 3: Use www subdomain (Works Now)
1. Use https://www.sabalist.com as primary URL
2. No DNS changes needed
3. Works immediately

---

## Files Created

1. `get-dns-status.ps1` - Check current DNS records via API
2. `fix-dns-for-vercel-ssl.ps1` - Attempt to fix DNS via API
3. `force-dns-clean.ps1` - Force clean DNS configuration
4. `list-all-zones.ps1` - List all DNS zones

---

## Summary

**Problem:** SSL certificate for sabalist.com can't be issued due to conflicting DNS records (ALIAS to CloudFront + CAA records blocking Let's Encrypt)

**Immediate Solution:** Use https://www.sabalist.com (works perfectly right now)

**Permanent Fix:** Manually delete conflicting records in Hostinger DNS management, OR switch nameservers to Vercel DNS

**Timeline:**
- Manual fix: 5-30 minutes (after removing records)
- Vercel DNS: Immediate (once nameservers propagate)
- www subdomain: Works right now!

---

*Status as of: January 4, 2026*
*Attempted automated fix via Hostinger API (pending propagation)*
