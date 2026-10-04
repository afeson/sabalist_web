import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// ── PostAbandonPrompt (WEB ONLY) ────────────────────────────────────────────
// Shown to a visitor who STARTED a listing (entered something) and is about to
// leave without publishing. Asks "what's stopping you?" + an OPTIONAL WhatsApp/
// email so the owner can follow up and encourage them. Consent-based: nothing is
// captured unless the person taps Send. Submits to the seo-web endpoint
// /api/post-feedback, which stores it and emails the owner when contact is left.
//
// Triggers (web): (1) exit-intent — cursor leaves the top of the window; and
// (2) in-app navigation away from the Create screen (React Navigation
// beforeRemove). Shown at most once per browser session (sessionStorage), never
// after a successful publish, and never for an empty form — getActive() is read
// live at trigger time so it reflects the latest state (incl. a just-published
// flag held in a ref by the parent).

const FEEDBACK_ENDPOINT = 'https://www.sabalist.com/api/post-feedback';
const SESSION_KEY = 'sb_abandon_prompt_shown';

const RED = '#D81F26';
const INK = '#171311';
const MUTED = '#6E635A';
const LINE = '#E3D6C4';
const BG2 = '#F4EDE3';

const REASONS = [
  { key: 'too_many_steps', label: 'Too many steps' },
  { key: 'photos', label: "Couldn't add photos" },
  { key: 'pricing', label: 'Not sure about pricing' },
  { key: 'sign_in', label: "Didn't want to sign in" },
  { key: 'just_browsing', label: 'Just browsing' },
  { key: 'other', label: 'Something else' },
];

function track(event, params) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', event, params || {});
    }
  } catch (_) { /* best-effort */ }
}

export default function PostAbandonPrompt({ getActive, getContext }) {
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [contact, setContact] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  // Live refs so event handlers always see the latest values.
  const getActiveRef = useRef(getActive);
  getActiveRef.current = getActive;
  const getContextRef = useRef(getContext);
  getContextRef.current = getContext;
  const pendingActionRef = useRef(null); // a blocked navigation to resume on close
  const shownRef = useRef(false);

  const alreadyShownThisSession = () => {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (_) { return false; }
  };
  const markShown = () => {
    shownRef.current = true;
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (_) { /* private mode */ }
  };

  const canTrigger = useCallback(() => {
    if (shownRef.current || alreadyShownThisSession()) return false;
    try { return !!(getActiveRef.current && getActiveRef.current()); } catch (_) { return false; }
  }, []);

  const trigger = useCallback(() => {
    if (!canTrigger()) return false;
    markShown();
    track('post_abandon_prompt_shown', {});
    setOpen(true);
    return true;
  }, [canTrigger]);

  // Resume a navigation we blocked (so "No thanks" still lets them leave).
  const resumePending = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) {
      try { navigation.dispatch(action); } catch (_) { /* already gone */ }
    }
  }, [navigation]);

  const close = useCallback(() => {
    setOpen(false);
    resumePending();
  }, [resumePending]);

  // Exit-intent: cursor leaves through the top of the viewport.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onMouseOut = (e) => {
      if (e.clientY <= 0 && !e.relatedTarget) trigger();
    };
    document.addEventListener('mouseout', onMouseOut);
    return () => document.removeEventListener('mouseout', onMouseOut);
  }, [trigger]);

  // In-app navigation away from the form → intercept once, ask, then resume.
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (!canTrigger()) return; // allow the navigation
      e.preventDefault();
      pendingActionRef.current = e.data.action;
      markShown();
      track('post_abandon_prompt_shown', { via: 'navigation' });
      setOpen(true);
    });
    return unsub;
  }, [navigation, canTrigger]);

  const submit = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const ctx = (() => { try { return getContextRef.current ? getContextRef.current() : {}; } catch (_) { return {}; } })();
    const value = contact.trim();
    const contactType = !value ? 'none' : /@/.test(value) ? 'email' : 'phone';
    track('post_abandon_feedback', { reason: reason || 'unspecified', has_contact: value ? 1 : 0 });
    try {
      await fetch(FEEDBACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason || 'unspecified',
          contact: value.slice(0, 120),
          contactType,
          step: ctx.step ?? null,
          hasTitle: !!ctx.hasTitle,
          hasPhotos: !!ctx.hasPhotos,
          path: typeof window !== 'undefined' ? window.location.pathname : '',
        }),
        keepalive: true, // still sends if the page is unloading
      });
    } catch (_) { /* best-effort; never block the user */ }
    setBusy(false);
    setSent(true);
    // Let them read the thank-you, then resume whatever they were doing.
    setTimeout(() => { setOpen(false); resumePending(); }, 1400);
  }, [busy, contact, reason, resumePending]);

  if (!open) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={close}>
      <Pressable
        onPress={close}
        style={{ flex: 1, backgroundColor: 'rgba(23,19,17,0.55)', justifyContent: 'center', alignItems: 'center', padding: 18 }}
      >
        {/* stop backdrop press from closing when tapping the card */}
        <Pressable
          onPress={() => {}}
          style={{ width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 20, padding: 22,
            shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 40, shadowOffset: { width: 0, height: 20 }, elevation: 12 }}
        >
          {sent ? (
            <View style={{ paddingVertical: 10 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: INK, marginBottom: 6 }}>Thank you 🙏</Text>
              <Text style={{ fontSize: 15, color: MUTED, lineHeight: 21 }}>
                {contact.trim() ? "Got it — we'll reach out shortly to help you get your listing posted." : 'Thanks for the feedback — it helps us make posting easier.'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 20, fontWeight: '800', color: INK, marginBottom: 4 }}>Before you go…</Text>
              <Text style={{ fontSize: 15, color: MUTED, lineHeight: 21, marginBottom: 16 }}>
                You started posting but didn't finish. What stopped you? (One tap — it helps a lot.)
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
                {REASONS.map((r) => {
                  const on = reason === r.key;
                  return (
                    <TouchableOpacity
                      key={r.key}
                      onPress={() => setReason(r.key)}
                      style={{
                        paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, marginRight: 8, marginBottom: 8,
                        borderWidth: 1, borderColor: on ? RED : LINE, backgroundColor: on ? '#FCE9EA' : '#fff',
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '600', color: on ? RED : INK }}>{r.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={{ fontSize: 13, fontWeight: '700', color: INK, marginTop: 10, marginBottom: 6 }}>
                Want us to help you post it?
              </Text>
              <TextInput
                value={contact}
                onChangeText={setContact}
                placeholder="WhatsApp number or email (optional)"
                placeholderTextColor="#9a9088"
                autoCapitalize="none"
                style={{
                  borderWidth: 1, borderColor: LINE, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                  fontSize: 15, color: INK, backgroundColor: BG2,
                }}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 18 }}>
                <TouchableOpacity onPress={close} style={{ paddingVertical: 11, paddingHorizontal: 16, marginRight: 6 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: MUTED }}>No thanks</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={submit}
                  disabled={busy || (!reason && !contact.trim())}
                  style={{
                    paddingVertical: 12, paddingHorizontal: 22, borderRadius: 999,
                    backgroundColor: (busy || (!reason && !contact.trim())) ? '#f0c9cb' : RED,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>{busy ? 'Sending…' : 'Send'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
