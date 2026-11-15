// Merit Media's published rate cards (valid April 2026 – March 2027).
// Loaded into the database with Packages → "Add our rate-card packages".
(function () {
  const M = window.M;
  const VALID = 'Valid April 2026 – March 2027';

  M.CATEGORIES = ['Weddings', 'Introductions', 'Studio sessions', 'Livestreaming', 'Schools', 'Events', 'Other'];

  M.RATE_CARD = {
    packages: [
      // ---- Weddings ----
      { slug: 'wedding-basic', category: 'Weddings', eventType: 'Wedding', order: 11, name: 'Wedding — Basic', price: 3500000, priceNote: VALID,
        description: 'Beautiful wedding photography with printed keepsakes.',
        includes: ['Photography only', '1 photographer', '200 edited soft copies', '12 x 12 photo book', '2 A3 boards'] },
      { slug: 'wedding-peoples-choice', category: 'Weddings', eventType: 'Wedding', order: 12, name: "Wedding — People's Choice", price: 7500000, priceNote: VALID, badge: "People's choice",
        description: 'Photo, video and drone coverage of your whole day.',
        includes: ['2 photographers', '2 videographers', '1 drone', '250 edited pictures', '12 x 16 photo book', '4 A3 boards', 'Short film', 'Full HD video', '500 GB hard drive with everything'] },
      { slug: 'wedding-most-value', category: 'Weddings', eventType: 'Wedding', order: 13, name: 'Wedding — Most Value', price: 8500000, priceNote: VALID, badge: 'Most value',
        description: 'Our most complete wedding coverage.',
        includes: ['2 photographers', '3 videographers', '1 drone', '300 edited pictures', '12 x 18 photo book', '3 A2 boards', 'Short film', 'Full HD video', '500 GB hard drive with everything'] },

      // ---- Kukyala (the visit to the bride's ssenga before the kwanjula) ----
      // Priced from Kampala market rates, Nov 2026: about UGX 0.5–1M photo only, 1.4–2.9M with video.
      { slug: 'kukyala-basic', category: 'Introductions', eventType: 'Kukyala', order: 14.1, name: 'Kukyala — Basic', price: 1000000, priceNote: VALID,
        description: 'Photography of your kukyala visit, with a printed board to keep.',
        includes: ['Photography only', '1 photographer', 'Up to 5 hours coverage', '100 edited soft copies', 'Online gallery', '1 A3 photo board'] },
      { slug: 'kukyala-peoples-choice', category: 'Introductions', eventType: 'Kukyala', order: 14.2, name: "Kukyala — People's Choice", price: 2000000, priceNote: VALID, badge: "People's choice",
        description: 'Photos and video of the visit, from arrival to the final blessings.',
        includes: ['1 photographer', '1 videographer', 'Up to 6 hours coverage', '150 edited soft copies', '2–3 minute highlight film', 'Full HD video', '2 A3 photo boards'] },
      { slug: 'kukyala-most-value', category: 'Introductions', eventType: 'Kukyala', order: 14.3, name: 'Kukyala — Most Value', price: 3000000, priceNote: VALID, badge: 'Most value',
        description: 'Our most complete kukyala coverage, with a photo book.',
        includes: ['2 photographers', '1 videographer', 'Full-day coverage', '200 edited soft copies', '12 x 12 photo book (20 pages)', '2 A3 photo boards', '2–3 minute highlight film', 'Full HD video', 'Flash drive with everything'] },

      // ---- Introductions (kwanjula / kukyala) ----
      { slug: 'introduction-basic', category: 'Introductions', eventType: 'Introduction', order: 15, name: 'Introduction — Basic', price: 3500000, priceNote: VALID,
        description: 'Beautiful introduction-ceremony photography with printed keepsakes.',
        includes: ['Photography only', '1 photographer', '200 edited soft copies', '12 x 12 photo book', '2 A3 boards'] },
      { slug: 'introduction-peoples-choice', category: 'Introductions', eventType: 'Introduction', order: 16, name: "Introduction — People's Choice", price: 7500000, priceNote: VALID, badge: "People's choice",
        description: 'Photo, video and drone coverage of your whole ceremony.',
        includes: ['2 photographers', '2 videographers', '1 drone', '250 edited pictures', '12 x 16 photo book', '4 A3 boards', 'Short film', 'Full HD video', '500 GB hard drive with everything'] },
      { slug: 'introduction-most-value', category: 'Introductions', eventType: 'Introduction', order: 17, name: 'Introduction — Most Value', price: 8500000, priceNote: VALID, badge: 'Most value',
        description: 'Our most complete introduction coverage.',
        includes: ['2 photographers', '3 videographers', '1 drone', '300 edited pictures', '12 x 18 photo book', '3 A2 boards', 'Short film', 'Full HD video', '500 GB hard drive with everything'] },

      // ---- Studio sessions ----
      { slug: 'studio-essential', category: 'Studio sessions', eventType: 'Portrait session', order: 18, name: 'Studio — Essential', price: 300000, priceNote: 'Studio session',
        description: 'A relaxed photo session in our Kisaasi studio.',
        includes: ['20 edited soft copies'] },
      { slug: 'studio-classic', category: 'Studio sessions', eventType: 'Portrait session', order: 19, name: 'Studio — Classic', price: 500000, priceNote: 'Studio session',
        description: 'Studio portraits plus printed boards to display.',
        includes: ['20 edited soft copies', '2 A3 photo boards'] },
      { slug: 'studio-premium', category: 'Studio sessions', eventType: 'Portrait session', order: 20, name: 'Studio — Premium', price: 1000000, priceNote: 'Studio session',
        description: 'Studio portraits with a framed print and a photobook.',
        includes: ['20 edited soft copies', '1 A3 framed photo', '1 photobook — 10 pages, 12 x 12 inches'] },

      // ---- Livestreaming ----
      { slug: 'livestream-basic', category: 'Livestreaming', eventType: 'Livestream', order: 21, name: 'Livestream — Basic', price: 1000000, priceNote: VALID,
        description: 'A single-camera livestream to one platform.',
        includes: ['1 camera setup', 'Up to 3 hours coverage', 'Stream to 1 platform', 'Technical director', 'Basic graphics (intro / outro, logo overlay)'] },
      { slug: 'livestream-standard', category: 'Livestreaming', eventType: 'Livestream', order: 22, name: 'Livestream — Standard', price: 2000000, priceNote: VALID,
        description: 'Two cameras with live switching and branded graphics.',
        includes: ['2 camera setup (with switching)', 'Up to 5 hours coverage', 'Branded graphics + lower thirds', 'Stream to 2 platforms', '2 camera operators + technical director'] },
      { slug: 'livestream-premium', category: 'Livestreaming', eventType: 'Livestream', order: 23, name: 'Livestream — Premium', price: 4000000, priceNote: VALID,
        description: 'Full-day, multi-platform production with a sound engineer.',
        includes: ['3 camera setup (with switching)', 'Full day coverage (up to 18 hours)', 'Custom graphics + branding', 'Stream to multiple platforms', '2 camera operators + technical director + sound engineer'] },

      // ---- Schools (per term, 3 months) ----
      { slug: 'school-term-starter', category: 'Schools', eventType: 'School term', order: 31, name: 'Term Starter', price: 2500000, priceNote: 'Per term (3 months) · invoiced once per term',
        description: "Keep your school's social media active all term.",
        includes: ['36 feed posts per term', '6 short reels per term', 'Weekly story updates', '3 school event coverages (photo)', 'Caption writing', 'End-of-term performance report'] },
      { slug: 'school-term-growth', category: 'Schools', eventType: 'School term', order: 32, name: 'Term Growth', price: 4500000, priceNote: 'Per term (3 months) · invoiced once per term', badge: 'Recommended',
        description: 'Daily presence, event coverage and design for a growing school.',
        includes: ['72 feed posts per term', '18 reels + video edits', 'Daily story updates', '6 event coverages (photo + video): visitation day, sports day, prize giving', 'Graphic design: admissions, term calendars, results & notices', 'Press releases & media liaison (2 per term)', 'End-of-term report + strategy review'] },
      { slug: 'school-whole-brand', category: 'Schools', eventType: 'School term', order: 33, name: 'Whole School Brand', price: 8000000, priceNote: 'Per term (3 months) · invoiced once per term',
        description: "Your school's complete media, design and PR team.",
        includes: ['Everything in Term Growth', 'Unlimited graphic design requests', 'Up to 12 event coverages per term', 'Livestream of 1 major event (graduation, speech day)', 'Termly newsletter & magazine design', 'Full PR & media relations management', 'Priority response + staff media training each term'] }
    ],

    // Livestream add-ons, added to the price list for quotations and invoices.
    addons: [
      { id: 'it-drone-live', name: 'Drone Livestream Integration', description: 'Livestream add-on', price: 700000, unit: 'event' },
      { id: 'it-extra-hour', name: 'Extra Streaming Hour', description: 'Livestream add-on', price: 250000, unit: 'hour' },
      { id: 'it-extra-operator', name: 'Extra Camera Operator', description: 'Livestream add-on', price: 500000, unit: 'operator' },
      { id: 'it-led-feed', name: 'Onsite Projector / LED Wall Feed', description: 'Livestream add-on', price: 400000, unit: 'sqm' },
      { id: 'it-recording', name: 'Event Recording & Editing', description: 'Livestream add-on', price: 1000000, unit: 'event' }
    ]
  };
})();
