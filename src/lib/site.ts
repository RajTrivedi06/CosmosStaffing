/**
 * Central site configuration: brand, navigation and page copy.
 *
 * Keep brand/content here rather than hard-coding it in pages. Anything the
 * business hasn't confirmed stays off the site, and never ships as a marked
 * draft: no ratings or reviews, background checks, response times, insurance,
 * re-cleans, cancellation rights, assigned cleaners, supplies, payout terms or
 * automated scheduling. Open items are tracked in docs/launch-cutover.md.
 */
export const siteConfig = {
  name: "Cosmos Cleaning",
  shortName: "Cosmos",
  slogan: "Come home to calm.",
  /** The slogan as set in the hero and closing headlines. */
  sloganLines: ["Come home", "to calm."],
  description:
    "Home and office cleaning. Our team coordinates scheduling with you.",
  /**
   * Canonical address for metadata, the sitemap and robots.txt. Set
   * NEXT_PUBLIC_SITE_URL only for an isolated local/preview origin.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://cosmosgroupusa.com",

  /**
   * Header navigation. Home sections use `/#id` so the links also work from
   * other pages; on the home page they glide in place (see LenisProvider).
   */
  nav: [
    { label: "How it works", href: "/#how" },
    { label: "Services", href: "/services" },
    { label: "Workplaces", href: "/#workplaces" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Questions", href: "/#faq" },
  ],

  primaryCta: { label: "Get my price", href: "/quote" },
  contactCta: { label: "Contact us", href: "/contact" },

  /** Confirmed by Raj, 2026-10-30. */
  contact: {
    email: "info@cosmosgroupusa.com",
  },

  footer: {
    services: [
      { label: "Home cleaning", href: "/services#regular" },
      { label: "Workplaces", href: "/services#office" },
      { label: "Move-in and move-out", href: "/services#move" },
      { label: "Deep cleans", href: "/services#deep" },
    ],
    company: [
      { label: "How it works", href: "/#how" },
      { label: "How we work", href: "/services#process" },
      { label: "Questions", href: "/services#faq" },
      { label: "Client sign-in", href: "/account" },
      { label: "Clean with Cosmos", href: "/clean-with-cosmos" },
    ],
  },
} as const;

/**
 * Where we work. Texas is the home market; requests from anywhere in the US
 * are welcome and confirmed case by case. Never reject a location outright.
 */
export const coverage = {
  state: "Texas",
  cities: ["Austin", "Houston", "San Antonio", "Dallas"],
  summary:
    "We're based in Texas and work most in Austin, Houston, San Antonio and " +
    "Dallas. We also coordinate cleaning providers elsewhere in Texas " +
    "and across the United States, after confirming availability and what " +
    "your space needs.",
} as const;

/** Photography in /public/images (4K masters). Wide is desktop, tall is phone. */
export const images = {
  /** A warm, modern office that still feels like home: desktop and phone. */
  heroWide: {
    src: "/images/hero-office-day-wide.jpg",
    width: 3840,
    height: 2160,
  },
  heroTall: {
    src: "/images/hero-office-day-tall.jpg",
    width: 2160,
    height: 3840,
  },
  hands: { src: "/images/hands.jpg", width: 3311, height: 4096 },
  kitchen: { src: "/images/kitchen.jpg", width: 3223, height: 4008 },
  office: { src: "/images/office.jpg", width: 4096, height: 2294 },
  move: { src: "/images/move.jpg", width: 3223, height: 4008 },
  bath: { src: "/images/bath.jpg", width: 3311, height: 4096 },
  bandWide: { src: "/images/band-wide.jpg", width: 5504, height: 3072 },
  bandTall: { src: "/images/band-tall.jpg", width: 3072, height: 5504 },
  kintsugi: { src: "/images/kintsugi.jpg", width: 3311, height: 4096 },
  homeDayWide: { src: "/images/home-day-wide.jpg", width: 5280, height: 2970 },
  homeEveWide: { src: "/images/home-eve-wide.jpg", width: 5280, height: 2970 },
} as const;

export type SiteImage = (typeof images)[keyof typeof images];

/** Encoding quality for every photo. Must be listed in next.config `qualities`. */
export const PHOTO_QUALITY = 90;

/**
 * Questions answered on the Services page. The home page shows the first few.
 */
export const faq = [
  {
    q: "How do I get a price?",
    a: "Answer a few questions about your space and schedule. You'll create an account to send your request, then we review it and reply with a personal quote confirming the scope, location and schedule. There's no card to enter.",
  },
  {
    q: "Do I need to be home?",
    a: "Tell us how access works in your request, and our team will coordinate it with you.",
  },
  {
    q: "Do you work outside Austin, Houston, San Antonio and Dallas?",
    a: "Those are our main markets. Send a request with your ZIP code, and our team will confirm availability.",
  },
  {
    q: "What if something isn't right?",
    a: "Contact Cosmos about a service concern.",
  },
  {
    q: "What about pets?",
    a: "Tell us about them in your request, and our team will take them into account.",
  },
] as const;

export type FaqItem = (typeof faq)[number];

/** Shown beside any list of tasks: the quote doesn't itemize them. */
const TASKS_CONFIRMED =
  "Tell us which tasks matter to you. Our team will confirm what's included before scheduling.";

/**
 * The services we offer. Ids match the quote flow's service values. `includes`
 * lists examples of what a cleaning can include, never a promise of everything
 * on it; `onRequest` lists tasks a client can ask for and Cosmos must confirm.
 */
export const services = [
  {
    id: "regular",
    title: "Home cleaning",
    cta: "Get a home cleaning quote",
    short: "Regular care you can request weekly, every two weeks or monthly.",
    image: "kitchen",
    alt: "A mother and daughter laughing in a bright kitchen.",
    detail:
      "Regular care for the rooms you live in. Request weekly, every-two-weeks or monthly cleaning and tell us what matters most. Cosmos confirms the scope, location and schedule in your quote.",
    includes: [
      "Kitchen counters, stovetop, sink and appliance fronts",
      "Bathroom toilets, showers, tubs, sinks and mirrors",
      "Dusting reachable surfaces and baseboards",
      "Vacuuming and mopping floors",
      "Making beds and tidying rooms",
    ],
    onRequest: ["Oven and refrigerator interiors", "Interior windows"],
  },
  {
    id: "deep",
    title: "Deep cleans",
    cta: "Get a deep clean quote",
    short:
      "A more detailed reset for a new season, a new baby or a fresh start.",
    image: "bath",
    alt: "A bright limestone bathroom with a white tub and fresh towels.",
    detail:
      "A longer, more detailed visit for homes that need more than upkeep. Good as a first visit before regular cleaning, or once or twice a year.",
    includes: [
      "Regular cleaning tasks, in more detail",
      "Built-up grime, hard-water stains and grease",
      "Door frames, light switches, vents and high edges",
    ],
    onRequest: [
      "Inside cabinets",
      "Oven and refrigerator interiors",
      "Interior windows",
    ],
  },
  {
    id: "move",
    title: "Move-in and move-out",
    cta: "Get a move-in and move-out quote",
    short: "For empty or nearly empty homes when you move.",
    image: "move",
    alt: "A couple carrying a large plant into a bright, empty apartment.",
    detail:
      "For empty or nearly empty homes at the start or end of a lease or sale. Tell us your move date and share any move-out checklist from your landlord or property manager, and our team coordinates the details with you.",
    includes: [
      "Inside cabinets, drawers and closets",
      "Kitchen appliance exteriors",
      "Bathroom fixtures, tile and mirrors",
      "Floors, baseboards and door frames",
    ],
    onRequest: [
      "Oven and refrigerator interiors",
      "Interior windows",
      "Items from your landlord's or property manager's move-out checklist",
    ],
  },
  {
    id: "office",
    title: "Workplaces",
    cta: "Get a workplace quote",
    short: "Offices, studios and retail spaces.",
    image: "office",
    alt: "A bright, tidy studio office with people at work.",
    detail:
      "For offices, studios and retail spaces. Cosmos confirms the scope, location and schedule in your quote.",
    includes: [
      "Desks, shared surfaces and touch points",
      "Kitchens and break rooms",
      "Restrooms",
      "Vacuuming and mopping floors",
      "Emptying trash and sorting recycling",
    ],
    onRequest: [],
  },
] as const;

export type ServiceId = (typeof services)[number]["id"];

export const home = {
  hero: {
    lede: siteConfig.description,
    secondaryCta: { label: "See how it works", href: "#how" },
    /** Set in two lines each, like the headline they replace. */
    say: [
      ["You get on", "with your day."],
      ["We take care", "of the rest."],
    ],
    alt: "Colleagues talking and laughing over laptops at a walnut table in a bright, plant-filled office, with a rust velvet sofa in the lounge corner and a colleague working at a desk behind.",
  },

  how: {
    title: "How it works.",
    alt: "A cleaner's hands folding a white towel beside a caddy of glass bottles and wooden brushes.",
    steps: [
      {
        title: "Tell us about your space",
        body: "A few quick questions about rooms, pets and timing. We reply with a personal quote.",
      },
      {
        title: "Agree on the details",
        body: "Cosmos confirms the scope, location and schedule in your quote.",
      },
      {
        title: "Come home to calm",
        body: "We work to the scope in your quote.",
      },
    ],
  },

  services: {
    title: "For homes, workplaces and move days.",
    more: "All services",
    go: "Get a quote",
    choose: "Choose a service",
    includes: "A cleaning can include",
  },

  workplaces: {
    title: "The office keeps moving. The floor stays calm.",
    body: "Our team coordinates scheduling with you.",
    cta: "Get a workplace quote",
    href: "/quote?service=office",
    alt: "People with coffee walking through a bright office atrium, softly blurred, over a still, gleaming terrazzo floor.",
  },

  standard: {
    title: "Ordinary work, done with pride.",
    lede: "Cosmos confirms the scope, location and schedule in your quote, and our team coordinates the details with you.",
    checklistTitle: "Example: what a kitchen cleaning can include",
    checklist: [
      "Degreasing the stovetop and oven door",
      "Wiping out the microwave",
      "Cabinet fronts and handles",
      "Backsplash and counters",
      "Sink and faucet",
      "Vacuuming and mopping the floor",
    ],
    confirm: TASKS_CONFIRMED,
  },

  care: {
    title: "We look after what you love.",
    lede: "Oiled oak, natural stone, old brass, a bowl someone mended by hand. Tell us what needs special care when you send your request.",
    points: [
      "Add notes to your request",
      "Our team reviews them with your quote",
    ],
    alt: "A mended kintsugi bowl with gold seams on a polished walnut table in late sun.",
  },

  pricing: {
    title: "A price made for your space.",
    lede: "Every home and workplace is different, so we don't publish one-size prices. Answer a few questions and we'll prepare a quote for yours.",
    micro: "Start with a few questions about your space. No card needed.",
  },

  evening: {
    title: "Welcome home.",
    body: "Thursday, seven o’clock. Shoes off, feet up, and nothing left to clean.",
    alt: "A mother and her young son laughing under a blanket on the sofa at night, lamps glowing, their dog asleep at their feet.",
  },

  faq: {
    title: "Before you book.",
    count: 5,
    more: "More questions",
  },

  close: {
    micro: "Start with a few questions about your space. No card needed.",
  },
} as const;

export const servicesPage = {
  title: "Cleaning, arranged properly.",
  lede: "Homes, workplaces and move days. Tell us what the space needs, and our team coordinates scheduling with you.",
  process: {
    title: "How we work",
    steps: [
      {
        title: "We assess what you need",
        body: "Your quote answers tell us the size, condition, timing and anything special about the space. If something is unclear we ask.",
      },
      {
        title: "We coordinate the right team",
        body: "We arrange the cleaning and confirm availability before anything is booked.",
      },
      {
        title: "We manage the work",
        body: "Cosmos confirms the scope, location and schedule in your quote. Our team coordinates scheduling with you.",
      },
      {
        title: "After the visit",
        body: "Contact Cosmos about a service concern.",
      },
    ],
  },
  includesTitle: "A cleaning can include",
  onRequestTitle: "Tasks you can request",
  confirm: TASKS_CONFIRMED,
  coverageTitle: "Where we work",
  faqTitle: "Questions",
} as const;

/**
 * Cleaner recruitment. The application, sign-in, agreements, statuses and the
 * cleaner portal all belong to the Operations Studio. This site explains the
 * opportunity and links into the Studio; it never collects cleaner details
 * (no form, no table, no uploads, no "leave your number").
 *
 * Copy follows the Studio's `docs/product/cleaner-onboarding.md`. Anything
 * not documented and approved stays off the page.
 */
export const cleaners = {
  path: "/clean-with-cosmos",
  label: "Clean with Cosmos",
  title: "Clean with Cosmos.",
  lede: "We work with independent cleaners across Texas who take pride in calm, careful work. Our team guides onboarding or sends you a private invitation link.",

  apply: {
    /**
     * Public applications are unavailable. Staff-led/private invitation
     * onboarding is the supported workflow. Enable only if Studio confirms
     * a public route and both allowlists are updated; never share an invite.
     */
    available: false,
    href: "/apply",
    label: "Cleaner onboarding",
    pending:
      "Public applications are not available. If our team has invited you, use your private invitation link. Otherwise, contact us to discuss the opportunity.",
  },

  /**
   * Phone number and texted code. Cleaners only; staff sign in elsewhere.
   * Nothing here shows until the hosted SMS flow is verified; set `available`
   * then, and the link, the note and the step all publish together.
   */
  signIn: {
    available: false,
    label: "Cleaner sign-in",
    href: "/me/login",
    note: "Already onboarded? Open your cleaner portal with your phone number and a texted code.",
    step: {
      title: "Your cleaner portal",
      body: "For the cleaner portal and signing documents, verify your phone number with a texted code.",
    },
  },

  /** Staff-led onboarding; the private questionnaire requires no password. */
  expect: [
    {
      title: "Start with our team",
      body: "Our team helps you through onboarding or sends a private link to your questionnaire. Keep that link private; it is just for you.",
    },
    {
      title: "No password to complete your questionnaire",
      body: "Open your invitation link to answer the onboarding questions.",
    },
    {
      title: "What we ask",
      body: "The cleanings you do, where in Texas you work and up to 12 ZIP codes, when you're usually free, how you get to jobs, whether you bring supplies, the languages you speak, your experience, and an emergency contact.",
    },
    {
      title: "Payment method",
      body: "The questionnaire asks how you'd prefer to be paid. It never asks for account numbers. A business name and EIN are optional.",
    },
    {
      title: "After your questionnaire",
      body: "Our team guides you through the electronic documents and the Cleaner Agreement, which sets out how we work together. Job offers start only once our team has completed your review and your profile is active.",
    },
  ],

  /** Texas areas, matching the application's choices. */
  areas: [
    "Austin",
    "Dallas–Fort Worth",
    "San Antonio",
    "Houston",
    "Elsewhere in Texas",
  ],
  areasTitle: "Where",

  /** The opportunity in plain words; the agreement holds the terms. */
  independent:
    "This is an opportunity for independent cleaners. The Cleaner Agreement sets out how we work together. Onboarding doesn't guarantee approval or work.",

  /** The home page's short version of this section. */
  teaser: {
    title: "Clean with Cosmos.",
    body: "Independent cleaners across Texas: learn about working with Cosmos and our staff-led onboarding process.",
    more: "What to expect",
  },
} as const;

export const contactPage = {
  title: "Talk to us",
  lede: "Questions before you book, a larger project, or something the quote doesn't cover. We're happy to help.",
  /** Two separate paths: clients asking for a cleaning, cleaners applying. */
  actions: {
    title: "How can we help?",
    clients: {
      title: "Request a cleaning",
      body: "Tell us about your space and timing, and we'll reply with a personal quote. A request is not a booking until we confirm it.",
      label: "Get a quote",
    },
    cleaners: {
      title: "Clean with Cosmos",
      body: "For independent cleaners in Texas. Learn about the opportunity and onboarding with our team or through a private invitation.",
    },
  },
} as const;

/**
 * Client accounts: email and password, with the email confirmed once at
 * sign-up (see lib/account). An account lets a client send a quote request
 * and, once the Studio connects its records, follow their requests, quotes,
 * visits and payments. Nothing here promises a booking.
 */
export const account = {
  path: "/account",
  label: "My account",
  signInLabel: "Client sign-in",

  privacy: {
    checking: "Checking your account…",
    unconfirmed: "We couldn't confirm your account. Check your connection.",
    retry: "Try again",
  },
  signIn: {
    title: "Sign in",
    lede: "Sign in to your Cosmos account.",
    submit: "Sign in",
    forgot: "Forgot your password?",
    noAccount: "New to Cosmos?",
    create: "Create an account",
  },
  signUp: {
    title: "Create your account",
    lede: "One account for your requests and quotes. You'll confirm your email once, then sign in with your password.",
    submit: "Create account",
    haveAccount: "Already have an account?",
    passwordHint: "At least 8 characters.",
  },
  checkEmail: {
    title: "Check your email",
    body: "We sent a confirmation link to",
    next: "Open it to finish creating your account. You'll be signed in and brought straight back.",
    sameDevice:
      "Open the link on this device to keep your quote answers. They're saved here, not in the link.",
    resend: "Send the link again",
    resent: "We sent a new link. It can take a minute to arrive.",
    existing:
      "If this email already has an account, no new link is sent: sign in, or reset your password.",
  },
  forgot: {
    title: "Reset your password",
    lede: "Enter your account email and we'll send you a link to choose a new password.",
    submit: "Send reset link",
    sent: "If an account exists for that email, we've sent a link to reset the password. It can take a minute to arrive.",
    sentTitle: "Check your email",
    back: "Back to sign in",
  },
  reset: {
    title: "Choose a new password",
    submit: "Save new password",
    expired:
      "This reset link has expired or was already used. Ask for a new one.",
    linkRequired:
      "To change your password, we'll email you a secure link first. Open it within an hour, on this device.",
    samePassword: "Choose a password you haven't used for this account.",
  },
  reasons: {
    signin_required: "Sign in to continue.",
    session_expired: "Your session ended. Sign in again to continue.",
    wrong_account:
      "This link belongs to a different account. Sign in with the account that received it.",
    link_expired:
      "That link has expired or was already used. Sign in, or ask for a new link.",
    signed_out: "You've signed out.",
    signed_out_local:
      "You've signed out in this browser. We couldn't confirm server-side session revocation.",
    password_updated: "Your password has been changed.",
  },
  home: {
    title: "Your account",
    signedInAs: "Signed in as",
    newRequest: "New request",
    signOut: "Sign out",
    sections: {
      quotes: "Quotes to review",
      requests: "Your requests",
      upcoming: "Upcoming cleanings",
      completed: "Completed cleanings",
      payments: "Payments",
    },
    empty: {
      quotes: "No quotes waiting for you.",
      requests: "No requests yet.",
      upcoming: "No cleanings scheduled.",
      completed: "No completed cleanings yet.",
      payments: "No payments yet.",
    },
    notConnected: {
      title: "Your history isn't shown here yet",
      body: "We're connecting accounts to our records. Until then, we'll reply to requests and send quotes by email, as usual.",
    },
    unavailable: {
      title: "We couldn't load your account details",
      body: "Please try again in a moment. Nothing about your requests has changed.",
    },
    // From the Studio's customer records (lib/account/records.ts).
    rejected: {
      title: "Please sign in again",
      body: "We couldn't confirm your session with our records. Sign in again to see your requests.",
      action: "Sign in again",
    },
    unverified: {
      title: "Confirm your email to see your requests",
      body: "Open the confirmation link we emailed you, then come back here.",
    },
    noRequests: "You haven't sent a request from this account yet.",
    quotesIncomplete:
      "Some quotes couldn't be loaded here. Open a request to see its quotes.",
    older: "Older requests",
    newest: "Newest requests",
  },
  request: {
    back: "Back to my account",
    answers: "What you asked for",
    quotes: "Quotes",
    noQuotes: "No quotes sent yet.",
    payments: "Payments",
    noPayments: "No payment requests.",
    paymentArranged: "We'll arrange payment with you directly.",
    moreQuotes: "Only the latest 50 quotes are shown.",
    morePayments: "Only the latest 50 payment requests are shown.",
    notFound: {
      title: "We couldn't find that request",
      body: "It may not exist, or it may belong to a different account. Check you're signed in with the right email.",
    },
  },
  quote: {
    title: "Create an account to continue",
    body: "Next we'll ask where and when, and how to reach you. Those details need a Cosmos account. You'll confirm your email once; the choices above are saved on this device while you do.",
    create: "Create account",
    signIn: "Sign in",
    signedInAs: "Sending as",
    backToAccount: "My account",
    sessionEndedTitle: "Please sign in again",
    sessionEnded:
      "Your session ended before we could confirm this request. For your privacy, its answers leave this browser now. We'll keep its reference so you can check on it once you're back.",
    sessionEndedAction: "Sign in again",
    temporarilyUnavailable:
      "Sending isn't available for the moment. Your answers are still here and your request ID is kept, so trying again can't create a duplicate. Please try again in a few minutes, or contact us.",
    // Only this attempt's ID is left in the browser (lib/quote-store.ts).
    unresolvedTitle: "We couldn't confirm an earlier request",
    unresolved:
      "It may already be with us, or it may not have reached us; we can't tell from here, so nothing else has been sent. Check your account, or contact us with the reference below. Only start a separate request if you're sure you want another one.",
    unresolvedReference: "Reference",
    unresolvedAccount: "Check my account",
    // Signed-in client: answers and attempts belong to one account.
    adoptTitle: "You started a request before signing in",
    adoptBody:
      "These answers were entered in this browser while signed out. Use them for this account, or start fresh.",
    adopt: "Use these answers",
    discard: "Start fresh",
    pendingAttempt:
      "An earlier request from this account hasn't been confirmed yet. Send it again (it won't be duplicated), or contact us.",
    switchedTitle: "This browser's account changed",
    switched:
      "A different account is signed in here now, so this request wasn't sent. Its answers stay with the account that wrote them.",
    reload: "Continue",
    unverified:
      "Confirm your email address before sending. Check your inbox for the confirmation link; your answers are saved.",
    followInAccount:
      "You can follow it in your account. Our team arranges scheduling and payment with you directly.",
  },
  errors: {
    credentials: "That email and password don't match an account.",
    unconfirmed:
      "Confirm your email before signing in. We can send the link again.",
    weakPassword: "Choose a password of at least 8 characters.",
    email: "Enter a valid email address.",
    rateLimited:
      "Too many attempts. Please wait a few minutes before trying again.",
    unavailable:
      "Sign-in isn't available right now. Please try again in a moment.",
    off: "Client accounts aren't open yet. You can still contact us directly.",
    captcha: "Complete the security check, then try again.",
    captchaUnavailable:
      "The security check didn't load. Check your connection, or try another browser.",
    captchaScript: "This form needs JavaScript for its security check.",
    captchaPending: "Running a quick security check…",
    interrupted: {
      title: "We couldn't confirm the result",
      body: "Please wait a few minutes, then return to the form. If you asked for an email, check your inbox first.",
      action: "Return to the form",
    },
  },
} as const;
