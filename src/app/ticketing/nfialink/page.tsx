"use client";

import React, { Suspense } from "react";
import TicketlinkHome from "../../../legacy-pages/Ticketing/Ticketlink/TicketlinkHome";
import { Box, Text } from "@chakra-ui/react";

export default function TicketlinkPage() {
  return (
    <Suspense fallback={<Box p={6} textAlign="center"><Text>로딩 중...</Text></Box>}>
      <TicketlinkHome />
    </Suspense>
  );
}
