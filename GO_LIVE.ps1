<#
.SYNOPSIS
  Sabalist SEO go-live helper. Runs the automatable parts of shipping the SEO
  system: install + build (root Expo SPA and the seo-web Next.js layer), verify
  the outputs, generate the IndexNow key, and (optionally) deploy + smoke-test.

.EXAMPLE
  # From the repo root (C:\Users\afeson\Downloads\al):
  powershell -ExecutionPolicy Bypass -File .\GO_LIVE.ps1 -All
  # Then, once envs/domains are set in Vercel:
  powershell -ExecutionPolicy Bypass -File .\GO_LIVE.ps1 -Deploy -VerifyLive

.NOTES
  Safe by default: nothing deploys unless you pass -Deploy. Console-only steps
  (Vercel domain redirect, Search Console, Firebase function secrets) are printed
  at the end — they cannot be scripted from here.
#>
param(
  [string]$RepoRoot   = (Get-Location).Path,
  [string]$SpaBaseUrl = '/app',          # set to '' to keep the SPA at root (pre-migration)
  [switch]$All,
  [switch]$InstallRoot,
  [switch]$BuildRoot,
  [switch]$InstallSeo,
  [switch]$BuildSeo,
  [switch]$NewIndexNowKey,
  [switch]$Deploy,
  [switch]$VerifyLive
)

$ErrorActionPreference = 'Stop'
function Section($t){ Write-Host "`n========== $t ==========" -ForegroundColor Cyan }
function Ok($t){ Write-Host "  [OK]   $t" -ForegroundColor Green }
function Warn($t){ Write-Host "  [WARN] $t" -ForegroundColor Yellow }
function Step($t){ Write-Host "  > $t" -ForegroundColor White }
function Need($cmd){ if(-not (Get-Command $cmd -ErrorAction SilentlyContinue)){ throw "Required tool not found on PATH: $cmd" } }

if($All){ $InstallRoot=$true; $BuildRoot=$true; $InstallSeo=$true; $BuildSeo=$true; $NewIndexNowKey=$true }
# If no action switch was passed at all, default to the full local pipeline.
if(-not ($InstallRoot -or $BuildRoot -or $InstallSeo -or $BuildSeo -or $NewIndexNowKey -or $Deploy -or $VerifyLive)){
  $InstallRoot=$true; $BuildRoot=$true; $InstallSeo=$true; $BuildSeo=$true; $NewIndexNowKey=$true
}

$Seo  = Join-Path $RepoRoot 'seo-web'
$Site = 'https://www.sabalist.com'

Section 'Prerequisites'
Need node; Need npm
Write-Host ("  node {0} / npm {1}" -f (node -v), (npm -v))
if(-not (Test-Path (Join-Path $RepoRoot 'package.json'))){ throw "No package.json in $RepoRoot - run from the repo root." }
if(-not (Test-Path $Seo)){ throw "seo-web folder not found at $Seo" }
Ok 'Prerequisites present'

# ---------------------------------------------------------------- ROOT (Expo SPA)
if($InstallRoot){
  Section 'Root app: npm install (regenerates package-lock.json, no legacy flags)'
  Push-Location $RepoRoot
  try {
    npm install
    if($LASTEXITCODE -ne 0){ throw 'Root npm install failed.' }
    $lock = Join-Path $RepoRoot 'package-lock.json'
    if((Get-Content $lock -Raw) -match '@expo/webpack-config'){ Warn 'package-lock still references @expo/webpack-config (re-run npm install).' }
    else { Ok 'Clean install; @expo/webpack-config gone from lockfile. Commit package.json + package-lock.json.' }
  } finally { Pop-Location }
}

