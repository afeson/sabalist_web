import React, { useRef, useState, useEffect } from 'react';
import { Modal, View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../theme';

/**
 * Runs the Firebase phone-auth reCAPTCHA + signInWithPhoneNumber flow
 * inside a WebView, loading a real hosted page from Firebase Hosting
 * (sabalist.firebaseapp.com/phone-auth.html). Using a hosted URL — not
 * inline HTML with baseUrl trickery — gives the page a proper origin so
 * reCAPTCHA accepts it. The page posts back a verificationId via
 * window.ReactNativeWebView.postMessage; we then use that verificationId
 * with PhoneAuthProvider.credential + signInWithCredential — a native
 * SDK path that does not crash on iOS (unlike signInWithPhoneNumber).
 */
const PHONE_AUTH_URL = 'https://sabalist.firebaseapp.com/phone-auth.html';

function buildUrl(phoneNumber) {
  return `${PHONE_AUTH_URL}?phone=${encodeURIComponent(phoneNumber)}&t=${Date.now()}`;
}

function _unusedBuildHtmlKeptForReference(phoneNumber) {
  const safePhone = JSON.stringify(phoneNumber);
  const safeConfig = JSON.stringify(FIREBASE_CONFIG);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <title>Verify your phone</title>
  <style>
    html, body { margin: 0; padding: 0; background: #fff; font-family: -apple-system, BlinkMacSystemFont, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrap { padding: 24px 24px 80px; }
    .title { font-size: 22px; font-weight: 700; color: #1a1a1a; margin: 8px 0 4px; }
    .subtitle { font-size: 14px; color: #555; margin-bottom: 24px; line-height: 1.4; }
    .phone { font-weight: 700; color: #1a1a1a; }
    .step { color: #888; font-size: 13px; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .captcha-card { background: #f7f7f7; padding: 20px; border-radius: 12px; border: 1px solid #e5e5e5; margin-bottom: 16px; }
    .captcha-help { font-size: 13px; color: #777; margin-top: 12px; }
    .status { background: #f0f7ff; border: 1px solid #c5dcfd; border-radius: 12px; padding: 14px; font-size: 14px; color: #1d4ed8; margin: 16px 0; display: flex; align-items: center; gap: 10px; }
    .status .spinner { width: 16px; height: 16px; border: 2px solid #c5dcfd; border-top-color: #1d4ed8; border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }
    .error { background: #fff0f0; border: 1px solid #fca5a5; color: #b91c1c; border-radius: 12px; padding: 14px; font-size: 13px; margin: 16px 0; line-height: 1.4; }
    @keyframes spin { to { transform: rotate(360deg); } }
    button.primary { display: block; width: 100%; padding: 14px 18px; background: #E50914; color: #fff; border: 0; border-radius: 10px; font-size: 16px; font-weight: 700; margin-top: 16px; -webkit-appearance: none; }
    button.primary:disabled { opacity: 0.5; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="title">Verify it's you</div>
    <div class="subtitle">We need to verify <span class="phone" id="phoneEcho"></span> before sending the SMS.</div>

    <div class="step">Step 1 — Security check</div>
    <div class="captcha-card">
      <div id="recaptcha-container"></div>
      <div class="captcha-help">Tap the checkbox above to continue.</div>
    </div>

    <div id="status" class="status" style="display:none;">
      <span class="spinner"></span>
      <span id="statusText">Working...</span>
    </div>

    <div id="errorBox" class="error" style="display:none;"></div>
  </div>

  <script src="https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.13.2/firebase-auth-compat.js"></script>
  <script>
    (function() {
      var phone = ${safePhone};
      document.getElementById('phoneEcho').textContent = phone;

      function post(msg) {
        try {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg));
        } catch (e) {}
      }
      function setStatus(s) {
        var el = document.getElementById('status');
        var txt = document.getElementById('statusText');
        if (s) { el.style.display = 'flex'; txt.textContent = s; }
        else { el.style.display = 'none'; }
      }
      function showError(code, message) {
        var el = document.getElementById('errorBox');
        el.style.display = 'block';
        el.textContent = '[' + (code || 'error') + '] ' + (message || 'Unknown error');
        post({ type: 'error', code: code, message: message });
      }

      // Surface uncaught errors back to RN.
      window.addEventListener('error', function (e) {
        showError('web/uncaught', (e && e.message) || 'uncaught error');
      });
      window.addEventListener('unhandledrejection', function (e) {
        showError('web/unhandled-rejection',
                  (e && e.reason && (e.reason.message || String(e.reason))) || 'unhandled rejection');
      });

      if (typeof firebase === 'undefined') {
        showError('web/sdk-missing', 'Firebase Web SDK did not load. Check your internet connection.');
        return;
      }
      post({ type: 'log', step: 'sdk.loaded' });

      try {
        firebase.initializeApp(${safeConfig});
      } catch (e) {
        if (!/already exists/i.test(e.message || '')) {
          showError('web/init-failed', e.message);
          return;
        }
      }

      var auth = firebase.auth();
      try { auth.useDeviceLanguage(); } catch (e) {}
      post({ type: 'log', step: 'auth.ready' });

      try {
        var verifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
          size: 'normal',
          callback: function (token) {
            post({ type: 'log', step: 'recaptcha.solved' });
            setStatus('Sending SMS to ' + phone + '...');
            auth.signInWithPhoneNumber(phone, verifier)
              .then(function (confirmation) {
                post({ type: 'log', step: 'sms.sent' });
                setStatus('Code sent — return to the app to enter the SMS code.');
                post({ type: 'verificationId', verificationId: confirmation.verificationId });
              })
              .catch(function (e) {
                showError(e.code || 'web/sms-failed', e.message || 'verification failed');
                try { verifier.clear(); } catch (_) {}
              });
          },
          'expired-callback': function () {
            showError('web/recaptcha-expired', 'Security check expired. Please tap the checkbox again.');
          },
          'error-callback': function () {
            showError('web/recaptcha-error', 'Security check failed to load. Check your internet connection.');
          },
        });

        verifier.render().then(function () {
          post({ type: 'log', step: 'verifier.rendered' });
        }).catch(function (e) {
          showError('web/render-failed', e.message);
        });
      } catch (e) {
        showError('web/verifier-failed', e.message);
      }
    })();
  </script>
</body>
</html>`;
}

export default function PhoneAuthWebView({ phoneNumber, onResult, onClose }) {
  const settledRef = useRef(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (phoneNumber) settledRef.current = false;
    setLoadFailed(false);
  }, [phoneNumber]);

  const handleMessage = (event) => {
    let data;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (data.type === 'log') {
      console.log('[PhoneAuthWebView]', data.step);
      return;
    }
    if (data.type === 'verificationId') {
      if (settledRef.current) return;
      settledRef.current = true;
      onResult({ verificationId: data.verificationId });
      return;
    }
    if (data.type === 'error') {
      console.warn('[PhoneAuthWebView] error', data.code, data.message);
      // Don't dismiss for transient errors (user can retry inside the
      // WebView by tapping the checkbox again). Only post to the parent
      // on terminal errors.
      if (
        data.code === 'web/init-failed' ||
        data.code === 'web/sdk-missing' ||
        data.code === 'auth/invalid-phone-number'
      ) {
        if (settledRef.current) return;
        settledRef.current = true;
        onResult({ error: { code: data.code, message: data.message } });
      }
    }
  };

  if (!phoneNumber) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={26} color={COLORS.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify your phone</Text>
          <View style={{ width: 26 }} />
        </View>
        {loadFailed ? (
          <View style={styles.errorView}>
            <Ionicons name="cloud-offline" size={48} color={COLORS.textMuted} />
            <Text style={styles.errorTitle}>Couldn't load verification page</Text>
            <Text style={styles.errorText}>Check your internet connection and try again, or use email sign-in.</Text>
          </View>
        ) : (
          <WebView
            originWhitelist={['*']}
            source={{ uri: buildUrl(phoneNumber) }}
            onMessage={handleMessage}
            onError={(e) => {
              console.warn('WebView onError', e.nativeEvent);
              setLoadFailed(true);
            }}
            onHttpError={(e) => console.warn('WebView onHttpError', e.nativeEvent)}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            mixedContentMode="always"
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator color={COLORS.primary} size="large" />
              </View>
            )}
            style={styles.webview}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  webview: { flex: 1, backgroundColor: '#fff' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  errorView: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  errorTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textDark, marginTop: SPACING.base },
  errorText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.sm },
});
