import React from "react";
import { Box, Container } from "@chakra-ui/react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import { bgColorState } from "../../Atom/bgColorState";
import { useRecoilValue } from "recoil";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const bg = useRecoilValue(bgColorState);
  const location = useLocation();
  const isBookingPage = location.pathname === "/ticketing/interpark/booking";

  return (
    <Box 
      height="100%"
      display="flex" 
      justifyContent="center" 
      backgroundColor={bg}
    >
      <Container 
        maxW="480px"
        height="100%"
        p={0}
        backgroundColor="white"
        boxShadow="lg"
      >
        {!isBookingPage && <Header />}
        <main style={{ minHeight: isBookingPage ? "100svh" : "calc(100svh - 68px)"}}>{children}</main>
      </Container>
    </Box>
  );
};

export default Layout;
