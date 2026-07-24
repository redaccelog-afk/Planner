"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { updateTrainerAction, addLegalEntityAction, removeLegalEntityAction } from "./actions";

type LegalEntity = {
  id: string;
  entityName: string | null;
  legalStatus: string | null;
  ice: string | null;
  rc: string | null;
  ifFiscal: string | null;
  cnss: string | null;
  iban: string | null;
  bankName: string | null;
  isDefault: boolean;
};

type Trainer = {
  id: string;
  type: "INTERNE" | "EXTERNE";
  fullName: string;
  phone: string;
  email: string | null;
  city: string;
  address: string | null;
  notes: string | null;
  employeeId: string | null;
  employerCost: number | null;
  legalStatus: string | null;
  ice: string | null;
  rc: string | null;
  ifFiscal: string | null;
  cnss: string | null;
  iban: string | null;
  bankName: string | null;
  defaultDayRate: number | null;
  paymentTerms: number | null;
  legalEntities: LegalEntity[];
};

export default function EditFormateurPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddEntity, setShowAddEntity] = useState(false);

  function loadTrainer() {
    fetch(`/api/trainers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setTrainer(data);
        setLoading(false);
      })
      .catch(() => router.push("/formateurs"));
  }

  useEffect(() => { loadTrainer(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-muted-foreground text-sm">
        Chargement...
      </div>
    );
  }

  if (!trainer) return null;

  const isInterne = trainer.type === "INTERNE";

  async function handleAddEntity(formData: FormData) {
    await addLegalEntityAction(formData);
    setShowAddEntity(false);
    loadTrainer();
  }

  async function handleRemoveEntity(formData: FormData) {
    await removeLegalEntityAction(formData);
    loadTrainer();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href={`/formateurs/${id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au profil
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Modifier le formateur</h1>
        <p className="text-sm text-muted-foreground mt-1">{trainer.fullName}</p>
      </div>

      <form action={updateTrainerAction} className="space-y-6">
        <input type="hidden" name="id" value={trainer.id} />
        <input type="hidden" name="type" value={trainer.type} />

        {/* Common fields */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Informations générales</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormLabel required>Nom complet</FormLabel>
              <FormInput name="fullName" required defaultValue={trainer.fullName} />
            </div>
            <div>
              <FormLabel required>Téléphone WhatsApp</FormLabel>
              <FormInput name="phone" required defaultValue={trainer.phone} />
            </div>
            <div>
              <FormLabel>Email</FormLabel>
              <FormInput name="email" type="email" defaultValue={trainer.email ?? ""} />
            </div>
            <div>
              <FormLabel required>Ville</FormLabel>
              <FormInput name="city" required defaultValue={trainer.city} />
            </div>
            <div>
              <FormLabel>Adresse</FormLabel>
              <FormInput name="address" defaultValue={trainer.address ?? ""} />
            </div>
            <div className="col-span-2">
              <FormLabel>Notes internes</FormLabel>
              <textarea
                name="notes"
                rows={3}
                defaultValue={trainer.notes ?? ""}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>
        </div>

        {/* INTERNE fields */}
        {isInterne && (
          <div className="bg-card border border-primary/20 rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-foreground">
              <span className="text-primary">Interne</span> — Informations RH
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormLabel>Matricule RH</FormLabel>
                <FormInput name="employeeId" defaultValue={trainer.employeeId ?? ""} />
              </div>
              <div>
                <FormLabel>Coût employeur/jour (MAD)</FormLabel>
                <FormInput name="employerCost" type="number" min="0" step="50" defaultValue={trainer.employerCost?.toString() ?? ""} />
              </div>
            </div>
          </div>
        )}

        {/* EXTERNE primary entity */}
        {!isInterne && (
          <div className="bg-card border border-amber-500/20 rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-foreground">
              <span className="text-amber-400">Externe</span> — Entité légale principale
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormLabel>Statut juridique</FormLabel>
                <select name="legalStatus" defaultValue={trainer.legalStatus ?? ""} className={selectCls}>
                  <option value="">— Choisir —</option>
                  <option value="Auto-entrepreneur">Auto-entrepreneur</option>
                  <option value="SARL">SARL</option>
                  <option value="SA">SA</option>
                  <option value="Personne physique">Personne physique</option>
                </select>
              </div>
              <div>
                <FormLabel>Tarif journalier par défaut (MAD)</FormLabel>
                <FormInput name="defaultDayRate" type="number" min="0" step="50" defaultValue={trainer.defaultDayRate?.toString() ?? ""} />
              </div>
              <div>
                <FormLabel>ICE</FormLabel>
                <FormInput name="ice" defaultValue={trainer.ice ?? ""} />
              </div>
              <div>
                <FormLabel>Registre de Commerce (RC)</FormLabel>
                <FormInput name="rc" defaultValue={trainer.rc ?? ""} />
              </div>
              <div>
                <FormLabel>Identifiant Fiscal (IF)</FormLabel>
                <FormInput name="ifFiscal" defaultValue={trainer.ifFiscal ?? ""} />
              </div>
              <div>
                <FormLabel>CNSS</FormLabel>
                <FormInput name="cnss" defaultValue={trainer.cnss ?? ""} />
              </div>
              <div>
                <FormLabel>IBAN</FormLabel>
                <FormInput name="iban" defaultValue={trainer.iban ?? ""} />
              </div>
              <div>
                <FormLabel>Banque</FormLabel>
                <FormInput name="bankName" defaultValue={trainer.bankName ?? ""} />
              </div>
              <div>
                <FormLabel>Délai de paiement (jours)</FormLabel>
                <FormInput name="paymentTerms" type="number" min="0" defaultValue={trainer.paymentTerms?.toString() ?? "30"} />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link href={`/formateurs/${id}`} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Annuler
          </Link>
          <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Enregistrer les modifications
          </button>
        </div>
      </form>

      {/* Additional legal entities (EXTERNE only) */}
      {!isInterne && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Entités légales supplémentaires</h2>
            <span className="text-xs text-muted-foreground">{trainer.legalEntities.length} entité(s)</span>
          </div>

          {trainer.legalEntities.map((entity) => (
            <div key={entity.id} className="bg-card border border-amber-500/10 rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-medium text-sm text-foreground">{entity.entityName || "Entité sans nom"}</p>
                  {entity.legalStatus && (
                    <p className="text-xs text-muted-foreground mt-0.5">{entity.legalStatus}</p>
                  )}
                </div>
                <form action={handleRemoveEntity}>
                  <input type="hidden" name="id" value={entity.id} />
                  <input type="hidden" name="trainerId" value={trainer.id} />
                  <button type="submit" className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors" title="Supprimer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                {entity.ice && <LegalField label="ICE" value={entity.ice} />}
                {entity.rc && <LegalField label="RC" value={entity.rc} />}
                {entity.ifFiscal && <LegalField label="IF" value={entity.ifFiscal} />}
                {entity.cnss && <LegalField label="CNSS" value={entity.cnss} />}
                {entity.iban && <LegalField label="IBAN" value={entity.iban} />}
                {entity.bankName && <LegalField label="Banque" value={entity.bankName} />}
              </div>
            </div>
          ))}

          {trainer.legalEntities.length === 0 && !showAddEntity && (
            <p className="text-sm text-muted-foreground italic">Aucune entité légale supplémentaire.</p>
          )}

          {/* Add entity form */}
          {showAddEntity ? (
            <div className="bg-card border border-dashed border-amber-500/40 rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-sm text-foreground">Nouvelle entité légale</h3>
              <form action={handleAddEntity} className="grid grid-cols-2 gap-4">
                <input type="hidden" name="trainerId" value={trainer.id} />
                <div className="col-span-2">
                  <FormLabel>Nom de l&apos;entité</FormLabel>
                  <FormInput name="entityName" placeholder="Ex: SARL Alaoui Formation" />
                </div>
                <div>
                  <FormLabel>Statut juridique</FormLabel>
                  <select name="legalStatus" className={selectCls}>
                    <option value="">— Choisir —</option>
                    <option value="Auto-entrepreneur">Auto-entrepreneur</option>
                    <option value="SARL">SARL</option>
                    <option value="SA">SA</option>
                    <option value="Personne physique">Personne physique</option>
                  </select>
                </div>
                <div>
                  <FormLabel>ICE</FormLabel>
                  <FormInput name="ice" placeholder="001234567890123" />
                </div>
                <div>
                  <FormLabel>RC</FormLabel>
                  <FormInput name="rc" placeholder="Casa-12345" />
                </div>
                <div>
                  <FormLabel>IF Fiscal</FormLabel>
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
                <div className="col-span-2 flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => setShowAddEntity(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Annuler
                  </button>
                  <button type="submit" className="px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-sm font-medium hover:bg-amber-500/20 transition-colors">
                    Ajouter
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddEntity(true)}
              className="flex items-center gap-2 px-4 py-2 border border-dashed border-amber-500/40 text-amber-400 rounded-xl text-sm hover:bg-amber-500/5 transition-colors w-full justify-center"
            >
              <Plus className="h-4 w-4" />
              Ajouter une entité légale supplémentaire
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LegalField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-16 shrink-0">{label}</span>
      <span className="font-mono text-foreground truncate">{value}</span>
    </div>
  );
}

function FormLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
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
  defaultValue,
  min,
  step,
  placeholder,
}: {
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  min?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <input
      name={name}
      type={type}
      required={required}
      defaultValue={defaultValue}
      min={min}
      step={step}
      placeholder={placeholder}
      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
  );
}

const selectCls = "w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";
