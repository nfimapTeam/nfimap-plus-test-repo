import React, { useRef, useLayoutEffect, useState } from "react";
import { Flex, Input, Button, Box, Image, VStack } from "@chakra-ui/react";
import { convertToWebP } from "../../../utils/utils";

interface NameInputProps {
  name: string;
  setName: (value: string) => void;
  onSubmit: () => void;
}

const NameInput: React.FC<NameInputProps> = ({ name, setName, onSubmit }) => {
  const [processedImages, setProcessedImages] = useState<string[]>([]);

  // Preload images before rendering
  const preloadImages = [
    "/image/nfiti/name/01_NAMING_PAGE_name.png",
    "/image/nfiti/name/01_NAMING_PAGE_nametag.png",
    "/image/nfiti/name/01_NAMING_PAGE_segeulja.png",
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle key press for submitting
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSubmit();
    }
  };

  // Handle input changes with character limits
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 3) {
      setName(value);
    }
  };

  // Render everything before main rendering
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '40px UhBeeSe_hyun';
        ctx.textAlign = "center";
        ctx.fillStyle = "#000";
        ctx.fillText(name, canvas.width / 2, canvas.height / 2 + 20);
      }
    }
  }, [name]);

  const preloads = ["/image/nfiti/name/01_NAMING_PAGE_character.gif"];
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
    <Flex
      h="calc(100svh - 68px)"
      flexDirection="column"
      justifyContent="space-between"
      alignItems="center"
    >
      <VStack
        flex="1"
        spacing={0}
        w="full"
        alignItems="center"
        justifyContent="center"
      >
        <Image
          src="/image/nfiti/name/01_NAMING_PAGE_character.gif"
          alt="캐릭터"
          w="100%"
          maxW="500px"
          loading="eager"
        />
        {processedImages[0] && (
          <Image
            src={processedImages[0]}
            alt="네임 배경"
            w="100%"
            maxW="500px"
            loading="eager"
          />
        )}
        <Box position="relative" w="100%" maxW="400px" h="200px" mb={4}>
          <canvas
            ref={canvasRef}
            width={400}
            height={200}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 10,
            }}
          />
          {processedImages[1] && (
            <Image
              src={processedImages[1]}
              alt="네임 태그"
              w="100%"
              position="absolute"
              top={0}
              left={0}
              loading="eager"
            />
          )}
        </Box>
        {processedImages[2] && (
          <Image
            src={processedImages[2]}
            alt="세글자 이미지"
            w="100%"
            maxW="500px"
            loading="eager"
          />
        )}
      </VStack>

      <Box w="100%" px={4} py={6} bg="white" boxShadow="md">
        <Input
          placeholder="이름을 입력하세요"
          value={name}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          maxLength={3}
          textAlign="center"
          fontSize="lg"
          w="100%"
          bg="gray.50"
          borderRadius="md"
          _focus={{ borderColor: "purple.600", bg: "white" }}
        />
        <Button mt={4} colorScheme="purple" w="100%" onClick={onSubmit}>
          저장
        </Button>
      </Box>
    </Flex>
  );
};

export default NameInput;
