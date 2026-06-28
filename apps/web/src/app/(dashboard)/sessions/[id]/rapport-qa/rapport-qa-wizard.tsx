"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  MonitorSmartphone,
  ClipboardList,
  Wrench,
  Smile,
  Lightbulb,
  ShieldAlert,
  Flag,
} from "lucide-react"
import { saveRapportQAAction, type RapportQAData } from "./actions"

// ─── Types ───────────────────────────────────────────────

type WizardState = {
  bilanGeneral: string
  salle: string
  esepi: string
  chariot: string
  accueilAmbiance: string
  hasVr: boolean
  vrDescription: string
  recommandations: string
  conclusion: string
}

type StepId =
  | "bilan"
  | "moyens"
  | "accueil"
  | "vr"
  | "recommandations"
  | "conclusion"
  | "recap"

type Step = {
  id: StepId
  label: string
  icon: React.ReactNode
}

// ─── Step config ─────────────────────────────────────────

const STEPS: Step[] = [
  { id: "bilan", label: "Bilan général", icon: <ClipboardList className="h-4 w-4" /> },
  { id: "moyens", label: "Moyens", icon: <Wrench className="h-4 w-4" /> },
  { id: "accueil", label: "Accueil", icon: <Smile className="h-4 w-4" /> },
  { id: "vr", label: "Exercice VR", icon: <MonitorSmartphone className="h-4 w-4" /> },
  { id: "recommandations", label: "Recommandations", icon: <Lightbulb className="h-4 w-4" /> },
  { id: "conclusion", label: "Conclusion", icon: <Flag className="h-4 w-4" /> },
  { id: "recap", label: "Récapitulatif", icon: <ShieldAlert className="h-4 w-4" /> },
]

// ─── Input primitives ────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
      {children}
    </label>
  )
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 6,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none leading-relaxed"
    />
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
    />
  )
}

// ─── Recap rows ──────────────────────────────────────────

function RecapSection({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 border-b border-border last:border-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {value || <span className="italic text-muted-foreground/60">Non renseigné</span>}
      </p>
    </div>
  )
}

// ─── Step nav indicator ──────────────────────────────────

