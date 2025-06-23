import React, { useEffect } from "react";
import { Box, Flex, Image } from "@chakra-ui/react";
import { Link } from "react-router-dom";

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
        <Link to="/">
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
