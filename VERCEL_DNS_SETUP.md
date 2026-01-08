# Vercel Custom Domain Setup for sabalist.com

## ✅ Completed Steps

1. **Added custom domains to Vercel project:**
   - sabalist.com
   - www.sabalist.com

## 🔧 DNS Configuration Required

You need to update your DNS records at Hostinger to point to Vercel's servers.

### Option 1: Update A Records (Recommended)

Log in to your Hostinger control panel and add/update these DNS records:

| Type | Name | Content/Value | TTL |
|------|------|---------------|-----|
| A | @ | 76.76.21.21 | 3600 |
| A | www | 76.76.21.21 | 3600 |

**Delete any existing records for:**
- A record for @ (root domain)
- A record for www
- CNAME record for @ (if any)
- CNAME record for www (if any)

### Option 2: Change Nameservers (Alternative)

Point your domain's nameservers to Vercel:
- ns1.vercel-dns.com
- ns2.vercel-dns.com

## 📋 Step-by-Step Instructions for Hostinger

1. Go to https://hpanel.hostinger.com/
2. Log in to your account
3. Go to **Domains** section
4. Click on **sabalist.com**
5. Go to **DNS / Name Servers** tab
6. **Delete** any existing A or CNAME records for:
   - @ (root)
   - www
7. **Add** new A records:
   - Type: A
   - Name: @
   - Points to: 76.76.21.21
   - TTL: 3600

   - Type: A
   - Name: www
   - Points to: 76.76.21.21
   - TTL: 3600
8. Click **Save**

## ⏱️ DNS Propagation

After updating the DNS records:
- Changes typically take 5-10 minutes
- Maximum propagation time: 24-48 hours
- You can verify the changes using: `nslookup sabalist.com` or `dig sabalist.com`

## ✅ Verification

After DNS propagation, Vercel will automatically detect the configuration and issue an SSL certificate.

You can check the status with:
```bash
vercel domains inspect sabalist.com
```

Or visit:
- https://sabalist.com
- https://www.sabalist.com

## 🔍 Current Status

Run this command to check if DNS has propagated:
```bash
nslookup sabalist.com
```

Expected result should show: `76.76.21.21`
