import { db } from "@ccelog/db";
import { formatDate } from "@/lib/utils";

// String-keyed maps to avoid depending on Prisma enum type compatibility
const DOC_TYPE_LABELS: Record<string, string> = {
  ATTESTATION: "Attestation",
  CACES_CERT: "CACES Cert",
  RAPPORT: "Rapport",
  CONVOCATION: "Convocation",
  ORDRE_MISSION: "Ordre de mission",
  FEUILLE_PRESENCE: "Feuille de présence",
  LISTE_PRESENCE: "Liste de présence",
  EVALUATION: "Évaluation",
  TEST: "Test",
  CERTIFICAT: "Certificat",
  BON_SORTIE_MATERIEL: "Bon sortie matériel",
  VOUCHER_HOTEL: "Voucher hôtel",
};

const DOC_TYPE_BADGE: Record<string, string> = {
  ATTESTATION: "bg-green-500/15 text-green-400",
  CACES_CERT: "bg-blue-500/15 text-blue-400",
  RAPPORT: "bg-purple-500/15 text-purple-400",
  CONVOCATION: "bg-yellow-500/15 text-yellow-400",
  ORDRE_MISSION: "bg-orange-500/15 text-orange-400",
  FEUILLE_PRESENCE: "bg-gray-500/15 text-gray-400",
};

const DOC_STATUS_BADGE: Record<string, string> = {
  VALIDE: "bg-green-500/15 text-green-400",
  ENVOYE_CLIENT: "bg-blue-500/15 text-blue-400",
  PRET: "bg-yellow-500/15 text-yellow-400",
  A_PREPARER: "bg-gray-500/15 text-gray-400",
  REMIS_FORMATEUR: "bg-gray-500/15 text-gray-400",
  RECUPERE: "bg-gray-500/15 text-gray-400",
};

const DOC_STATUS_LABELS: Record<string, string> = {
  A_PREPARER: "À préparer",
  PRET: "Prêt",
  REMIS_FORMATEUR: "Remis formateur",
  RECUPERE: "Récupéré",
  VALIDE: "Validé",
  ENVOYE_CLIENT: "Envoyé client",
};

export const metadata = { title: "Archivage & GED" };