function StepIndicator({
  steps,
  currentIndex,
}: {
  steps: Step[]
  currentIndex: number
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {steps.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <div key={step.id} className="flex items-center gap-1 shrink-0">
            <div
              className={[
                "flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-colors",
                done
                  ? "bg-primary text-primary-foreground"
                  : active
                    ? "bg-primary/15 text-primary ring-1 ring-primary"
                    : "bg-secondary text-muted-foreground",
              ].join(" ")}
              aria-label={step.label}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
            </div>
            {i < steps.length - 1 && (
              <div
                className={[
                  "h-px w-4 transition-colors",
                  done ? "bg-primary" : "bg-border",
                ].join(" ")}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main wizard ─────────────────────────────────────────

const INITIAL_STATE: WizardState = {
  bilanGeneral: "",
  salle: "RAS",
  esepi: "RAS",
  chariot: "RAS",
  accueilAmbiance: "",
  hasVr: false,
  vrDescription: "",
  recommandations: "",
  conclusion: "",
}

export function RapportQAWizard({
  sessionId,
  existing,
}: {
  sessionId: string
  existing: Partial<WizardState> | null
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  // Merge existing data if editing an existing brouillon
  const [state, setState] = useState<WizardState>(() => {
    if (!existing) return INITIAL_STATE
    return {
      bilanGeneral: existing.bilanGeneral ?? "",
      salle: existing.salle ?? "RAS",
      esepi: existing.esepi ?? "RAS",
      chariot: existing.chariot ?? "RAS",
      accueilAmbiance: existing.accueilAmbiance ?? "",
      hasVr: existing.hasVr ?? false,
      vrDescription: existing.vrDescription ?? "",
      recommandations: existing.recommandations ?? "",
      conclusion: existing.conclusion ?? "",
    }
  })

  function set<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  const currentStepId = STEPS[step].id

  function handleNext() {
    if (step < STEPS.length - 1) setStep((s) => s + 1)
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1)
  }

  function handleSubmit() {
    // Serialize moyens as a formatted string
    const moyensDisposition = [
      `Salle de formation : ${state.salle}`,
      `ESEPI : ${state.esepi}`,
      `Chariot élévateur : ${state.chariot}`,
    ].join("\n")

    const payload: RapportQAData = {
      bilanGeneral: state.bilanGeneral,
      moyensDisposition,
      accueilAmbiance: state.accueilAmbiance,
      hasVr: state.hasVr,
      vrDescription: state.hasVr ? state.vrDescription : undefined,
      recommandations: state.recommandations,
      conclusion: state.conclusion,
    }

    startTransition(async () => {
      await saveRapportQAAction(sessionId, payload)
      setSaved(true)
      // Brief pause so the user sees the saved state before redirect
      await new Promise((r) => setTimeout(r, 600))
      router.push(`/sessions/${sessionId}/rapport`)
    })
  }

  // ── Render ──────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <StepIndicator steps={STEPS} currentIndex={step} />

      {/* Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Card header */}
        <div className="border-b border-border px-6 py-4 flex items-center gap-3">
          <span className="text-muted-foreground">{STEPS[step].icon}</span>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Étape {step + 1} sur {STEPS.length}
            </p>
            <h2 className="text-base font-semibold text-foreground mt-0.5">
              {STEPS[step].label}
            </h2>
          </div>
        </div>

        {/* Card body */}
        <div className="px-6 py-6">
          {currentStepId === "bilan" && (
            <div>
              <Label>Bilan général de la session</Label>
              <Textarea
                value={state.bilanGeneral}
                onChange={(v) => set("bilanGeneral", v)}
                placeholder="Décrivez le déroulement général de la session : ambiance de travail, progression des stagiaires, incidents éventuels…"
                rows={7}
              />
            </div>
          )}

          {currentStepId === "moyens" && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Indiquez l'état des moyens mis à disposition. Laissez "RAS" si tout était conforme.
              </p>
              <div>
                <Label>Salle de formation</Label>
                <TextInput
                  value={state.salle}
                  onChange={(v) => set("salle", v)}
                  placeholder="RAS"
                />
              </div>
              <div>
                <Label>ESEPI</Label>
                <TextInput
                  value={state.esepi}
                  onChange={(v) => set("esepi", v)}
                  placeholder="RAS"
                />
              </div>
              <div>
                <Label>Chariot élévateur</Label>
                <TextInput
                  value={state.chariot}
                  onChange={(v) => set("chariot", v)}
                  placeholder="RAS"
                />
              </div>
            </div>
          )}

          {currentStepId === "accueil" && (
            <div>
              <Label>Accueil et ambiance générale</Label>
              <Textarea
                value={state.accueilAmbiance}
                onChange={(v) => set("accueilAmbiance", v)}
                placeholder="Décrivez les conditions d'accueil sur site, l'attitude des stagiaires, la coopération du client…"
                rows={7}
              />
            </div>
          )}

          {currentStepId === "vr" && (
            <div className="space-y-5">
              {/* Toggle */}
              <div className="flex items-center justify-between p-4 bg-secondary/40 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Exercice VR réalisé
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    La session incluait-elle un exercice en réalité virtuelle ?
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={state.hasVr}
                  onClick={() => set("hasVr", !state.hasVr)}
                  className={[
                    "relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    state.hasVr ? "bg-primary" : "bg-secondary border border-border",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                      state.hasVr ? "translate-x-6" : "translate-x-1",
                    ].join(" ")}
                  />
                </button>
              </div>

              {/* Conditional textarea */}
              {state.hasVr && (
                <div>
                  <Label>Description de l'exercice VR</Label>
                  <Textarea
                    value={state.vrDescription}
                    onChange={(v) => set("vrDescription", v)}
                    placeholder="Décrivez le déroulement de l'exercice VR, les scénarios utilisés, les réactions des participants…"
                    rows={6}
                  />
                </div>
              )}
            </div>
          )}

          {currentStepId === "recommandations" && (
            <div>
              <Label>Recommandations</Label>
              <Textarea
                value={state.recommandations}
                onChange={(v) => set("recommandations", v)}
                placeholder="Recommandations à l'attention du client, de l'entreprise ou des stagiaires…"
                rows={7}
              />
            </div>
          )}

          {currentStepId === "conclusion" && (
            <div>
              <Label>Conclusion</Label>
              <Textarea
                value={state.conclusion}
                onChange={(v) => set("conclusion", v)}
                placeholder="Synthèse finale de la session : atteinte des objectifs pédagogiques, points forts, axes d'amélioration…"
                rows={7}
              />
            </div>
          )}

          {currentStepId === "recap" && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground mb-4">
                Vérifiez vos réponses avant de générer le rapport. Vous pourrez le modifier ultérieurement.
              </p>
              <RecapSection label="Bilan général" value={state.bilanGeneral} />
              <RecapSection
                label="Moyens mis à disposition"
                value={[
                  `Salle : ${state.salle}`,
                  `ESEPI : ${state.esepi}`,
                  `Chariot élévateur : ${state.chariot}`,
                ].join("  ·  ")}
              />
              <RecapSection label="Accueil et ambiance" value={state.accueilAmbiance} />
              <RecapSection
                label="Exercice VR"
                value={
                  state.hasVr
                    ? `Oui${state.vrDescription ? ` — ${state.vrDescription}` : ""}`
                    : "Non"
                }
              />
              <RecapSection label="Recommandations" value={state.recommandations} />
              <RecapSection label="Conclusion" value={state.conclusion} />
            </div>
          )}
        </div>

        {/* Card footer — nav */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0 || isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour
          </button>

          {currentStepId !== "recap" ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {saved ? "Redirection…" : "Enregistrement…"}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Générer le rapport
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
