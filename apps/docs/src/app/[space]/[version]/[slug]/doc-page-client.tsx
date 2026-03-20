"use client";

import React, { useMemo } from "react";
import { buildDocumentIdentity, DocumentView } from "@/modules/documentation";

interface DocPageClientProps {
  space: string;
  version: string;
  slug: string;
}

export function DocPageClient({ space, version, slug }: DocPageClientProps) {
  const identity = useMemo(
    () => buildDocumentIdentity(space, version, slug),
    [space, version, slug],
  );

  return <DocumentView identity={identity} />;
}
