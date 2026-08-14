"use client";

import { useState } from "react";
import { Section, Eyebrow } from "./primitives";
import { Reveal } from "@/components/Reveal";

// Answers mirror docs/TRUST.md's honest framing: what SILENT does, what it
// does NOT claim (SIMULATED_TEE, no execution privacy), and what is trusted.
const ITEMS = [
  {
    q: "What exactly is SILENT?",
    a: "A confidential treasury OS on Flare. FXRP is shielded into SilentVault behind a commitment-only hash, policies are evaluated privately inside a TEE, and settlement is proven on-chain via signed attestation, a fresh FTSO price, and FDC evidence.",
  },
  {
    q: "Is my balance ever visible on-chain?",
    a: "No. shield() stores only keccak256(amount + salt + user) — the commitment. No amount is ever stored or emitted, not even as a marketing stat. proveReserves proves a threshold without revealing the balance.",
  },
  {
    q: "What does the TEE actually do?",
    a: "It holds your encrypted policy, polls the live FTSO feed privately, and decides when to settle: trigger prices, trailing stops, payroll batches, redemption destinations. The keeper that calls tick() can't decrypt anything — it only forwards bytes.",
  },
  {
    q: "Is it real confidential compute?",
    a: "Honest answer: SIMULATED_TEE today. The enclave is a Go process with the same interface, signature scheme, and on-chain verification path production would use, but no remote attestation yet. Hardware attestation via TeeMachineRegistry is the roadmap.",
  },
  {
    q: "How is settlement proven on-chain?",
    a: "Three checks in settle(): the TEE signature against the allowlisted signer, the FTSO feed re-checked on-chain for freshness (≤300s) and trigger condition, and the FDC Merkle proof when the path redeems to XRPL — recorded as CrossChainEvidenceRecorded.",
  },
  {
    q: "Who can settle?",
    a: "Only the allowlisted TEE signer. The keeper is untrusted by design: anyone can run one, running zero just means orders wait for someone else to tick them. There is no owner withdraw and liabilities are isolated per vault.",
  },
  {
    q: "What does SILENT not hide?",
    a: "Execution. Once settle() is a public transaction, its calldata is visible in the mempool like any other. What's hidden is standing intent — the policy itself — never the settlement. That is a deliberate, documented boundary, not an oversight.",
  },
  {
    q: "Is this a live product?",
    a: "Deployed and verified on Flare Coston2 (addresses in docs/DEPLOY.md) as a hackathon build with a real cryptographic core. Not audited, not mainnet. TRUST.md states exactly what's trusted versus what's verified — read it before treating it as production.",
  },
];

function FaqItem({
  index,
  question,
  answer,
  open,
  onToggle,
}: {
  index: number;
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = `faq-panel-${index}`;
  const buttonId = `faq-button-${index}`;
  return (
    <div className="border-b border-term-border">
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-6 rounded-lg py-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-term-violet focus-visible:ring-offset-2"
        >
          <span className="text-[17px] font-medium tracking-tight text-term-text sm:text-lg">
            {question}
          </span>
          <span
            aria-hidden
            className={`relative h-5 w-5 shrink-0 text-term-muted transition-transform duration-300 motion-reduce:transition-none ${
              open ? "rotate-45 text-term-violet" : ""
            }`}
          >
            <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current" />
            <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="max-w-2xl pb-6 text-[15px] leading-relaxed text-term-muted">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Section id="faq" className="py-24 sm:py-32">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <Reveal>
          <div className="lg:sticky lg:top-32">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-term-text sm:text-5xl">
              Questions, answered honestly.
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-term-muted sm:text-xl">
              The short version of how SILENT works — and just as important,
              what it is not.
            </p>
          </div>
        </Reveal>

        <div className="border-t border-term-border">
          {ITEMS.map((item, i) => (
            <Reveal key={item.q} delay={i * 0.04}>
              <FaqItem
                index={i}
                question={item.q}
                answer={item.a}
                open={open === i}
                onToggle={() => setOpen(open === i ? null : i)}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
