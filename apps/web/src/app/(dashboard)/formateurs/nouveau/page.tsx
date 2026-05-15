"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, Building2 } from "lucide-react";
import { createTrainerAction } from "./actions";

export default function NouveauFormateurPage() {
  const [type, setType] = useState<"INTERNE" | "EXTERNE">("EXTERNE");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/formateurs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux formateurs
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Nouveau formateur</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Créer un profil formateur interne (salarié CCE LOG) ou externe (prestataire).
        </p>
      </div>

      <form action={createTrainerAction} className="space-y-6">
        {/* Type selector */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4">Type de formateur</h2>
          <div className="grid grid-cols-2 gap-3">
            <TypeCard
              value="INTERNE"
              selected={type === "INTERNE"}
              onSelect={() => setType("INTERNE")}
              icon={<User className="h-5 w-5" />}
              label="Interne"
              description="Salarié CCE LOG"
              color="primary"
            />
            <TypeCard
              value="EXTERNE"
              selected={type === "EXTERNE"}
              onSelect={() => setType("EXTERNE")}
              icon={<Building2 className="h-5 w-5" />}
              label="Externe"
              description="Prestataire indépendant"
              color="amber"
            />
          </div>
          <input type="hidden" name="type" value={type} />
        </div>

        {/* Common fields */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Informations générales</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormLabel required>Nom complet</FormLabel>
              <FormInput name="fullName" required placeholder="Mohammed Alaoui" />
            </div>
            <div>
              <FormLabel required>Téléphone WhatsApp</FormLabel>
              <FormInput name="phone" required placeholder="+212600000000" />
            </div>
            <div>
              <FormLabel>Email</FormLabel>
              <FormInput name="email" type="email" placeholder="formateur@email.com" />
            </div>
            <div>
              <FormLabel required>Ville</FormLabel>
              <FormInput name="city" required placeholder="Casablanca" />
            </div>
            <div>
              <FormLabel>Adresse</FormLabel>
              <FormInput name="address" placeholder="Rue, quartier..." />
            </div>
            <div className="col-span-2">
              <FormLabel>Notes internes</FormLabel>
              <textarea
                name="notes"
                rows={3}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                placeholder="Remarques, spécialités, contraintes..."
              />
            </div>
          </div>
        </div>

        {/* INTERNE fields */}
        {type === "INTERNE" && (
          <div className="bg-card border border-primary/20 rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-foreground">
              <span className="text-primary">Interne</span> — Informations RH
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormLabel>Matricule RH</FormLabel>
                <FormInput name="employeeId" placeholder="EMP-0042" />
              </div>
              <div>
                <FormLabel>Coût employeur/jour (MAD)</FormLabel>
                <FormInput name="employerCost" type="number" min="0" step="50" placeholder="800" />
              </div>
            </div>
          </div>
        )}

        {/* EXTERNE fields */}
        {type === "EXTERNE" && (
          <div className="bg-card border border-amber-500/20 rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-foreground">
              <span className="text-amber-400">Externe</span> — Informations légales & bancaires
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormLabel>Statut juridique</FormLabel>
                <select
                  name="legalStatus"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">— Choisir —</option>
                  <option value="Auto-entrepreneur">Auto-entrepreneur</option>
                  <option value="SARL">SARL</option>
                  <option value="SA">SA</option>
                  <option value="Personne physique">Personne physique</option>
                </select>
              </div>
              <div>
                <FormLabel>Tarif journalier par défaut (MAD)</FormLabel>
                <FormInput name="defaultDayRate" type="number" min="0" step="50" placeholder="1500" />
              </div>
              <div>
                <FormLabel>ICE</FormLabel>
                <FormInput name="ice" placeholder="001234567890123" />
              </div>
              <div>
                <FormLabel>Registre de Commerce (RC)</FormLabel>
                <FormInput name="rc" placeholder="Casa-12345" />
              </div>
              <div>
                <FormLabel>Identifiant Fiscal (IF)</FormLabel>
                <FormInput name="ifFiscal" placeholder="12345678" />
              </div>
              <div>
                <FormLabel>CNSS</FormLabel>
                <FormInput name="cnss" placeholder="1234567" />
              </div>
              <div>
                <FormLabel>IBAN</FormLabel>
                <FormInput name="iban" placeholder="MA64011519000001234567890144" />
              </div>
              <div>
                <FormLabel>Banque</FormLabel>
                <FormInput name="bankName" placeholder="Attijariwafa Bank" />
              </div>
              <div>
                <FormLabel>Délai de paiement (jours)</FormLabel>
                <FormInput name="paymentTerms" type="number" min="0" defaultValue="30" />
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/formateurs"
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Créer le formateur
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Form helpers ───────────────────────────────────────────────────────────────

function FormLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-xs text-muted-foreground block mb-1">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function FormInput({
  name,
  type = "text",
  required = false,
  placeholder,
  defaultValue,
  min,
  step,
}: {
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  min?: string;
  step?: string;
}) {
  return (
    <input
      name={name}
      type={type}
      required={required}
      placeholder={placeholder}
      defaultValue={defaultValue}
      min={min}
      step={step}
      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
  );
}

function TypeCard({
  value,
  selected,
  onSelect,
  icon,
  label,
  description,
  color,
}: {
  value: string;
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: "primary" | "amber";
}) {
  const colorMap = {
    primary: {
      selected: "border-primary bg-primary/5 text-primary",
      icon: "bg-primary/10 text-primary",
      unselected: "border-border hover:border-primary/50",
    },
    amber: {
      selected: "border-amber-500 bg-amber-500/5 text-amber-400",
      icon: "bg-amber-500/10 text-amber-400",
      unselected: "border-border hover:border-amber-500/50",
    },
  };
  const colors = colorMap[color];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
        selected ? colors.selected : `${colors.unselected} text-foreground`
      }`}
    >
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.icon}`}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {selected && (
        <div className={`ml-auto h-4 w-4 rounded-full flex items-center justify-center ${color === "primary" ? "bg-primary" : "bg-amber-500"}`}>
          <div className="h-1.5 w-1.5 rounded-full bg-white" />
        </div>
      )}
    </button>
  );
}

// Silence unused imports
const _unused = { value: "" };
void _unused;
