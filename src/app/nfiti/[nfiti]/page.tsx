

import React from "react";
import Share from "../../../legacy-pages/Nfiti/components/Share";

interface PageProps {
  params: {
    nfiti: string;
  };
}

export function generateStaticParams() {
  const codes = ["inf", "int", "isf", "ist", "enf", "ent", "est", "esf"];
  return [
    ...codes.map((c) => ({ nfiti: c })),
    ...codes.map((c) => ({ nfiti: c.toUpperCase() })),
  ];
}

export default function SharePage({ params }: PageProps) {
  const nfitiCode = params.nfiti.toUpperCase();
  return <Share nfiti={nfitiCode} />;
}
