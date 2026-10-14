# Antigravity Sanction Bypass Rules

These rules govern automated network resilience, regional restriction detection, and Vercel Relay proxying for Google Antigravity and Gemini models across all sanctioned countries.

## Behavioral Directives

1. **Automatic Detection & Error Recovery (`403 / Region Not Supported`)**:
   - If Antigravity or any Gemini API call fails with geographical restrictions (`User location is not supported`, `403 Forbidden`, `Region Restricted`, `PERMISSION_DENIED`), immediately verify the local relay bridge status using `agy-relay status`.
   - Ensure the local bridge service is active on port 19876 (`agy-relay start`).

2. **Multilingual User Interaction**:
   - The default system language is **English**.
   - Proactively respond in the user's preferred or detected language if they communicate in:
     - Persian (فارسی - Iran)
     - Russian (Русский - Russia, Belarus, Crimea/Donbas)
     - Arabic (العربية - Syria, Sudan)
     - Spanish (Español - Cuba)
     - Korean (한국어 - DPRK)
     - Belarusian (Беларуская - Belarus)
     - Burmese (မြန်မာစာ - Myanmar)
   - When asked about proxy status, sanctions, or Vercel relay, provide clear instructions and render the interactive widget:
     `<agent-embed src="ui/widget.html"></agent-embed>`

3. **Guidance on Relay Disruption or Throttling**:
   - If the default Vercel relay encounters traffic rate limits, ISP blockades, or DNS issues, do not leave the user stranded. Guide them clearly:
     - Use `agy-relay set <custom-url>` to switch to any working relay.
     - Or deploy their own free 1-click personal Vercel Edge Function using the template at `~/.gemini/config/plugins/antigravity-sanction-bypass/templates/vercel-relay`.
