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
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import ResultText from "./ResultText";
import ShareModal from "./ShareModal";
import { FaInstagram } from "react-icons/fa";

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
  name: string;
  resultCode: string | null;
  testResult?: TestResult | null;
  handleRestartTest: () => void;
}

const Result = ({ name, resultCode,  testResult, handleRestartTest }: ResultProps) => {
  const [showLoading, setShowLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

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

  // 렌더링 전에 이미지 미리 불러오기
  useLayoutEffect(() => {
    preloadAllImages();
  }, []);

  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      // 로딩 화면을 페이드 아웃 효과로 숨기기
      if (loadingRef.current) {
        loadingRef.current.style.opacity = "0";
        loadingRef.current.style.transition = "opacity 0.5s ease-out";

        // 애니메이션 종료 후 완전히 제거
        const fadeOutTimer = setTimeout(() => {
          setShowLoading(false);
          setImageLoaded(true);
        }, 800);

        return () => clearTimeout(fadeOutTimer);
      }
    }, 3000);

    return () => clearTimeout(loadingTimer);
  }, []);

  useEffect(() => {
    if (imageLoaded && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const img = new window.Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        if (ctx) {
          ctx.font = 'bold 64px UhBeeSe_hyun';
          ctx.fillStyle = "black";
          ctx.textAlign = "center";
          ctx.fillText(
            name + "(이)는",
            canvas.width / 2,
            canvas.height / 9 - 10
          );
        }
      };

      img.src = `${testResult?.imageUrl}`;
    }
  }, [imageLoaded, name, testResult]);

  const handleSaveClick = () => {
    if (canvasRef.current) {
      const dataURL = canvasRef.current.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = "NFITI.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatDetails = (result: TestResult | null | undefined) => {
    if (!result) return "";
    return `

${result.details.reason}
${result.details.reasonText}
  
${result.details.hashtags}`;
  }
  
  const formattedResult = formatDetails(testResult);

  if (!testResult) {
    return null;
  }

  return (
    <Box fontFamily='"nanumfont", sans-serif'>
      <Container maxW="container.md" py={8}>
        <Flex direction="column" align="center" gap={6}>
          {showLoading && (
            <Flex
              ref={loadingRef}
              position="fixed"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              flexDirection="column"
              justify="center"
              align="center"
              p={8}
              zIndex={10}
              bg="white"
              width="100%"
              height="100%"
            >
              <Image
                src="/image/nfiti/loading/loading-gif.gif"
                alt="로딩 이미지"
                width="100px"
                height="100px"
                objectFit="contain"
                objectPosition="center"
                loading="eager"
              />
              <Text
                fontSize="2xl"
                fontFamily='"UhBeeSe_hyun", serif'
                textAlign="center"
                color="purple.600"
                mt={4}
              >
                로딩중...
              </Text>
            </Flex>
          )}

          {imageLoaded && (
            <canvas
              ref={canvasRef}
              style={{
                width: "100%",
                height: "auto",
                borderRadius: "15px",
                boxShadow: "0 8px 20px rgba(0, 0, 0, 0.2)",
              }}
            />
          )}

          {imageLoaded && (
            <Stack spacing={6} w="full">
              {/* Save and Share Buttons */}
              <Flex
                w="full"
                justifyContent="space-between"
                alignItems="center"
                px={4}
              >
                <Image
                  src="/image/Final_UI_save.svg"
                  alt="저장"
                  w="45%"
                  h="auto"
                  cursor="pointer"
                  transition="transform 0.2s"
                  _hover={{
                    transform: "scale(1.05)",
                  }}
                  _active={{
                    transform: "scale(0.95)",
                  }}
                  onClick={handleSaveClick}
                  loading="eager"
                />
                <Image
                  src="/image/Final_UI_share.svg"
                  alt="공유"
                  w="45%"
                  h="auto"
                  cursor="pointer"
                  transition="transform 0.2s"
                  _hover={{
                    transform: "scale(1.05)",
                  }}
                  _active={{
                    transform: "scale(0.95)",
                  }}
                  onClick={onOpen}
                  loading="eager"
                />
              </Flex>

              <ResultText testResult={testResult} />
              <Flex
                position="relative"
                w="100%"
                justifyContent="center"
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
                  w="70%"
                  loading="eager"
                />
              </Flex>
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
          )}
        </Flex>
      </Container>
      <ShareModal
        isOpen={isOpen}
        onClose={onClose}
        canvasRef={canvasRef}
        shareTitle={name+"(이)는 "+testResult?.title || "테스트 결과"}
        shareDescription={formattedResult}
        shareUrl={`nfiti/${resultCode}`}
      />
    </Box>
  );
};

export default Result;
