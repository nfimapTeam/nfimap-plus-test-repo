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

  return (
    <Box 
      height={isBookingResultPage ? "auto" : "100svh"}
      minHeight="100svh"
      maxHeight={isBookingResultPage ? "none" : "100svh"}
      display="flex" 
      justifyContent="center" 
      backgroundColor={bg}
      overflow={isBookingResultPage ? "visible" : "hidden"}
    >
      <Container 
        maxW="480px"
        height={isBookingResultPage ? "auto" : "100svh"}
        minHeight={isBookingResultPage ? "100svh" : "unset"}
        maxHeight={isBookingResultPage ? "none" : "100svh"}
        p={0}
        backgroundColor="white"
        boxShadow="lg"
        display="flex"
        flexDirection="column"
        overflow={isBookingResultPage ? "visible" : "hidden"}
      >
        {!isBookingPage && <Header />}
        <main style={{ 
          height: isBookingResultPage ? "auto" : (isBookingPage ? "100svh" : "calc(100svh - 68px)"),
          maxHeight: isBookingResultPage ? "none" : (isBookingPage ? "100svh" : "calc(100svh - 68px)"),
          overflow: isBookingResultPage ? "visible" : "hidden",
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
