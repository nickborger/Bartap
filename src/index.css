@import "tailwindcss";

/*
 * Black & copper theme ("trendy cocktail bar, modern nightlife").
 * Palette: #1A1A1A near-black background, #36302C charcoal surfaces,
 * #A86B45 copper primary accent, #C99B72 light copper secondary accent,
 * #F2E8DD warm cream text.
 * The neutral scale is remapped to warm tones built from that palette, so every
 * existing neutral-* class follows the theme.
 */
@theme {
  --color-ink: #0b0b0b; /* text on copper buttons (AA contrast) */
  --color-night: #1a1a1a;
  --color-surface: #36302c;
  --color-copper: #a86b45;
  --color-copper-dark: #8f5a39;
  --color-tan: #c99b72;
  --color-cream: #f2e8dd;

  --color-white: #f2e8dd;
  --color-black: #0b0b0b;

  --color-neutral-50: #faf6f1;
  --color-neutral-100: #f2e8dd;
  --color-neutral-200: #e4d6c8;
  --color-neutral-300: #d3c2b2;
  --color-neutral-400: #b5a391;
  --color-neutral-500: #9c8c7e;
  --color-neutral-600: #6e6158;
  --color-neutral-700: #554a43;
  --color-neutral-800: #443c37;
  --color-neutral-900: #36302c;
  --color-neutral-950: #1a1a1a;
}

@layer base {
  html,
  body {
    background-color: #1a1a1a;
    color: #f2e8dd;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    max-width: 100%;
    overflow-x: clip;
  }

  #root {
    min-height: 100dvh;
    max-width: 100%;
    overflow-x: clip;
    display: flex;
    flex-direction: column;
  }

  ::selection {
    background-color: #a86b45;
    color: #0b0b0b;
  }

  code,
  pre,
  .font-mono {
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
  }
}

.scrollbar-none::-webkit-scrollbar,
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.scrollbar-none,
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #554a43;
  border-radius: 9999px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #a86b45;
}
