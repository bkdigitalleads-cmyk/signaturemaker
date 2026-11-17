/**
 * Every word the app shows or reads out, in English. English is the
 * default and the fallback; de.ts, fr.ts, es.ts and it.ts have exactly this
 * shape (the `Strings` type checks it). Plain strings, or small functions
 * where a number, a name or a price goes in, so each language can put it
 * where its grammar wants it. Numbers come in already formatted for the
 * device locale (format.ts) unless a function needs the count for a plural.
 *
 * Kept in English on purpose, in every language: the corner mark "Made with
 * Signature Maker" (it is in the files people send), the "signed" in a signed
 * copy's file name ("Lease signed.pdf"), the support email's subject, the
 * font names and "Signature Maker" itself.
 */

type Kind = 'signature' | 'initials' | 'date' | 'text';
type Unit = 'day' | 'week' | 'month' | 'year';

export const en = {
  common: {
    close: 'Close',
    back: 'Back',
    cancel: 'Cancel',
    delete: 'Delete',
    remove: 'Remove',
    continue: 'Continue',
    done: 'Done',
    open: 'Open',
    share: 'Share',
    default: 'Default',
    tryAgain: 'Try once more.',
    didNotSave: 'That did not save',
    fileDidNotOpen: 'That file did not open',
    tryAnotherCopy: 'Try another copy of it.',
    sharingDidNotOpen: 'Sharing did not open',
    mailDidNotOpen: 'Mail did not open',
    /** A locked item's VoiceOver label: "Marker pen, Pro". */
    withPro: (label: string) => `${label}, Pro`,
    pageOf: (page: number, of: number) => `Page ${page} of ${of}`,
    shareApps: 'Mail, Messages, Files and other apps',
  },

  tabs: { create: 'Create', library: 'Library', documents: 'Documents', settings: 'Settings' },

  startup: {
    title: 'Signature Maker could not start.',
    body: 'Please delete the app and install it again. If it keeps happening, send this screen to support.',
  },

  app: {
    openOther: (name: string) => `Open “${name}”?`,
    openOtherBody: 'What you placed on the document that is open now is not saved.',
    keepThisOne: 'Keep this one',
    initialsSaved: 'Initials saved with the signature.',
    savedToLibrary: 'Saved to your library.',
    claimTitle: 'Your first export and first signed document are free.',
    claimBody: 'Neither carries a mark. Making and saving signatures stays free.',
    claim: 'Claim',
    crashTitle: 'Something went wrong on this screen.',
    crashBody: 'Close the app and open it again. Your signatures and documents are saved.',
  },

  create: {
    signHere: 'Sign here',
    yourInitials: 'Your initials',
    signOnce: 'Sign once and it is saved for every document.',
    draw: 'Draw',
    typeInstead: 'Type instead',
    drawInitials: 'Draw your initials',
    undo: 'Undo',
    redo: 'Redo',
    clear: 'Clear',
    wide: 'Wide',
    wideMode: 'Wide mode',
    wideHint: 'Turns the pad sideways so a long signature fits',
    saveSignature: 'Save signature',
    saveInitials: 'Save initials',
    drawFirst: 'Draw on the pad first',
    typeFirst: 'Type a name first',
    skip: 'Skip for now',
    yourName: 'Your name',
    /** "Jordan Ellis in Great Vibes", the typed preview for VoiceOver. */
    inFont: (text: string, font: string) => `${text} in ${font}`,
    inkColor: 'Ink color',
    font: 'Font',
    turnPhone: 'Turn the phone and sign along the line',
  },

  pad: {
    placeholder: 'Draw with a finger or Apple Pencil',
    empty: 'Signature pad, empty. Draw your signature with a finger or Apple Pencil, or choose Type instead.',
    strokes: (n: number, shown: string) => `Signature pad with ${shown} ${n === 1 ? 'stroke' : 'strokes'}`,
    hint: 'Draw with one finger. Type instead is above the pad.',
  },

  pens: {
    group: 'Pen',
    /** VoiceOver: "Ink pen". */
    a11y: (label: string) => `${label} pen`,
    ink: { label: 'Ink', hint: 'Thicker when you go slowly, thinner when you go fast' },
    ballpoint: { label: 'Ballpoint', hint: 'An even, thin line' },
    marker: { label: 'Marker', hint: 'An even, bold line' },
    fountain: { label: 'Fountain', hint: 'Thick on the way down, thin on the way up' },
    thickness: 'Thickness',
    sizes: ['Thin', 'Medium', 'Thick'],
  },

  inks: {
    /** The color alone, and the phrase used in names and VoiceOver ("blue ink"). */
    black: { label: 'Black', phrase: 'black ink' },
    navy: { label: 'Navy', phrase: 'navy ink' },
    blue: { label: 'Blue', phrase: 'blue ink' },
    red: { label: 'Red', phrase: 'red ink' },
    /** The first word of a new drawn signature's name ("Signature, blue ink"). */
    signature: 'Signature',
  },

  library: {
    title: 'Library',
    empty: 'Your saved signatures and initials. The default one goes on the next document you sign.',
    make: 'Make a signature',
    card: (name: string, isDefault: boolean, withInitials: boolean) => `${name}${isDefault ? ', default' : ''}${withInitials ? ', with initials' : ''}`,
    cardHint: 'Opens export, initials, rename, order and delete',
    footer: 'Tap one to export it, add initials, rename it, move it or delete it.',
    export: 'Export',
    exportSub: 'Transparent PNG, on white, Photos, copy',
    makeInitials: 'Make initials',
    redoInitials: 'Redo initials',
    useAsDefault: 'Use as default',
    rename: 'Rename',
    moveUp: 'Move up',
    moveDown: 'Move down',
    deleteTitle: (name: string) => `Delete “${name}”?`,
    deleteBody: 'Its initials go with it. Documents you already signed are not changed.',
  },

  export: {
    transparentPng: 'Transparent PNG',
    pngOnWhite: 'PNG on white',
    jpgOnWhite: 'JPG on white',
    nothing: 'There is nothing to export.',
    /** Added to the file name when the initials are exported ("Jordan, blue ink initials 2026-11-03.png"). */
    initialsFile: 'initials',
    didNotWork: 'That did not work',
    saved: 'Saved.',
    savedTransparent: 'Saved. It has a transparent background.',
    photosOffTitle: 'Photos is off for Signature Maker',
    photosOffBody: 'Allow adding photos in Settings, Signature Maker, Photos. The app only adds images; it never reads your library.',
    savedToPhotos: 'Saved to Photos.',
    savedToPhotosTransparent: 'Saved to Photos. It has a transparent background.',
    copied: 'Copied. Paste it into Mail, Notes or a document.',
    checkerboard: 'Checkerboard',
    onLetter: 'On a letter',
    signature: 'Signature',
    initials: 'Initials',
    checkerCaption: 'The gray squares show where it is clear. On a page or in an email, only the ink shows.',
    fileCaption: 'This is the file as it will be saved.',
    /** The mark's own words stay in English in every language: they are what the file carries. */
    markCaption: ' Your free export is used, so this one carries a small “Made with Signature Maker” mark. Pro removes it.',
    format: 'Format',
    size: 'Size',
    pixels: (w: string, h: string) => `${w} × ${h} px`,
    saveToPhotos: 'Save to Photos',
    copy: 'Copy',
    shareAs: (format: string) => `Share ${format}`,
    preview: (name: string, format: string) => `${name}, ${format}`,
    letterA11y: 'The signature at the foot of a sample letter',
  },

  /** The sample letter on the export screen and the second onboarding screen. */
  letter: {
    greeting: 'Dear Ms. Alvarez,',
    body: 'Thank you for the offer. I have read the terms and I am glad to accept. The signed copy is attached.',
    bodyShort: 'Thank you for the offer. I have read the terms and I am glad to accept.',
    closing: 'Sincerely,',
  },

  documents: {
    title: 'Sign a document',
    intro: 'A lease, an offer letter, a form. Place your signature, then send it back. Nothing is uploaded.',
    openPdf: 'Open a PDF',
    openPdfHint: 'From Files, iCloud Drive or a folder on this iPhone',
    photo: 'A photo',
    photoHint: 'A picture of a form from Photos',
    fromMail: 'From Mail or Files: tap the attachment, tap Share, then choose Signature Maker.',
    recent: 'Signed recently',
    recentEmpty: 'Signed copies show up here. The last 20 are kept.',
    row: (day: string, pages: number, shown: string) => `${day}, ${shown} ${pages === 1 ? 'page' : 'pages'}`,
    openNamed: (name: string) => `Open ${name}`,
    shareNamed: (name: string) => `Share ${name}`,
    removeNamed: (name: string) => `Remove ${name}`,
    removeTitle: (name: string) => `Remove “${name}”?`,
    removeBody: 'It is deleted from this app. Copies you sent are not affected.',
  },

  sign: {
    /** The text stamp's first words when no name has been typed yet. */
    yourName: 'Your name',
    leaveTitle: 'Leave without saving?',
    leaveBody: 'The original document is not changed either way.',
    keepSigning: 'Keep signing',
    leave: 'Leave',
    /** Top right on a multi-page document: "2 of 5". */
    pageCount: (page: number, of: number) => `${page} of ${of}`,
    wholePage: 'Whole page',
    wholePageA11y: 'Show the whole page',
    wholePageHint: 'Pinch or double tap the page to zoom in again',
    dateField: 'Date',
    textField: 'Text',
    dateA11y: 'Date on the page',
    textA11y: 'Text on the page',
    addSignature: 'Add signature',
    addInitials: 'Add initials',
    addDate: 'Add date',
    addText: 'Add text',
    toolSignature: 'Signature',
    toolInitials: 'Initials',
    toolDate: 'Date',
    toolText: 'Text',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    doneSigning: 'Done signing',
    addFirst: 'Add a signature first',
    doneHint: 'Saves a signed copy. The original stays as it is.',
    pickDefault: (name: string) => `${name}, default`,
    makeInitials: 'Make initials',
    newSignature: 'New signature',
    saveAs: 'Save the signed photo as',
    pdfSub: 'Best for sending back',
    jpgSub: 'An image, like the photo',
    smaller: { signature: 'Make the signature smaller', initials: 'Make the initials smaller', date: 'Make the date smaller', text: 'Make the text smaller' } as Record<Kind, string>,
    bigger: { signature: 'Make the signature bigger', initials: 'Make the initials bigger', date: 'Make the date bigger', text: 'Make the text bigger' } as Record<Kind, string>,
    removeSelected: { signature: 'Remove the selected signature', initials: 'Remove the selected initials', date: 'Remove the selected date', text: 'Remove the selected text' } as Record<Kind, string>,
    placedSignature: 'Signature',
    placedInitials: 'Initials',
    placedDate: (text: string) => `Date, ${text}`,
    placedText: (text: string) => `Text, ${text}`,
    placedHint: 'Drag to move. Pull the corner to resize, or use the smaller and bigger buttons.',
    actBigger: 'Make bigger',
    actSmaller: 'Make smaller',
  },

  signed: {
    title: 'Signed.',
    body: (name: string) => `${name} is saved in Documents. The original is unchanged.`,
    thumb: (page: number, name: string) => `Page ${page} of ${name}, signed`,
    sent: 'Sent.',
    sendMail: 'Send in Mail',
    saveFiles: 'Save to Files',
    saveFilesHint: 'Opens the share sheet; choose Save to Files',
    sendBack: 'Send it back',
  },

  settings: {
    title: 'Settings',
    pro: 'Pro',
    proOn: 'Signature Maker Pro is on',
    proName: 'Signature Maker Pro',
    proSub: 'Every pen and font, initials, the date and text, files with no mark',
    help: 'Help',
    support: 'Support',
    supportSub: 'How to make, export and sign',
    emailSupport: 'Email support',
    emailHint: 'Opens Mail with the subject Signature Maker support',
    writeTo: (email: string) => `Write to ${email}.`,
    about: 'About',
    /** The legal line. Its meaning must stay exactly this in every language. */
    legal: 'Signature Maker creates a signature image and places it on your document. It does not verify identity or certify signatures.',
    local: 'No account. Your signatures and documents stay on this iPhone.',
    version: (v: string) => `Version ${v}`,
    deleteAll: 'Delete all signatures and documents',
    deleteAllTitle: 'Delete every signature and signed document?',
    deleteAllBody: 'This empties the library and the Documents list on this iPhone. Files you already sent are not affected.',
    deleted: 'Deleted.',
    counts: (sigs: number, docs: number, sigsShown: string, docsShown: string) =>
      `${sigsShown} saved ${sigs === 1 ? 'signature' : 'signatures'}, ${docsShown} signed ${docs === 1 ? 'document' : 'documents'} on this iPhone.`,
    testing: 'Testing (test builds only)',
    actFree: 'Act as a free user',
    resetFree: 'Make the first export and document free again',
    countersReset: 'Counters reset.',
    replay: 'Show onboarding again',
  },

  /** Purchase and restore results, on the paywall and in Settings. */
  purchase: {
    restore: 'Restore purchases',
    restoring: 'Restoring',
    proOn: 'Pro is on',
    proBack: 'Pro is back on',
    proBody: 'Every pen and font, initials, the date and text, and files with no mark.',
    reminderNote: ' You will get a reminder the day before the trial ends.',
    nothing: 'Nothing to restore',
    nothingBody: 'This Apple ID has no Signature Maker Pro purchase.',
    restoreFailed: 'Restore did not work',
    paidNotShowing: 'Paid, but Pro is not showing',
    paidNotShowingBody: 'The App Store can lag a minute. Tap Restore purchases in a moment and it turns on.',
    failed: 'The purchase did not go through',
  },

  paywall: {
    reasons: {
      export: { title: 'Export without the mark.', line: 'Every format and size, with no corner mark, plus every pen and font.' },
      document: { title: 'Sign every document.', line: 'As many signed PDFs as you need, with no corner mark, plus initials, the date and text.' },
      pen: { title: 'All four pens.', line: 'Marker and Fountain, and all twelve script fonts.' },
      font: { title: 'All twelve script fonts.', line: 'Pick the one closest to your handwriting. All four pens come with it.' },
      initials: { title: 'Initials beside your signature.', line: 'Make them once. They are ready on every document.' },
      stamp: { title: 'Initials, the date and text.', line: 'Fill in the rest of the form on the same page.' },
      pro: { title: 'Signature Maker Pro.', line: 'Exports and signed documents with no mark, every pen and font, initials, the date and text.' },
    },
    /** The headline when the trial is offered: "Sign every document. 3 days free first." */
    withTrial: (title: string, trial: string) => `${title} ${trial[0].toUpperCase()}${trial.slice(1)} first.`,
    closeWithMark: 'Close and continue with the corner mark',
    yourSignature: 'Your signature',
    signatureSaved: 'Your signature is saved.',
    orClose: 'Or close this to save it with a small corner mark. Making and saving signatures is always free.',
    alwaysFree: 'Making and saving signatures is always free.',
    unavailable: 'The App Store did not answer. Try again in a minute.',
    weekly: 'Weekly',
    yearly: 'Yearly',
    lifetime: 'Lifetime, pay once',
    perWeek: (price: string) => `${price} a week`,
    perYear: (price: string, perWeek: string | null) => `${price} a year${perWeek ? `, ${perWeek}` : ''}`,
    once: (price: string) => `${price} once, yours to keep`,
    trialThen: (trial: string, price: string) => `${trial}, then ${price} a week`,
    oneMoment: 'One moment',
    noPayment: 'No payment now',
    terms: 'Terms of Use (EULA)',
    privacy: 'Privacy Policy',
  },

  /**
   * The always-visible subscription disclosure (App Review 3.1.2(c)) and the
   * trial wording. Prices are StoreKit's own strings, passed in as they are.
   * The legal meaning must be identical in every language.
   */
  offer: {
    /** A trial's length: "3 days", "1 week". */
    period: (n: number, unit: Unit) => `${n} ${unit}${n === 1 ? '' : 's'}`,
    /** "3 days free". */
    free: (length: string) => `${length} free`,
    yearly: (price: string) => `Yearly ${price}/year is an auto-renewing subscription billed once a year until cancelled.`,
    weekly: (price: string, trialLength: string | null) =>
      `Weekly ${price}/week is an auto-renewing subscription billed once a week until cancelled${trialLength ? `; it starts with ${trialLength} free and you are not charged until the trial ends` : ''}.`,
    lifetime: (price: string) => `Lifetime ${price} is a one-time purchase, not a subscription.`,
    noPrices: 'Pro is offered as a weekly or yearly auto-renewing subscription, or a one-time lifetime purchase.',
    billing: 'Payment is charged to your Apple ID. Cancel a subscription anytime in your Apple ID settings at least 24 hours before the period ends.',
  },

  welcome: {
    pages: [
      { title: 'Draw a signature that looks like yours.', line: 'The ink follows your hand, with a finger or Apple Pencil.' },
      { title: 'Save it as a transparent PNG.', line: 'Only the ink, ready for an email, Word, Canva or a form.' },
      { title: 'Sign a PDF on your phone.', line: 'Open it from Mail or Files, sign on the line, send it back.' },
    ],
    needTitle: 'What do you need today?',
    needLine: 'You can do both any time. This only picks where you start.',
    needs: {
      document: { label: 'Sign a document', sub: 'A PDF or a photo of a form' },
      image: { label: 'Make a signature image', sub: 'A transparent PNG for email, Word or Canva' },
      both: { label: 'Both', sub: 'Start by making the signature' },
    },
    needA11y: (label: string, sub: string) => `${label}. ${sub}`,
    trialTitle: (length: string) => `Try it free for ${length}.`,
    trialLine: (then: string) => `Then ${then}. Cancel in Settings any time before it ends.`,
    tryFree: 'Try it free',
    today: 'Today',
    todaySub: 'Every pen and font, exports and signed documents with no mark.',
    dayBefore: 'The day before it ends',
    dayBeforeSub: 'One reminder, so nothing surprises you.',
    after: (length: string) => `After ${length}`,
    afterSub: (then: string) => `${then[0].toUpperCase()}${then.slice(1)}. Cancel before then and pay nothing.`,
    remindTitle: 'We’ll remind you the day before it ends.',
    remindLine: 'It is the only notification the app sends.',
  },

  /** The one local notification. */
  reminder: {
    title: 'Your free trial ends tomorrow',
    body: 'Signature Maker Pro renews tomorrow. Cancel anytime in Settings, Apple ID, Subscriptions.',
  },

  /** Messages of errors that end up in an alert. */
  errors: {
    noPages: 'This PDF has no pages.',
    unreadableImage: 'This image could not be read.',
    unwritableImage: 'The image could not be written.',
    noSharing: 'Sharing is not available on this phone.',
    lockedPdf: 'This PDF is locked with a password, so it cannot be signed here.',
    noInk: 'There is no ink to save yet.',
    fontMissing: (font: string) => `Could not load ${font}`,
  },

  /** The onboarding pictures: a signature drawing itself, the PNG and the letter, the foot of a lease. */
  showcase: {
    drawA11y: 'A signature, Jordan Ellis, being drawn in black ink on the signing line',
    exportA11y: 'The same signature as a transparent PNG on a checkerboard, and at the foot of a letter',
    signA11y: 'Page 2 of a lease agreement with the signature on the tenant signature line and today’s date beside it',
    clauses: [
      ['9. Alterations', 'Tenant will not paint, remodel or install fixtures without written consent.'],
      ['10. Notices', 'Notices to Landlord go to 90 Front Avenue, Suite 300. Notices to Tenant go to the residence.'],
      ['11. Entire agreement', 'This is the entire agreement. Any change must be in writing and signed by both parties.'],
    ] as [string, string][],
    tenant: 'Tenant signature',
    landlord: 'Landlord signature',
    date: 'Date',
    footer: 'Residential Lease Agreement, page 2 of 2',
  },
};

export type Strings = typeof en;
