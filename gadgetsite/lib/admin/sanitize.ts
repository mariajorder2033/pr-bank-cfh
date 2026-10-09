import sanitizeHtml from 'sanitize-html'

// Rich text written in admin (descriptions, pages) is cleaned before it is stored
// (spec §10): structure and links only — no scripts, styles, handlers or embeds.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'ul',
    'ol',
    'li',
    'h2',
    'h3',
    'a',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ],
  // `rel` is always overwritten by the transform below.
  allowedAttributes: { a: ['href', 'title', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.href
        ? { ...attribs, rel: 'noopener noreferrer' }
        : Object.fromEntries(Object.entries(attribs).filter(([k]) => k !== 'rel')),
    }),
  },
}

export const sanitizeRichText = (html: string): string => sanitizeHtml(html, OPTIONS)
