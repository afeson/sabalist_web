// Native no-op. The "what's stopping you from posting?" prompt is a WEB-ONLY
// growth surface (see PostAbandonPrompt.web.js). On iOS/Android this renders
// nothing and adds no listeners, so native behaviour is completely unchanged.
export default function PostAbandonPrompt() {
  return null;
}