if($BuildRoot){
  Section "Root app: web build (Metro, baseUrl='$SpaBaseUrl')"
  Push-Location $RepoRoot
  try {
    $env:EXPO_WEB_BASE_URL = $SpaBaseUrl
    npm run build
    if($LASTEXITCODE -ne 0){ throw 'Root web build failed (see errors above).' }
    $dist = Join-Path $RepoRoot 'dist'
    if(-not (Test-Path (Join-Path $dist '_expo'))){ throw 'dist/_expo missing - web export failed.' }
    Ok 'dist/_expo present'
    $idx = Get-Content (Join-Path $dist 'index.html') -Raw
    if($SpaBaseUrl -ne '' -and ($idx -notmatch [regex]::Escape("$SpaBaseUrl/_expo"))){ Warn "index.html does not reference $SpaBaseUrl/_expo - check experiments.baseUrl." }
    elseif($SpaBaseUrl -ne ''){ Ok "index.html references $SpaBaseUrl/_expo (SPA will live under $SpaBaseUrl)" }
    foreach($f in 'robots.txt','sitemap.xml'){ if(Test-Path (Join-Path $dist $f)){ Ok "dist/$f present" } else { Warn "dist/$f missing" } }
    $debug = Get-ChildItem $dist -Filter '*test*.html' -ErrorAction SilentlyContinue
    if($debug){ Warn ("Debug HTML still in dist: " + ($debug.Name -join ', ')) } else { Ok 'No debug *test*.html in dist' }
  } finally { Remove-Item Env:\EXPO_WEB_BASE_URL -ErrorAction SilentlyContinue; Pop-Location }
}

# ---------------------------------------------------------------- SEO-WEB (Next.js)
if($InstallSeo){
  Section 'seo-web: env + npm install'
  $envLocal = Join-Path $Seo '.env.local'
  if(-not (Test-Path $envLocal)){
    Copy-Item (Join-Path $Seo '.env.example') $envLocal
    Warn "Created seo-web\.env.local from the example - FILL IN the EXPO_PUBLIC_FIREBASE_* values (same as the app) before building/deploying."
  } else { Ok '.env.local exists' }
  Push-Location $Seo
  try { npm install; if($LASTEXITCODE -ne 0){ throw 'seo-web npm install failed.' }; Ok 'seo-web dependencies installed' } finally { Pop-Location }
}

if($BuildSeo){
  Section 'seo-web: next build'
  $envLocal = Join-Path $Seo '.env.local'
  if((Test-Path $envLocal) -and ((Get-Content $envLocal -Raw) -match 'EXPO_PUBLIC_FIREBASE_API_KEY=\s*(\r?\n|$)')){
    Warn 'EXPO_PUBLIC_FIREBASE_API_KEY looks empty in .env.local - build will succeed but pages will have no live data.'
  }
  Push-Location $Seo
  try { npm run build; if($LASTEXITCODE -ne 0){ throw 'seo-web build failed (see errors above).' }; Ok 'seo-web built (.next)' } finally { Pop-Location }
}

