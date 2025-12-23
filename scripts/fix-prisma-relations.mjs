import fs from "fs";

const file = "prisma/schema.prisma";
let s = fs.readFileSync(file, "utf8");
let changed = false;

function replaceOnce(from, to) {
  if (s.includes(from)) {
    s = s.replace(from, to);
    changed = true;
  }
}

// 1) Nombrar relaciones (para evitar ambigüedades)
replaceOnce(
  "org      Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)",
  'org      Organization @relation("OrganizationEngagements", fields: [orgId], references: [id], onDelete: Cascade)'
);

replaceOnce(
  "respondent      User?      @relation(fields: [respondentUserId], references: [id], onDelete: SetNull)",
  'respondent      User?      @relation("AnswerRespondent", fields: [respondentUserId], references: [id], onDelete: SetNull)'
);

replaceOnce(
  "owner         User?         @relation(fields: [ownerUserId], references: [id], onDelete: SetNull)",
  'owner         User?         @relation("KpiOwner", fields: [ownerUserId], references: [id], onDelete: SetNull)'
);

replaceOnce(
  "createdBy     User? @relation(fields: [createdByUserId], references: [id], onDelete: SetNull)",
  'createdBy     User? @relation("KpiValueCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)'
);

replaceOnce(
  "kpi           Kpi?       @relation(fields: [kpiId], references: [id], onDelete: SetNull)",
  'kpi           Kpi?       @relation("KpiInitiatives", fields: [kpiId], references: [id], onDelete: SetNull)'
);

// 2) Insertar “opposite fields” si faltan
function ensureFieldInModel(modelName, fieldLine) {
  const re = new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)\\n\\}`, "m");
  const m = s.match(re);
  if (!m) {
    console.warn(`⚠️  No encontré model ${modelName}`);
    return;
  }

  const block = m[0];
  if (block.includes(fieldLine)) return;

  const newBlock = block.replace(/\n\}\s*$/, `\n  ${fieldLine}\n}`);
  s = s.replace(block, newBlock);
  changed = true;
}

ensureFieldInModel("Organization", 'engagements Engagement[] @relation("OrganizationEngagements")');
ensureFieldInModel("User", 'answers Answer[] @relation("AnswerRespondent")');
ensureFieldInModel("User", 'ownedKpis Kpi[] @relation("KpiOwner")');
ensureFieldInModel("User", 'createdKpiValues KpiValue[] @relation("KpiValueCreatedBy")');
ensureFieldInModel("Kpi", 'initiatives Initiative[] @relation("KpiInitiatives")');

fs.writeFileSync(file, s, "utf8");

console.log(changed ? "✅ schema.prisma actualizado" : "ℹ️ No hubo cambios (puede que tu schema no calce exacto con los textos buscados)");
