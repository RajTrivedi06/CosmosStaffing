/**
 * Central site configuration: brand, navigation and page copy.
 *
 * Keep brand/content here rather than hard-coding it in pages. Unknown facts
 * (phone, email, rating, reviews, policies) are rendered as visible
 * `[PLACEHOLDER: …]` tokens via the <Placeholder> component. Do not replace
 * them with invented values.
 *
 * Promises still to confirm before launch (some copy states them as fact):
 * insured and background-checked teams, the same team every visit, a free
 * re-clean, cancellation notice, a note after each visit, fair pay, and the
 * number of room checklists. Policy answers that are not yet approved are
 * marked `confirm: true` below and render as placeholders.
 */
export const siteConfig = {
  name: "Cosmos Cleaning",
  shortName: "Cosmos",
  slogan: "Come home to calm.",
  /** The slogan as set in the hero and closing headlines. */
  sloganLines: ["Come home", "to calm."],
  description:
    "Trusted home and office cleaning, on a schedule that runs itself.",
  /**
   * Canonical address for metadata, the sitemap and robots.txt. Set
   * NEXT_PUBLIC_SITE_URL only for an isolated local/preview origin.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://cosmosservicesllc.com",

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
      // Forwarded to the Operations Studio (lib/studio-routes.ts).
      { label: "Terms", href: "/terms" },
      { label: "Client sign-in", href: "/account" },
      { label: "Clean with Cosmos", href: "/clean-with-cosmos" },
      { label: "Cleaner sign-in", href: "/me/login" },
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
    "Dallas. We also coordinate trusted cleaning providers elsewhere in Texas " +
    "and across the United States, after confirming availability and what " +
    "your space needs.",
} as const;

/** Photography in /public/images (4K masters). Wide is desktop, tall is phone. */
export const images = {
  heroWide: { src: "/images/hero-wide.jpg", width: 5504, height: 3072 },
  heroTall: { src: "/images/hero-tall.jpg", width: 3072, height: 5504 },
  hands: { src: "/images/hands.jpg", width: 3311, height: 4096 },
  kitchen: { src: "/images/kitchen.jpg", width: 3223, height: 4008 },
  office: { src: "/images/office.jpg", width: 4096, height: 2294 },
  move: { src: "/images/move.jpg", width: 3223, height: 4008 },
  bath: { src: "/images/bath.jpg", width: 3311, height: 4096 },
  bandWide: { src: "/images/band-wide.jpg", width: 5504, height: 3072 },
  bandTall: { src: "/images/band-tall.jpg", width: 3072, height: 5504 },
  kintsugi: { src: "/images/kintsugi.jpg", width: 3311, height: 4096 },
  homeDayWide: { src: "/images/home-day-wide.jpg", width: 5280, height: 2970 },
  homeDayTall: { src: "/images/home-day-tall.jpg", width: 3072, height: 5504 },
  homeEveWide: { src: "/images/home-eve-wide.jpg", width: 5280, height: 2970 },
  homeEveTall: { src: "/images/home-eve-tall.jpg", width: 3072, height: 5504 },
} as const;

export type SiteImage = (typeof images)[keyof typeof images];

/** Encoding quality for every photo. Must be listed in next.config `qualities`. */
export const PHOTO_QUALITY = 90;

/**
 * Questions answered on the Services page. The home page shows the first few.
 * `confirm: true` marks a draft answer that states a policy the business has
 * not approved yet; it renders as a placeholder for review.
 */
export const faq = [
  {
    q: "How do I get a price?",
    a: "Answer a few questions about your space and schedule. We review them and reply with a personal quote. There is no account to create and no card to enter.",
  },
  {
    q: "Do I need to be home?",
    a: "No. Many clients share a key or door code. Tell us how access works in your quote and we will plan around it.",
  },
  {
    q: "Will it be the same people each time?",
    a: "We aim for the same small team on every regular visit, so they learn your space. Ask for a change any time.",
    confirm: true,
  },
  {
    q: "Do you bring supplies?",
    a: "Yes, including products chosen for your surfaces. Tell us if you prefer your own.",
    confirm: true,
  },
  {
    q: "Do you work outside Austin, Houston, San Antonio and Dallas?",
    a: "Often, yes. Those are our main markets, and we coordinate providers elsewhere in Texas and across the US. Send a quote request with your ZIP code and we will confirm availability.",
  },
  {
    q: "Are the cleaners insured and background-checked?",
    a: "Insurance and background-check policy",
    confirm: true,
  },
  {
    q: "What if something isn't right?",
    a: "Re-clean and satisfaction policy",
    confirm: true,
  },
  {
    q: "Can I pause or cancel?",
    a: "Cancellation and rescheduling notice period",
    confirm: true,
  },
  {
    q: "What about pets?",
    a: "Tell us their names and routines in your quote request and we will plan the visit around them.",
  },
] as const;

export type FaqItem = (typeof faq)[number];

/** The services we offer. Ids match the quote flow's service values. */
export const services = [
  {
    id: "regular",
    title: "Home cleaning",
    short: "Regular care, weekly, every two weeks or monthly.",
    image: "kitchen",
    alt: "A mother and daughter laughing in a bright, spotless kitchen.",
    detail:
      "A steady rhythm of care for the rooms you live in. Your team follows a written checklist for each room and adds your own notes to it, so the details you care about are never left to memory.",
    includes: [
      "Kitchen surfaces, hob, sink and appliance fronts",
      "Bathrooms: toilet, shower, bath, basin and mirrors",
      "Dusting of reachable surfaces and skirting",
      "Floors vacuumed and mopped throughout",
      "Beds made and rooms tidied",
    ],
  },
  {
    id: "deep",
    title: "Deep cleans",
    short:
      "A top-to-bottom reset for a new season, a new baby or a fresh start.",
    image: "bath",
    alt: "A bright limestone bathroom with a white tub and fresh towels.",
    detail:
      "A longer, more detailed visit for homes that need more than upkeep. Good as a first visit before regular cleaning, or once or twice a year.",
    includes: [
      "Everything in a regular clean",
      "Built-up grime, limescale and grease",
      "Inside cupboards, oven and fridge on request",
      "Door frames, switches, vents and high edges",
      "Interior windows on request",
    ],
  },
  {
    id: "move",
    title: "Move-in and move-out",
    short: "Cleans that hand the keys over spotless.",
    image: "move",
    alt: "A couple carrying a large plant into a bright, empty apartment.",
    detail:
      "For empty or nearly empty homes at the start or end of a lease or sale. We plan around your move date and any handover checklist from your landlord or agent.",
    includes: [
      "Inside every cupboard, drawer and wardrobe",
      "Kitchen appliances inside and out",
      "Bathrooms descaled and polished",
      "Floors, skirting and door frames throughout",
      "Your landlord's or agent's checklist, if you share it",
    ],
  },
  {
    id: "office",
    title: "Workplaces",
    short: "Before or after hours, so the workday never stops for us.",
    image: "office",
    alt: "A bright, tidy studio office with people at work.",
    detail:
      "Offices, studios and retail spaces cleaned outside working hours on a schedule that suits you, with one contact for everything.",
    includes: [
      "Desks, shared surfaces and touch points",
      "Kitchens and break rooms",
      "Restrooms cleaned and restocked",
      "Floors vacuumed and mopped",
      "Bins emptied and recycling sorted",
    ],
  },
] as const;

export type ServiceId = (typeof services)[number]["id"];

export const home = {
  hero: {
    lede: siteConfig.description,
    secondaryCta: { label: "See how it works", href: "#how" },
    /** Unconfirmed promises: shown marked for review until approved. */
    trust: ["Insured and background-checked", "Not right? We come back free"],
    say: ["You get on with your day.", "We take care of the rest."],
    alt: "A couple laughing over coffee at a long oak table in a sunlit room, their dog asleep at their feet.",
  },

  how: {
    title: "Set it up once. Then it runs itself.",
    alt: "A cleaner's hands folding a white towel beside a caddy of glass bottles and wooden brushes.",
    steps: [
      {
        title: "Tell us about your space",
        body: "A few quick questions about rooms, pets and timing. We reply with a personal quote.",
      },
      {
        title: "Meet your team",
        body: "The same small team every visit. They learn your home, so you never explain twice.",
        confirm: true,
      },
      {
        title: "Come home to calm",
        body: "We work from your checklist and send a short note when we are done.",
      },
    ],
  },

  services: {
    title: "For homes, workplaces and move days.",
    more: "All services",
    go: "Get a quote",
  },

  workplaces: {
    title: "The office keeps moving. The floor stays calm.",
    body: "We clean before the first meeting or after the last one. One contact, one invoice.",
    /** Unconfirmed: shown marked for review until approved. */
    bodyConfirm: "A team your staff will recognise.",
    cta: "Get a workplace quote",
    href: "/quote?service=office",
    alt: "People with coffee walking through a bright office atrium, softly blurred, over a still, gleaming terrazzo floor.",
  },

  standard: {
    title: "Ordinary work, done with pride.",
    lede: "Every visit follows a written standard, room by room.",
    /** Unconfirmed: shown marked for review until approved. */
    ledeConfirm:
      "Our people are trained, fairly paid and given the time to do it properly, so nothing gets rushed.",
    checklistTitle: "Kitchen, every visit",
    checklist: [
      "Hob and oven front degreased",
      "Inside the microwave wiped",
      "Cabinet fronts and handles",
      "Splashback and counters",
      "Sink and tap polished",
      "Floor vacuumed and mopped",
    ],
    points: [
      {
        title: "Same team, every visit",
        body: "No strangers, no re-explaining. Ask for a change any time.",
        confirm: true,
      },
      {
        title: "A written standard",
        body: "Every room has its own checklist, and your notes are added to it.",
      },
      {
        title: "A note when we leave",
        body: "A short message with anything we noticed, like a dripping tap.",
      },
    ],
  },

  care: {
    title: "We look after what you love.",
    lede: "Oiled oak, natural stone, old brass, a bowl someone mended by hand. We learn what each surface needs and care for it that way, so your things keep their character.",
    points: [
      "Products chosen for each material",
      "Notes kept for every home",
      "We ask before moving anything precious",
    ],
    alt: "A mended kintsugi bowl with gold seams on a polished walnut table in late sun.",
  },

  reviews: {
    title: "Calm, in their words.",
    // Placeholders on purpose: never invent reviews. Use real ones with a
    // first name, neighbourhood and service.
    items: [
      {
        quote: "a real review: a specific change in their week, in their words",
        who: "client name, neighbourhood",
        service: "Homes",
      },
      {
        quote: "a real review: why they trusted the team with their keys",
        who: "client name, neighbourhood",
        service: "Homes",
      },
      {
        quote: "a real review: an office manager on reliability",
        who: "name, company",
        service: "Workplaces",
      },
    ],
  },

  pricing: {
    title: "A price made for your space.",
    lede: "Every home and workplace is different, so we don't publish one-size prices. Answer a few questions and we'll prepare a quote for yours.",
    micro: "A few questions. No account, no card.",
  },

  evening: {
    title: "Welcome home.",
    body: "Thursday, seven o’clock. Shoes off, feet up, and nothing left to clean.",
    alt: "A mother and her young son laughing under a blanket on the sofa at dusk, lamps glowing, their dog asleep at their feet.",
  },

  faq: {
    title: "Before you book.",
    count: 5,
    more: "More questions",
  },

  close: {
    micro: "A few questions. No account, no card.",
  },
} as const;

export const servicesPage = {
  title: "Cleaning, arranged properly.",
  lede: "Homes, workplaces and move days. Tell us what the space needs and we take care of the rest, from the first question to the follow-up.",
  process: {
    title: "How we work",
    steps: [
      {
        title: "We assess what you need",
        body: "Your quote answers tell us the size, condition, timing and anything special about the space. If something is unclear we ask, and for larger or unusual jobs we may suggest a walkthrough first.",
      },
      {
        title: "We coordinate the right team",
        body: "We match your job with a cleaning team suited to the space, the schedule and your location, and confirm availability before anything is booked.",
      },
      {
        title: "We manage the work",
        body: "You have one point of contact. We agree the checklist, share it with the team, and handle scheduling, access notes and any changes you ask for.",
      },
      {
        title: "We follow up",
        body: "After the visit we check in. If anything was missed, tell us and we will put it right.",
      },
    ],
  },
  coverageTitle: "Where we work",
  faqTitle: "Questions",
  termsTitle: "Terms and conditions",
  termsBody:
    "Our full terms cover quotes, scheduling, access, cancellations and payment.",
  /** The Operations Studio serves the terms (lib/studio-routes.ts). */
  termsHref: "/terms",
} as const;

/**
 * Cleaner recruitment. The application, sign-in, agreements, statuses and the
 * cleaner portal all belong to the Operations Studio. This site explains the
 * opportunity and links into the Studio; it never collects cleaner details
 * (no form, no table, no uploads, no "leave your number").
 *
 * Copy follows the Studio's `docs/product/cleaner-onboarding.md`. Anything
 * not documented and approved renders as a placeholder.
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

  /** Phone number and texted code. Cleaners only; staff sign in elsewhere. */
  signIn: {
    label: "Cleaner sign-in",
    href: "/me/login",
    note: "Already onboarded? Open your cleaner portal with your phone number and a texted code.",
  },

  /** Staff-led onboarding; the private questionnaire requires no password. */
  expect: [
    {
      title: "Start with our team",
      body: "Our team helps you through onboarding or sends a private link to your questionnaire. Keep that link private; it is just for you.",
    },
    {
      title: "No password to complete your questionnaire",
      body: "Open your invitation link to answer the onboarding questions. For the cleaner portal and signing documents, verify your phone number with a texted code.",
    },
    {
      title: "What we ask",
      body: "The cleanings you do, where in Texas you work and up to 12 ZIP codes, when you're usually free, how you get to jobs, whether you bring supplies, the languages you speak, your experience, and an emergency contact.",
    },
    {
      title: "How you'd be paid",
      body: "Choose Zelle, Cash App, Venmo or check. The questionnaire never asks for account numbers. A business name and EIN are optional.",
    },
    {
      title: "After your questionnaire",
      body: "Verify your phone number to access the portal, agree to receive documents electronically, and sign the Cleaner Agreement. Job offers start only once our team has completed your review and your profile is active.",
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

  /** Documented decision (Raj, 2026-10-20); the scope is not yet written. */
  insurance: "You don't need your own insurance to apply.",
  insurancePending:
    "what Cosmos's company insurance covers for independent cleaners",

  /** Not decided or not live yet: shown as placeholders, never guessed. */
  pending: [
    "pay rates and earnings",
    "how long a review takes",
    "background checks (not live yet)",
    "how much work to expect",
    "payout timing and process",
  ],
  pendingTitle: "Still to confirm",

  /** Plain statement of the relationship; the agreement holds the terms. */
  independent:
    "You'd work with Cosmos as an independent cleaner, not an employee; the Cleaner Agreement sets out how we work together. Applying doesn't guarantee approval or work.",

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
  },
  reset: {
    title: "Choose a new password",
    submit: "Save new password",
    expired:
      "This reset link has expired or was already used. Ask for a new one.",
  },
  reasons: {
    signin_required: "Sign in to continue.",
    session_expired: "Your session ended. Sign in again to continue.",
    wrong_account:
      "This link belongs to a different account. Sign in with the account that received it.",
    link_expired:
      "That link has expired or was already used. Sign in, or ask for a new link.",
    signed_out: "You've signed out.",
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
  },
  quote: {
    title: "Create an account to send",
    body: "Sending a request needs a Cosmos account. You'll confirm your email once; your answers are saved on this device while you do.",
    create: "Create account",
    signIn: "Sign in",
    signedInAs: "Sending as",
    backToAccount: "My account",
    sessionEnded:
      "Your session ended before we could send this. Sign in again; your answers are saved.",
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
  },
} as const;
