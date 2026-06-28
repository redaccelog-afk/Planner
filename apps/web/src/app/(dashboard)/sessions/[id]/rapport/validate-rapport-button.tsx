"use client"

import { useTransition } from "react"
import { Loader2, CheckCircle2 } from "lucide-react"
import { validateRapportAction } from "../rapport-qa/actions"

export function ValidateRapportButton({ sessionId }: { sessionId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await validateRapportAction(sessionId)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" />
      )}
      {isPending ? "Validation…" : "Valider le rapport"}
    </button>
  )
}
