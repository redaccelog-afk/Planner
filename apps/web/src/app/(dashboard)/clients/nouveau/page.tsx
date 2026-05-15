import Link from "next/link";
import { ArrowLeft, Building2, MapPin, User } from "lucide-react";
import { createClientAction } from "./actions";

export const metadata = { title: "Nouveau client" };

export default function NouveauClientPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link
        href="/clients"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux clients
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nouveau client</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Créer un nouveau client dans CCE LOG</p>
        </div>
      </div>

      <form action={createClientAction} className="space-y-6">
        {/* Informations principales */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Informations client
          </h2>

          <div>
            <label htmlFor="name" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Nom du client *
            </label>
            <input
              id="name"
              name="name"
              required
              autoFocus
              placeholder="ex. HUTCHINSON MAROC"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Informations complémentaires sur ce client..."
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
        </div>

        {/* Site optionnel */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Premier site
            <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
          </h2>
          <p className="text-xs text-muted-foreground -mt-2">
            Remplissez tous les champs pour ajouter un premier site, ou laissez vide pour en ajouter plus tard.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="siteLabel" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Label du site
              </label>
              <input
                id="siteLabel"
                name="siteLabel"
                placeholder="ex. HUTCHINSON BOUSKOURA"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label htmlFor="siteCity" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Ville
              </label>
              <input
                id="siteCity"
                name="siteCity"
                placeholder="ex. Casablanca"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div>
            <label htmlFor="siteAddress" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Adresse
            </label>
            <input
              id="siteAddress"
              name="siteAddress"
              placeholder="ex. Zone Industrielle, Route de Bouskoura"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Contact optionnel */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Premier contact
            <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
          </h2>
          <p className="text-xs text-muted-foreground -mt-2">
            Renseignez au moins le nom pour ajouter un contact principal, ou laissez vide pour en ajouter plus tard.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="contactName" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Nom du contact
              </label>
              <input
                id="contactName"
                name="contactName"
                placeholder="ex. Karim Benali"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label htmlFor="contactRole" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Rôle
              </label>
              <input
                id="contactRole"
                name="contactRole"
                placeholder="ex. Responsable formation"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label htmlFor="contactEmail" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                placeholder="ex. k.benali@entreprise.ma"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label htmlFor="contactPhone" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Téléphone
              </label>
              <input
                id="contactPhone"
                name="contactPhone"
                placeholder="ex. +212 6 00 00 00 00"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/clients"
            className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors border border-border"
          >
            Annuler
          </Link>
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Créer le client
          </button>
        </div>
      </form>
    </div>
  );
}
