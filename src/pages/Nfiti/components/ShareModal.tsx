import React, { useEffect, RefObject } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  Flex,
  Box,
  Icon,
  useToast,
} from "@chakra-ui/react";
import { FaLink } from "react-icons/fa";
import { RiKakaoTalkFill } from "react-icons/ri";
import { BsTwitterX } from "react-icons/bs";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl?: string;
  shareTitle?: string;
  shareDescription?: string;
  canvasRef?: RefObject<HTMLCanvasElement>;
}

declare global {
  interface Window {
    Kakao?: any;
  }
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  canvasRef,
  shareUrl,
  shareTitle = "NFITI 테스트 결과를 확인해보세요!",
  shareDescription = "",
}) => {
  const toast = useToast();

  useEffect(() => {
    const initKakaoSDK = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.cleanup();
        window.Kakao.init(process.env.REACT_APP_SHARE_KAKAO_LINK_KEY);
      }
    };

    if (window.Kakao) {
      initKakaoSDK();
    } else {
      const script = document.createElement("script");
      script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js";
      script.async = true;
      script.onload = initKakaoSDK;
      document.head.appendChild(script);
    }

    return () => {
      const scripts = document.head.getElementsByTagName("script");
      for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].src.includes("kakao_js_sdk")) {
          document.head.removeChild(scripts[i]);
          break;
        }
      }
    };
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard
      .writeText(`https://nfimap-plus.co.kr/${shareUrl}`)
      .then(() => {
        toast({
          title: "링크 복사 완료",
          description: "링크가 클립보드에 복사되었습니다.",
          status: "success",
          duration: 2000,
          isClosable: true,
          position: "top",
        });
      })
      .catch((err) => {
        toast({
          title: "링크 복사 실패",
          description: "링크 복사 중 오류가 발생했습니다.",
          status: "error",
          duration: 2000,
          isClosable: true,
          position: "top",
        });
      });
  };

  const handleKakaoShare = () => {
    if (!window.Kakao || !window.Kakao.Share) {
      toast({
        title: "카카오 공유 실패",
        description: "카카오 공유 기능을 사용할 수 없습니다.",
        status: "warning",
        duration: 2000,
        isClosable: true,
        position: "top",
      });
      return;
    }

    try {
      if (canvasRef?.current) {
        canvasRef.current.toBlob(function (blob) {
          if (blob) {
            const file = new File([blob], "nfiti-result.png", {
              type: "image/png",
              lastModified: Date.now(),
            });

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);

            window.Kakao.Share.uploadImage({
              file: dataTransfer.files,
            })
              .then((response: any) => {
                window.Kakao.Share.sendCustom({
                  templateId: 115327,
                  templateArgs: {
                    title: shareTitle,
                    description: shareDescription,
                    image: response.infos.original.url,
                    shareUrl: shareUrl,
                  },
                });
              })
              .catch((error: any) => {
                console.error("Kakao image upload error:", error);
                toast({
                  title: "이미지 공유 실패",
                  description: "이미지 업로드 중 오류가 발생했습니다.",
                  status: "error",
                  duration: 2000,
                  isClosable: true,
                  position: "top",
                });
              });
          } else {
            console.error("Canvas returned null for Blob");
          }
        }, "image/png");
      } else {
        window.Kakao.Share.sendCustom({
          templateId: 115327,
          templateArgs: {
            title: shareTitle,
            description: shareDescription,
            shareUrl: shareUrl,
          },
        });
      }
    } catch (error) {
      console.error("Kakao share error:", error);
      toast({
        title: "카카오 공유 오류",
        description: "공유 중 문제가 발생했습니다.",
        status: "error",
        duration: 2000,
        isClosable: true,
        position: "top",
      });
    }
  };

  const handleXShare = () => {
    const encodedTitle = encodeURIComponent(shareTitle + shareDescription);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodeURIComponent("https://nfimap-plus.co.kr/nfiti")}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="20px" maxWidth="350px" py={6} px={4}>
        <ModalCloseButton />
        <Flex justifyContent="center" gap={4} alignItems="center" width="100%">
          {/* Link Copy Button */}
          <Box
            as="button"
            onClick={handleCopyLink}
            borderRadius="full"
            bg="gray.100"
            p={4}
            display="flex"
            justifyContent="center"
            alignItems="center"
            transition="transform 0.2s"
            _hover={{ transform: "scale(1.1)" }}
            _active={{ transform: "scale(0.95)" }}
          >
            <Icon as={FaLink} w={8} h={8} color="gray.600" />
          </Box>
          {/* X Share Button */}
          <Box
            as="button"
            onClick={handleXShare}
            borderRadius="full"
            bg="black"
            p={4}
            display="flex"
            justifyContent="center"
            alignItems="center"
            transition="transform 0.2s"
            _hover={{ transform: "scale(1.1)" }}
            _active={{ transform: "scale(0.95)" }}
          >
            <Icon as={BsTwitterX} w={8} h={8} color="white" />
          </Box>
          {/* Kakao Share Button */}
          <Box
            as="button"
            onClick={handleKakaoShare}
            borderRadius="full"
            bg="yellow.400"
            p={3}
            display="flex"
            justifyContent="center"
            alignItems="center"
            transition="transform 0.2s"
            _hover={{ transform: "scale(1.1)" }}
            _active={{ transform: "scale(0.95)" }}
          >
            <Icon as={RiKakaoTalkFill} w={10} h={10} color="black" />
          </Box>
        </Flex>
      </ModalContent>
    </Modal>
  );
};

export default ShareModal;