# ---------------------------------------------------------------- INDEXNOW KEY
if($NewIndexNowKey){
  Section 'IndexNow key'
  $pub = Join-Path $Seo 'public'
  if(-not (Test-Path $pub)){ New-Item -ItemType Directory -Path $pub | Out-Null }
  $existing = Get-ChildItem $pub -Filter '*.txt' -ErrorAction SilentlyContinue | Where-Object { $_.BaseName.Length -ge 16 }
  if($existing){ Ok ("IndexNow key file already present: public\{0}" -f $existing[0].Name) ; $key = $existing[0].BaseName }
  else {
    $key = -join ((1..32) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
    Set-Content -Path (Join-Path $pub "$key.txt") -Value $key -NoNewline -Encoding ascii
    Ok "Generated public\$key.txt"
  }
  Write-Host "  -> Set this in Vercel:  INDEXNOW_KEY=$key" -ForegroundColor Magenta
}

# ---------------------------------------------------------------- DEPLOY (opt-in)
if($Deploy){
  Section 'Deploy (optional)'
  if(Get-Command vercel -ErrorAction SilentlyContinue){
    Step 'Deploy the seo-web Next.js layer to production:'
    Write-Host '      cd seo-web; vercel --prod' -ForegroundColor Gray
    Step 'Deploy the SPA (this repo) to its own Vercel project that backs SPA_ORIGIN:'
    Write-Host '      vercel --prod' -ForegroundColor Gray
    Step 'Set env vars on the seo-web project (run once each, then redeploy):'
    Write-Host '      vercel env add EXPO_PUBLIC_FIREBASE_API_KEY production' -ForegroundColor Gray
    Write-Host '      vercel env add EXPO_PUBLIC_FIREBASE_PROJECT_ID production' -ForegroundColor Gray
    Write-Host '      vercel env add EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN production' -ForegroundColor Gray
    Write-Host '      vercel env add EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET production' -ForegroundColor Gray
    Write-Host '      vercel env add EXPO_PUBLIC_FIREBASE_APP_ID production' -ForegroundColor Gray
    Write-Host '      vercel env add REVALIDATE_SECRET production' -ForegroundColor Gray
    Write-Host '      vercel env add SPA_ORIGIN production' -ForegroundColor Gray
    Write-Host '      vercel env add INDEXNOW_KEY production' -ForegroundColor Gray
  } else { Warn 'Vercel CLI not found. Install with: npm i -g vercel' }
  if(Get-Command firebase -ErrorAction SilentlyContinue){
    Step 'Deploy the Firestore -> revalidate Cloud Function:'
    Write-Host '      firebase functions:secrets:set SEO_REVALIDATE_SECRET   # paste the same value as REVALIDATE_SECRET' -ForegroundColor Gray
    Write-Host '      firebase deploy --only functions:revalidateOnListingWrite' -ForegroundColor Gray
  } else { Warn 'Firebase CLI not found. Install with: npm i -g firebase-tools' }
}

# ---------------------------------------------------------------- LIVE SMOKE TEST
if($VerifyLive){
  Section 'Live verification'
  try {
    $r = Invoke-WebRequest "https://sabalist.com/" -MaximumRedirection 0 -ErrorAction SilentlyContinue
    if($r.StatusCode -in 301,308 -and "$($r.Headers.Location)" -match 'www\.sabalist\.com'){ Ok "apex -> www redirect ($($r.StatusCode))" } else { Warn "apex redirect not detected (status $($r.StatusCode))" }
  } catch { Warn "apex check: $($_.Exception.Message)" }
  foreach($u in "$Site/robots.txt", "$Site/sitemap-index.xml"){
    try { $resp = Invoke-WebRequest $u -ErrorAction Stop; Ok "$u -> $($resp.StatusCode) ($($resp.Headers.'Content-Type'))" }
    catch { Warn "$u -> $($_.Exception.Message)" }
  }
  try {
    $rb = (Invoke-WebRequest "$Site/robots.txt").Content
    if($rb -match 'sitemap-index\.xml'){ Ok 'robots.txt points at sitemap-index.xml' } else { Warn 'robots.txt missing sitemap-index reference' }
    if($rb -match 'GPTBot'){ Ok 'robots.txt allows AI agents' } else { Warn 'robots.txt missing AI-agent rules' }
  } catch {}
}

# ---------------------------------------------------------------- MANUAL STEPS
Section 'Manual steps (console only - cannot be scripted)'
@"
  1. Vercel Domains:
       - Add www.sabalist.com to the seo-web project (primary).
       - Add sabalist.com (apex) and set it to REDIRECT to www.sabalist.com (308).
       - Point /app traffic to the SPA via SPA_ORIGIN (next.config rewrite) or app.sabalist.com.
  2. Commit:  git add -A; git commit -m "SEO system + Metro web migration"; git push
  3. Drop --legacy-peer-deps from vercel.json (installCommand) and amplify.yml ONCE a clean
     npm install is confirmed and the regenerated package-lock.json is committed.
  4. Add seo-web\public\og\default-1200x630.png (branded social fallback image).
  5. Google Search Console + Bing: follow SEARCH_CONSOLE_RUNBOOK.md
       - Verify www property, submit https://www.sabalist.com/sitemap-index.xml
  6. Firebase: firebase.json needs a "functions" block ->  "functions": { "source": "seo-web/integrations/firebase-functions" }
"@ | Write-Host -ForegroundColor Gray

Write-Host "`nDone." -ForegroundColor Cyan
