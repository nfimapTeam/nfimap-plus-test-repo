"use client";

import React, { useEffect } from "react";
import { Box, Flex, Image, Button } from "@chakra-ui/react";

interface NfitiProps {
  onStartTest: () => void;
}

const Nfiti = ({ onStartTest }: NfitiProps) => {
  const preloads = [
    "/image/nfiti/start/00_START_PAGE_startN.svg",
    "/image/nfiti/start/00_START_PAGE_startB.svg",
    "/image/nfiti/start/00_START_PAGE_animation.avifs",
  ];

  const preloadAllImages = () => {
    preloads.forEach((src) => {
      const img = new (window as any).Image() as HTMLImageElement;
      img.src = src;
    });
  };

  useEffect(() => {
    preloadAllImages();
  }, []);

  return (
    <Flex
      direction="column"
      justifyContent="space-between"
      alignItems="center"
      w="100%"
      h="calc(100svh - 68px)"
      overflow="hidden"
      p="20px 0"
    >
      <Flex h="120px" flexShrink={0} justifyContent="center" alignItems="center" p="10px 40px">
        <Image
          src="/image/nfiti/start/00_START_PAGE_startN.svg"
          alt="제목"
          w="300px"
          h="auto"
          objectFit="contain"
          loading="eager"
        />
      </Flex>
      <Flex
        flex={1}
        alignItems="center"
        justifyContent="center"
        borderRadius="md"
        overflow="hidden"
        w="100%"
      >
        <Image
          src="/image/nfiti/start/00_START_PAGE_animation.avifs"
          alt="랜덤 이미지"
          objectFit="contain"
          maxH="100%"
          loading="eager"
        />
      </Flex>
      <Flex h="100px" flexShrink={0} justifyContent="center" alignItems="center" p="10px 80px">
        <Button
          onClick={onStartTest}
          bg="transparent"
          _hover={{
            bg: "transparent",
            transform: "scale(1.05)",
          }}
          _active={{
            bg: "transparent",
            transform: "scale(0.95)",
          }}
          borderRadius="md"
          padding="0"
          w="240px"
          h="71px"
          minWidth="auto"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Image
            src="/image/nfiti/start/00_START_PAGE_startB.svg"
            alt="테스트 시작"
            w="100%"
            h="100%"
            objectFit="contain"
            loading="eager"
          />
        </Button>
      </Flex>
    </Flex>
  );
};

export default Nfiti;
