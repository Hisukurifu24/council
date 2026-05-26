"use client";

import * as React from "react";

export type Locale = "en" | "it";

export const LOCALES: Locale[] = ["en", "it"];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  it: "Italiano",
};

const STRINGS: Record<Locale, Record<string, string>> = {
  en: {
    // Common
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.continue": "Continue",
    "common.delete": "Delete",
    "common.back": "Back",
    "common.you": "you",
    "common.apply": "Apply",
    "common.dismiss": "Dismiss",
    "common.pleaseWait": "Please wait…",
    "common.unexpectedError": "Unexpected error.",
    "common.unexpectedErrorWith": "Unexpected error: {msg}",
    "common.formError": "Please check the form.",

    // Brand
    "brand.title": "Council",
    "brand.subtitle": "D&D Session Planner",

    // Time slots
    "timeSlot.morning": "Morning",
    "timeSlot.afternoon": "Afternoon",
    "timeSlot.evening": "Evening",

    // Status
    "status.available": "Available",
    "status.maybe": "Maybe",
    "status.unavailable": "Unavailable",
    "status.cantMakeIt": "Can't make it",
    "status.noResponse": "No response",
    "status.notSet": "not set",

    // Layout
    "layout.toggleTheme": "Toggle theme",
    "layout.home": "Home",
    "layout.invite": "Invite",
    "layout.settings": "Settings",

    // Landing
    "landing.myCampaigns": "My campaigns",
    "landing.tagline": "Find the night the whole party can play",
    "landing.title.line1": "Stop herding cats in",
    "landing.title.discord": "Discord.",
    "landing.subtitle":
      "Everyone taps their availability across the next few weeks and Council instantly surfaces the best session time. No spreadsheets — just a quick sign-in so your campaigns follow you.",
    "landing.create": "Create a campaign",
    "landing.join": "Join with a code",
    "landing.feature.instantTitle": "Instant",
    "landing.feature.instantDesc":
      "Tap to mark a slot. Scores update live across every device.",
    "landing.feature.smartTitle": "Smart",
    "landing.feature.smartDesc":
      "Best / backup picks computed from real attendance.",
    "landing.feature.frictionlessTitle": "Frictionless",
    "landing.feature.frictionlessDesc":
      "Share a link or QR. Players sign in and start tapping.",
    "landing.joinModalTitle": "Join a campaign",
    "landing.invitePlaceholder": "Invite code (e.g. K7P2QX)",
    "landing.gotLink": "Got a link instead? Just open it — it takes you straight in.",

    // Dashboard
    "dashboard.title": "My campaigns",
    "dashboard.new": "New campaign",
    "dashboard.join": "Join",
    "dashboard.empty.title": "No campaigns yet",
    "dashboard.empty.desc":
      "Create one in seconds, then share the link with your party to start collecting availability.",
    "dashboard.players": "{n} players",
    "dashboard.booked": "{n} booked",

    // Create
    "create.title": "New campaign",
    "create.name": "Campaign name",
    "create.namePlaceholder": "Storm King's Thunder",
    "create.minPlayers": "Minimum players for a session",
    "create.minPlayersDesc":
      "How many players (not counting you, the DM) must be available before a day counts as a viable session.",
    "create.decrease": "Decrease",
    "create.increase": "Increase",
    "create.notes": "Notes (optional)",
    "create.notesPlaceholder": "Bring snacks. We resume at the Sunless Citadel.",
    "create.datesHint":
      "Dates are filled in automatically — the next 5 weeks, morning / afternoon / evening. Everyone just marks their availability.",
    "create.cta": "Create campaign",

    // Campaign
    "campaign.title": "Campaign",
    "campaign.notFound": "We couldn't find a campaign for code {code}.",
    "campaign.backHome": "Back home",
    "campaign.joinTitle": "Join this campaign",
    "campaign.joinAs": "You'll join as {name}.",
    "campaign.joinCta": "Join campaign",
    "campaign.minPlayersTitle": "Min players per session",
    "campaign.minPlayersDesc":
      "Available players (excluding you) needed to flag a viable day.",
    "campaign.rename.title": "Campaign name",
    "campaign.rename.cta": "Rename",
    "campaign.rename.modal": "Rename campaign",
    "campaign.openPlanner": "Open availability planner",
    "campaign.bookedSessions": "Booked sessions",
    "campaign.confirmed": "Confirmed",
    "campaign.locked": "Locked",
    "campaign.party": "Party ({n})",
    "campaign.inviteShort": "+ Invite",
    "campaign.deleteTitle": "Delete campaign",
    "campaign.deleteDesc":
      "Permanently removes this campaign and everyone's availability. This can't be undone.",
    "campaign.deleteConfirmTitle": "Delete campaign?",
    "campaign.deleteConfirmDesc":
      "This permanently deletes {name} and all of its availability and booked sessions for everyone. This can't be undone.",
    "campaign.deleteCta": "Delete campaign",

    // Plan
    "plan.title": "Planner",
    "plan.notFound": "Campaign not found.",
    "plan.joinTitle": "Join to start marking",
    "plan.legend.hint": "Tap to cycle · hold & drag to paint:",
    "plan.empty":
      "Mark a few slots and recommendations will appear here.",
    "plan.responded": "{a}/{b} responded",
    "plan.footer":
      "Numbers show players available (+maybe). A check marks days with at least {n} {playerLabel} free; the crown marks the best slot.",
    "plan.footer.dmHint": " The DM confirms the final session.",
    "plan.player": "player",
    "plan.players": "players",
    "plan.confirmModal.title": "Confirm this session?",
    "plan.confirmModal.available": "{n} available",
    "plan.confirmModal.maybe": " (+{n} maybe)",
    "plan.confirmModal.notesPlaceholder": "Notes for the party (optional)",
    "plan.confirmCta": "Confirm session",

    // Session
    "session.title": "Session",
    "session.notFound": "Session not found.",
    "session.whoVoted": "Who voted what",
    "session.noNotes": "No notes added.",
    "session.backToPlanner": "Back to planner",
    "session.cancelYes": "Yes, cancel session",
    "session.cancelKeep": "Keep it",
    "session.cancelCta": "Cancel session",

    // Settings
    "settings.title": "Settings",
    "settings.logout": "Log out",
    "settings.appearance": "Appearance",
    "settings.appearanceDesc": "Dark mode is on by default.",
    "settings.language": "Language",
    "settings.languageDesc": "Choose your preferred language.",
    "settings.localData": "Local data",
    "settings.localDataDesc":
      "Reset clears the campaigns this device remembers. Shared campaigns stay on the server — you can rejoin them with the invite link.",
    "settings.confirmReset": "Confirm reset",
    "settings.reset": "Reset local data",
    "settings.footer": "Council · D&D Session Planner · v0.1",

    // Auth
    "auth.signIn": "Sign in",
    "auth.signupTitle": "Create your account",
    "auth.loginTitle": "Welcome back",
    "auth.signupSub":
      "Just an email and password — so your campaigns follow you.",
    "auth.loginSub": "Log in to see your campaigns.",
    "auth.displayName": "Display name",
    "auth.displayNamePlaceholder": "Dungeon Master",
    "auth.email": "Email",
    "auth.emailPlaceholder": "you@example.com",
    "auth.password": "Password",
    "auth.passwordPlaceholder": "••••••",
    "auth.createAccount": "Create account",
    "auth.logIn": "Log in",
    "auth.toLogin": "Already have an account? Log in",
    "auth.toSignup": "New here? Create an account",

    // Invite
    "invite.title": "Invite your party",
    "invite.qrAlt": "QR code to join the campaign",
    "invite.code": "Invite code",
    "invite.copyLink": "Copy link",
    "invite.share": "Share",
    "invite.shareTitle": "Join \"{name}\" on Council",
    "invite.shareText": "Mark your availability for {name}:",
    "invite.discordHint":
      "Link copied — paste it into your Discord channel. No account needed to join.",

    // Members
    "members.noResponse": "No response yet",
    "members.allSet": "All set",
    "members.marked": "{n}/{total} marked",
    "members.player": "Player",
    "members.dm": "DM",

    // Recommendations
    "rec.best": "Best session time",
    "rec.backup": "Good backup",
    "rec.available": "{n} available",
    "rec.maybe": " (+{n} maybe)",
    "rec.potential": " · potential {a}/{b}",
    "rec.confirm": "Confirm",

    // Bulk
    "bulk.title": "Mark all",
    "bulk.days": "Which days",
    "bulk.times": "Which times",
    "bulk.availability": "Availability",
    "bulk.allTimes": "All times",
    "bulk.day.all": "Every day",
    "bulk.day.remaining": "Only remaining",
    "bulk.day.weekdays": "Weekdays",
    "bulk.day.weekends": "Weekends",
    "bulk.day.mon": "Mondays",
    "bulk.day.tue": "Tuesdays",
    "bulk.day.wed": "Wednesdays",
    "bulk.day.thu": "Thursdays",
    "bulk.day.fri": "Fridays",
    "bulk.day.sat": "Saturdays",
    "bulk.day.sun": "Sundays",

    // Voice
    "voice.title": "Say or type your availability",
    "voice.placeholder":
      "e.g. \"free every Saturday evening but busy Sunday afternoon\"",
    "voice.notSupported":
      "Voice isn't supported in this browser — type a sentence instead.",
    "voice.listening": "Listening… speak now.",
    "voice.applied": "Marked {n} slot{plural}.",
    "voice.notUnderstood":
      "Couldn't understand that. Try e.g. “free Saturday evening”.",
    "voice.stop": "Stop listening",
    "voice.speak": "Speak",
    "voice.parse": "Parse sentence",
    "voice.sentenceAria": "Availability sentence",

    // Availability grid
    "grid.cellAria":
      "{weekday} {day} {slot}: {avail} available{maybeFrag}{viableFrag}. Your status: {mine}.",
    "grid.maybeFrag": ", {n} maybe",
    "grid.viableFrag": ", viable session",
    "grid.seeWhoVoted": "See who voted for {weekday} {day} {slot}",

    // Setup notice
    "setup.title": "Supabase isn't configured",
    "setup.body":
      "Council stores all campaigns in Supabase. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, apply the migrations in supabase/migrations, then restart the dev server.",
  },
  it: {
    // Common
    "common.cancel": "Annulla",
    "common.save": "Salva",
    "common.continue": "Continua",
    "common.delete": "Elimina",
    "common.back": "Indietro",
    "common.you": "tu",
    "common.apply": "Applica",
    "common.dismiss": "Chiudi",
    "common.pleaseWait": "Attendi…",
    "common.unexpectedError": "Errore imprevisto.",
    "common.unexpectedErrorWith": "Errore imprevisto: {msg}",
    "common.formError": "Controlla il modulo.",

    // Brand
    "brand.title": "Council",
    "brand.subtitle": "Pianificatore di sessioni D&D",

    // Time slots
    "timeSlot.morning": "Mattina",
    "timeSlot.afternoon": "Pomeriggio",
    "timeSlot.evening": "Sera",

    // Status
    "status.available": "Disponibile",
    "status.maybe": "Forse",
    "status.unavailable": "Non disponibile",
    "status.cantMakeIt": "Non posso",
    "status.noResponse": "Nessuna risposta",
    "status.notSet": "non impostato",

    // Layout
    "layout.toggleTheme": "Cambia tema",
    "layout.home": "Home",
    "layout.invite": "Invita",
    "layout.settings": "Impostazioni",

    // Landing
    "landing.myCampaigns": "Le mie campagne",
    "landing.tagline": "Trova la sera in cui tutta la compagnia può giocare",
    "landing.title.line1": "Smetti di rincorrere tutti su",
    "landing.title.discord": "Discord.",
    "landing.subtitle":
      "Ognuno segna la propria disponibilità per le prossime settimane e Council mostra subito la serata migliore. Niente fogli di calcolo — solo un rapido accesso così le tue campagne ti seguono ovunque.",
    "landing.create": "Crea una campagna",
    "landing.join": "Entra con un codice",
    "landing.feature.instantTitle": "Istantaneo",
    "landing.feature.instantDesc":
      "Tocca per segnare uno slot. I punteggi si aggiornano in tempo reale su ogni dispositivo.",
    "landing.feature.smartTitle": "Intelligente",
    "landing.feature.smartDesc":
      "Migliori opzioni e alternative calcolate dalle disponibilità reali.",
    "landing.feature.frictionlessTitle": "Senza attrito",
    "landing.feature.frictionlessDesc":
      "Condividi un link o un QR. I giocatori entrano e iniziano a segnare.",
    "landing.joinModalTitle": "Entra in una campagna",
    "landing.invitePlaceholder": "Codice invito (es. K7P2QX)",
    "landing.gotLink":
      "Hai un link invece del codice? Aprilo — ti porta dentro direttamente.",

    // Dashboard
    "dashboard.title": "Le mie campagne",
    "dashboard.new": "Nuova campagna",
    "dashboard.join": "Entra",
    "dashboard.empty.title": "Nessuna campagna ancora",
    "dashboard.empty.desc":
      "Creane una in pochi secondi, poi condividi il link con la compagnia per iniziare a raccogliere le disponibilità.",
    "dashboard.players": "{n} giocatori",
    "dashboard.booked": "{n} prenotate",

    // Create
    "create.title": "Nuova campagna",
    "create.name": "Nome della campagna",
    "create.namePlaceholder": "L'Ira del Re delle Tempeste",
    "create.minPlayers": "Giocatori minimi per una sessione",
    "create.minPlayersDesc":
      "Quanti giocatori (escluso te, il DM) devono essere disponibili perché un giorno conti come sessione valida.",
    "create.decrease": "Diminuisci",
    "create.increase": "Aumenta",
    "create.notes": "Note (facoltative)",
    "create.notesPlaceholder":
      "Portate gli spuntini. Riprendiamo dalla Cittadella Senza Sole.",
    "create.datesHint":
      "Le date sono compilate automaticamente — le prossime 5 settimane, mattina / pomeriggio / sera. Ognuno segna solo la propria disponibilità.",
    "create.cta": "Crea campagna",

    // Campaign
    "campaign.title": "Campagna",
    "campaign.notFound":
      "Non abbiamo trovato nessuna campagna con il codice {code}.",
    "campaign.backHome": "Torna alla home",
    "campaign.joinTitle": "Entra in questa campagna",
    "campaign.joinAs": "Entrerai come {name}.",
    "campaign.joinCta": "Entra nella campagna",
    "campaign.minPlayersTitle": "Giocatori minimi per sessione",
    "campaign.minPlayersDesc":
      "Giocatori disponibili (escluso te) necessari per segnare un giorno come valido.",
    "campaign.rename.title": "Nome della campagna",
    "campaign.rename.cta": "Rinomina",
    "campaign.rename.modal": "Rinomina campagna",
    "campaign.openPlanner": "Apri pianificatore",
    "campaign.bookedSessions": "Sessioni prenotate",
    "campaign.confirmed": "Confermata",
    "campaign.locked": "Bloccata",
    "campaign.party": "Compagnia ({n})",
    "campaign.inviteShort": "+ Invita",
    "campaign.deleteTitle": "Elimina campagna",
    "campaign.deleteDesc":
      "Rimuove definitivamente questa campagna e tutte le disponibilità. Non si può annullare.",
    "campaign.deleteConfirmTitle": "Eliminare la campagna?",
    "campaign.deleteConfirmDesc":
      "Questo elimina definitivamente {name} e tutte le sue disponibilità e sessioni prenotate per tutti. Non si può annullare.",
    "campaign.deleteCta": "Elimina campagna",

    // Plan
    "plan.title": "Pianificatore",
    "plan.notFound": "Campagna non trovata.",
    "plan.joinTitle": "Entra per iniziare a segnare",
    "plan.legend.hint": "Tocca per ciclare · tieni premuto e trascina per dipingere:",
    "plan.empty":
      "Segna qualche slot e qui appariranno i suggerimenti.",
    "plan.responded": "{a}/{b} hanno risposto",
    "plan.footer":
      "I numeri mostrano i giocatori disponibili (+forse). Un segno di spunta indica i giorni con almeno {n} {playerLabel} libero/i; la corona indica lo slot migliore.",
    "plan.footer.dmHint": " Il DM conferma la sessione definitiva.",
    "plan.player": "giocatore",
    "plan.players": "giocatori",
    "plan.confirmModal.title": "Confermi questa sessione?",
    "plan.confirmModal.available": "{n} disponibili",
    "plan.confirmModal.maybe": " (+{n} forse)",
    "plan.confirmModal.notesPlaceholder": "Note per la compagnia (facoltative)",
    "plan.confirmCta": "Conferma sessione",

    // Session
    "session.title": "Sessione",
    "session.notFound": "Sessione non trovata.",
    "session.whoVoted": "Chi ha votato cosa",
    "session.noNotes": "Nessuna nota aggiunta.",
    "session.backToPlanner": "Torna al pianificatore",
    "session.cancelYes": "Sì, annulla la sessione",
    "session.cancelKeep": "Mantienila",
    "session.cancelCta": "Annulla sessione",

    // Settings
    "settings.title": "Impostazioni",
    "settings.logout": "Esci",
    "settings.appearance": "Aspetto",
    "settings.appearanceDesc": "La modalità scura è attiva di default.",
    "settings.language": "Lingua",
    "settings.languageDesc": "Scegli la lingua che preferisci.",
    "settings.localData": "Dati locali",
    "settings.localDataDesc":
      "Il reset cancella le campagne che questo dispositivo ricorda. Le campagne condivise restano sul server — puoi rientrare con il link di invito.",
    "settings.confirmReset": "Conferma reset",
    "settings.reset": "Resetta dati locali",
    "settings.footer": "Council · Pianificatore D&D · v0.1",

    // Auth
    "auth.signIn": "Accedi",
    "auth.signupTitle": "Crea il tuo account",
    "auth.loginTitle": "Bentornato",
    "auth.signupSub":
      "Solo email e password — così le tue campagne ti seguono.",
    "auth.loginSub": "Accedi per vedere le tue campagne.",
    "auth.displayName": "Nome visualizzato",
    "auth.displayNamePlaceholder": "Dungeon Master",
    "auth.email": "Email",
    "auth.emailPlaceholder": "tu@esempio.com",
    "auth.password": "Password",
    "auth.passwordPlaceholder": "••••••",
    "auth.createAccount": "Crea account",
    "auth.logIn": "Accedi",
    "auth.toLogin": "Hai già un account? Accedi",
    "auth.toSignup": "Sei nuovo? Crea un account",

    // Invite
    "invite.title": "Invita la tua compagnia",
    "invite.qrAlt": "Codice QR per entrare nella campagna",
    "invite.code": "Codice invito",
    "invite.copyLink": "Copia link",
    "invite.share": "Condividi",
    "invite.shareTitle": "Entra in \"{name}\" su Council",
    "invite.shareText": "Segna la tua disponibilità per {name}:",
    "invite.discordHint":
      "Link copiato — incollalo nel tuo canale Discord. Non serve un account per entrare.",

    // Members
    "members.noResponse": "Nessuna risposta ancora",
    "members.allSet": "Tutto fatto",
    "members.marked": "{n}/{total} segnati",
    "members.player": "Giocatore",
    "members.dm": "DM",

    // Recommendations
    "rec.best": "Miglior orario sessione",
    "rec.backup": "Buona alternativa",
    "rec.available": "{n} disponibili",
    "rec.maybe": " (+{n} forse)",
    "rec.potential": " · potenziale {a}/{b}",
    "rec.confirm": "Conferma",

    // Bulk
    "bulk.title": "Segna tutti",
    "bulk.days": "Quali giorni",
    "bulk.times": "Quali orari",
    "bulk.availability": "Disponibilità",
    "bulk.allTimes": "Tutti gli orari",
    "bulk.day.all": "Ogni giorno",
    "bulk.day.remaining": "Solo rimanenti",
    "bulk.day.weekdays": "Giorni feriali",
    "bulk.day.weekends": "Weekend",
    "bulk.day.mon": "Lunedì",
    "bulk.day.tue": "Martedì",
    "bulk.day.wed": "Mercoledì",
    "bulk.day.thu": "Giovedì",
    "bulk.day.fri": "Venerdì",
    "bulk.day.sat": "Sabato",
    "bulk.day.sun": "Domenica",

    // Voice
    "voice.title": "Dimmi o scrivi la tua disponibilità",
    "voice.placeholder":
      "es. \"libero ogni sabato sera ma occupato domenica pomeriggio\"",
    "voice.notSupported":
      "La voce non è supportata in questo browser — scrivi una frase.",
    "voice.listening": "In ascolto… parla pure.",
    "voice.applied": "Segnato {n} slot{plural}.",
    "voice.notUnderstood":
      "Non ho capito. Prova ad esempio “libero sabato sera”.",
    "voice.stop": "Ferma ascolto",
    "voice.speak": "Parla",
    "voice.parse": "Analizza frase",
    "voice.sentenceAria": "Frase di disponibilità",

    // Availability grid
    "grid.cellAria":
      "{weekday} {day} {slot}: {avail} disponibili{maybeFrag}{viableFrag}. Il tuo stato: {mine}.",
    "grid.maybeFrag": ", {n} forse",
    "grid.viableFrag": ", sessione valida",
    "grid.seeWhoVoted": "Vedi chi ha votato per {weekday} {day} {slot}",

    // Setup notice
    "setup.title": "Supabase non è configurato",
    "setup.body":
      "Council salva tutte le campagne in Supabase. Imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, applica le migrazioni in supabase/migrations, poi riavvia il server di sviluppo.",
  },
};

