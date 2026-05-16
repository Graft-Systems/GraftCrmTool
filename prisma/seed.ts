import "dotenv/config";

import { DEFAULT_RELATIONSHIP_STAGES, SEED_WORKSPACE_USERS } from "../src/lib/constants";
import { prisma } from "../src/lib/db";

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { id: "seed-workspace" },
    update: {
      name: "Graft Systems",
      capitalSplitBuckets: [
        { key: "burn", label: "Burn runway", percent: 45 },
        { key: "hiring", label: "Hiring", percent: 30 },
        { key: "buffer", label: "Strategic buffer", percent: 25 },
      ],
    },
    create: {
      id: "seed-workspace",
      name: "Graft Systems",
      capitalSplitBuckets: [
        { key: "burn", label: "Burn runway", percent: 45 },
        { key: "hiring", label: "Hiring", percent: 30 },
        { key: "buffer", label: "Strategic buffer", percent: 25 },
      ],
    },
  });

  await prisma.company.deleteMany({ where: { id: "seed-company-stonefield" } });

  for (const stage of DEFAULT_RELATIONSHIP_STAGES) {
    await prisma.relationshipStage.upsert({
      where: {
        workspaceId_key: {
          workspaceId: workspace.id,
          key: stage.key,
        },
      },
      update: {
        label: stage.label,
        sortOrder: stage.sortOrder,
      },
      create: {
        workspaceId: workspace.id,
        key: stage.key,
        label: stage.label,
        sortOrder: stage.sortOrder,
      },
    });
  }

  for (const seedUser of SEED_WORKSPACE_USERS) {
    await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {
        name: seedUser.name,
        workspaceId: workspace.id,
        role: seedUser.role,
      },
      create: {
        email: seedUser.email,
        name: seedUser.name,
        workspaceId: workspace.id,
        role: seedUser.role,
      },
    });
  }

  const owner = await prisma.user.findUniqueOrThrow({
    where: { email: SEED_WORKSPACE_USERS[0].email },
  });

  const exploringStage = await prisma.relationshipStage.findFirst({
    where: {
      workspaceId: workspace.id,
      key: "exploring",
    },
  });

  const sampleCompany = await prisma.company.upsert({
    where: { id: "seed-company-acme" },
    update: {
      name: "Acme Robotics",
      website: "https://acme.example",
      domain: "acme.example",
      description: "Industrial automation pilot prospect.",
      relationshipStageId: exploringStage?.id,
      tags: ["manufacturing", "warm-intro"],
      needs: "Needs a faster way to route field notes into account follow-ups.",
      accountOwnerId: owner.id,
    },
    create: {
      id: "seed-company-acme",
      workspaceId: workspace.id,
      name: "Acme Robotics",
      website: "https://acme.example",
      domain: "acme.example",
      description: "Industrial automation pilot prospect.",
      relationshipStageId: exploringStage?.id,
      tags: ["manufacturing", "warm-intro"],
      needs: "Needs a faster way to route field notes into account follow-ups.",
      accountOwnerId: owner.id,
    },
  });

  await prisma.contact.upsert({
    where: { id: "seed-contact-sarah" },
    update: {
      companyId: sampleCompany.id,
      name: "Sarah Chen",
      email: "sarah@acme.example",
      title: "VP Operations",
      contactRole: "champion",
      isPrimary: true,
      notes: "Prefers async updates and short weekly check-ins.",
    },
    create: {
      id: "seed-contact-sarah",
      companyId: sampleCompany.id,
      name: "Sarah Chen",
      email: "sarah@acme.example",
      title: "VP Operations",
      contactRole: "champion",
      isPrimary: true,
      notes: "Prefers async updates and short weekly check-ins.",
    },
  });

  await prisma.contact.upsert({
    where: { id: "seed-contact-marcus" },
    update: {
      companyId: sampleCompany.id,
      name: "Marcus Lee",
      email: "marcus@acme.example",
      title: "Head of IT",
      contactRole: "technical",
      isPrimary: false,
    },
    create: {
      id: "seed-contact-marcus",
      companyId: sampleCompany.id,
      name: "Marcus Lee",
      email: "marcus@acme.example",
      title: "Head of IT",
      contactRole: "technical",
      isPrimary: false,
    },
  });

  const sarah = await prisma.contact.findUnique({ where: { id: "seed-contact-sarah" } });
  const teammate = await prisma.user.findUnique({
    where: { email: SEED_WORKSPACE_USERS[1].email },
  });

  await prisma.interaction.upsert({
    where: { id: "seed-interaction-acme-call" },
    update: {
      companyId: sampleCompany.id,
      contactId: sarah?.id,
      type: "call",
      occurredAt: new Date("2026-05-10T15:00:00.000Z"),
      notes: "Discussed pilot scope, data handoff, and who should own weekly follow-ups.",
      createdById: owner.id,
    },
    create: {
      id: "seed-interaction-acme-call",
      companyId: sampleCompany.id,
      contactId: sarah?.id,
      type: "call",
      occurredAt: new Date("2026-05-10T15:00:00.000Z"),
      notes: "Discussed pilot scope, data handoff, and who should own weekly follow-ups.",
      createdById: owner.id,
    },
  });

  const dueSoon = new Date();
  dueSoon.setDate(dueSoon.getDate() + 1);
  const dueLater = new Date();
  dueLater.setDate(dueLater.getDate() + 5);

  await prisma.followUpTask.upsert({
    where: { id: "seed-task-acme-recap" },
    update: {
      companyId: sampleCompany.id,
      contactId: sarah?.id,
      title: "Send pilot recap to Sarah",
      description: "Include timeline, owners, and the next decision point.",
      status: "open",
      dueAt: dueSoon,
      ownerId: owner.id,
      createdById: owner.id,
    },
    create: {
      id: "seed-task-acme-recap",
      companyId: sampleCompany.id,
      contactId: sarah?.id,
      title: "Send pilot recap to Sarah",
      description: "Include timeline, owners, and the next decision point.",
      status: "open",
      dueAt: dueSoon,
      ownerId: owner.id,
      createdById: owner.id,
    },
  });

  const sampleDeal = await prisma.deal.upsert({
    where: { id: "seed-deal-acme-platform" },
    update: {
      workspaceId: workspace.id,
      companyId: sampleCompany.id,
      name: "Platform rollout",
      stage: "proposal",
      valueEstimate: 120000,
      expectedClose: dueLater,
      ownerId: owner.id,
      notes: "Expansion tied to the field-notes pilot.",
    },
    create: {
      id: "seed-deal-acme-platform",
      workspaceId: workspace.id,
      companyId: sampleCompany.id,
      name: "Platform rollout",
      stage: "proposal",
      valueEstimate: 120000,
      expectedClose: dueLater,
      ownerId: owner.id,
      notes: "Expansion tied to the field-notes pilot.",
    },
  });

  const samplePilot = await prisma.pilot.upsert({
    where: { id: "seed-pilot-acme-field-notes" },
    update: {
      companyId: sampleCompany.id,
      dealId: sampleDeal.id,
      name: "Field notes pilot",
      status: "active",
      startAt: new Date("2026-05-01T00:00:00.000Z"),
      targetEndAt: dueLater,
      successCriteria: "Two teams logging notes weekly with follow-ups created in under 24 hours.",
      ownerId: teammate?.id ?? owner.id,
      notes: "Primary evaluation track for Acme.",
    },
    create: {
      id: "seed-pilot-acme-field-notes",
      companyId: sampleCompany.id,
      dealId: sampleDeal.id,
      name: "Field notes pilot",
      status: "active",
      startAt: new Date("2026-05-01T00:00:00.000Z"),
      targetEndAt: dueLater,
      successCriteria: "Two teams logging notes weekly with follow-ups created in under 24 hours.",
      ownerId: teammate?.id ?? owner.id,
      notes: "Primary evaluation track for Acme.",
    },
  });

  await prisma.followUpTask.update({
    where: { id: "seed-task-acme-recap" },
    data: {
      dealId: sampleDeal.id,
      pilotId: samplePilot.id,
    },
  });

  await prisma.capitalReceipt.upsert({
    where: { id: "seed-capital-receipt-1" },
    update: {
      workspaceId: workspace.id,
      amount: 85000,
      title: "Acme platform deposit",
      source: "deal",
      dealId: sampleDeal.id,
      receivedAt: new Date("2026-05-12T12:00:00.000Z"),
      notes: "Initial cash against signed SOW.",
      createdById: owner.id,
    },
    create: {
      id: "seed-capital-receipt-1",
      workspaceId: workspace.id,
      amount: 85000,
      title: "Acme platform deposit",
      source: "deal",
      dealId: sampleDeal.id,
      receivedAt: new Date("2026-05-12T12:00:00.000Z"),
      notes: "Initial cash against signed SOW.",
      createdById: owner.id,
    },
  });

  await prisma.investorProfile.upsert({
    where: { companyId: sampleCompany.id },
    update: {
      fundName: "Northline Ventures",
      checkSizeBand: "$250k-$1M",
      thesisTags: ["industrial", "workflow-ai"],
      warmIntroSource: "Conference operator intro",
      stage: "diligence",
      nextStep: "Share pilot metrics after week two.",
      notes: "Interested in workflow capture for field teams.",
    },
    create: {
      companyId: sampleCompany.id,
      fundName: "Northline Ventures",
      checkSizeBand: "$250k-$1M",
      thesisTags: ["industrial", "workflow-ai"],
      warmIntroSource: "Conference operator intro",
      stage: "diligence",
      nextStep: "Share pilot metrics after week two.",
      notes: "Interested in workflow capture for field teams.",
    },
  });

  await prisma.partnerProfile.upsert({
    where: { companyId: sampleCompany.id },
    update: {
      partnerType: "Technology alliance",
      programStatus: "exploring",
      ownerId: owner.id,
      integrationNotes: "Evaluate co-marketing once the pilot lands.",
      notes: "Potential integration with their field service stack.",
    },
    create: {
      companyId: sampleCompany.id,
      partnerType: "Technology alliance",
      programStatus: "exploring",
      ownerId: owner.id,
      integrationNotes: "Evaluate co-marketing once the pilot lands.",
      notes: "Potential integration with their field service stack.",
    },
  });

  const secondCompany = await prisma.company.upsert({
    where: { id: "seed-company-northwind" },
    update: {
      name: "Northwind Logistics",
      website: "https://northwind.example",
      domain: "northwind.example",
      description: "Regional logistics partner exploring our routing platform.",
      relationshipStageId: exploringStage?.id,
      tags: ["logistics", "warm-intro"],
      needs:
        "Wants better visibility into delivery exceptions and a clearer ROI story before committing to a paid pilot.",
      accountOwnerId: owner.id,
    },
    create: {
      id: "seed-company-northwind",
      workspaceId: workspace.id,
      name: "Northwind Logistics",
      website: "https://northwind.example",
      domain: "northwind.example",
      description: "Regional logistics partner exploring our routing platform.",
      relationshipStageId: exploringStage?.id,
      tags: ["logistics", "warm-intro"],
      needs:
        "Wants better visibility into delivery exceptions and a clearer ROI story before committing to a paid pilot.",
      accountOwnerId: owner.id,
    },
  });

  await prisma.contact.upsert({
    where: { id: "seed-contact-elena" },
    update: {
      companyId: secondCompany.id,
      name: "Elena Marchetti",
      email: "elena@northwind.example",
      title: "VP Operations",
      contactRole: "champion",
      isPrimary: true,
      notes: "Decision maker on the pilot; prefers concise weekly updates.",
    },
    create: {
      id: "seed-contact-elena",
      companyId: secondCompany.id,
      name: "Elena Marchetti",
      email: "elena@northwind.example",
      title: "VP Operations",
      contactRole: "champion",
      isPrimary: true,
      notes: "Decision maker on the pilot; prefers concise weekly updates.",
    },
  });

  await prisma.capitalReceipt.upsert({
    where: { id: "seed-capital-receipt-northwind-pilot" },
    update: {
      workspaceId: workspace.id,
      amount: 4200,
      title: "Northwind pilot — first invoice",
      source: "customer",
      receivedAt: new Date("2026-05-08T12:00:00.000Z"),
      notes: "Initial pilot kickoff invoice.",
      createdById: owner.id,
    },
    create: {
      id: "seed-capital-receipt-northwind-pilot",
      workspaceId: workspace.id,
      amount: 4200,
      title: "Northwind pilot — first invoice",
      source: "customer",
      receivedAt: new Date("2026-05-08T12:00:00.000Z"),
      notes: "Initial pilot kickoff invoice.",
      createdById: owner.id,
    },
  });

  await prisma.followUpTask.upsert({
    where: { id: "seed-task-acme-security" },
    update: {
      companyId: sampleCompany.id,
      title: "Confirm IT security review path",
      description: "Loop in Marcus on data retention and access controls.",
      status: "open",
      dueAt: dueLater,
      ownerId: teammate?.id ?? null,
      createdById: owner.id,
    },
    create: {
      id: "seed-task-acme-security",
      companyId: sampleCompany.id,
      title: "Confirm IT security review path",
      description: "Loop in Marcus on data retention and access controls.",
      status: "open",
      dueAt: dueLater,
      ownerId: teammate?.id ?? null,
      createdById: owner.id,
    },
  });

  const existingComment = await prisma.comment.findFirst({
    where: { companyId: sampleCompany.id, authorId: owner.id },
  });
  if (!existingComment) {
    await prisma.comment.create({
      data: {
        workspaceId: workspace.id,
        companyId: sampleCompany.id,
        authorId: owner.id,
        body:
          "Heads up: their procurement lead is out next week. Re-engage after the 22nd and lead with the pilot ROI slide.",
      },
    });
  }

  console.info(
    "[seed] Done. Each user chooses their own password on first sign-in (seeded rows start without a stored hash). Re-running seed does not change passwords already saved.",
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
