import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  Image,
  useToast,
  Progress,
  SimpleGrid,
  Flex,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';
import { Upload, Camera, RefreshCw } from 'lucide-react';
import * as tmImage from '@teachablemachine/image';
import '@tensorflow/tfjs';

const Lookalike = () => {
  const [model, setModel] = useState<tmImage.CustomMobileNet | null>(null);
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<{ className: string; probability: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const MODEL_URL = process.env.REACT_APP_MODEL_URL;

  useEffect(() => {
    const loadModel = async () => {
      try {
        const modelURL = MODEL_URL + 'model.json';
        const metadataURL = MODEL_URL + 'metadata.json';
        const loadedModel = await tmImage.load(modelURL, metadataURL);
        setModel(loadedModel);
        setIsModelLoading(false);
      } catch (error) {
        console.error('Failed to load model:', error);
        toast({
          title: '모델 로딩 실패',
          description: '모델 파일을 찾을 수 없습니다. (public/my_model 폴더를 확인해주세요)',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setIsModelLoading(false);
      }
    };
    loadModel();
  }, [toast]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageURL(e.target?.result as string);
        setPredictions([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const predict = async () => {
    if (!model || !imageURL) return;
    setLoading(true);
    try {
      const imageElement = document.createElement('img');
      imageElement.src = imageURL;
      imageElement.onload = async () => {
        const prediction = await model.predict(imageElement);
        // Sort by probability desc
        const sortedPredictions = prediction.sort((a, b) => b.probability - a.probability);
        setPredictions(sortedPredictions);
        setLoading(false);
      };
    } catch (error) {
      console.error('Prediction failed:', error);
      toast({
        title: '분석 실패',
        description: '이미지 분석 중 오류가 발생했습니다.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setLoading(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  return (
    <Box minH="100vh" bg={bgColor} py={10}>
      <Container maxW="container.md">
        <VStack spacing={8} align="stretch">
          <Box textAlign="center" py={5}>
            <Heading as="h1" size="2xl" bgGradient="linear(to-r, blue.400, purple.500)" bgClip="text" mb={3}>
              N.Flying 닮은꼴 찾기
            </Heading>
            <Text fontSize="lg" color="gray.500">
              나는 엔플라잉의 누구와 가장 닮았을까요?
            </Text>
          </Box>

          <Box
            bg={cardBg}
            p={8}
            borderRadius="2xl"
            boxShadow="xl"
            textAlign="center"
            border="1px"
            borderColor="gray.200"
          >
            {isModelLoading ? (
              <VStack spacing={4} py={10}>
                <Progress size="xs" isIndeterminate w="100%" colorScheme="blue" />
                <Text>인공지능 모델을 불러오는 중입니다...</Text>
              </VStack>
            ) : (
              <VStack spacing={6}>
                {!imageURL ? (
                  <Box
                    w="100%"
                    h="300px"
                    border="2px dashed"
                    borderColor="gray.300"
                    borderRadius="xl"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    onClick={triggerFileUpload}
                    transition="all 0.2s"
                    _hover={{ borderColor: 'blue.500', bg: 'blue.50' }}
                  >
                    <VStack spacing={2} color="gray.500">
                      <Icon as={Upload} w={10} h={10} />
                      <Text>사진을 클릭하여 업로드하세요</Text>
                    </VStack>
                  </Box>
                ) : (
                  <VStack spacing={4} w="100%">
                    <Box position="relative" borderRadius="xl" overflow="hidden" boxShadow="lg">
                      <Image src={imageURL} alt="Uploaded" maxH="400px" objectFit="contain" />
                    </Box>

                    {predictions.length === 0 && (
                      <Button
                        leftIcon={<Icon as={Camera} />}
                        colorScheme="blue"
                        size="lg"
                        onClick={predict}
                        isLoading={loading}
                        loadingText="분석 중..."
                        w="full"
                        boxShadow="md"
                      >
                        닮은꼴 분석하기
                      </Button>
                    )}

                    {predictions.length > 0 && (
                      <Button
                        leftIcon={<Icon as={RefreshCw} />}
                        variant="outline"
                        colorScheme="gray"
                        onClick={() => {
                          setImageURL(null);
                          setPredictions([]);
                        }}
                      >
                        다른 사진 해보기
                      </Button>
                    )}
                  </VStack>
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                />
              </VStack>
            )}
          </Box>

          {predictions.length > 0 && (
            <VStack spacing={4} align="stretch" bg={cardBg} p={6} borderRadius="2xl" boxShadow="lg">
              <Heading size="md" mb={2} textAlign="center">
                분석 결과
              </Heading>

              {/* Top Prediction Highlight */}
              <Box
                bgGradient="linear(to-r, blue.50, purple.50)"
                p={4}
                borderRadius="xl"
                border="1px"
                borderColor="blue.100"
                textAlign="center"
              >
                <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                  {predictions[0].className}
                </Text>
                <Text fontSize="md" color="gray.600" mb={2}>
                  {(predictions[0].probability * 100).toFixed(1)}% 일치
                </Text>
                {(() => {
                  const percentage = predictions[0].probability * 100;
                  if (percentage >= 90) {
                    return (
                      <Text fontSize="lg" fontWeight="bold" color="pink.500" mt={2}>
                        💖 완벽해요! 사랑하면 닮는다더니 정말 닮았네요!
                      </Text>
                    );
                  } else if (percentage >= 70) {
                    return (
                      <Text fontSize="lg" fontWeight="bold" color="purple.500" mt={2}>
                        🌟 대박! 진짜 팬이시네요!
                      </Text>
                    );
                  } else if (percentage >= 50) {
                    return (
                      <Text fontSize="lg" fontWeight="bold" color="blue.500" mt={2}>
                        👍 오~ 꽤 닮았어요!
                      </Text>
                    );
                  } else if (percentage >= 30) {
                    return (
                      <Text fontSize="lg" fontWeight="bold" color="teal.500" mt={2}>
                        😊 조금 닮았네요!
                      </Text>
                    );
                  } else {
                    return (
                      <Text fontSize="lg" fontWeight="bold" color="orange.500" mt={2}>
                        🎵 각자의 매력이 있어요!
                      </Text>
                    );
                  }
                })()}
              </Box>

              <Text fontSize="sm" color="gray.500" pt={2}>상세 결과</Text>
              {predictions.map((pred, index) => (
                <Box key={index}>
                  <Flex justify="space-between" mb={1}>
                    <Text fontWeight="medium">{pred.className}</Text>
                    <Text color="gray.500">{(pred.probability * 100).toFixed(1)}%</Text>
                  </Flex>
                  <Progress
                    value={pred.probability * 100}
                    size="sm"
                    colorScheme={index === 0 ? 'blue' : 'gray'}
                    borderRadius="full"
                  />
                </Box>
              ))}
            </VStack>
          )}
        </VStack>
      </Container>
    </Box>
  );
};

export default Lookalike;