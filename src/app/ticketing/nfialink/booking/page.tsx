"use client";

import React, { Suspense } from "react";
import TicketlinkBooking from "../../../../legacy-pages/Ticketing/Ticketlink/TicketlinkBooking";
import { Box, Text } from "@chakra-ui/react";

export default function BookingPage() {
  return (
    <Suspense fallback={<Box p={6} textAlign="center"><Text>로딩 중...</Text></Box>}>
      <TicketlinkBooking />
    </Suspense>
  );
}
