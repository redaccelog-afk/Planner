"use client";

type Row = {
  nickname: string;
  teamName: string | null;
  totalScore: number;
  cells: { isCorrect: boolean; pointsAwarded: number; answered: boolean }[];
};

export default function ExportCsvButton({
  filename,
  questions,
  rows,
}: {
  filename: string;
  questions: string[];
  rows: Row[];
}) {
  function handleExport() {
    const header = ["Joueur", "Équipe", ...questions, "Total"];
    const lines = rows.map((row) => {
      const cells = row.cells.map((c) => (c.answered ? (c.isCorrect ? `Correct (${c.pointsAwarded})` : "Incorrect") : ""));
      return [row.nickname, row.teamName ?? "", ...cells, String(row.totalScore)];
    });
    const csv = [header, ...lines].map((line) => line.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button onClick={handleExport} className="btn-secondary">
      Télécharger CSV
    </button>
  );
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
