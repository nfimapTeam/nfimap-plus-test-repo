"use client";

import React from "react";
import { Box, Container } from "@chakra-ui/react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import { bgColorState } from "../../Atom/bgColorState";
import { bookingResultState } from "../../Atom/bookingResultState";
import { useRecoilValue } from "recoil";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const bg = useRecoilValue(bgColorState);
  const isBookingResultPage = useRecoilValue(bookingResultState);
  const pathname = usePathname();
  const isBookingPage = pathname?.includes("/booking") ?? false;
  const isTicketingPage = pathname?.includes("/ticketing/nfiapark") || pathname?.includes("/ticketing/nfialink");
  const isScreenFitPage = isTicketingPage && !isBookingResultPage;

  return (
    <Box 
      height={isScreenFitPage ? "100svh" : "auto"}
      minHeight="100svh"
      maxHeight={isScreenFitPage ? "100svh" : "none"}
      display="flex" 
      justifyContent="center" 
      backgroundColor={bg}
      overflow={isScreenFitPage ? "hidden" : "visible"}
    >
      <Container 
        maxW="480px"
        height={isScreenFitPage ? "100svh" : "auto"}
        minHeight={isScreenFitPage ? "unset" : "100svh"}
        maxHeight={isScreenFitPage ? "100svh" : "none"}
        p={0}
        backgroundColor="white"
        boxShadow="lg"
        display="flex"
        flexDirection="column"
        overflow={isScreenFitPage ? "hidden" : "visible"}
      >
        {!isBookingPage && <Header />}
        <main style={{ 
          height: isScreenFitPage ? (isBookingPage ? "100svh" : "calc(100svh - 68px)") : "auto",
          maxHeight: isScreenFitPage ? (isBookingPage ? "100svh" : "calc(100svh - 68px)") : "none",
          overflow: isScreenFitPage ? "hidden" : "visible",
          display: "flex",
          flexDirection: "column",
          flex: 1
        }}>
          {children}
        </main>
      </Container>
    </Box>
  );
};

export default Layout;
