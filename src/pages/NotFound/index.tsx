import React from 'react'
import { Box, VStack, Text, Image } from '@chakra-ui/react'

const NotFoundPage = () => {
  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minH="calc(100svh - 68px)"
      bg="blue.50"
    >
      <VStack spacing={6}>
        <Image 
          src="/image/nfiti/loading/loading-gif.gif"
          alt="로딩 중"
          w="200px"
          h="200px"
        />
        <Text fontSize="2xl" fontWeight="bold" color="gray.600">
          페이지를 찾을 수 없습니다
        </Text>
        <Text color="gray.500">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다
        </Text>
      </VStack>
    </Box>
  )
}

export default NotFoundPage
