import {
  Flex,
  Image,
  Box,
  Text,
  Container,
  Stack,
  useDisclosure,
  Link,
} from "@chakra-ui/react";
import React, { useState, useEffect, useLayoutEffect } from "react";
import ResultText from "./ResultText";
import ShareModal from "./ShareModal";
import { FaInstagram } from "react-icons/fa";
import { RESULT_DESCRIPTIONS } from "../constants";
import { useSetRecoilState } from "recoil";
import { bgColorState } from "../../../Atom/bgColorState";

interface TestResultDetails {
  reason: string; 
  reasonText: string;
  keyPoints: {
    title: string;
    description: string[];
  };
  dayPlan: {
    title: string;
    description: {
      title: string;
      content: string;
    }[];
  };
  hashtags: string;
}

interface TestResult {
  title: string;
  imageUrl: string;
  details: TestResultDetails;
}

interface ResultProps {
    nfiti: string;
}

const Share = ({ nfiti }: ResultProps) => {
    const testResult = RESULT_DESCRIPTIONS[nfiti];
    
    const setBgColor = useSetRecoilState(bgColorState);

    
    const preloadImages = [
        `/image/nfiti/loading/loading-gif.gif`,
        `/image/Final_UI_save.svg`,
        `/image/Final_UI_share.svg`,
        `/image/nfiti/retry.png`,
        `/image/nfiti/result/INF.png`,
        `/image/nfiti/result/INT.png`,
        `/image/nfiti/result/ISF.png`,
        `/image/nfiti/result/IST.png`,
        `/image/nfiti/result/ENF.png`,
        `/image/nfiti/result/ENT.png`,
        `/image/nfiti/result/EST.png`,
        `/image/nfiti/result/ESF.png`,
    ];
    
    const preloadAllImages = () => {
        preloadImages.forEach((src) => {
            const img = new (window as any).Image() as HTMLImageElement;
            img.src = src;
        });
    };
    
    useEffect(() => {
      setBgColor("purple.600");
    }, []);

    useLayoutEffect(() => {
        preloadAllImages();
    }, []);
    
  const handleRestartTest = () => {
    window.location.href = "https://nfimap-plus.co.kr/nfiti";
  };

  return (
    <Box fontFamily='"nanumfont", sans-serif'>
      <Container maxW="container.md" py={8}>
        <Flex direction="column" align="center" gap={6}>
            <Box
              position="relative"
              width="100%"
              borderRadius="15px"
              boxShadow="0 8px 20px rgba(0, 0, 0, 0.2)"
              overflow="hidden"
            >
              <Image
                src={testResult.imageUrl}
                alt="결과 이미지"
                width="100%"
                height="auto"
              />
            </Box>

          
            <Stack spacing={6} w="full">
              <ResultText testResult={testResult} />
              <Box
                position="relative"
                w="100%"
                onClick={handleRestartTest}
                cursor="pointer"
                _hover={{
                  transform: "scale(1.05)",
                }}
                _active={{
                  transform: "scale(0.95)",
                }}
              >
                <Image
                  src="/image/nfiti/retry.png"
                  alt="다시하기"
                  w="100%"
                  loading="eager"
                />
              </Box>
              <Flex
                alignItems="center"
                justifyContent="center"
                p={3}
                borderRadius="md"
              >
                <Link
                  href="https://www.instagram.com/HOYEYE92"
                  isExternal
                  display="flex"
                  alignItems="center"
                  gap={2}
                  _hover={{ textDecoration: "none" }}
                >
                  <Text
                    fontFamily='"UhBeeSe_hyun", serif'
                    fontSize="2xl"
                    fontWeight="800"
                    color="purple"
                    _hover={{
                      color: "purple.500",
                    }}
                  >
                    HOYEYE92
                  </Text>
                  <Flex
                    alignItems="center"
                    justifyContent="center"
                    boxSize="30px"
                    bgGradient="linear(to-br, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)"
                    borderRadius="full"
                  >
                    <FaInstagram color="white" size="20px" />
                  </Flex>
                </Link>
              </Flex>
            </Stack>
        </Flex>
      </Container>
    </Box>
  );
};

export default Share;
