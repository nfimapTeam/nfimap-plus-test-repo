import React from "react";
import { Box, Flex, Image } from "@chakra-ui/react";
import Link from "next/link";

const Header = () => {

  return (
    <Box
      p="10px"
      bg="white"
      height="68px"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      position="relative"
    >
      <Flex justifyContent="center" flex="1">
        <Link href="/">
          <Image
            src="/image/logo/logo.svg"
            alt="MyApp Logo"
            h="64px"
          />
        </Link>
      </Flex>
    </Box>
  );
};

export default Header;