export default async function GedPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: typeFilter } = await searchParams;

  const documents = await db.document.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      session: {
        include: {
          trainer: true,
          theme: true,
          request: {
            include: {
              client: true,
              site: true,
            },
          },
        },
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: typeFilter ? { type: typeFilter as any } : undefined,
  });

  // Build tree: Client → Site → Theme → "YYYY/MM" → documents
  type DocLeaf = (typeof documents)[number];
  type MonthMap = Map<string, DocLeaf[]>;
  type ThemeMap = Map<string, MonthMap>;
  type SiteMap = Map<string, ThemeMap>;
  type ClientMap = Map<string, SiteMap>;

  const tree: ClientMap = new Map();

  for (const doc of documents) {
    const clientName = doc.session.request.client.name;
    const siteLabel = `${doc.session.request.site.label} (${doc.session.request.site.city})`;
    const themeLabel = doc.session.theme.label;
    const createdAt = new Date(doc.createdAt);
    const monthKey = `${createdAt.getFullYear()}/${String(createdAt.getMonth() + 1).padStart(2, "0")}`;

    if (!tree.has(clientName)) tree.set(clientName, new Map());
    const siteMap = tree.get(clientName)!;
    if (!siteMap.has(siteLabel)) siteMap.set(siteLabel, new Map());
    const themeMap = siteMap.get(siteLabel)!;
    if (!themeMap.has(themeLabel)) themeMap.set(themeLabel, new Map());
    const monthMap = themeMap.get(themeLabel)!;
    if (!monthMap.has(monthKey)) monthMap.set(monthKey, []);
    monthMap.get(monthKey)!.push(doc);
  }

  const docTypes = Object.keys(DOC_TYPE_LABELS);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Archivage &amp; GED</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {documents.length} document{documents.length !== 1 ? "s" : ""} archivé{documents.length !== 1 ? "s" : ""}
          </p>
        </div>
        {/* Filter */}
        <form method="GET">
          <select
            name="type"
            defaultValue={typeFilter ?? ""}
            className="bg-card border border-border text-foreground text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
            onChangeCapture={undefined}
          >
            <option value="">Tous les types</option>
            {docTypes.map((t) => (
              <option key={t} value={t}>
                {DOC_TYPE_LABELS[t] ?? t}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="ml-2 px-3 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors"
          >
            Filtrer
          </button>
          {typeFilter && (
            <a
              href="/ged"
              className="ml-2 px-3 py-2 bg-secondary text-foreground text-sm rounded-md hover:bg-secondary/80 transition-colors"
            >
              Réinitialiser
            </a>
          )}
        </form>
      </div>

      {/* Tree */}
      {tree.size === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">Aucun document archivé.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="divide-y divide-border">
            {Array.from(tree.entries()).map(([clientName, siteMap]) => (
              <details key={clientName} open className="group">
                <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors select-none list-none">
                  <span className="text-xs text-muted-foreground group-open:rotate-90 inline-block transition-transform">▶</span>
                  <span className="font-semibold text-foreground">{clientName}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {Array.from(siteMap.values()).flatMap((tm) =>
                      Array.from(tm.values()).flatMap((mm) =>
                        Array.from(mm.values())
                      )
                    ).flat().length} docs
                  </span>
                </summary>
                <div className="ml-4 border-l border-border">
                  {Array.from(siteMap.entries()).map(([siteLabel, themeMap]) => (
                    <details key={siteLabel} open className="group/site">
                      <summary className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-secondary/30 transition-colors select-none list-none">
                        <span className="text-xs text-muted-foreground group-open/site:rotate-90 inline-block transition-transform">▶</span>
                        <span className="font-medium text-foreground text-sm">{siteLabel}</span>
                      </summary>
                      <div className="ml-4 border-l border-border">
                        {Array.from(themeMap.entries()).map(([themeLabel, monthMap]) => (
                          <details key={themeLabel} open className="group/theme">
                            <summary className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-secondary/20 transition-colors select-none list-none">
                              <span className="text-xs text-muted-foreground group-open/theme:rotate-90 inline-block transition-transform">▶</span>
                              <span className="text-sm text-muted-foreground">{themeLabel}</span>
                            </summary>
                            <div className="ml-4 border-l border-border">
                              {Array.from(monthMap.entries()).map(([monthKey, docs]) => (
                                <details key={monthKey} open className="group/month">
                                  <summary className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-secondary/10 transition-colors select-none list-none text-xs text-muted-foreground">
                                    <span className="group-open/month:rotate-90 inline-block transition-transform">▶</span>
                                    <span>{monthKey}</span>
                                    <span className="ml-auto">{docs.length} doc{docs.length !== 1 ? "s" : ""}</span>
                                  </summary>
                                  <div className="divide-y divide-border/50">
                                    {docs.map((doc) => (
                                      <div
                                        key={doc.id}
                                        className="flex items-center gap-3 px-6 py-2.5 hover:bg-secondary/5 transition-colors"
                                      >
                                        {/* Type badge */}
                                        <span
                                          className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                                            DOC_TYPE_BADGE[doc.type] ?? "bg-secondary text-muted-foreground"
                                          }`}
                                        >
                                          {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                                        </span>
                                        {/* Filename */}
                                        <span className="text-sm text-foreground truncate flex-1 min-w-0">
                                          {doc.fileName ?? <span className="text-muted-foreground italic">Sans nom</span>}
                                        </span>
                                        {/* Status badge */}
                                        <span
                                          className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                                            DOC_STATUS_BADGE[doc.status] ?? "bg-secondary text-muted-foreground"
                                          }`}
                                        >
                                          {DOC_STATUS_LABELS[doc.status]}
                                        </span>
                                        {/* Date */}
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                          {formatDate(doc.createdAt)}
                                        </span>
                                        {/* Download */}
                                        {doc.fileUrl ? (
                                          <a
                                            href={doc.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="shrink-0 text-xs text-primary hover:underline"
                                          >
                                            Télécharger
                                          </a>
                                        ) : (
                                          <span className="shrink-0 text-xs text-muted-foreground">–</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              ))}
                            </div>
                          </details>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
