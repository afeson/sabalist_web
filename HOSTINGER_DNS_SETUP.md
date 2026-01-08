# Hostinger DNS Setup for AWS Amplify - sabalist.com

## 🎯 Objective
Configure Hostinger DNS to allow AWS Amplify to issue SSL certificates and route traffic to your web app.

---

## 📋 Step-by-Step Instructions

### **Step 1: Log into Hostinger**
1. Go to https://hpanel.hostinger.com
2. Click on **Domains**
3. Find **sabalist.com** and click **Manage**
4. Go to **DNS / Name Servers** section

---

### **Step 2: Delete ALL Existing CAA Records**

Find and DELETE these CAA records (if they exist):
- ❌ `0 issue "comodoca.com"`
- ❌ `0 issue "digicert.com"`
- ❌ `0 issue "globalsign.com"`
- ❌ `0 issue "letsencrypt.org"`
- ❌ `0 issue "pki.goog"`

**How to delete:**
- Find each CAA record in the list
- Click the trash/delete icon
- Confirm deletion

---

### **Step 3: Add AWS CAA Records**

Click **"Add Record"** and add these TWO CAA records:

#### **CAA Record 1:**
```
Type: CAA
Name: @ (or leave blank)
Flags: 0
Tag: issue
Value: amazon.com
TTL: 3600 (or default)
```

#### **CAA Record 2:**
```
Type: CAA
Name: @ (or leave blank)
Flags: 0
Tag: issue
Value: amazontrust.com
TTL: 3600 (or default)
```

**Note:** Some DNS panels combine flags and tag. If so, enter:
- Value: `0 issue "amazon.com"`
- Value: `0 issue "amazontrust.com"`

---

### **Step 4: Add SSL Verification CNAME**

This is CRITICAL for AWS to verify you own the domain:

```
Type: CNAME
Name: _a39684f0933de309c0799b5602087b2b
Value: _82394b3d74094c1ec49bf7f3c55b791a.jkddzztszm.acm-validations.aws.
TTL: 3600
```

⚠️ **IMPORTANT:**
- Copy the name EXACTLY as shown
- Include the trailing dot (.) at the end of the Value if your DNS panel allows it
- Do NOT add sabalist.com to the name - Hostinger will add it automatically

---

### **Step 5: Add Domain Routing CNAMEs**

These route traffic from your domain to AWS Amplify:

#### **Root Domain CNAME:**
```
Type: CNAME
Name: @ (or leave blank for root)
Value: d1ewgsv5l3yhh7.cloudfront.net
TTL: 3600
```

**Note:** If Hostinger doesn't allow CNAME for root (@), you may need to:
1. Use an A record pointing to Amplify's IP (if provided)
2. Or use Hostinger's ANAME/ALIAS record type
3. Contact Hostinger support if neither works

#### **WWW Subdomain CNAME:**
```
Type: CNAME
Name: www
Value: d1ewgsv5l3yhh7.cloudfront.net
TTL: 3600
```

---

### **Step 6: Save and Wait**

1. Click **"Save Changes"** or **"Update"** in Hostinger
2. Wait **5-30 minutes** for DNS propagation
3. AWS Amplify will automatically detect the changes and:
   - Verify domain ownership
   - Issue SSL certificate
   - Deploy your app to sabalist.com

---

## ✅ Verification

After 10-15 minutes, run the verification script:

```bash
verify-dns.bat
```

Or manually check in AWS Amplify Console:
1. Go to https://console.aws.amazon.com/amplify/home?region=us-east-1#/d2hef9d7y3mss4
2. Click **Domain management**
3. Check status - should change from "Pending verification" to "Available"

---

## 🔍 Expected Timeline

| Step | Duration | Status |
|------|----------|--------|
| DNS record propagation | 5-30 min | Wait for Hostinger DNS to update |
| SSL certificate validation | 5-30 min | AWS verifies domain ownership |
| SSL certificate issuance | 5-10 min | AWS ACM creates certificate |
| Domain deployment | 5-10 min | CloudFront updates distribution |
| **Total** | **20-80 min** | **Most complete in 30 min** |

---

## ⚠️ Troubleshooting

### **If still "Pending verification" after 1 hour:**

1. **Verify CNAME records added correctly:**
   ```bash
   nslookup -type=CNAME _a39684f0933de309c0799b5602087b2b.sabalist.com 8.8.8.8
   ```
   Should return: `_82394b3d74094c1ec49bf7f3c55b791a.jkddzztszm.acm-validations.aws`

2. **Check CAA records deleted:**
   - No CAA records should exist EXCEPT amazon.com and amazontrust.com

3. **DNS propagation incomplete:**
   - Try different DNS servers: `nslookup -type=CNAME ... 1.1.1.1`
   - Some regions see changes faster than others

4. **Hostinger-specific issues:**
   - Clear Hostinger DNS cache (if available)
   - Try contacting Hostinger support
   - Some Hostinger accounts have DNS propagation delays

---

## 💰 Cost Confirmation

**NO EXTRA CHARGES:**
- ✅ SSL certificate: FREE (AWS ACM)
- ✅ Certificate renewal: FREE (automatic)
- ✅ Domain validation: FREE
- ✅ CloudFront usage: Included in Amplify pricing

---

## 📞 Support

If you need help:
- AWS Amplify Support: https://console.aws.amazon.com/support/
- Hostinger Support: https://www.hostinger.com/cpanel-login
- Check AWS Amplify domain logs for specific errors

---

**Last Updated:** 2026-01-02
**Domain:** sabalist.com
**Amplify App:** sabalist-site (d2hef9d7y3mss4)