function format(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in params ? String(params[k]) : `{${k}}`,
  );
}

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = React.createContext<I18nValue>({
  locale: "it",
  setLocale: () => {},
  t: (k) => k,
});

export function useI18n(): I18nValue {
  return React.useContext(I18nContext);
}

export const LANGUAGE_STORAGE_KEY = "dndtime:language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>("it");

  React.useEffect(() => {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Locale | null;
    if (saved === "en" || saved === "it") {
      setLocaleState(saved);
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const value = React.useMemo<I18nValue>(() => {
    const dict = STRINGS[locale];
    return {
      locale,
      setLocale: setLocaleState,
      t: (key, params) => {
        const raw = dict[key] ?? STRINGS.en[key] ?? key;
        return format(raw, params);
      },
    };
  }, [locale]);

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function localeTag(locale: Locale): string {
  return locale === "it" ? "it-IT" : "en-US";
}

export function formatDateLabelLocale(
  iso: string,
  locale: Locale,
): { weekday: string; day: string } {
  const d = new Date(iso + "T00:00:00");
  const tag = localeTag(locale);
  return {
    weekday: d.toLocaleDateString(tag, { weekday: "short" }),
    day: d.toLocaleDateString(tag, { month: "short", day: "numeric" }),
  };
}

export function useFormatDate() {
  const { locale } = useI18n();
  return React.useCallback(
    (iso: string) => formatDateLabelLocale(iso, locale),
    [locale],
  );
}

export function useTimeSlotLabel() {
  const { t } = useI18n();
  return React.useCallback(
    (slot: "morning" | "afternoon" | "evening") => t(`timeSlot.${slot}`),
    [t],
  );
}

export function useStatusLabel() {
  const { t } = useI18n();
  return React.useCallback(
    (status: "available" | "maybe" | "unavailable") => t(`status.${status}`),
    [t],
  );
}
