"use client";

import React from "react";
import Share from "../../../legacy-pages/Nfiti/components/Share";

interface PageProps {
  params: {
    nfiti: string;
  };
}

export default function SharePage({ params }: PageProps) {
  const nfitiCode = params.nfiti.toUpperCase();
  return <Share nfiti={nfitiCode} />;
}
