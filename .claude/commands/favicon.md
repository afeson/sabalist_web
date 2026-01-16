# Favicon Generator Command

Generate a complete set of favicons from a source image and integrate them into the project.

## Arguments
- `$1`: Path to the source image (PNG, SVG, or other image format)

## Instructions

You are a favicon generation assistant. Follow these steps precisely:

### Step 1: Validate Prerequisites

1. **Check ImageMagick v7+**: Run `magick --version` to verify ImageMagick 7+ is installed. If the command fails or shows v6.x, stop with error:
   ```
   ERROR: ImageMagick v7+ is required but not found.
   Install it from https://imagemagick.org/script/download.php
   ```

2. **Check source image exists**: Verify the file at `$1` exists. If not, stop with error:
   ```
   ERROR: Source image not found: $1
   ```

3. **Validate image is readable**: Run `magick identify "$1"` to verify the image can be read. If it fails, stop with error:
   ```
   ERROR: Cannot read image file: $1
   ```

### Step 2: Detect Framework and Assets Directory

Detect the project framework by checking for these files (in order):

| Framework | Detection File(s) | Assets Directory |
|-----------|------------------|------------------|
| **Expo (React Native Web)** | `app.json` with `expo` key + `webpack` bundler | `public/` |
| **Next.js (App Router)** | `app/layout.tsx` or `app/layout.js` | `app/` (for favicon.ico), `public/` (for others) |
| **Next.js (Pages)** | `pages/_app.tsx` or `pages/_app.js` + no `app/` | `public/` |
| **Vite** | `vite.config.ts` or `vite.config.js` | `public/` |
| **Create React App** | `public/index.html` + `react-scripts` in package.json | `public/` |
| **Rails** | `config/application.rb` | `public/` |
| **Static HTML** | `index.html` in root | Root directory |
| **Unknown** | None of the above | `public/` (create if needed) |

Store the detected framework name and assets directory for later use.

### Step 3: Generate Favicon Files

Using ImageMagick, generate these files in the assets directory (`public/` for Expo projects):

```bash
# Navigate to assets directory first
cd public/

# favicon.ico (multi-resolution: 16x16, 32x32, 48x48)
magick "$SOURCE" -resize 16x16 -gravity center -background transparent -extent 16x16 favicon-16.png
magick "$SOURCE" -resize 32x32 -gravity center -background transparent -extent 32x32 favicon-32.png
magick "$SOURCE" -resize 48x48 -gravity center -background transparent -extent 48x48 favicon-48.png
magick favicon-16.png favicon-32.png favicon-48.png favicon.ico
rm favicon-16.png favicon-32.png favicon-48.png

# favicon-96x96.png
magick "$SOURCE" -resize 96x96 -gravity center -background transparent -extent 96x96 favicon-96x96.png

# apple-touch-icon.png (180x180)
magick "$SOURCE" -resize 180x180 -gravity center -background transparent -extent 180x180 apple-touch-icon.png

# web-app-manifest-192x192.png
magick "$SOURCE" -resize 192x192 -gravity center -background transparent -extent 192x192 web-app-manifest-192x192.png

# web-app-manifest-512x512.png
magick "$SOURCE" -resize 512x512 -gravity center -background transparent -extent 512x512 web-app-manifest-512x512.png
```

**If source is SVG**: Also copy the source file as `favicon.svg` to the assets directory.

### Step 4: Create or Update site.webmanifest

Check if `site.webmanifest` exists in the assets directory. Also check for existing `manifest.json` in `dist/` or `web-build/` directories for preserved values.

**For Sabalist/Expo projects**: Read existing manifest.json from `dist/manifest.json` or `web-build/manifest.json` if present and preserve:
- `theme_color` (default: #E50914 for Sabalist)
- `background_color` (default: #E50914 for Sabalist)
- `display` (default: standalone)
- `name` (default: Sabalist)
- `short_name` (default: Sabalist)
- `start_url`
- `orientation`
- `related_applications`
- `prefer_related_applications`

**Create `public/site.webmanifest` with this structure:**
```json
{
  "name": "Sabalist",
  "short_name": "Sabalist",
  "icons": [
    {
      "src": "/web-app-manifest-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/web-app-manifest-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "theme_color": "#E50914",
  "background_color": "#E50914",
  "display": "standalone",
  "start_url": "/?utm_source=web_app_manifest",
  "orientation": "portrait",
  "related_applications": [
    {
      "platform": "itunes",
      "id": "com.sabalist.app"
    },
    {
      "platform": "play",
      "url": "http://play.google.com/store/apps/details?id=com.sabalist.app",
      "id": "com.sabalist.app"
    }
  ],
  "prefer_related_applications": true
}
```

### Step 5: Update Layout/Head Files with Favicon Tags

Find the appropriate head/layout file based on framework:

| Framework | Head File Location |
|-----------|-------------------|
| **Expo (React Native Web)** | `public/index.html` |
| **Next.js (App Router)** | `app/layout.tsx` or `app/layout.js` - use metadata export |
| **Next.js (Pages)** | `pages/_document.tsx` or `pages/_document.js`, or `pages/_app.tsx` |
| **Vite** | `index.html` in root |
| **Create React App** | `public/index.html` |
| **Rails** | `app/views/layouts/application.html.erb` |
| **Static HTML** | `index.html` in root |

**Remove old favicon tags first**: Search for and remove any existing lines containing:
- `rel="icon"`
- `rel="shortcut icon"`
- `rel="apple-touch-icon"`
- `name="msapplication-TileImage"`
- `site.webmanifest` or `manifest.json` link

**Add new favicon tags** in the `<head>` section (after the viewport meta tag):

```html
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<meta name="apple-mobile-web-app-title" content="Sabalist" />
<link rel="manifest" href="/site.webmanifest" />
```

Note: Only include the `favicon.svg` line if the source was an SVG file:
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

### Step 6: Print Summary

Print a summary in this format:

```
✓ Favicon generation complete!

Framework detected: [Framework Name]
Assets directory: [path]

Files generated:
  • favicon.ico (16x16, 32x32, 48x48)
  • favicon-96x96.png
  • apple-touch-icon.png (180x180)
  • web-app-manifest-192x192.png
  • web-app-manifest-512x512.png
  • site.webmanifest
  [• favicon.svg (if applicable)]

Files modified:
  • [list each modified file with its path]

Done! Your favicons are ready.
```

## Error Handling

If any step fails:
1. Stop immediately
2. Print a clear error message explaining what went wrong
3. Do not proceed to subsequent steps
4. If files were partially generated, note which ones were created before the error
