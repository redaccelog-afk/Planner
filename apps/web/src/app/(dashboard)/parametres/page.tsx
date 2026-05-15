import { db } from "@ccelog/db";
import { Settings, Mail, MessageSquare, Phone, Send, CheckCircle2, AlertCircle, Link } from "lucide-react";
import { updateConfigAction } from "./actions";

export const metadata = { title: "Paramètres" };

// Helper: read a config key value with fallback
function cfg(configs: { key: string; value: string }[], key: string, fallback = ""): string {
  return configs.find((c) => c.key === key)?.value ?? fallback;
}

// Helper: check env var presence (server-side only)
function isConfigured(envKey: string): boolean {
  return !!(process.env[envKey] && process.env[envKey]!.trim().length > 0);
}

export default async function ParametresPage() {
  const configs = await db.appConfig.findMany();

  const integrations = [
    {
      label: "Microsoft 365",
      description: "Synchronisation calendrier Outlook",
      envKey: "M365_ACCESS_TOKEN",
      icon: "🔵",
    },
    {
      label: "WhatsApp Cloud API",
      description: "Envoi de messages via Meta",
      envKey: "WA_API_TOKEN",
      icon: "🟢",
    },
    {
      label: "Google Maps",
      description: "Calcul de distances inter-villes",
      envKey: "GOOGLE_MAPS_API_KEY",
      icon: "📍",
    },
    {
      label: "Anthropic (IA)",
      description: "Parsing IA des messages entrants",
      envKey: "ANTHROPIC_API_KEY",
      icon: "🤖",
    },
    {
      label: "Twilio (SMS)",
      description: "Envoi de SMS formateurs / clients",
      envKey: "TWILIO_ACCOUNT_SID",
      icon: "📱",
    },
    {
      label: "Telegram Bot",
      description: "Canal de notifications Telegram",
      envKey: "TELEGRAM_BOT_TOKEN",
      icon: "✈️",
    },
  ];

  const channels = [
    {
      label: "Email",
      description: "Réception des demandes par email",
      icon: Mail,
      envKey: "EMAIL_WEBHOOK_SECRET",
      webhookPath: "/api/webhooks/email",
    },
    {
      label: "WhatsApp",
      description: "Webhook Meta Cloud API",
      icon: MessageSquare,
      envKey: "WA_APP_SECRET",
      webhookPath: "/api/whatsapp/webhook",
    },
    {
      label: "SMS (Twilio)",
      description: "Webhook Twilio inbound SMS",
      icon: Phone,
      envKey: "TWILIO_ACCOUNT_SID",
      webhookPath: "/api/webhooks/sms",
    },
    {
      label: "Telegram",
      description: "Webhook Telegram Bot",
      icon: Send,
      envKey: "TELEGRAM_BOT_TOKEN",
      webhookPath: "/api/webhooks/telegram",
    },
  ];

  const appUrl = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL ?? "https://votre-domaine.com";

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configuration générale de la plateforme CCE LOG Planner
        </p>
      </div>

      {/* ── Section 1: Configuration générale ── */}
      <section className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Configuration générale</h2>
        </div>
        <form action={updateConfigAction} className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <LabeledInput
              label="Distance hôtel (km)"
              description="Seuil à partir duquel un hôtel est requis (règle R5)"
              name="hotel_distance_threshold_km"
              type="number"
              min="0"
              step="1"
              defaultValue={cfg(configs, "hotel_distance_threshold_km", "150")}
            />
            <LabeledInput
              label="Sessions max consécutives"
              description="Nombre maximum de sessions consécutives par formateur (R1)"
              name="max_consecutive_sessions"
              type="number"
              min="1"
              step="1"
              defaultValue={cfg(configs, "max_consecutive_sessions", "3")}
            />
            <LabeledInput
              label="Cache distances (jours)"
              description="Durée de validité du cache Google Maps (jours)"
              name="distance_cache_days"
              type="number"
              min="1"
              step="1"
              defaultValue={cfg(configs, "distance_cache_days", "30")}
            />
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4">Pipeline — Délais de réponse</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <LabeledInput
                label="Timeout formateur (heures)"
                description="Délai avant relance automatique du formateur"
                name="pipeline_trainer_timeout_hours"
                type="number"
                min="1"
                step="1"
                defaultValue={cfg(configs, "pipeline_trainer_timeout_hours", "48")}
              />
              <LabeledInput
                label="Timeout client (heures)"
                description="Délai avant relance automatique du client"
                name="pipeline_client_timeout_hours"
                type="number"
                min="1"
                step="1"
                defaultValue={cfg(configs, "pipeline_client_timeout_hours", "72")}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4">Pipeline — Messages par défaut</h3>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Message WhatsApp formateur (confirmation de disponibilité)
              </label>
              <p className="text-xs text-muted-foreground">
                Utilisé comme template par défaut lors de la demande de disponibilité
              </p>
              <textarea
                name="whatsapp_trainer_default_message"
                rows={4}
                defaultValue={cfg(
                  configs,
                  "whatsapp_trainer_default_message",
                  "Bonjour {prenom}, nous avons une session {theme} prévue du {date_debut} au {date_fin} à {ville}. Êtes-vous disponible ? Répondez OUI ou NON."
                )}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Variables disponibles: {"{prenom}"}, {"{theme}"}, {"{date_debut}"}, {"{date_fin}"}, {"{ville}"}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </section>

      {/* ── Section 2: Canaux de réception ── */}
      <section className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
          <Link className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Canaux de réception</h2>
        </div>
        <div className="divide-y divide-border">
          {channels.map(({ label, description, icon: Icon, envKey, webhookPath }) => {
            const configured = isConfigured(envKey);
            const webhookUrl = `${appUrl}${webhookPath}`;
            return (
              <div key={label} className="px-6 py-4 flex items-start gap-4">
                <div className={`mt-0.5 p-2 rounded-lg ${configured ? "bg-emerald-500/10" : "bg-secondary"}`}>
                  <Icon className={`h-4 w-4 ${configured ? "text-emerald-400" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    {configured ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Configuré
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">
                        <AlertCircle className="h-2.5 w-2.5" />
                        Non configuré
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{description}</p>
                  <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5">
                    <code className="text-xs text-primary truncate flex-1">{webhookUrl}</code>
                    <span className="text-xs text-muted-foreground shrink-0">Webhook URL</span>
                  </div>
                  {!configured && (
                    <p className="text-xs text-amber-400">
                      Variable manquante: <code className="font-mono">{envKey}</code>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Section 3: Intégrations ── */}
      <section className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Intégrations</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Statut des services externes (basé sur les variables d&apos;environnement)
          </p>
        </div>
        <div className="p-6 grid gap-3 md:grid-cols-2">
          {integrations.map(({ label, description, envKey, icon }) => {
            const configured = isConfigured(envKey);
            return (
              <div
                key={envKey}
                className={`flex items-start gap-3 p-4 rounded-xl border ${
                  configured
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-secondary/50 border-border"
                }`}
              >
                <span className="text-xl leading-none mt-0.5">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    {configured ? (
                      <span className="text-[10px] font-medium text-emerald-400">✓ Configurée</span>
                    ) : (
                      <span className="text-[10px] font-medium text-amber-400">⚠ Non configurée</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">{envKey}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ── Sub-component: Labeled form input ──

interface LabeledInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  name: string;
}

function LabeledInput({ label, description, name, ...props }: LabeledInputProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <input
        id={name}
        name={name}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        {...props}
      />
    </div>
  );
}
