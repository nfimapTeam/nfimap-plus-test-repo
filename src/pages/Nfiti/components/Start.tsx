import React, { useLayoutEffect, useState } from "react";
import { Box, Flex, Image, Button } from "@chakra-ui/react";
import { convertToWebP } from "../../../utils/utils";

interface NfitiProps {
  onStartTest: () => void;
}

const Nfiti = ({ onStartTest }: NfitiProps) => {
  const [processedImages, setProcessedImages] = useState<string[]>([]);

  const preloadImages = [
    "image/nfiti/start/00_START_PAGE_startN.svg",
    "image/nfiti/start/00_START_PAGE_startB.svg",
  ];

  const processImages = async () => {
    try {
      const processed = await Promise.all(
        preloadImages.map((src) => convertToWebP(src))
      );
      setProcessedImages(processed);
    } catch (error) {
      console.error("Image processing error:", error);
    }
  };

  useLayoutEffect(() => {
    processImages();
  }, []);

  const preloads = [
    "/image/nfiti/start/00_START_PAGE_animation.gif",
  ];
  const preloadAllImages = () => {
    preloads.forEach((src) => {
      const img = new (window as any).Image() as HTMLImageElement;
      img.src = src;
    });
  };

  useLayoutEffect(() => {
    preloadAllImages();
  }, []);

  return (
    <Box position="relative" w="100%" h="calc(100svh - 68px)" overflow="hidden">
      <Flex h="150px" justifyContent="center" alignItems="center" p="20px 40px">
        {processedImages[0] && (
          <Image src={processedImages[0]} alt="제목" loading="eager" />
        )}
      </Flex>
      <Flex
        h="calc(100svh - 368px)"
        alignItems="center"
        justifyContent="center"
        borderRadius="md"
        overflow="hidden"
      >
        <Image
          src="/image/nfiti/start/00_START_PAGE_animation.avifs"
          alt="랜덤 이미지"
          objectFit="contain"
          loading="eager"
        />
      </Flex>
      <Flex h="150px" justifyContent="center" alignItems="center" p="20px 80px">
        <Button
          onClick={onStartTest}
          bg="transparent"
          _hover={{
            transform: "scale(1.05)",
          }}
          _active={{
            transform: "scale(0.95)",
          }}
          borderRadius="md"
          padding="0"
          minWidth="auto"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {processedImages[1] && (
            <Image src={processedImages[1]} alt="테스트 시작" loading="eager" />
          )}
        </Button>
      </Flex>
    </Box>
  );
};

export default Nfiti;
