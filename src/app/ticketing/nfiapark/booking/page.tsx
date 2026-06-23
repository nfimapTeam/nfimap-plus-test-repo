"use client";

import React, { Suspense } from "react";
import InterparkBooking from "../../../../legacy-pages/Ticketing/Interpark/InterparkBooking";
import { Box, Text } from "@chakra-ui/react";

export default function BookingPage() {
  return (
    <Suspense fallback={<Box p={6} textAlign="center"><Text>로딩 중...</Text></Box>}>
      <InterparkBooking />
    </Suspense>
  );
}
