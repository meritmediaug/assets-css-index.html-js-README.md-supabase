// Starting data for local mode.
// Records from Merit Media's real documents (INV-2026-0011, RCP-2026-0025, the
// price list and client names) are kept as-is. Everything marked `sample: true`
// is illustrative and can be removed in Settings → Data → Remove sample data.
(function () {
  const M = window.M;

  M.DEFAULT_COMPANY = {
    id: 'company',
    name: 'Merit Media Limited',
    shortName: 'Merit Media',
    tagline: 'Every moment deserves to be remembered.',
    phone: '+256 702 642571',
    email: 'meritmediaug@gmail.com',
    website: 'meritmediaug.com',
    address: 'Kisaasi – Kyanja Road, opp. Rochester Hotel, Kampala',
    hours: 'Open Monday to Saturday, 8:00 AM – 6:00 PM',
    travel: 'We travel to weddings nationwide',
    thanks: 'Thank you for trusting Merit Media Limited with your special moments.',
    paymentDetails: '',
    invoiceDueDays: 7,
    quoteValidDays: 14,
    vatRate: 18,
    vatDefault: false,
    tin: '',
    // Last numbers issued before Merit, so new documents carry on the sequence.
    numbersYear: '2026',
    lastNumbers: { INV: 11, RCP: 25, QUO: 0, REQ: 0, BKG: 0 }
  };

  M.seed = function () {
    const S = { sample: true };
    const line = (name, description, qty, price) => ({ name, description, qty, price });
    const photo = (q = 1) => line('Photography', 'Event photography coverage', q, 1200000);
    const video = (q = 1) => line('Videography', 'Two-camera video coverage', q, 850000);
    const boards = (q = 1) => line('A3 Boards', 'Printed A3 display boards', q, 100000);
    const book = (q = 1) => line('Photobook (12 x 16)', 'Premium printed photobook', q, 400000);

    return {
      settings: [Object.assign({}, M.DEFAULT_COMPANY)],

      users: [
        { id: 'u-admin', name: 'Super Admin', email: 'meritmediaug@gmail.com', role: 'admin' },
        { id: 'u-staff1', name: 'Studio Assistant', email: '', role: 'staff', sample: true },
        { id: 'u-staff2', name: 'Second Shooter', email: '', role: 'staff', sample: true }
      ],

      items: [
        { id: 'it-photo', name: 'Photography', description: 'Event photography coverage', price: 1200000, unit: 'event' },
        { id: 'it-video', name: 'Videography', description: 'Two-camera video coverage', price: 850000, unit: 'camera' },
        { id: 'it-a3', name: 'A3 Boards', description: 'Printed A3 display boards', price: 100000, unit: 'board' },
        { id: 'it-book', name: 'Photobook (12 x 16)', description: 'Premium printed photobook', price: 400000, unit: 'book' }
      ],

      packages: [
        Object.assign({ id: 'pk-photo', slug: 'event-photography', name: 'Event Photography', eventType: 'Event', price: 1200000, active: true, order: 1,
          description: 'Full-event photo coverage for birthdays, graduations, introductions and corporate events.',
          includes: ['One lead photographer', 'Edited high-resolution photos', 'Online gallery'] }, S),
        Object.assign({ id: 'pk-wedding', slug: 'wedding-photo-video', name: 'Wedding Photo + Video', eventType: 'Wedding', price: 2900000, active: true, order: 2,
          description: 'Your wedding day captured in photos and film, from preparations to the last dance.',
          includes: ['Photography — full day', 'Two-camera videography', 'Highlight film', 'Edited photos and online gallery'] }, S),
        Object.assign({ id: 'pk-premium', slug: 'wedding-premium', name: 'Wedding Premium', eventType: 'Wedding', price: 3500000, active: true, order: 3,
          description: 'Everything in Photo + Video, plus printed keepsakes.',
          includes: ['Photography — full day', 'Two-camera videography', '2 printed A3 display boards', 'Premium 12 x 16 photobook'] }, S)
      ],

      requests: [
        Object.assign({ id: 'req-sample01', status: 'new', packageId: 'pk-wedding', packageName: 'Wedding Photo + Video', packagePrice: 2900000,
          name: 'Brian & Joan', phone: '0772 000 111', email: '', eventType: 'Wedding', date: '2026-12-19', venue: 'Munyonyo', notes: 'Church at 11am.', submittedAt: '2026-10-27T18:20:00Z' }, S)
      ],

      clients: [
        { id: 'c-sandra', name: 'Miss Sandra', phone: '0704172007', email: '', location: 'Kampala, Uganda', notes: '' },
        { id: 'c-derrick', name: 'Eng Derrick & Dr Sheila', phone: '0778005847', email: '', location: 'Kampala, Uganda', notes: '' },
        { id: 'c-ivan', name: 'Ivan & Eve', phone: '0785065804', email: '', location: 'Kampala, Uganda', notes: '' },
        { id: 'c-raphael', name: 'Raphael & Aidah', phone: '', email: '', location: 'UK, Uganda', notes: 'Based in the UK — prefers WhatsApp.' },
        { id: 'c-felix', name: 'Dr Felix Ocom', phone: '', email: '', location: 'Uganda', notes: '' },
        { id: 'c-marcus', name: 'Marcus & Vivian', phone: '', email: '', location: 'Kampala, Uganda', notes: '' }
      ],

      quotations: [
        Object.assign({ id: 'q-1', number: 'QUO-2026-0001', clientId: 'c-ivan', date: '2026-09-02', validUntil: '2026-09-16', lines: [photo(), video(2), book()], discount: 200000, notes: 'Wedding — full day coverage.', status: 'accepted', bookingId: 'b-ivan' }, S),
        Object.assign({ id: 'q-2', number: 'QUO-2026-0002', clientId: 'c-raphael', date: '2026-10-21', validUntil: '2026-11-04', lines: [photo(), video(1), boards(2)], discount: 0, notes: 'Introduction ceremony (kwanjula).', status: 'sent' }, S)
      ],

      bookings: [
        Object.assign({ id: 'b-marcus', number: 'BKG-2026-0003', clientId: 'c-marcus', eventType: 'Wedding', date: '2026-08-15', time: '10:00', venue: 'Speke Resort, Munyonyo', status: 'completed', crew: ['u-staff1', 'u-staff2'], notes: '' }, S),
        Object.assign({ id: 'b-felix', number: 'BKG-2026-0004', clientId: 'c-felix', eventType: 'Graduation', date: '2026-09-12', time: '09:00', venue: 'Makerere University', status: 'completed', crew: ['u-staff1'], notes: '' }, S),
        { id: 'b-derrick', number: 'BKG-2026-0005', clientId: 'c-derrick', eventType: 'Wedding', date: '2026-10-17', time: '10:00', venue: 'Kampala', status: 'completed', crew: ['u-staff1', 'u-staff2'], notes: '' },
        { id: 'b-sandra', number: 'BKG-2026-0006', clientId: 'c-sandra', eventType: 'Event', date: '2026-10-18', time: '14:00', venue: 'Kampala', status: 'completed', crew: ['u-staff1'], notes: '' },
        Object.assign({ id: 'b-ivan', number: 'BKG-2026-0007', clientId: 'c-ivan', eventType: 'Wedding', date: '2026-11-14', time: '09:00', venue: 'Serena Hotel, Kampala', status: 'confirmed', crew: ['u-staff1', 'u-staff2'], notes: 'Church 11:00, reception 16:00.', quotationId: 'q-1' }, S),
        Object.assign({ id: 'b-raphael', number: 'BKG-2026-0008', clientId: 'c-raphael', eventType: 'Introduction', date: '2026-12-05', time: '11:00', venue: 'Mukono', status: 'tentative', crew: [], notes: 'Waiting on quotation approval.' }, S)
      ],

      invoices: [
        // Real: INV-2026-0011 as issued.
        { id: 'i-0011', number: 'INV-2026-0011', clientId: 'c-sandra', bookingId: 'b-sandra', issueDate: '2026-10-20', dueDate: '2026-10-20', lines: [photo(), video(2), boards(2), book()], discount: 0, notes: '', status: 'sent' },
        // Invoice behind RCP-2026-0025 (stated total UGX 3,000,000).
        { id: 'i-0010', number: 'INV-2026-0010', clientId: 'c-derrick', bookingId: 'b-derrick', issueDate: '2026-10-01', dueDate: '2026-10-17', lines: [photo(), video(2), boards()], discount: 0, notes: '', status: 'sent' },
        Object.assign({ id: 'i-0007', number: 'INV-2026-0007', clientId: 'c-marcus', bookingId: 'b-marcus', issueDate: '2026-07-20', dueDate: '2026-08-15', lines: [photo(), video(2), book(2)], discount: 0, notes: '', status: 'sent' }, S),
        Object.assign({ id: 'i-0008', number: 'INV-2026-0008', clientId: 'c-felix', bookingId: 'b-felix', issueDate: '2026-09-01', dueDate: '2026-09-12', lines: [photo(), boards(2)], discount: 0, notes: '', status: 'sent' }, S),
        Object.assign({ id: 'i-0009', number: 'INV-2026-0009', clientId: 'c-ivan', bookingId: 'b-ivan', quotationId: 'q-1', issueDate: '2026-09-05', dueDate: '2026-11-07', lines: [photo(), video(2), book()], discount: 200000, notes: 'Balance due one week before the wedding.', status: 'sent' }, S)
      ],

      receipts: [
        Object.assign({ id: 'r-0012', number: 'RCP-2026-0012', invoiceId: 'i-0007', clientId: 'c-marcus', date: '2026-07-22', amount: 2000000, method: 'mtn', reference: 'MP260722.1043.A51823', notes: 'Deposit' }, S),
        Object.assign({ id: 'r-0015', number: 'RCP-2026-0015', invoiceId: 'i-0007', clientId: 'c-marcus', date: '2026-08-14', amount: 1700000, method: 'bank', reference: 'Stanbic TRF 88213', notes: 'Balance' }, S),
        Object.assign({ id: 'r-0018', number: 'RCP-2026-0018', invoiceId: 'i-0008', clientId: 'c-felix', date: '2026-09-12', amount: 1400000, method: 'cash', reference: '', notes: '' }, S),
        Object.assign({ id: 'r-0020', number: 'RCP-2026-0020', invoiceId: 'i-0009', clientId: 'c-ivan', date: '2026-09-06', amount: 1500000, method: 'airtel', reference: 'AM-7731045', notes: 'Booking deposit' }, S),
        Object.assign({ id: 'r-0022', number: 'RCP-2026-0022', invoiceId: 'i-0010', clientId: 'c-derrick', date: '2026-10-02', amount: 500000, method: 'mtn', reference: 'MP261002.0912.B10044', notes: 'Booking deposit' }, S),
        // Real: RCP-2026-0025 as issued.
        { id: 'r-0025', number: 'RCP-2026-0025', invoiceId: 'i-0010', clientId: 'c-derrick', date: '2026-10-20', amount: 2500000, method: 'cash', reference: '', notes: 'Payment receipt' }
      ],

      requisitions: [
        Object.assign({ id: 'rq-1', number: 'REQ-2026-0001', requestedBy: 'u-staff1', date: '2026-10-15', category: 'Printing', purpose: 'Print 2 A3 boards for Miss Sandra', amount: 120000, bookingId: 'b-sandra', status: 'paid', decidedBy: 'u-admin', decidedAt: '2026-10-15', paidAt: '2026-10-16', paidMethod: 'mtn', paidReference: 'MP261016.1120.C22', note: '' }, S),
        Object.assign({ id: 'rq-2', number: 'REQ-2026-0002', requestedBy: 'u-staff2', date: '2026-10-22', category: 'Crew fees', purpose: 'Second shooter allowance — Derrick & Sheila wedding', amount: 250000, bookingId: 'b-derrick', status: 'approved', decidedBy: 'u-admin', decidedAt: '2026-10-23', note: '' }, S),
        Object.assign({ id: 'rq-3', number: 'REQ-2026-0003', requestedBy: 'u-staff1', date: '2026-10-25', category: 'Transport', purpose: 'Fuel for venue recce at Serena — Ivan & Eve', amount: 80000, bookingId: 'b-ivan', status: 'pending', note: '' }, S)
      ],

      expenses: [
        Object.assign({ id: 'e-1', date: '2026-08-05', category: 'Rent & utilities', description: 'Studio rent — August', amount: 900000, method: 'bank' }, S),
        Object.assign({ id: 'e-2', date: '2026-08-15', category: 'Transport', description: 'Fuel — Speke Resort wedding', amount: 150000, method: 'cash', bookingId: 'b-marcus' }, S),
        Object.assign({ id: 'e-3', date: '2026-08-20', category: 'Printing', description: 'Photobooks (2) — Marcus & Vivian', amount: 480000, method: 'mtn', bookingId: 'b-marcus' }, S),
        Object.assign({ id: 'e-4', date: '2026-09-05', category: 'Rent & utilities', description: 'Studio rent — September', amount: 900000, method: 'bank' }, S),
        Object.assign({ id: 'e-5', date: '2026-09-12', category: 'Crew fees', description: 'Assistant — graduation shoot', amount: 150000, method: 'cash', bookingId: 'b-felix' }, S),
        Object.assign({ id: 'e-6', date: '2026-09-18', category: 'Data & internet', description: 'Fibre internet — September', amount: 220000, method: 'mtn' }, S),
        Object.assign({ id: 'e-7', date: '2026-10-05', category: 'Rent & utilities', description: 'Studio rent — October', amount: 900000, method: 'bank' }, S),
        Object.assign({ id: 'e-8', date: '2026-10-16', category: 'Printing', description: 'Print 2 A3 boards for Miss Sandra', amount: 120000, method: 'mtn', requisitionId: 'rq-1', bookingId: 'b-sandra' }, S),
        Object.assign({ id: 'e-9', date: '2026-10-17', category: 'Transport', description: 'Fuel — Derrick & Sheila wedding', amount: 180000, method: 'cash', bookingId: 'b-derrick' }, S),
        Object.assign({ id: 'e-10', date: '2026-10-19', category: 'Maintenance', description: 'Sensor clean — Canon EOS R6', amount: 150000, method: 'cash', maintenanceId: 'm-1' }, S)
      ],

      equipment: [
        Object.assign({ id: 'eq-1', code: 'EQ-001', name: 'Sony A7 IV', category: 'Camera', serial: 'SN 5218843', purchaseDate: '2024-03-10', purchaseValue: 9800000, condition: 'good', nextServiceDate: '2027-01-15', notes: '' }, S),
        Object.assign({ id: 'eq-2', code: 'EQ-002', name: 'Sony A7S III', category: 'Camera', serial: 'SN 4471209', purchaseDate: '2023-11-02', purchaseValue: 13500000, condition: 'good', nextServiceDate: '2026-11-02', notes: 'Main video body' }, S),
        Object.assign({ id: 'eq-3', code: 'EQ-003', name: 'Canon EOS R6', category: 'Camera', serial: 'SN 0832114', purchaseDate: '2022-06-21', purchaseValue: 8200000, condition: 'excellent', nextServiceDate: '2027-04-19', notes: '' }, S),
        Object.assign({ id: 'eq-4', code: 'EQ-004', name: 'Sony FE 24–70mm f/2.8 GM II', category: 'Lens', serial: 'SN 1849002', purchaseDate: '2024-03-10', purchaseValue: 8400000, condition: 'good', nextServiceDate: '', notes: '' }, S),
        Object.assign({ id: 'eq-5', code: 'EQ-005', name: 'DJI Mavic 3 Classic', category: 'Drone', serial: '1581F5BK', purchaseDate: '2024-08-30', purchaseValue: 6900000, condition: 'needs-repair', nextServiceDate: '2026-10-30', notes: 'Gimbal error after last flight.' }, S),
        Object.assign({ id: 'eq-6', code: 'EQ-006', name: 'DJI RS 3 Pro gimbal', category: 'Stabiliser', serial: 'RS3P-77102', purchaseDate: '2023-05-14', purchaseValue: 3900000, condition: 'good', nextServiceDate: '', notes: '' }, S),
        Object.assign({ id: 'eq-7', code: 'EQ-007', name: 'Godox SL60W (pair)', category: 'Lighting', serial: '', purchaseDate: '2022-02-01', purchaseValue: 1600000, condition: 'fair', nextServiceDate: '', notes: '' }, S),
        Object.assign({ id: 'eq-8', code: 'EQ-008', name: 'Rode Wireless GO II', category: 'Audio', serial: 'RWG2-31877', purchaseDate: '2023-05-14', purchaseValue: 1250000, condition: 'good', nextServiceDate: '', notes: '' }, S)
      ],

      checkouts: [
        Object.assign({ id: 'co-1', equipmentId: 'eq-1', userId: 'u-staff1', bookingId: 'b-derrick', outAt: '2026-10-16', dueBack: '2026-10-18', inAt: '2026-10-18', conditionIn: 'good', note: '' }, S),
        Object.assign({ id: 'co-2', equipmentId: 'eq-2', userId: 'u-staff2', bookingId: 'b-derrick', outAt: '2026-10-16', dueBack: '2026-10-18', inAt: '2026-10-19', conditionIn: 'good', note: '' }, S),
        Object.assign({ id: 'co-3', equipmentId: 'eq-6', userId: 'u-staff2', bookingId: '', outAt: '2026-10-21', dueBack: '2026-10-24', inAt: '', note: 'Practice shoot' }, S),
        Object.assign({ id: 'co-4', equipmentId: 'eq-8', userId: 'u-staff1', bookingId: 'b-ivan', outAt: '2026-10-25', dueBack: '2026-11-15', inAt: '', note: 'Testing before wedding' }, S)
      ],

      maintenance: [
        Object.assign({ id: 'm-1', equipmentId: 'eq-3', date: '2026-10-19', type: 'service', description: 'Sensor clean and firmware update', vendor: 'Camera Clinic, Kampala Road', cost: 150000 }, S),
        Object.assign({ id: 'm-2', equipmentId: 'eq-5', date: '2026-10-20', type: 'repair', description: 'Reported gimbal calibration error — awaiting repair quote', vendor: '', cost: 0 }, S)
      ]
    };
  };
})();
